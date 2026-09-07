/**
 * Offres IA-Entrepreneur que le conseiller a le droit de proposer.
 *
 * Liste fermée : le modèle choisit une clé, jamais une URL. Toute clé inconnue
 * est ignorée côté serveur, ce qui rend impossible l'invention d'une page.
 */
export const OFFRES = {
  'formation-sur-mesure': {
    url: '/formations-entreprises.html',
    titre: 'Formation IA sur mesure pour vos équipes',
    pour: "former une équipe sur ses propres outils et ses propres cas métier",
  },
  'coaching-dirigeant': {
    url: '/coaching-ia-dirigeant.html',
    titre: 'Coaching IA individuel pour dirigeant',
    pour: "un dirigeant seul qui veut avancer vite sans passer par une formation collective",
  },
  'audit-diagnostic': {
    url: '/audit-diagnostic-ia-entreprise.html',
    titre: "Audit et diagnostic IA de l'entreprise",
    pour: "ne pas savoir par où commencer, ou vouloir cadrer avant d'investir",
  },
  'integration-cle-en-main': {
    url: '/integrations-ia.html',
    titre: 'Intégration IA clé en main',
    pour: "vouloir le résultat sans que personne en interne ait à s'en occuper",
  },
  'formation-chatgpt': {
    url: '/formation-chatgpt-entreprise.html',
    titre: 'Formation ChatGPT en entreprise',
    pour: "tirer réellement parti d'un assistant généraliste au quotidien",
  },
  'formation-automatisation': {
    url: '/formation-ia-automatisation.html',
    titre: 'Formation IA et automatisation',
    pour: "construire soi-même ses automatisations plutôt que les sous-traiter",
  },
  'formation-copilot': {
    url: '/formation-microsoft-copilot-entreprise.html',
    titre: 'Formation Microsoft Copilot',
    pour: "une entreprise déjà équipée de Microsoft 365",
  },
  'formation-prospection': {
    url: '/formation-prospection-commerciale.html',
    titre: 'Formation prospection commerciale et IA',
    pour: "une équipe commerciale qui veut plus de rendez-vous qualifiés",
  },
  'formation-vente': {
    url: '/formation-techniques-vente-closing.html',
    titre: 'Formation techniques de vente et closing',
    pour: "transformer davantage de rendez-vous en signatures",
  },
  'formation-ai-act': {
    url: '/formation-ia-obligatoire-ai-act.html',
    titre: "Formation IA obligatoire — article 4 de l'AI Act",
    pour: "se mettre en conformité et obtenir une attestation opposable",
  },
};

export const CLES_OFFRES = Object.keys(OFFRES);
