/**
 * /api/crm-google : retour de Google quand un membre de l'équipe connecte sa
 * boîte Gmail et son agenda au CRM (bouton « Connecter ma boîte Google »).
 * Le lien part de /api/crm (op google_connexion) avec un état signé qui dit pour
 * qui ; ici, on vérifie l'état et le compte connecté, on garde le jeton chiffré,
 * puis on renvoie vers /crm/. Rien d'autre n'est accessible par cette route.
 */
import { retourGoogle } from './_equipe.js';

const MESSAGES = {
  ok: 'ok',
  etat_invalide: 'lien', lien_expire: 'lien', mauvais_compte: 'compte', portees_manquantes: 'portees',
  pas_de_jeton: 'jeton', utilisateur_inconnu: 'compte', google_refus: 'refus',
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const params = new URL(req.url, 'http://local').searchParams;
  let issue = 'refus';
  if (params.get('error')) issue = 'annule';
  else {
    try {
      await retourGoogle(params.get('code'), params.get('state'));
      issue = 'ok';
    } catch (e) {
      issue = MESSAGES[e && e.code] || 'erreur';
      console.error('crm-google', e && (e.code || e.message));
    }
  }
  res.setHeader('Location', `/crm/?google=${issue}`);
  return res.status(302).end();
}
