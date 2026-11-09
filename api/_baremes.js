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
 * Pour ajouter une branche : lire le barème 2026 de l'OPCO, recopier les
 * chiffres tels quels (HT), noter la source et la date, vérifier que les IDCC
 * sont bien rattachés à cet OPCO dans data/idcc-opco.json.
 */

export const BAREMES = [
  {
    opco: 'CONSTRUCTYS',
    branche: 'Bâtiment',
    idcc: ['1596', '1597', '2420', '2609'],
    lien: 'https://www.constructys.fr/conditions-de-prise-en-charge-2/',
    version: 'barème Bâtiment 2026 de Constructys (septembre 2026)',
    lu_le: '2026-11-09',
    valable_jusquau: '2026-12-31',
    paliers: [
      { min: 0, max: 10, montant: '24 € HT par heure et par stagiaire', detail: "dans la limite de 840 € HT par jour pour un groupe en intra-entreprise, plus une participation aux salaires de 15 € HT par heure et par stagiaire" },
      { min: 11, max: 49, montant: '19 € HT par heure et par stagiaire', detail: 'dans la limite de 665 € HT par jour pour un groupe en intra-entreprise' },
    ],
    delai: 'Demande complète à déposer au moins 15 jours avant le début de la formation.',
  },
  {
    opco: 'CONSTRUCTYS',
    branche: 'Travaux publics',
    idcc: ['1702', '2614', '3212'],
    lien: 'https://www.constructys.fr/conditions-de-prise-en-charge-2/',
    version: 'barème Travaux publics 2026 de Constructys (juillet 2026)',
    lu_le: '2026-11-09',
    valable_jusquau: '2026-12-31',
    paliers: [
      { min: 0, max: 10, montant: '4 000 € HT par an pour les coûts de formation', detail: 'dans la limite de 32 € HT par heure et par stagiaire, plus une participation aux salaires de 15 € HT par heure et par stagiaire' },
      { min: 11, max: 49, montant: '4 000 € HT par an pour les coûts de formation', detail: 'dans la limite de 32 € HT par heure et par stagiaire' },
    ],
    delai: 'Demande complète à déposer au moins 15 jours avant le début de la formation.',
  },
  {
    opco: 'AKTO',
    branche: 'Propreté et services associés',
    idcc: ['3043'],
    lien: 'https://www.akto.fr/regles-de-prise-en-charge-proprete/',
    version: "règles de prise en charge 2026 de la branche Propreté d'AKTO (mises à jour le 02/11/2026)",
    lu_le: '2026-11-09',
    valable_jusquau: '2026-12-31',
    paliers: [
      { min: 0, max: 49, montant: '7 000 € HT par an pour les coûts de formation', detail: "en intra-entreprise, jusqu'à 2 800 € HT par jour pour un groupe de 5 à 12 salariés" },
    ],
    delai: 'AKTO demande que les dossiers 2026 soient déposés complets au plus tard le 20 novembre 2026.',
    delai_jusquau: '2026-11-20',
  },
  {
    opco: 'OPCO EP',
    branche: 'Immobilier',
    idcc: ['1527'],
    lien: 'https://www.opcoep.fr/criteres-de-financement?branche=187',
    version: "critères 2026 de la branche Immobilier d'OPCO EP (mis à jour le 05/10/2026)",
    lu_le: '2026-11-09',
    valable_jusquau: '2026-12-31',
    paliers: [
      { min: 0, max: 10, montant: '2 500 € HT de financement en 2026', detail: "les formations à la transformation numérique, IA comprise, sont prises en charge jusqu'à 30 € HT par heure et par stagiaire" },
      { min: 11, max: 49, montant: '4 500 € HT de financement en 2026', detail: "les formations à la transformation numérique, IA comprise, sont prises en charge jusqu'à 30 € HT par heure et par stagiaire" },
    ],
  },
];

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
 */
export function baremePour(opco, idcc, tranche) {
  if (!opco || !idcc) return null;
  const jour = aujourdhui();
  const b = BAREMES.find((x) => x.opco === opco && x.idcc.includes(idcc) && jour <= x.valable_jusquau);
  if (!b) return null;
  const bornes = BORNES[tranche] || null;
  const paliers = bornes ? b.paliers.filter((p) => p.min <= bornes[1] && p.max >= bornes[0]) : b.paliers;
  if (!paliers.length) return null; // 50 salariés et plus : pas de fonds mutualisés
  return {
    branche: b.branche,
    lien: b.lien,
    version: b.version,
    paliers: paliers.map((p) => ({ ...p, libelle: p.min === 0 ? `moins de ${p.max + 1} salariés` : `de ${p.min} à ${p.max} salariés` })),
    plusieurs: paliers.length > 1,
    delai: b.delai && (!b.delai_jusquau || jour <= b.delai_jusquau) ? b.delai : null,
  };
}
