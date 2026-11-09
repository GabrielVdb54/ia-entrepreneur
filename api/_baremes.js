/**
 * _baremes.js — les montants que l'email peut annoncer directement.
 *
 * Gabriel, 09/11/2026 : « si possible lui donner directement, en disant,
 * d'après vos infos, voici le budget auquel vous avez droit ; attention,
 * merci de vérifier ». Donc :
 *   · un barème n'entre ici que LU À LA SOURCE, dans le document 2026 de
 *     l'OPCO pour la branche (IDCC) et la taille d'entreprise ; la date de
 *     lecture et la version du document sont notées ;
 *   · `valable_jusquau` coupe l'affichage à la fin de l'année : en 2027,
 *     l'email revient au seul lien tant que le barème n'a pas été relu ;
 *   · sans barème vérifié, l'email donne le lien vers la page de l'OPCO,
 *     comme l'outil de Cathy. Jamais d'estimation.
 *
 * Paliers d'effectif : bornes incluses, en salariés. La tranche Insee
 * « 10 à 19 salariés » chevauche le seuil de 11 : l'email donne alors les
 * deux paliers, sans choisir à la place de l'entreprise.
 *
 * Pour ajouter une branche : la relever dans data/baremes-2026/ (chiffres tels
 * quels, HT seulement si la source l'écrit, citations exactes), puis lancer
 * generer_baremes.py, qui refuse toute entrée non vérifiée.
 */

import { BAREMES_2026 } from './_baremes-2026.js';

// Les barèmes relevés et vérifiés vivent dans data/baremes-2026/ ;
// generer_baremes.py les contrôle (verifier_baremes.py) puis écrit
// _baremes-2026.js. En 2027 : relire les barèmes, data/baremes-2027/, même chaîne.
export const BAREMES = [...BAREMES_2026];

// Tranche d'effectif Insee → bornes en salariés.
const BORNES = {
  NN: [0, 0], '00': [0, 0], '01': [1, 2], '02': [3, 5], '03': [6, 9],
  11: [10, 19], 12: [20, 49], 21: [50, 99], 22: [100, 199], 31: [200, 249], 32: [250, 499],
  41: [500, 999], 42: [1000, 1999], 51: [2000, 4999], 52: [5000, 9999], 53: [10000, 1e9],
};

function aujourdhui() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * Le barème à annoncer pour cet OPCO, cette convention et cette tranche,
 * ou null. `paliers` ne garde que ceux qui recouvrent la tranche.
 * `bornesDeclarees` ([n, n]) remplace la tranche Insee quand le visiteur a
 * donné son nombre de salariés.
 */
export function baremePour(opco, idcc, tranche, bornesDeclarees = null) {
  if (!opco || !idcc) return null;
  const jour = aujourdhui();
  const b = BAREMES.find((x) => x.opco === opco && x.idcc.includes(idcc) && jour <= x.valable_jusquau);
  if (!b) return null;
  const bornes = bornesDeclarees || BORNES[tranche] || null;
  const commun = { branche: b.branche, lien: b.lien, version: b.version, lu_le: b.lu_le };
  // Enveloppe 2026 épuisée (dit par l'OPCO, cité) : on le dit, sans montant.
  if (b.epuise) return bornes && bornes[0] >= 50 ? null : { ...commun, epuise: b.epuise, paliers: [] };
  const paliers = bornes ? b.paliers.filter((p) => p.min <= bornes[1] && p.max >= bornes[0]) : b.paliers;
  if (!paliers.length) return null; // 50 salariés et plus, ou palier non publié : lien seul
  return {
    ...commun,
    paliers: paliers.map((p) => ({ ...p, libelle: p.min === 0 ? `moins de ${p.max + 1} salariés` : `de ${p.min} à ${p.max} salariés` })),
    plusieurs: paliers.length > 1,
    delai: b.delai || null,
  };
}
