#!/usr/bin/env python3
"""Génère quel-est-mon-opco.html : la page de l'outil « Quel est mon OPCO ? ».

Gabriel, 09/11/2026 : « créer une page pour bien se positionner sur connaître
mon OPCO, connaître mon budget formation… un lead magnet de fou ». Le visiteur
tape son SIRET, voit son OPCO et sa convention, et reçoit par email le barème
de sa branche (outil-opco.js + api/opco.js).

Même gabarit que les pages villes (en-tête, menu généré, pied de page de
formation-claude-entreprise.html) : relancer ce script après un changement de
menu. Les exemples de secteurs par OPCO sont lus dans data/idcc-opco.json
(table de France compétences) : un exemple faux sur une page qui se veut la
référence ferait perdre toute la confiance. Idempotent.
Usage : python3 generer_page_opco.py
"""
import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
sys.path.insert(0, str(RACINE))
import generer_pages_villes as v  # noqa: E402  (gabarit, FAQ, CTA, JSON-LD communs)
from nettoyage_typo import nettoie_html  # noqa: E402

SITE = v.SITE
SLUG = 'quel-est-mon-opco.html'
TABLE = json.loads((RACINE / 'data' / 'idcc-opco.json').read_text())
MAJ = '/'.join(reversed(TABLE['donnee_maj'].split('-')))

# OPCO, nom affiché, et des exemples de branches avec leur IDCC. Chaque IDCC
# est vérifié dans la table à la génération : si France compétences le
# rattache un jour à un autre OPCO, le script s'arrête au lieu de publier faux.
OPCO = [
    ('AKTO', 'AKTO', [('3043', 'propreté'), ('1351', 'prévention et sécurité'), ('1979', 'hôtels, cafés, restaurants'), ('2378', 'travail temporaire')]),
    ('ATLAS', 'Atlas', [('1486', "bureaux d'études et conseil (Syntec)"), ('0787', 'experts-comptables'), ('1672', 'assurances'), ('2120', 'banque')]),
    ('CONSTRUCTYS', 'Constructys', [('1596', 'bâtiment'), ('1702', 'travaux publics')]),
    ('OPCO EP', 'OPCO EP', [('1527', 'immobilier'), ('2596', 'coiffure'), ('0843', 'boulangerie'), ('2332', "cabinets d'architectes"), ('1850', "cabinets d'avocats")]),
    ("L'OPCOMMERCE", "L'Opcommerce", [('2216', 'commerce à prédominance alimentaire'), ('1517', 'commerces de détail non alimentaires')]),
    ('OPCO2I', 'OPCO 2i', [('3248', 'métallurgie')]),
    ('OPCO MOBILITES', 'OPCO Mobilités', [('0016', 'transports routiers'), ('1090', "services de l'automobile")]),
    ('OPCO SANTE', 'OPCO Santé', [('2264', 'hospitalisation privée')]),
    ('UNIFORMATION COHESION SOCIALE', 'Uniformation', [('1518', 'animation'), ('2941', 'aide à domicile')]),
    ('AFDAS', 'Afdas', [('3090', 'spectacle vivant'), ('2511', 'sport'), ('0086', 'publicité')]),
    ('OCAPIAT', 'OCAPIAT', []),
]
for code, _, exemples in OPCO:
    for idcc, lib in exemples:
        trouve = TABLE['idcc'].get(idcc, {}).get('opco')
        assert trouve == code, f'IDCC {idcc} ({lib}) est rattaché à {trouve}, pas à {code} : corriger OPCO'

FLECHE = v.FLECHE

FAQ = [
    ("Comment connaître son OPCO ?",
     "Avec le numéro SIRET de l'entreprise. France compétences publie chaque mois la table qui rattache chaque établissement employeur à son OPCO : c'est elle que lit notre outil, comme le site officiel quel-est-mon-opco.francecompetences.fr. L'OPCO dépend de la convention collective de l'entreprise, indiquée sur les bulletins de paie (code IDCC)."),
    ("Où trouver mon numéro SIRET ?",
     "Sur vos factures, votre extrait Kbis ou l'avis de situation Sirene de l'Insee. Vous pouvez aussi chercher votre entreprise par son nom sur l'<a href=\"https://annuaire-entreprises.data.gouv.fr/\" target=\"_blank\" rel=\"noopener\">Annuaire des entreprises</a>. Le SIREN (9 chiffres) suffit : l'outil lit alors l'établissement siège."),
    ("Quel est le budget formation de mon entreprise ?",
     "Il dépend de votre OPCO, de votre branche et de votre effectif. Chaque OPCO fixe, branche par branche, un plafond de prise en charge revu chaque année : coûts pédagogiques, plafond annuel par entreprise, parfois les salaires pendant la formation. Exemples 2026 : 7 000 € HT par an pour une entreprise de propreté de moins de 50 salariés (AKTO), 2 500 € HT pour une agence immobilière de moins de 11 salariés (OPCO EP). L'outil trouve votre OPCO et votre branche, puis vous envoie votre montant ou la page où l'OPCO le publie."),
    ("Mon entreprise a plus de 50 salariés : l'OPCO peut-il financer ?",
     "Les fonds mutualisés du plan de développement des compétences sont réservés aux entreprises de moins de 50 salariés. Au-delà, la formation se finance sur le budget de l'entreprise, ou par un versement volontaire à l'OPCO, qui en assure alors la gestion."),
    ("Je n'ai pas de salarié : qui finance ma formation ?",
     "Un dirigeant non salarié relève d'un fonds d'assurance formation, et non de l'OPCO : AGEFICE pour le commerce, l'industrie et les services, FIF-PL pour les professions libérales, FAFCEA pour les artisans, VIVEA pour les chefs d'entreprise agricole, FAF-PM pour les médecins. Le vôtre figure sur votre attestation de contribution à la formation professionnelle, dans votre espace Urssaf."),
    ("Mon établissement n'apparaît pas : pourquoi ?",
     "La table de France compétences ne recense que les employeurs qui déclarent des salariés (DSN). Une entreprise sans salarié, ou créée depuis peu, n'y figure pas encore. Laissez-nous votre email : nous vérifions votre OPCO avec vous."),
    ("Quand faut-il déposer la demande de prise en charge ?",
     "Toujours avant le début de la formation, dans l'espace en ligne de votre OPCO. Les délais varient : Constructys demande 15 jours, OPCO Mobilités un mois. La formation doit être dispensée par un organisme certifié Qualiopi."),
    ("La formation IA est-elle finançable par l'OPCO ?",
     "Oui. IA-Entrepreneur est un organisme de formation certifié Qualiopi (certificat n° 883211-2) et nous montons le dossier de financement avec vous auprès de votre OPCO. Vous connaissez votre reste à charge avant de signer."),
    ("D'où viennent les données ?",
     f"De trois sources publiques : le répertoire Sirene de l'Insee (entreprise, effectif), la table SIRET-OPCO de France compétences (données du {MAJ}, mise à jour chaque mois) et le Code du travail numérique (nom de la convention collective). Les barèmes sont ceux que publie chaque OPCO."),
]

TITRE = 'Quel est mon OPCO ? Votre budget formation par SIRET'
DESC = ("Entrez votre SIRET : trouvez votre OPCO, votre convention collective et le barème "
        "de prise en charge pour former vos salariés. Gratuit, données officielles.")


def carte_opco(code, nom, exemples):
    if exemples:
        ex = ', '.join(f'{lib} (IDCC {int(idcc)})' for idcc, lib in exemples)
    else:
        ex = 'agriculture, pêche, industries agroalimentaires'
    return f'          <div class="imm-limite"><h3>{nom}</h3><p>{ex[0].upper() + ex[1:]}.</p></div>'


CORPS = f'''
  <section class="oo-hero">
    <div class="container">
      <p class="oo-sur">Outil gratuit, données officielles</p>
      <h1>Quel est mon OPCO, et quel budget pour former mes salariés ?</h1>
      <p class="lead">Entrez le SIRET de votre entreprise. Nous lisons les registres publics pour trouver votre OPCO et votre convention collective, puis nous vous envoyons le budget formation auquel votre branche donne droit.</p>
      <div class="oo-hero-outil" data-outil-opco data-auto data-titre="" data-sous=""></div>
      <noscript><p>L'outil demande JavaScript. Vous pouvez aussi trouver votre OPCO sur <a href="https://quel-est-mon-opco.francecompetences.fr/">le site de France compétences</a>.</p></noscript>
      <ul class="oo-sources">
        <li>Table SIRET-OPCO de France compétences, données du {MAJ}</li>
        <li>Répertoire Sirene de l'Insee</li>
        <li>Les liens de critères que notre équipe administrative utilise pour chaque dossier</li>
      </ul>
    </div>
  </section>
{v.zones('Comment ça marche', 'Trente secondes, sans inscription. Seul le barème de votre branche arrive par email.', [
    ('1. Votre SIRET', "Le numéro à 14 chiffres de votre établissement, ou le SIREN à 9 chiffres de l'entreprise. Il figure sur vos factures et votre Kbis."),
    ('2. Votre OPCO et votre branche', "L'OPCO retenu par France compétences pour votre établissement, s'il est géré par un autre OPCO, votre convention collective et votre effectif."),
    ('3. Votre budget par email', "Le montant 2026 de votre branche quand nous avons vérifié son barème, sinon le lien direct vers la page où votre OPCO le publie."),
], ident='comment')}
  <section class="imm-programme-section" id="opco">
    <div class="container">
      <h2 class="section-title">Qu'est-ce qu'un OPCO ?</h2>
      <p class="section-sub">Un opérateur de compétences (OPCO) finance la formation des salariés des entreprises de sa branche, avec les contributions que ces entreprises versent. Il y en a onze, et c'est votre convention collective qui décide du vôtre. Quelques exemples lus dans la table de France compétences :</p>
      <div class="imm-limites oo-grille-opco">
{chr(10).join(carte_opco(*o) for o in OPCO)}
      </div>
    </div>
  </section>

  <section class="imm-limites-section" id="budget">
    <div class="container oo-texte">
      <h2 class="section-title">Combien mon OPCO peut-il financer ?</h2>
      <p>Il n'existe pas de montant unique. Chaque OPCO fixe chaque année, branche par branche, ce qu'il prend en charge : un plafond horaire ou journalier pour les coûts de formation, un plafond annuel par entreprise qui dépend de l'effectif, et parfois une participation aux salaires pendant la formation. Un chiffre recopié sur un autre site a toutes les chances d'être périmé.</p>
      <p>Trois règles valent pour les onze OPCO :</p>
      <ul>
        <li><b>Moins de 50 salariés</b> : la formation peut être prise en charge sur les fonds mutualisés du plan de développement des compétences.</li>
        <li><b>50 salariés et plus</b> : la formation se finance sur le budget de l'entreprise, ou par un versement volontaire à l'OPCO.</li>
        <li><b>Dans tous les cas</b> : un organisme de formation certifié Qualiopi, et une demande déposée avant le début de la formation.</li>
      </ul>
      <p>C'est pour cela que l'outil ne donne jamais un chiffre estimé. Quand nous avons lu le barème 2026 de votre branche (bâtiment, travaux publics, propreté, immobilier…), l'email vous donne le montant pour votre taille d'entreprise, avec sa source. Sinon, il vous envoie la page officielle de votre OPCO et la branche à y choisir.</p>
    </div>
  </section>
{v.zones('Dirigeant non salarié : votre fonds de formation', "Votre propre formation ne relève pas de l'OPCO mais d'un fonds d'assurance formation : celui qui figure sur votre attestation de contribution à la formation professionnelle (espace Urssaf, rubrique Documents).", [
    ('AGEFICE', 'Dirigeants non salariés du commerce, de l\'industrie et des services.'),
    ('FIF-PL', 'Professions libérales.'),
    ('FAFCEA', 'Artisans.'),
    ('VIVEA', "Chefs d'entreprise agricole."),
    ('FAF-PM', 'Médecins libéraux.'),
], ident='non-salaries')}
  <section class="imm-programme-section" id="dossier">
    <div class="container oo-texte">
      <h2 class="section-title">Nous montons votre dossier de financement</h2>
      <p>IA-Entrepreneur forme les équipes à l'intelligence artificielle, sur leurs propres dossiers, en trois niveaux : acculturation, IA métier, automatisation. Organisme de formation certifié Qualiopi (certificat n° 883211-2), nous préparons la demande de prise en charge auprès de votre OPCO avec vous, et vous connaissez votre reste à charge avant de signer.</p>
      <div class="imm-voie-actions">
        <a href="/formation-ia-entreprise.html" class="btn-primary">Voir les formations IA pour les équipes {FLECHE}</a>
        <a href="/rendez-vous.html" class="imm-lien">Réserver un appel de 30 min</a>
      </div>
    </div>
  </section>

  <section class="faq-section" id="faq">
    <div class="container">
      <h2 class="section-title">Vos questions sur l'OPCO et le budget formation</h2>
      <div class="faq-list" style="max-width:820px;margin-top:28px">
{v.faq_html(FAQ)}
      </div>
    </div>
  </section>
{v.cta("Votre budget formation, puis votre formation IA", "Trouvez votre OPCO ci-dessus, ou parlons-en directement : nous regardons votre branche et votre effectif, et nous montons le dossier avec vous.", adresse=False)}'''

CSS = """
  /* Page « Quel est mon OPCO ? » (generer_page_opco.py, 09/11/2026) */
  .oo-hero{padding:132px 0 56px;background:#fff;text-align:center}
  .oo-hero h1{font-size:clamp(1.8rem,4.2vw,2.9rem);line-height:1.15;max-width:860px;margin:0 auto 16px;color:var(--text)}
  .oo-hero .lead{max-width:720px;margin:0 auto 28px;font-size:1.08rem;line-height:1.65;color:var(--muted)}
  .oo-sur{display:inline-block;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--primary);margin:0 0 14px}
  .oo-sources{list-style:none;margin:22px auto 0;padding:0;display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;font-size:.84rem;color:var(--muted);max-width:760px}
  .oo-sources li::before{content:"\\2713";color:#10B981;font-weight:700;margin-right:6px}
  .oo-texte{max-width:820px}
  .oo-texte p,.oo-texte li{font-size:1rem;line-height:1.7;color:var(--text)}
  .oo-texte ul{padding-left:20px;margin:0 0 16px}
  .oo-texte li{margin-bottom:8px}
  .oo-grille-opco .imm-limite p{font-size:.92rem}
  @media (max-width:768px){.oo-hero{padding:104px 0 40px}.oo-hero .lead{font-size:1rem}}
"""


def jsonld():
    url = f'{SITE}/{SLUG}'
    fil = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Formations IA", "item": f"{SITE}/formation-ia-entreprise.html"},
        {"@type": "ListItem", "position": 3, "name": "Quel est mon OPCO ?", "item": url}]}
    appli = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Quel est mon OPCO ?",
             "url": url, "applicationCategory": "BusinessApplication", "operatingSystem": "Tous",
             "description": DESC, "inLanguage": "fr-FR", "isAccessibleForFree": True,
             "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
             "provider": {"@type": "Organization", "name": "IA-Entrepreneur", "url": SITE}}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": v.texte(q), "acceptedAnswer": {"@type": "Answer", "text": v.texte(r)}} for q, r in FAQ]}
    return '\n'.join(f'  <script type="application/ld+json">{json.dumps(o, ensure_ascii=False, separators=(",", ":"))}</script>' for o in (fil, appli, faq))


def construire():
    p = {'slug': SLUG, 'titre': TITRE, 'desc': DESC, 'image': 'formation-ia-equipes.jpg', 'faq': FAQ, 'corps': CORPS,
         'nom': '', 'zone': []}
    t = v.page(p)
    # JSON-LD propre à cette page (le gabarit des villes pose un Service local).
    import re
    t = re.sub(r'\n  <script type="application/ld\+json">.*?</script>', '', t, flags=re.S)
    img = f'{SITE}/images/formation-ia-equipes.jpg'
    t = t.replace(f'<meta name="twitter:image" content="{img}"/>', f'<meta name="twitter:image" content="{img}"/>\n' + jsonld(), 1)
    t = t.replace(v.CSS + '</style>', CSS + '</style>', 1)
    if 'src="/outil-opco.js"' not in t:
        t = t.replace('</body>', '<script defer src="/outil-opco.js"></script>\n</body>', 1)
    return nettoie_html(t)


if __name__ == '__main__':
    (RACINE / SLUG).write_text(construire())
    print('écrit', SLUG, len(TITRE), len(DESC))
