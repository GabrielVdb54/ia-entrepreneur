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
import { OFFRES, CLES_OFFRES, OFFRES_CONDITIONNEES, OFFRE_PAR_DEFAUT } from './_offres.js';

// Vercel coupe une fonction Node bien avant si on ne le lui dit pas. Une
// réponse à trois voies demande jusqu'à 25 secondes : sans cette ligne, les
// prompts les plus riches échouaient précisément là où ils sont les plus utiles.
export const maxDuration = 60;

const MODELE = 'claude-haiku-4-5';
const QUESTION_MIN = 3;
const QUESTION_MAX = 500;

// Limite par visiteur. Le stockage est en mémoire : sur une plateforme
// serverless, chaque instance a le sien, donc la limite est indicative. Elle
// écarte une boucle accidentelle sans gêner un visiteur qui explore : le vrai
// plafond de dépense est le budget mensuel du workspace Anthropic.
// Quand elle se déclenche, la page bascule sur son moteur local : le visiteur
// obtient une réponse, il ne voit pas d'erreur.
// Plafond d'une conversation. Au-delà, il n'y a plus grand-chose à tirer d'un
// échange écrit : mieux vaut un appel de quinze minutes. C'est aussi ce qui
// empêche une conversation de dix messages de coûter dix appels au modèle.
const MAX_REPONSES = 4;

const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 25;   // ~8 conversations complètes : un visiteur curieux ne doit pas buter dessus
const passages = new Map();

function tropDeRequetes(empreinte) {
  const maintenant = Date.now();
  const recentes = (passages.get(empreinte) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (passages.size > 5000) passages.clear();       // garde-fou mémoire
  // On ne compte QUE les requêtes servies. Compter aussi les refus enfermait
  // le visiteur : chaque tentative repoussait la sortie, et quelqu'un qui
  // réessaie deux ou trois fois restait bloqué bien au-delà des dix minutes.
  if (recentes.length >= MAX_PAR_FENETRE) {
    passages.set(empreinte, recentes);
    return true;
  }
  recentes.push(maintenant);
  passages.set(empreinte, recentes);
  return false;
}

/**
 * Une TACHE nommee se traite directement, un CONTEXTE sans tache se clarifie.
 *
 * La consigne existe depuis longtemps dans le prompt, et le modele ne la suit
 * pas de facon fiable : « quelle ia pour mes posts linkedin » repartait en
 * interrogatoire alors que la tache est explicite. Quelqu'un qui arrive d'un
 * lien et se fait questionner au lieu d'obtenir une reponse s'en va.
 *
 * On tranche donc avant l'appel, comme pour la coherence des offres : le
 * lexique ci-dessous ne contient que des OBJETS de travail et des VERBES
 * d'action. Aucun secteur, aucun metier — « cabinet comptable », « boite de
 * BTP » ou « mon restaurant » doivent continuer a declencher des questions,
 * puisqu'on ne sait pas encore ce qui prend du temps a la personne.
 */
const TACHES = new RegExp('\\b(?:' + [
  'mails?', 'e-?mails?', 'courriels?', 'boite mail',
  'posts?', 'linkedin', 'instagram', 'facebook', 'tiktok', 'reseaux sociaux', 'publications?',
  'videos?', 'montage', 'sous-?titres?', 'podcasts?', 'voix off', 'reels?', 'shorts?',
  'images?', 'visuels?', 'photos?', 'logos?', 'illustrations?', 'miniatures?', 'affiches?',
  'factures?', 'devis', 'notes? de frais', 'relances?', 'impayes?', 'depenses?',
  'contrats?', 'cgv', 'clauses?', 'rgpd', 'ai ?act', 'conformite', 'conformes?', 'registre',
  'cv', 'offres? d.emploi', 'recrutement', 'candidatures?', 'entretiens?', 'onboarding',
  'articles?', 'blog', 'newsletters?', 'fiches? produit', 'descriptions?',
  'slides?', 'presentations?', 'powerpoints?', 'pitch', 'supports? de cours', 'quiz', 'formations? en ligne',
  'sites? (?:web|internet)', 'landing', 'chatbots?', 'formulaires?', 'maquettes?',
  'comptes? ?-?rendus?', 'reunions?', 'visios?', 'prises? de notes',
  'seo', 'referencement', 'mots.?cles', 'netlinking', 'backlinks?',
  'crm', 'prospection', 'prospects?', 'leads?', 'sequences?', 'cold ?(?:mail|call)',
  'tableaux? de bord', 'dashboards?', 'reporting', 'tableurs?', 'feuilles? de calcul',
  'documents?', 'pdf', 'rapports?', 'traductions?', 'orthographe', 'fautes?', 'contenus?',
  'plannings?', 'agendas?', 'rendez-?vous',
  'rediger', 'ecrire', 'publier', 'poster', 'repondre aux', 'traduire', 'transcrire', 'resumer',
  'analyser', 'prospecter', 'relancer', 'monter', 'creer', 'generer', 'corriger', 'planifier',
  'automatiser', 'facturer', 'signer', 'convertir', 'illustrer', 'dessiner', 'retoucher',
  'sous-?titrer', 'synthetiser', 'classer', 'archiver', 'extraire', 'trier',
].join('|') + ')\\b', 'i');

function tacheNommee(texte) {
  return TACHES.test(
    String(texte)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // « rédiger » et « rediger » se valent
      .replace(/['\u2019]/g, ' ')                          // « l'AI Act » doit se lire « l ai act »
      .toLowerCase(),
  );
}

const INSTRUCTIONS = `Tu es FindIA, l'assistant de l'annuaire d'outils IA de IA-Entrepreneur, organisme de formation certifié Qualiopi qui accompagne des dirigeants et des équipes de TPE-PME françaises. Si on te demande qui tu es, dis-le simplement : une IA qui connaît cet annuaire et rien d'autre.

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

QUAND POSER DES QUESTIONS, ET QUAND NE PAS EN POSER
La règle tient en une ligne : une TÂCHE nommée se traite directement, un CONTEXTE sans tâche se clarifie.

Recommande sans poser de question dès qu'une tâche est identifiable, même en trois mots : « lire un document », « détecter les fautes », « transcrire un audio », « traduire un contrat », « faire des slides », « résumer des PDF », « créer une image ». Si un détail pouvait changer ta réponse, ne le demande pas : donne ta recommandation principale et cite l'alternative en une demi-phrase — « si vos documents contiennent des données clients, prenez plutôt X ».

Pose des questions uniquement quand le besoin lui-même reste inconnu : un secteur ou un métier sans tâche nommée. « Une IA pour mon restaurant », « pour mes cours », « pour ma boîte », « pour mon cabinet » — là, tu ne peux pas choisir sans savoir ce qui prend du temps. Deux à quatre questions courtes, concrètes, dont chaque réponse changerait vraiment ta recommandation.

Dans ce cas seulement, renvoie une liste d'étapes vide et remplis le champ des questions. Sinon, laisse les questions vides et recommande.

QUAND LA DEMANDE N'A RIEN À VOIR
Si on te demande qui tu es, ou quelque chose qui n'a aucun rapport avec un outil d'IA en entreprise, ne force pas une recommandation et ne pose pas de question de politesse : réponds franchement dans le champ « situation », en deux phrases maximum, puis laisse les étapes ET les questions vides.

Deux cas distincts, à ne pas confondre.

On te demande qui tu es : c'est une question légitime, jamais un hors-sujet. Réponds-y vraiment, en commençant par te nommer. Par exemple : « Je suis FindIA, une intelligence artificielle. Je ne suis pas une personne. Je connais les 129 outils de cet annuaire et je vous aide à choisir ceux qui correspondent à votre situation. » Puis invite à décrire une situation de travail.

On te demande autre chose, sans rapport avec le travail ou les outils : dis en une phrase que ce n'est pas ton domaine, et ramène vers ce que tu sais faire.

Règle de coût, stricte : jamais plus de deux tours de questions dans une conversation. En cas de doute entre questionner et recommander, recommande.

TROIS FAÇONS DE FAIRE
Chaque recommandation se décline en trois niveaux, pour que le visiteur se situe sans que tu aies à lui demander son budget.
- La chaîne principale est le MEILLEUR RAPPORT QUALITÉ-PRIX : ce que tu conseillerais à un ami qui accepte de payer un peu si ça vaut le coup.
- La version GRATUITE n'utilise que des outils dont l'offre gratuite suffit réellement à faire le travail. Dis franchement ce qu'on y perd.
- La version PERFORMANCE est ce que tu prendrais si le budget n'était pas un sujet. Dis ce que l'argent achète concrètement, pas « plus de fonctionnalités ».
Deux règles impératives sur ces colonnes.
La phrase d'une colonne ne cite QUE des outils présents dans la liste de cette même colonne. Vanter un outil qu'on n'a pas mis dans la liste rend la colonne incompréhensible.
Si une colonne aboutit aux mêmes outils que la recommandation, ne répète pas la liste sans le dire : écris franchement qu'il n'y a rien de mieux à ce niveau, ou qu'il n'y a pas lieu de payer davantage.
Si le visiteur a annoncé son budget, respecte-le dans la chaîne principale — mais renseigne quand même les deux autres colonnes.

LA CONVERSATION
Le visiteur peut rebondir sur ta réponse précédente. Tiens compte de tout le fil : s'il précise son budget, son niveau ou son métier après coup, révise ta recommandation au lieu de la répéter. Termine toujours par deux ou trois relances que LE VISITEUR pourrait t'envoyer ensuite : elles sont écrites de son point de vue, à la première personne, et deviendront des boutons qu'il cliquera pour te répondre. Ne pose jamais de question au visiteur dans ce champ — « Quel est votre budget ? » est faux, « Mon budget est serré » est juste.

L'OFFRE
Tu termines toujours par l'offre IA-Entrepreneur la plus pertinente, choisie dans la liste fournie.

COHÉRENCE, D'ABORD : l'offre doit correspondre aux outils que tu viens de recommander. Conseiller Mistral puis vendre une formation ChatGPT décrédibilise tout ce qui précède. En cas de doute, la formation sur mesure convient toujours.

La phrase suit trois temps, dans cet ordre, sans jamais les nommer :
1. Ce que la personne repart en sachant faire — un savoir-faire concret, pas « maîtriser l'IA ».
2. Sur quoi elle s'entraîne — SES dossiers, SES clients, SES outils, repris de ce qu'elle a raconté.
3. Ce qui lève le frein — organisme certifié Qualiopi, formation finançable par l'OPCO, souvent sans reste à charge, en présentiel ou à distance.

Exemple du ton attendu, pour un commercial en téléphonie : « Deux jours pour construire vos séquences de prospection sur votre propre fichier, écrire les relances qui vous manquent et brancher le tout sur votre CRM. Organisme certifié Qualiopi, finançable par votre OPCO. »

Jamais de chiffre de retour sur investissement, jamais d'urgence, jamais de superlatif. La phrase doit être écrite POUR CETTE PERSONNE : reprends son métier, son contexte et ses propres mots, et dis ce que la formation change concrètement sur SON cas. « Une formation sur mesure » ne veut rien dire ; « deux jours sur vos propres séquences de prospection, avec votre fichier et votre CRM » veut dire quelque chose.

Nomme au moins un élément concret de sa situation dans la phrase, et relie-le à un des outils que tu viens de recommander. L'idée à faire passer, jamais énoncée comme un slogan : disposer de l'outil ne suffit pas, savoir s'en servir sur ses propres dossiers fait la différence. Jamais de pression commerciale, jamais d'urgence artificielle, jamais de promesse chiffrée.`;

const OUTIL = {
  name: 'recommander',
  description: "Renvoie la chaîne d'outils recommandée pour la situation décrite par le visiteur.",
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      situation: {
        type: 'string',
        description: "Si tu recommandes : reformulation du besoin en une phrase, à la deuxième personne. Si tu poses des questions : une phrase qui dit ce qu'il te manque pour bien conseiller, sans jargon.",
      },
      questions: {
        type: 'array',
        description: "Deux à quatre questions courtes et concrètes, posées au visiteur, quand la demande est trop vague pour recommander. Vide dès que tu recommandes.",
        items: { type: 'string' },
      },
      etapes: {
        type: 'array',
        description: "La chaîne recommandée : le meilleur rapport qualité-prix pour cette situation. Deux ou trois outils, quatre seulement si c'est indispensable, dans l'ordre où on les utilise. Vide si tu poses des questions.",
        items: {
          type: 'object',
          properties: {
            outil: { type: 'string', description: 'Slug exact d\'un outil du catalogue.' },
            role: { type: 'string', description: "Le rôle de cet outil dans la chaîne, en quelques mots." },
            comment: { type: 'string', description: "Comment s'en servir dans cette situation précise. UNE phrase, deux au maximum si la première ne suffit pas." },
          },
          required: ['outil', 'role', 'comment'],
          additionalProperties: false,
        },
      },
      gratuit: {
        type: 'object',
        description: "La façon de faire sans dépenser un euro : uniquement des outils Gratuit ou Freemium dont la version gratuite suffit vraiment. Un à trois slugs.",
        properties: {
          outils: { type: 'array', items: { type: 'string' } },
          phrase: { type: 'string', description: "Ce qu'on obtient et ce qu'on perd par rapport à la recommandation, en une phrase." },
        },
        required: ['outils', 'phrase'],
        additionalProperties: false,
      },
      performance: {
        type: 'object',
        description: "La façon de faire quand le budget n'est pas le sujet et qu'on veut le meilleur résultat. Un à trois slugs.",
        properties: {
          outils: { type: 'array', items: { type: 'string' } },
          phrase: { type: 'string', description: "Ce que le budget supplémentaire apporte concrètement, en une phrase." },
        },
        required: ['outils', 'phrase'],
        additionalProperties: false,
      },
      vigilance: {
        type: 'string',
        description: "Le point de vigilance qui compte ici : données, coût réel, niveau requis, obligation légale. Chaîne vide s'il n'y a rien de particulier à signaler.",
      },
      offre: { type: 'string', enum: CLES_OFFRES, description: "Clé de l'offre IA-Entrepreneur la plus pertinente." },
      phrase_offre: { type: 'string', description: "Une phrase reliant la situation décrite à cette offre." },
      suivis: {
        type: 'array',
        description: "Deux ou trois RELANCES que le visiteur pourrait t'envoyer ensuite, rédigées de SON point de vue, à la première personne. Ce sont des messages qu'il enverra en cliquant dessus, pas des questions que tu lui poses. Exemples corrects : « Je n'ai pas encore de CRM », « Je prospecte surtout sur LinkedIn », « Et pour la facturation ? », « Montre-moi des outils gratuits ». Exemple INCORRECT : « Quel est votre budget ? »",
        items: { type: 'string' },
      },
    },
    required: ['situation', 'questions', 'etapes', 'gratuit', 'performance', 'vigilance', 'offre', 'phrase_offre', 'suivis'],
    additionalProperties: false,
  },
};

/**
 * Variante de l'outil sans le champ « questions ».
 *
 * Demander au modele de ne pas poser de questions ne marche pas : la consigne
 * est dans le prompt depuis longtemps, elle a ete renforcee par un bloc systeme
 * dedie, et « quelle ia pour mes posts linkedin » repartait quand meme en
 * interrogatoire. On ne lui demande donc plus rien : on retire le champ. Un
 * schema strict sans « questions » rend l'interrogatoire impossible a produire.
 *
 * Contrepartie assumee : les outils precedent le systeme dans la cle de cache,
 * donc les deux variantes entretiennent deux caches distincts. Le catalogue est
 * ecrit deux fois plutot qu'une. C'est le prix d'une reponse fiable, et le
 * visiteur qui arrive d'un lien compte plus que le cout d'une ecriture de cache.
 */
const OUTIL_SANS_QUESTIONS = (() => {
  const { questions, ...proprietes } = OUTIL.input_schema.properties;
  return {
    ...OUTIL,
    input_schema: {
      ...OUTIL.input_schema,
      properties: proprietes,
      required: OUTIL.input_schema.required.filter((c) => c !== 'questions'),
    },
  };
})();

/**
 * Tronque sur une frontiere de mot. Un « ou la rela » en fin de question
 * ruine la credibilite de la reponse : mieux vaut une phrase entiere plus
 * courte qu'une phrase coupee au milieu d'un mot.
 */
function couper(texte, maxi) {
  const t = String(texte || '').trim();
  if (t.length <= maxi) return t;
  const coupe = t.slice(0, maxi).replace(/\s+\S*$/, '');
  return (coupe || t.slice(0, maxi)) + '…';
}

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

  // Plafond de dépense : trois réponses maximum par conversation. Au-delà de
  // deux tours de questions, le conseiller doit trancher avec ce qu'il sait.
  // Le client n'envoie que les six derniers tours, pour ne pas payer un
  // contexte inutile : le serveur ne peut donc pas deviner la longueur reelle
  // de la conversation. Elle lui est transmise a part. Un client malveillant
  // pourrait mentir, mais la limite anti-abus couvre ce cas.
  const toursAnnonces = Number.isInteger(req.body?.tours) ? req.body.tours : 0;
  const toursReponse = Math.max(fil.filter((m) => m.role === 'assistant').length, toursAnnonces);
  const dernierTour = toursReponse >= 2;

  // Conversation terminée : on répond sans appeler le modèle. Zéro coût, et
  // le visiteur est orienté là où l'échange devient utile.
  if (toursReponse >= MAX_REPONSES) {
    return res.status(200).json({
      source: 'local',
      mode: 'termine',
      situation: "Nous avons fait le tour de ce qu'un échange écrit permet. Pour aller plus loin sur votre cas précis — vos outils, vos process, ce qui bloque vraiment — quinze minutes au téléphone valent mieux que dix messages.",
      offre: {
        url: '/formations-entreprises.html',
        titre: 'Parlons de votre situation',
        phrase: "Un appel gratuit de quinze minutes, sans engagement. Et si vous préférez continuer seul, l'annuaire complet est juste en dessous.",
      },
    });
  }

  // Une tache nommee se traite directement ; au dernier tour, on tranche de
  // toute facon. Dans les deux cas, le champ « questions » disparait du schema.
  const recommandeDirectement = dernierTour || tacheNommee(question);

  const client = new Anthropic({ timeout: 50000, maxRetries: 1 });

  try {
    const reponse = await client.messages.create({
      model: MODELE,
      max_tokens: 1000,
      system: [
        {
          type: 'text',
          text: `CATALOGUE DES OUTILS (${CATALOGUE.length} entrées)\n${JSON.stringify(CATALOGUE)}\n\nOFFRES IA-ENTREPRENEUR\n${JSON.stringify(OFFRES)}`,
          // Le catalogue et les consignes ne changent jamais d'une requête à
          // l'autre. Cache d'une heure et non de cinq minutes : sur un site à
          // trafic modéré, la plupart des visiteurs tombaient sur un cache
          // expiré, donc payaient et attendaient le plein tarif.
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
        { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral', ttl: '1h' } },
        ...(dernierTour
          ? [{ type: 'text', text: "C'EST TON DERNIER TOUR. Tu ne poses plus aucune question : tu recommandes avec ce que tu sais déjà, quitte à préciser une hypothèse en une demi-phrase." }]
          : []),
        // Bloc non caché, volontairement : il dépend de la question posée.
        // Le schéma a déjà retiré le champ « questions » ; cette phrase dit au
        // modèle quoi faire du détail qui lui manque, plutôt que de le laisser
        // buter contre un champ absent.
        ...(!dernierTour && recommandeDirectement
          ? [{ type: 'text', text: "Le visiteur a nommé une tâche précise : tu recommandes, tu ne demandes rien. Le champ « etapes » ne peut PAS rester vide — c'est une impasse pour le visiteur, qui repartirait sans rien. S'il te manque un détail, prends l'interprétation la plus probable, dis-la en une demi-phrase dans la reformulation (« je pars du principe que vous voulez monter des vidéos existantes »), et couvre l'autre lecture en citant un outil de plus avec son rôle. Une hypothèse assumée vaut mieux qu'une question, et infiniment mieux que rien." }]
          : []),
      ],
      tools: [recommandeDirectement ? OUTIL_SANS_QUESTIONS : OUTIL],
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
          role: couper(e.role, 200),
          comment: couper(e.comment, 500),
        };
      });

    const questions = (Array.isArray(brut.questions) ? brut.questions : [])
      .filter((x) => typeof x === 'string' && x.trim())
      .slice(0, 4)
      .map((x) => couper(x, 220));

    // Demande de précisions : pas d'outil, donc rien à valider contre le
    // catalogue. On l'accepte seulement si ce n'est pas le dernier tour.
    if (!etapes.length && questions.length && !dernierTour) {
      journaliser(question, []);
      return res.status(200).json({
        source: 'claude',
        modele: reponse.model,
        mode: 'questions',
        situation: couper(brut.situation, 320),
        questions,
      });
    }

    // Une tâche etait nommee, et il n'en sort aucun outil : le modele, prive du
    // champ « questions », a repondu « vous cherchez une IA pour la video, mais
    // sans preciser le type » et s'est arrete la. C'est une impasse : ni outil,
    // ni question, rien a faire pour le visiteur. On renvoie donc une erreur,
    // ce qui fait basculer la page sur son moteur local — lequel, lui, trouvera
    // toujours des outils video. Le visiteur obtient une reponse, pas un mur.
    if (recommandeDirectement && !etapes.length) {
      return res.status(502).json({
        erreur: 'aucune_recommandation',
        // DIAGNOSTIC TEMPORAIRE : distinguer « le modele n'a rien propose » de
        // « il a propose des outils dont les identifiants ont ete rejetes ».
        diag: {
          proposes: Array.isArray(brut.etapes) ? brut.etapes.map((e) => e && e.outil) : null,
          situation: String(brut.situation || '').slice(0, 120),
        },
      });
    }

    // Ni outil ni question : le visiteur a demandé autre chose (« qui es-tu ? »,
    // le prix d'une pizza). Le conseiller a le droit de simplement répondre.
    // Renvoyer une erreur ici serait absurde : la réponse est correcte.
    if (!etapes.length) {
      const message = couper(brut.situation, 500);
      if (!message) return res.status(502).json({ erreur: 'reponse_vide' });
      journaliser(question, []);
      return res.status(200).json({
        source: 'claude',
        modele: reponse.model,
        mode: 'message',
        situation: message,
        suivis: (Array.isArray(brut.suivis) ? brut.suivis : [])
          .filter((x) => typeof x === 'string' && x.trim())
          .slice(0, 3)
          .map((x) => couper(x, 140)),
      });
    }

    // Mêmes garde-fous que pour la chaîne principale : tout slug inconnu saute.
    function variante(v) {
      if (!v || !Array.isArray(v.outils)) return null;
      const outils = v.outils
        .filter((sl) => SLUGS.has(sl))
        .slice(0, 3)
        .map((sl) => {
          const f = CATALOGUE.find((o) => o.slug === sl);
          return { slug: f.slug, nom: f.nom, prix: f.prix, url: `/ia/${f.slug}.html` };
        });
      return outils.length ? { outils, phrase: couper(v.phrase, 220) } : null;
    }

    // Une offre liée à un outil précis n'est retenue que si cet outil est
    // effectivement dans la recommandation. Sinon on bascule sur la formation
    // sur mesure, qui convient à toutes les situations.
    let cleOffre = OFFRES[brut.offre] ? brut.offre : OFFRE_PAR_DEFAUT;
    const requis = OFFRES_CONDITIONNEES[cleOffre];
    if (requis && !etapes.some((e) => requis.includes(e.slug))) cleOffre = OFFRE_PAR_DEFAUT;

    // La clé accompagne l'offre : la page la renvoie telle quelle à /api/recap,
    // qui la revalide contre la même liste fermée.
    const offre = { cle: cleOffre, ...OFFRES[cleOffre], phrase: couper(brut.phrase_offre, 340) };

    journaliser(question, etapes.map((e) => e.slug));

    return res.status(200).json({
      source: 'claude',
      mode: 'recommandation',
      // La page n'affiche le bloc « recevoir par email » que si l'envoi est
      // réellement configuré. On ne propose pas un envoi qu'on ne sait pas faire.
      recap: Boolean(process.env.N8N_RECAP_WEBHOOK),
      // Le modele reellement utilise, tel que l'API le renvoie — pas celui
      // qu'on a demande. Permet de verifier de l'exterieur qu'aucun autre
      // modele, plus cher, n'a servi la reponse.
      modele: reponse.model,
      situation: couper(brut.situation, 320),
      etapes,
      gratuit: variante(brut.gratuit),
      performance: variante(brut.performance),
      vigilance: couper(brut.vigilance, 420),
      suivis: (Array.isArray(brut.suivis) ? brut.suivis : [])
        .filter((x) => typeof x === 'string' && x.trim())
        .slice(0, 3)
        .map((x) => couper(x, 140)),
      offre,
    });
  } catch (erreur) {
    const code = erreur?.status === 429 ? 429 : 502;
    return res.status(code).json({ erreur: 'conseiller_indisponible' });
  }
}
