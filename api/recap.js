/**
 * /api/recap — « recevoir ce plan par email ».
 *
 * Le visiteur vient d'obtenir une chaîne d'outils de FindIA. Il peut se la
 * faire envoyer par email, et accepter séparément de recevoir nos contenus
 * sur l'IA. Deux finalités distinctes, deux bases légales distinctes :
 *   · le récap lui-même, qu'il a explicitement demandé en cliquant ;
 *   · la prospection commerciale, qui exige un consentement libre et
 *     spécifique (art. 6.1.a RGPD) — une case à cocher jamais pré-cochée.
 *
 * LE POINT IMPORTANT : le client n'envoie AUCUN texte libre. Il envoie des
 * identifiants d'outils et une clé d'offre ; le serveur reconstruit les noms,
 * les prix et les liens depuis le catalogue. Sans cela, n'importe qui pourrait
 * poster un texte arbitraire avec l'adresse email d'un tiers, et se servir du
 * domaine ia-entrepreneur.fr comme d'un relais de spam. C'est la même
 * discipline que dans /api/conseil : rien de ce qui vient de l'extérieur
 * n'est réutilisé tel quel.
 *
 * L'email part par Brevo, déjà déclaré comme routeur dans la politique de
 * confidentialité et hébergé en France. Appel direct plutôt que passage par
 * n8n : envoyer un email et créer un contact tient en deux requêtes, un
 * workflow intermédiaire n'aurait fait qu'ajouter une pièce à entretenir.
 * La séquence de nurturing, elle, se construit dans Brevo — c'est son métier,
 * et elle se modifie sans toucher au code.
 *
 * Sans BREVO_API_KEY, la fonction répond 503 et la page n'affiche jamais le
 * bloc : on ne promet pas un envoi qu'on ne peut pas faire.
 */

import { CATALOGUE, SLUGS } from './_catalogue.js';
import { OFFRES } from './_offres.js';

export const maxDuration = 15;

// Recopié mot pour mot depuis la case à cocher de la page. Si la formulation
// change là-bas, elle doit changer ici : c'est cette phrase qu'on archive
// comme preuve de ce que le visiteur a accepté.
const TEXTE_CONSENTEMENT =
  'Je souhaite recevoir les conseils IA et les offres de formation d’IA-Entrepreneur. ' +
  'Désinscription en un clic dans chaque email.';

const EMAIL_MAX = 254;
// Volontairement permissif : le rôle de cette expression est d'écarter une
// faute de frappe, pas de valider une adresse. Seul un email réellement remis
// prouve qu'une adresse existe.
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

// Plus strict que le conseiller : personne n'a de raison légitime de demander
// dix récaps en dix minutes, et c'est le seul point du site qui déclenche un
// envoi d'email vers une adresse choisie par l'appelant.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 5;
const passages = new Map();

function tropDeDemandes(empreinte) {
  const maintenant = Date.now();
  const recentes = (passages.get(empreinte) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (passages.size > 5000) passages.clear();
  if (recentes.length >= MAX_PAR_FENETRE) {
    passages.set(empreinte, recentes);
    return true;
  }
  recentes.push(maintenant);
  passages.set(empreinte, recentes);
  return false;
}

const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];

// Un navigateur envoie toujours Origin sur une requête POST cross-site. On
// refuse ce qui vient d'ailleurs. Un script hors navigateur peut omettre
// l'en-tête : ce n'est donc pas une protection, seulement une porte fermée
// de plus. Le vrai garde-fou reste la limite ci-dessus.
function origineEtrangere(req) {
  const origine = req.headers.origin;
  if (!origine) return false;
  try {
    const hote = new URL(origine).hostname;
    return !(HOTES_AUTORISES.includes(hote) || hote.endsWith('.vercel.app'));
  } catch {
    return true;
  }
}

// Le journal est en écriture seule (aucune policy SELECT côté Supabase) : la
// clé anon est publique, elle ne doit pas permettre de relire la liste
// d'adresses. Table distincte du journal des questions, qui reste anonyme.
async function enregistrer(donnees) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_ANON_KEY;
  if (!url || !cle) return;
  try {
    await fetch(`${url}/rest/v1/ia_entrepreneur_recaps`, {
      method: 'POST',
      headers: {
        apikey: cle,
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(donnees),
    });
  } catch {
    // Un journal qui tombe ne doit pas priver le visiteur de son récap.
  }
}

// L'adresse doit être un expéditeur vérifié dans Brevo, sinon l'envoi est
// refusé. Une adresse @ia-entrepreneur.fr et non @clindit.com : c'est la marque
// que le destinataire vient de rencontrer.
const EXPEDITEUR = process.env.BREVO_EXPEDITEUR || 'contact@ia-entrepreneur.fr';
const EXPEDITEUR_NOM = process.env.BREVO_EXPEDITEUR_NOM || 'IA-Entrepreneur';
const SITE = 'https://ia-entrepreneur.fr';
// Doit dire la meme chose que LIENS_REMUNERES dans generate_ia_pages.py. Un
// email qui affirme la neutralite alors que le site declare des mises en avant
// payantes serait la contradiction la plus visible qui soit : le destinataire a
// les deux sous les yeux.
const MENTION_LIENS = 'aucun éditeur ne paie pour figurer dans cet annuaire';
// Le jour venu : 'les mises en avant rémunérées y sont signalées'
const CALENDLY = 'https://calendly.com/gabriel-ia-entrepreneur/decouverte';

function echapper(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * L'email est composé ici, à partir du seul catalogue : ni le navigateur ni le
 * modèle n'y injectent quoi que ce soit. Styles en ligne et largeur fixe, parce
 * qu'aucune messagerie ne lit une feuille de style externe.
 */
function composerEmail(outils, offre) {
  const etapes = outils.map((o, i) => `
      <tr>
        <td style="padding:0 0 18px;">
          <div style="font:700 15px/1.4 Helvetica,Arial,sans-serif;color:#0A0F2C;">
            ${i + 1}. <a href="${o.url}" style="color:#1A3CFF;text-decoration:none;">${echapper(o.nom)}</a>
          </div>
          <div style="font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#525880;padding-top:4px;">
            ${echapper(o.usage)} · niveau ${echapper(o.niveau)} · ${echapper(o.prix)}
          </div>
        </td>
      </tr>`).join('');

  const blocOffre = offre ? `
      <tr><td style="padding:22px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0FBF6;border-left:4px solid #10B981;border-radius:10px;">
          <tr><td style="padding:18px 20px;">
            <div style="font:700 15px/1.4 Helvetica,Arial,sans-serif;color:#0A0F2C;">${echapper(offre.titre)}</div>
            <div style="font:400 13px/1.65 Helvetica,Arial,sans-serif;color:#525880;padding:8px 0 14px;">
              Disposer de l’outil ne suffit pas : ce qui change tout, c’est de savoir s’en servir sur vos propres dossiers.
              Organisme certifié Qualiopi, formation finançable par votre OPCO.
            </div>
            <a href="${CALENDLY}" style="display:inline-block;background:#10B981;color:#fff;font:700 13px Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 22px;border-radius:50px;">Appel gratuit de 15 minutes</a>
            <a href="${offre.url}" style="display:inline-block;color:#525880;font:700 13px Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 16px;">Voir le programme</a>
          </td></tr>
        </table>
      </td></tr>` : '';

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F6F7FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FB;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;padding:32px 28px;">
        <tr><td style="font:800 19px/1.35 Helvetica,Arial,sans-serif;color:#0A0F2C;padding-bottom:6px;">
          Votre plan d’outils IA
        </td></tr>
        <tr><td style="font:400 14px/1.65 Helvetica,Arial,sans-serif;color:#525880;padding-bottom:22px;">
          Voici la chaîne que FindIA vous a proposée, dans l’ordre où on l’utilise.
          Chaque nom renvoie à sa fiche : ce qu’il fait gagner, ses limites, son tarif et le pays de l’éditeur.
        </td></tr>
        ${etapes}
        ${blocOffre}
        <tr><td style="padding:24px 0 0;border-top:1px solid #E7E9F2;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8A90AB;">
          Vous recevez cet email parce que vous l’avez demandé sur
          <a href="${SITE}/meilleures-ia.html" style="color:#525880;">l’annuaire des meilleures IA</a>.
          Les tarifs sont indicatifs et vérifiés régulièrement ; ${MENTION_LIENS}.<br><br>
          IA-Entrepreneur — marque de Clindit SASU · Organisme de formation certifié Qualiopi<br>
          <a href="${SITE}/politique-confidentialite.html" style="color:#8A90AB;">Politique de confidentialité</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Une version texte accompagne toujours l'email : sans elle, les filtres
// antispam notent la lettre plus sévèrement, et certains clients n'affichent rien.
function composerTexte(outils, offre) {
  const lignes = outils.map((o, i) => `${i + 1}. ${o.nom} — ${o.usage} · niveau ${o.niveau} · ${o.prix}\n   ${o.url}`);
  return [
    'Votre plan d’outils IA',
    '',
    'Voici la chaîne que FindIA vous a proposée, dans l’ordre où on l’utilise :',
    '',
    ...lignes,
    '',
    ...(offre ? [
      offre.titre,
      'Disposer de l’outil ne suffit pas : ce qui change tout, c’est de savoir s’en servir sur vos propres dossiers.',
      'Organisme certifié Qualiopi, formation finançable par votre OPCO.',
      `Appel gratuit de 15 minutes : ${CALENDLY}`,
      `Programme : ${offre.url}`,
      '',
    ] : []),
    `Vous recevez cet email parce que vous l’avez demandé sur ${SITE}/meilleures-ia.html`,
    'IA-Entrepreneur — marque de Clindit SASU · Organisme de formation certifié Qualiopi',
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (origineEtrangere(req)) {
    return res.status(403).json({ erreur: 'origine_refusee' });
  }
  const cleBrevo = process.env.BREVO_API_KEY;
  if (!cleBrevo) {
    return res.status(503).json({ erreur: 'envoi_indisponible' });
  }

  const corps = req.body || {};

  // Pot de miel : un champ invisible que seul un robot remplit. On répond 200
  // sans rien faire — lui signaler qu'il est repéré l'inviterait à s'adapter.
  if (typeof corps.piege === 'string' && corps.piege.trim()) {
    return res.status(200).json({ ok: true });
  }

  const email = String(corps.email || '').trim().toLowerCase();
  if (email.length < 6 || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return res.status(400).json({ erreur: 'email_invalide' });
  }

  // Booléen strict : « true » en chaîne, 1, ou un objet ne valent pas un
  // consentement. Un consentement se prouve, il ne se déduit pas.
  const consentement = corps.consentement === true;

  const empreinte = (req.headers['x-forwarded-for'] || 'inconnu').split(',')[0].trim();
  if (tropDeDemandes(empreinte)) {
    return res.status(429).json({ erreur: 'trop_de_demandes' });
  }

  // Reconstruction depuis le catalogue : le client n'a fourni que des slugs.
  const outils = (Array.isArray(corps.outils) ? corps.outils : [])
    .filter((sl) => typeof sl === 'string' && SLUGS.has(sl))
    .slice(0, 4)
    .map((sl) => {
      const f = CATALOGUE.find((o) => o.slug === sl);
      return {
        slug: f.slug,
        nom: f.nom,
        usage: f.usage,
        niveau: f.niveau,
        prix: f.prix,
        url: `https://ia-entrepreneur.fr/ia/${f.slug}.html`,
      };
    });
  if (!outils.length) {
    return res.status(400).json({ erreur: 'aucun_outil' });
  }

  const cleOffre = OFFRES[corps.offre] ? corps.offre : null;
  const offre = cleOffre
    ? {
        cle: cleOffre,
        titre: OFFRES[cleOffre].titre,
        url: `https://ia-entrepreneur.fr${OFFRES[cleOffre].url}`,
      }
    : null;

  const charge = {
    email,
    consentement,
    // Art. 7.1 RGPD : pouvoir démontrer le consentement. On transmet et on
    // archive la formulation exacte affichée au moment du clic, pas un
    // simple booléen sorti de son contexte.
    consentement_texte: consentement ? TEXTE_CONSENTEMENT : null,
    consentement_date: consentement ? new Date().toISOString() : null,
    outils,
    offre,
    source: 'findia',
    date: new Date().toISOString(),
  };

  // On attend la réponse de Brevo : afficher « c'est envoyé » alors que l'appel
  // a échoué serait une promesse rompue, et le visiteur attendrait un email
  // qui n'arriverait jamais.
  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), 10000);
  try {
    const reponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': cleBrevo, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        to: [{ email }],
        replyTo: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        subject: `Votre plan d’outils IA : ${outils.map((o) => o.nom).join(' + ')}`,
        htmlContent: composerEmail(outils, offre),
        textContent: composerTexte(outils, offre),
        tags: ['findia-recap'],
      }),
      signal: abandon.signal,
    });
    if (!reponse.ok) throw new Error(`brevo ${reponse.status}`);
  } catch {
    return res.status(502).json({ erreur: 'envoi_impossible' });
  } finally {
    clearTimeout(minuteur);
  }

  // Le contact n'entre dans la liste QUE si la case a été cochée. L'échec de
  // cette étape ne doit pas priver le visiteur de son récap, qui est déjà parti.
  if (consentement && process.env.BREVO_LISTE_ID) {
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'api-key': cleBrevo, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email,
          updateEnabled: true,          // un visiteur qui revient met à jour sa fiche, il ne crée pas de doublon
          listIds: [Number(process.env.BREVO_LISTE_ID)],
          attributes: {
            // De quoi segmenter la séquence : ce que la personne cherchait, et
            // ce qu'on lui a répondu. Ecrire à quelqu'un sans savoir pourquoi
            // il est venu, c'est exactement le mail qu'on jette.
            FINDIA_OUTILS: outils.map((o) => o.nom).join(', '),
            FINDIA_USAGE: outils[0].usage,
            FINDIA_OFFRE: offre ? offre.titre : '',
            FINDIA_DATE: charge.consentement_date,
            OPT_IN: true,
          },
        }),
      });
    } catch {
      // Le récap est parti, c'est l'essentiel. Le journal Supabase garde la
      // trace du consentement, le contact pourra être rattrapé.
    }
  }

  await enregistrer({
    email,
    consentement_prospection: consentement,
    consentement_date: charge.consentement_date,
    consentement_texte: charge.consentement_texte,
    outils: outils.map((o) => o.slug),
    offre: cleOffre,
    source: 'findia',
  });

  return res.status(200).json({ ok: true });
}
