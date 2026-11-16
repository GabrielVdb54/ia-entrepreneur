/**
 * Relevé de consommation de l'API Claude (16/11/2026, Gabriel : « mesurer d'abord »).
 *
 * Le 12/11, l'alerte à 8 $ du workspace Anthropic du site a sonné. Ce workspace porte la clé de FindIA
 * (Haiku, quelques centimes) et de tout le CRM (Opus), et rien ne disait quelle fonction du CRM
 * dépensait. Chaque appel à Claude du CRM passe désormais par noterConso() : une ligne dans
 * iae_crm_conso (supabase/iae_crm_conso.sql) avec la fonction, le modèle qui a vraiment répondu
 * (un repli peut en changer), les tokens et le coût estimé. La requête de bilan est en bas du schéma.
 *
 * Le relevé ne fait jamais échouer un appel : 3 s au plus, erreurs seulement journalisées. Il écrit
 * avec la clé de service directement, sans passer par sb() : un appel lancé pour un membre de
 * l'équipe doit être compté aussi, et garder() refuserait la table.
 */

// Dollars par million de tokens (tarifs publics d'Anthropic au 16/11/2026). L'écriture en cache coûte
// 1,25 fois l'entrée pour 5 minutes et 2 fois pour une heure. Du plus long au plus court : un nom daté
// (« claude-opus-5-5-… ») doit trouver claude-opus-5-5 avant claude-opus-5.
const PRIX = [
  ['claude-opus-5-5', { entree: 4, sortie: 20, lecture: 0.2 }],
  ['claude-opus-5', { entree: 5, sortie: 25, lecture: 0.5 }],
  ['claude-opus-4-8', { entree: 5, sortie: 25, lecture: 0.5 }],
  ['claude-sonnet-5-5', { entree: 2, sortie: 10, lecture: 0.1 }],
  ['claude-sonnet-5', { entree: 2, sortie: 10, lecture: 0.2 }],
  ['claude-haiku-4-5', { entree: 1, sortie: 5, lecture: 0.1 }],
];

const entier = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x)) : 0);

// Coût d'un usage pour un modèle connu, null sinon (le relevé garde les tokens : on recalcule plus tard).
export function coutEstime(modele, u = {}) {
  const m = String(modele || '');
  const p = (PRIX.find(([k]) => m === k) || PRIX.find(([k]) => m.startsWith(`${k}-`)) || [])[1];
  if (!p) return null;
  const ecriture = entier(u.cache_creation_input_tokens);
  const uneHeure = Math.min(entier(u.cache_creation?.ephemeral_1h_input_tokens), ecriture);
  const dollars = entier(u.input_tokens) * p.entree + entier(u.output_tokens) * p.sortie + entier(u.cache_read_input_tokens) * p.lecture
    + (ecriture - uneHeure) * p.entree * 1.25 + uneHeure * p.entree * 2;
  return Math.round(dollars) / 1e6;
}

// Quand un repli a servi (fallbacks), chaque modèle passé est facturé à son prix : on additionne les
// passages s'ils disent tous leur modèle et leurs tokens, sinon on prend le total au prix du modèle final.
function coutReponse(reponse) {
  const u = reponse.usage || {};
  const passages = Array.isArray(u.iterations) ? u.iterations : [];
  if (passages.length && passages.every((x) => x && x.model) && passages.some((x) => entier(x.input_tokens) + entier(x.output_tokens) > 0)) {
    const couts = passages.map((x) => coutEstime(x.model, x));
    if (couts.every((c) => c !== null)) return Math.round(couts.reduce((s, c) => s + c, 0) * 1e6) / 1e6;
  }
  return coutEstime(reponse.model, u);
}

export async function noterConso(fonction, reponse, { compte = null } = {}) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle || !reponse) return;
  const u = reponse.usage || {};
  const detail = {};
  if (Array.isArray(u.iterations) && u.iterations.length) detail.passages = u.iterations;
  if (reponse.stop_reason && reponse.stop_reason !== 'end_turn') detail.arret = reponse.stop_reason;
  try {
    const r = await fetch(`${url}/rest/v1/iae_crm_conso`, {
      method: 'POST',
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        fonction: String(fonction || 'autre').slice(0, 60),
        modele: reponse.model ? String(reponse.model).slice(0, 80) : null,
        compte: compte ? String(compte).slice(0, 200) : null,
        entree: entier(u.input_tokens),
        sortie: entier(u.output_tokens),
        cache_lecture: entier(u.cache_read_input_tokens),
        cache_ecriture: entier(u.cache_creation_input_tokens),
        cout_usd: coutReponse(reponse),
        detail: Object.keys(detail).length ? detail : null,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) console.error('conso claude', r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error('conso claude', e?.name || e?.message);
  }
}
