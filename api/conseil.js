/**
 * /api/conseil — le conseiller de l'annuaire « Les meilleures IA ».
 *
 * Le visiteur décrit sa situation en français ; la fonction renvoie une
 * réponse composée : deux à quatre outils, le rôle de chacun dans la chaîne,
 * la façon de s'en servir, un point de vigilance, et l'offre IA-Entrepreneur
 * la plus pertinente pour le cas décrit.
 *
 * Trois garde-fous, parce qu'un modèle qui invente un outil détruit la
 * crédibilité de tout l'annuaire :
 *   1. le modèle ne voit que le catalogue et ne peut choisir que des slugs
 *      existants ; la sortie est contrainte par un schéma d'outil strict ;
 *   2. le serveur revérifie chaque slug et chaque clé d'offre, et retire
 *      silencieusement tout ce qui ne correspond pas au catalogue ;
 *   3. s'il ne reste aucun outil valide, la fonction renvoie une erreur et la
 *      page garde la réponse de son moteur local.
 *
 * Sans ANTHROPIC_API_KEY, la fonction répond 503 : la page continue de
 * fonctionner avec son moteur local, sans rien casser.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CATALOGUE, SLUGS } from './_catalogue.js';
import { OFFRES, CLES_OFFRES } from './_offres.js';

const MODELE = 'claude-haiku-4-5';
const QUESTION_MIN = 3;
const QUESTION_MAX = 500;

// Limite par visiteur. Le stockage est en mémoire : sur une plateforme
// serverless, chaque instance a le sien, donc la limite est indicative. Elle
// suffit à écarter une boucle accidentelle ; le vrai plafond de dépense est le
// max_tokens et la brièveté de la réponse demandée.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 10;
const passages = new Map();

function tropDeRequetes(empreinte) {
  const maintenant = Date.now();
  const recentes = (passages.get(empreinte) || []).filter((t) => maintenant - t < FENETRE_MS);
  recentes.push(maintenant);
  passages.set(empreinte, recentes);
  if (passages.size > 5000) passages.clear();       // garde-fou mémoire
  return recentes.length > MAX_PAR_FENETRE;
}

const INSTRUCTIONS = `Tu es le conseiller de l'annuaire d'outils IA de IA-Entrepreneur, organisme de formation certifié Qualiopi qui accompagne des dirigeants et des équipes de TPE-PME françaises.

Un visiteur décrit sa situation. Tu réponds en composant une chaîne d'outils : quel outil pour quelle étape, et comment s'en servir concrètement. Deux à quatre outils, jamais plus — au-delà, personne ne passe à l'action.

RÈGLES ABSOLUES
- Tu ne cites que des outils présents dans le catalogue fourni, par leur slug exact. Ne jamais inventer un outil, ni citer un outil absent du catalogue.
- Tu respectes le niveau apparent du visiteur : ne propose pas un outil « Expert » à quelqu'un qui décrit un usage de débutant.
- Si la personne dit vouloir commencer sans payer, privilégie les outils Gratuit ou Freemium.
- Si sa situation touche des données clients, des données personnelles ou un sujet réglementé, privilégie les éditeurs européens et dis-le.

STYLE
- Français, vouvoiement, phrases courtes, ton direct et concret.
- Le champ « comment » dit ce qu'on fait réellement avec l'outil dans SA situation, pas ce que l'outil sait faire en général.
- Aucune promesse chiffrée de retour sur investissement. On parle de temps gagné et de fiabilité.
- Pas de superlatif creux.

LA CONVERSATION
Le visiteur peut rebondir sur ta réponse précédente. Tiens compte de tout le fil : s'il précise son budget, son niveau ou son métier après coup, révise ta recommandation au lieu de la répéter. Termine toujours par deux ou trois questions courtes qu'il pourrait poser ensuite, formulées à la première personne.

L'OFFRE
Tu termines toujours par l'offre IA-Entrepreneur la plus pertinente pour la situation décrite, choisie dans la liste fournie. Une phrase, honnête, qui relie le besoin exprimé à ce que la formation ou l'accompagnement change concrètement. L'idée à faire passer : disposer de l'outil ne suffit pas, c'est de savoir s'en servir sur ses propres cas qui fait la différence. Jamais de pression commerciale, jamais d'urgence artificielle.`;

const OUTIL = {
  name: 'recommander',
  description: "Renvoie la chaîne d'outils recommandée pour la situation décrite par le visiteur.",
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      situation: {
        type: 'string',
        description: "Reformulation du besoin en une phrase, à la deuxième personne. Exemple : « Vous voulez plus de rendez-vous qualifiés sans y passer vos matinées. »",
      },
      etapes: {
        type: 'array',
        description: "Deux à quatre outils, dans l'ordre où on les utilise.",
        items: {
          type: 'object',
          properties: {
            outil: { type: 'string', description: 'Slug exact d\'un outil du catalogue.' },
            role: { type: 'string', description: "Le rôle de cet outil dans la chaîne, en quelques mots." },
            comment: { type: 'string', description: "Comment s'en servir dans cette situation précise, une à deux phrases." },
          },
          required: ['outil', 'role', 'comment'],
          additionalProperties: false,
        },
      },
      vigilance: {
        type: 'string',
        description: "Le point de vigilance qui compte ici : données, coût réel, niveau requis, obligation légale. Chaîne vide s'il n'y a rien de particulier à signaler.",
      },
      offre: { type: 'string', enum: CLES_OFFRES, description: "Clé de l'offre IA-Entrepreneur la plus pertinente." },
      phrase_offre: { type: 'string', description: "Une phrase reliant la situation décrite à cette offre." },
      suivis: {
        type: 'array',
        description: "Deux ou trois questions courtes que le visiteur pourrait poser ensuite, à la première personne, pour approfondir sa situation. Exemple : « Et pour la facturation ? »",
        items: { type: 'string' },
      },
    },
    required: ['situation', 'etapes', 'vigilance', 'offre', 'phrase_offre', 'suivis'],
    additionalProperties: false,
  },
};

async function journaliser(question, outils) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_ANON_KEY;
  if (!url || !cle) return;
  try {
    await fetch(`${url}/rest/v1/ia_entrepreneur_questions`, {
      method: 'POST',
      headers: {
        apikey: cle,
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ question, outils, source: 'claude' }),
    });
  } catch {
    // La journalisation ne doit jamais faire échouer une réponse au visiteur.
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ erreur: 'conseiller_indisponible' });
  }

  // Le fil de discussion, pour que « et pour la facturation ? » ait du sens.
  // On ne garde que les six derniers tours : au-delà, on paie du contexte qui
  // n'apporte plus rien à la recommandation.
  const brutMessages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  const fil = (brutMessages || [{ role: 'user', content: req.body?.question ?? '' }])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .slice(-6)
    .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, QUESTION_MAX) }));

  if (!fil.length || fil[fil.length - 1].role !== 'user') {
    return res.status(400).json({ erreur: 'fil_invalide' });
  }
  const question = fil[fil.length - 1].content;
  if (question.length < QUESTION_MIN) {
    return res.status(400).json({ erreur: 'question_trop_courte' });
  }

  const empreinte = (req.headers['x-forwarded-for'] || 'inconnu').split(',')[0].trim();
  if (tropDeRequetes(empreinte)) {
    return res.status(429).json({ erreur: 'trop_de_questions' });
  }

  const client = new Anthropic({ timeout: 25000, maxRetries: 1 });

  try {
    const reponse = await client.messages.create({
      model: MODELE,
      max_tokens: 900,
      system: [
        {
          type: 'text',
          text: `CATALOGUE DES OUTILS (${CATALOGUE.length} entrées)\n${JSON.stringify(CATALOGUE)}\n\nOFFRES IA-ENTREPRENEUR\n${JSON.stringify(OFFRES)}`,
          // Le catalogue est identique d'une requête à l'autre : mis en cache,
          // il est facturé environ dix fois moins cher en lecture.
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: INSTRUCTIONS },
      ],
      tools: [OUTIL],
      tool_choice: { type: 'tool', name: 'recommander' },
      messages: fil,
    });

    const bloc = reponse.content.find((b) => b.type === 'tool_use');
    if (!bloc) return res.status(502).json({ erreur: 'reponse_illisible' });
    const brut = bloc.input;

    // Revérification : on ne fait confiance à rien de ce qui sort du modèle.
    const etapes = (Array.isArray(brut.etapes) ? brut.etapes : [])
      .filter((e) => e && SLUGS.has(e.outil))
      .slice(0, 4)
      .map((e) => {
        const fiche = CATALOGUE.find((o) => o.slug === e.outil);
        return {
          slug: fiche.slug,
          nom: fiche.nom,
          usage: fiche.usage,
          niveau: fiche.niveau,
          prix: fiche.prix,
          url: `/ia/${fiche.slug}.html`,
          role: String(e.role || '').slice(0, 200),
          comment: String(e.comment || '').slice(0, 400),
        };
      });

    if (!etapes.length) return res.status(502).json({ erreur: 'aucun_outil_valide' });

    const offre = OFFRES[brut.offre] ? { ...OFFRES[brut.offre], phrase: String(brut.phrase_offre || '').slice(0, 300) }
                                     : null;

    journaliser(question, etapes.map((e) => e.slug));

    return res.status(200).json({
      source: 'claude',
      // Le modele reellement utilise, tel que l'API le renvoie — pas celui
      // qu'on a demande. Permet de verifier de l'exterieur qu'aucun autre
      // modele, plus cher, n'a servi la reponse.
      modele: reponse.model,
      situation: String(brut.situation || '').slice(0, 300),
      etapes,
      vigilance: String(brut.vigilance || '').slice(0, 400),
      suivis: (Array.isArray(brut.suivis) ? brut.suivis : [])
        .filter((x) => typeof x === 'string' && x.trim())
        .slice(0, 3)
        .map((x) => x.trim().slice(0, 120)),
      offre,
    });
  } catch (erreur) {
    const code = erreur?.status === 429 ? 429 : 502;
    return res.status(code).json({ erreur: 'conseiller_indisponible' });
  }
}
