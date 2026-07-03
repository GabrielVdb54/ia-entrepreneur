const input = $input.first().json;
const prompt = `Article source à adapter :
Titre : ${input.originalTitle}
Contenu :
${input.content}
---
CHIFFRES OFFICIELS 2026 À UTILISER OBLIGATOIREMENT (ne jamais inventer d'autres chiffres) :

MICRO-ENTREPRISE :
- Plafonds CA 2026 (seuils applicables 2026-2028) : 203 100€ (vente/hébergement) | 83 600€ (services BIC/BNC et libéral)
- Cotisations sociales : 12,3% (vente BIC) | 21,2% (services/artisans BIC) | 21,1% (libéral CIPAV) | 25,6% (libéral régime général BNC)
- Franchise TVA : 85 000€ / 93 500€ (vente) | 37 500€ / 41 250€ (services)
- ACRE : exonération ~50% des cotisations pendant 12 mois
- Versement libératoire IR : 1% (vente) | 1,7% (BIC services) | 2,2% (BNC)

SOCIÉTÉS :
- Taux IS : 15% jusqu'à 42 500€ de bénéfice | 25% au-delà
- Frais greffe : ~37,45€ (immatriculation) + ~21€ (DBE)
- Annonce légale : ~138€ (SAS/SASU) | ~121€ (SARL/EURL)
- Capital social minimum légal : 1€ (recommandé : 1 000€ minimum)

Si tu mentionnes un chiffre absent de cette liste, ajoute : "(à vérifier sur urssaf.fr ou impots.gouv.fr)"

MISSION : Réécris et enrichis cet article pour le blog de IA-Entrepreneur. Ce n'est pas une simple paraphrase — tu produis un article original, plus complet et plus utile que la source.
STRUCTURE OBLIGATOIRE (dans cet ordre) :
1. Accroche (1 paragraphe) : une situation concrète ou un chiffre qui interpelle. Pas de question rhétorique.
2. Introduction (1 paragraphe) : contexte et promesse de l'article.
3. Corps de l'article : minimum 5 sections h2, avec des h3 si besoin. Alterne prose et listes uniquement quand c'est pertinent. Intègre un tableau comparatif si le sujet s'y prête (statuts juridiques, outils, méthodes...).
4. Encart CTA au milieu de l'article : après la 3e section h2, insérer ce bloc HTML exact :
<div style="background:rgba(26,60,255,0.05);border:1px solid rgba(26,60,255,0.15);border-radius:12px;padding:24px;margin:32px 0;text-align:center;"><p style="font-weight:700;font-size:1.05rem;margin-bottom:8px;">Vous voulez intégrer l'IA dans votre activité ou former vos équipes ?</p><p style="color:#525880;font-size:0.9rem;margin-bottom:16px;">Nos formateurs praticiens vous accompagnent de A à Z. Premier échange gratuit, sans engagement.</p><a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" style="display:inline-block;background:#10B981;color:#fff;padding:12px 28px;border-radius:50px;font-weight:700;text-decoration:none;">Réserver un appel gratuit</a></div>
5. FAQ : 3 questions que se posent vraiment les lecteurs sur ce sujet, avec des réponses complètes (pas des réponses en 2 lignes).
6. Conclusion (1 paragraphe) : synthèse + transition naturelle vers les formations IA-Entrepreneur, sans forcer.
RÈGLES CONTENU :
- Minimum 1400 mots dans le champ content (HTML complet).
- Intègre 1 ou 2 exemples inventés mais réalistes avec prénom, secteur, localisation et chiffres concrets.
- Mentionne IA-Entrepreneur 2 à 3 fois de façon naturelle, jamais comme une pub.
- MAILLAGE INTERNE OBLIGATOIRE : intègre 2 à 3 liens internes vers des pages pertinentes du site IA-Entrepreneur. Pages disponibles : /formations-entreprises.html (formations IA en entreprise), /formation-chatgpt-entreprise.html (formation ChatGPT), /formation-microsoft-copilot-entreprise.html (formation Copilot), /formation-ia-automatisation.html (automatisation IA), /formation-prospection-commerciale.html (prospection), /formation-management-leadership.html (management), /blog.html (blog). Choisis uniquement les pages en rapport avec le sujet de l'article. Format : <a href="/formations-entreprises.html">formations IA</a>.
- SEO : le mot-clé principal doit apparaître dans le titre (h1), dans le premier paragraphe et dans au moins un h2. Ne pas le répéter mécaniquement, mais l'intégrer naturellement.
- Les balises HTML autorisées : h2, h3, p, ul, li, ol, strong, a, table, thead, tbody, tr, th, td, et le bloc CTA ci-dessus.
- Pas de balise div sauf pour le CTA fourni.
- Le slug est en kebab-case, sans accents, sans majuscules.
- L'excerpt fait 2-3 phrases complètes. Accrocheur, orienté SEO. Toujours terminer sur une phrase complète, jamais couper une phrase en cours.
- Les tags : 5 à 6 mots-clés SEO pertinents, en français.
- category : l'une de ces valeurs selon le sujet principal : "Intelligence Artificielle" | "Création d'entreprise" | "Développement commercial" | "Management" | "Financement".
- imagePrompt : description EN ANGLAIS d'une photo professionnelle illustrant l'article.
- L'article est rédigé en 2026. Toutes les années mentionnées dans le titre, l'excerpt et le contenu doivent être 2026. Ne jamais écrire "2024" ou "2025".
FORMAT DE RÉPONSE — JSON brut uniquement :
{
  "title": "Titre accrocheur et SEO de l'article",
  "slug": "titre-de-larticle",
  "category": "Intelligence Artificielle",
  "content": "<h2>...</h2><p>...</p>...",
  "excerpt": "2-3 phrases complètes et percutantes.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "imagePrompt": "Professional photo of..."
}`;
return [{ json: { ...input, fullPrompt: prompt } }];
