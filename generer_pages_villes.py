#!/usr/bin/env python3
"""Génère formation-ia-nancy.html, formation-ia-metz.html et formation-ia-strasbourg.html.

Gabarit : formation-claude-entreprise.html (en-tête, menu généré, pied de page,
scripts). Seuls les métadonnées, le JSON-LD et le corps changent. Idempotent.
Usage : python3 generer_pages_villes.py (depuis la racine du dépôt)
"""
import html, json, re, sys
from pathlib import Path

RACINE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
GABARIT = (RACINE / 'formation-claude-entreprise.html').read_text()
SITE = 'https://ia-entrepreneur.fr'
FLECHE = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
CHEVRON = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
ADRESSE = {"@type": "PostalAddress", "streetAddress": "5 Rue Jacques Villermaux", "addressLocality": "Nancy",
           "postalCode": "54000", "addressRegion": "Grand Est", "addressCountry": "FR"}
TEL = '<a class="tel-reveal" role="button" tabindex="0" data-tel="MzUgODIgMzEgNzUgNzA=" aria-label="Afficher le numéro de téléphone"><span class="tel-value">Afficher le numéro</span></a>'
# Numéro en clair pour Google (fiche d'identité LocalBusiness), recalculé depuis la version codée
# de TEL : le script est public, il ne doit pas contenir le numéro lisible (Gabriel, 09/11/2026).
import base64 as _b64
TEL_SCHEMA = '+33 ' + _b64.b64decode(re.search(r'data-tel="([^"]+)"', TEL).group(1)).decode()[::-1][1:]

CSS = """
  /* Pages villes (formation-ia-nancy, -metz, -strasbourg), 09/11/2026 */
  .imm-limite a,.ville-lien{color:var(--primary);font-weight:700;text-decoration:underline;text-underline-offset:2px}
  .ville-avis{margin:26px 0 0;padding:20px 22px;border-radius:16px;background:#fff;border:1px solid rgba(10,15,44,.09)}
  .ville-avis p{margin:0;font-size:1rem;line-height:1.7;color:var(--text)}
  .ville-avis .ville-etoiles{color:#F5A623;letter-spacing:2px;margin-bottom:8px}
  .ville-avis .ville-auteur{margin-top:10px;font-size:.88rem;color:var(--muted)}
  .ville-refs{margin-top:16px;font-size:.92rem;color:var(--muted);line-height:1.7}
  .ville-coord{font-style:normal}
  .cta-final .ville-adresse{margin-top:18px;font-size:.9rem;opacity:.85}
"""

def faq_html(faq):
    lignes = []
    for q, r in faq:
        lignes.append(f'        <details><summary>{q}{CHEVRON}</summary><div class="faq-answer">{r}</div></details>')
    return '\n'.join(lignes)

def texte(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))

def marches(sous_titre):
    return f'''
  <section class="imm-niveaux-outil">
    <div class="container imm-niveaux-outil-grille">
      <div>
        {sous_titre}
        <p class="section-sub">On choisit avec vous le niveau de départ de chaque groupe. Les prix sont indicatifs, par jour et pour un groupe de 12 personnes au plus ; le prix ferme figure dans la proposition. Nous montons le dossier OPCO : la prise en charge dépend de votre branche et de votre effectif, les fonds mutualisés étant réservés aux entreprises de moins de 50 salariés. Vous connaissez votre reste à charge avant de signer.</p>
        <a href="/quel-est-mon-opco.html" class="imm-lien">Trouver mon OPCO et mon budget</a>
      </div>
      <ol class="imm-marches">
            <li><a href="/formation-ia-entreprise.html#niveau-1"><span class="n">1</span><span class="t"><b>Acculturation IA</b>Comprendre les IA, savoir laquelle utiliser pour quoi, éviter les erreurs</span><span class="d">1 à 2 jours<em>1 200 € HT / jour</em></span></a></li>
            <li><a href="/formation-ia-entreprise.html#niveau-2"><span class="n">2</span><span class="t"><b>IA métier</b>L'IA dans vos process et vos logiciels internes</span><span class="d">2 à 3 jours<em>1 500 € HT / jour</em></span></a></li>
            <li><a href="/formation-ia-entreprise.html#niveau-3"><span class="n">3</span><span class="t"><b>Automatisation et intégration</b>Automatiser et intégrer soi-même des solutions IA liées à son métier</span><span class="d">3 à 4 jours<em>2 000 € HT / jour</em></span></a></li>
      </ol>
    </div>
  </section>
'''

def formateur(lien, img, nom, role, pos=''):
    style = f' style="object-position:{pos}"' if pos else ''
    return (f'<a class="imm-formateur" href="{lien}"><img src="/images/{img}" alt="{nom}" loading="lazy" width="128" height="128"{style}>'
            f'<span><b>{nom}</b>{role}</span></a>')

GABRIEL = formateur('/apropos.html', 'gabriel-vanderbecken.jpg', 'Gabriel Vanderbecken', 'Fondateur, formateur IA, Nancy', 'top center')
RYAD = formateur('/formateur-ryad-mimeche.html', 'ryad-mimeche.jpg', 'Ryad Mimeche', 'Vente, négociation et IA, Nancy')
CELINE = formateur('/formateur-celine-herment.html', 'celine-herment.jpg', 'Céline Herment', 'SEO et IA, Moselle et Meurthe-et-Moselle')
GILLES = formateur('/formateur-gilles-idoux.html', 'gilles-idoux.jpg', 'Gilles Idoux', 'IA générative, vente et management, Grand Est')

def hero(h1, mots, lead, faits, photo, legende):
    premier = mots.split('|')[0]
    faits_html = ''.join(f'<li>{f}</li>' for f in faits)
    return f'''
  <section class="imm-outil-hero">
    <div class="container imm-outil-hero-grille">
      <div class="imm-outil-hero-texte">
        <h1>{h1}</h1>
        <p class="imm-pour">Pour vos <span class="imm-rotatif" data-mots="{mots}">{premier}</span></p>
        <p class="lead">{lead}</p>
        <div class="imm-voie-actions" style="margin-top:0">
          <a href="/formation-ia-entreprise.html#devis" class="btn-primary">Construire mon programme {FLECHE}</a>
          <a href="/rendez-vous.html" class="imm-lien">Réserver un appel de 30 min</a>
        </div>
        <ul class="imm-outil-faits">{faits_html}</ul>
      </div>
      <figure class="imm-outil-photo"><img src="/images/{photo}" alt="{legende}" fetchpriority="high"><figcaption>{legende}</figcaption></figure>
    </div>
  </section>
'''

def zones(titre, sous, cartes, ident='zones'):
    c = '\n'.join(f'          <div class="imm-limite"><h3>{h}</h3><p>{p}</p></div>' for h, p in cartes)
    return f'''
  <section class="imm-limites-section" id="{ident}">
    <div class="container">
      <h2 class="section-title">{titre}</h2>
      <p class="section-sub">{sous}</p>
      <div class="imm-limites">
{c}
      </div>
    </div>
  </section>
'''

def modules(titre, sous, items, ident='programme'):
    c = '\n'.join(f'          <div class="imm-module"><h3>{h}</h3><p>{p}</p></div>' for h, p in items)
    return f'''
  <section class="imm-programme-section" id="{ident}">
    <div class="container">
      <h2 class="section-title">{titre}</h2>
      <p class="section-sub">{sous}</p>
      <div class="imm-modules">
{c}
      </div>
    </div>
  </section>
'''

def equipe(titre, sous, formateurs, photo, legende, apres=''):
    return f'''
  <section class="imm-outil-equipe">
    <div class="container imm-outil-equipe-grille">
      <figure class="imm-outil-photo"><img src="/images/{photo}" alt="{legende}" loading="lazy"><figcaption>{legende}</figcaption></figure>
      <div>
        <h2 class="section-title">{titre}</h2>
        <p class="section-sub">{sous}</p>
        <div class="imm-outil-formateurs">
          {''.join(formateurs)}
        </div>
        <p style="margin-top:18px"><a class="imm-lien" href="/nos-formateurs.html">Voir les treize formateurs</a></p>
{apres}
      </div>
    </div>
  </section>
'''

def faq_section(faq, ville):
    # L'outil « Quel est mon OPCO ? » (outil-opco.js, chargé par le gabarit)
    # juste avant la FAQ, comme sur les pages de formation.
    return f'''
  <!-- outil-opco -->
  <section style="padding:56px 0 8px;" id="budget-formation">
    <div class="container">
      <div data-outil-opco></div>
    </div>
  </section>

  <section class="faq-section" id="faq">
    <div class="container">
      <h2 class="section-title">Vos questions sur la formation IA à {ville}</h2>
      <div class="faq-list" style="max-width:820px;margin-top:28px">
{faq_html(faq)}
      </div>
    </div>
  </section>
'''

def cta(titre, texte_cta, adresse=True):
    adr = ('\n      <p class="ville-adresse">IA-Entrepreneur, 5 rue Jacques Villermaux, 54000 Nancy</p>' if adresse else '')
    return f'''
  <section class="cta-final">
    <div class="container">
      <h2>{titre}</h2>
      <p>{texte_cta}</p>
      <div class="imm-voie-actions" style="justify-content:center">
        <a href="/rendez-vous.html" class="btn-primary">Réserver un appel de 30 min {FLECHE}</a>
        <a href="/formation-ia-entreprise.html#devis" class="imm-lien">Demander un devis</a>
      </div>{adr}
    </div>
  </section>
'''

AVIS = '''        <div class="ville-avis">
          <p class="ville-etoiles" aria-label="5 étoiles sur 5">★★★★★</p>
          <p>« Cours très intéressants, nous avons apprécié l'approche de Gabriel, beaucoup de cas concrets, des exemples issus de son expérience. La formation IA a vraiment changé notre façon de travailler au quotidien. Je recommande vivement ! »</p>
          <p class="ville-auteur">Morgane Daniel, responsable formation, ECM Nancy. Avis publié sur notre <a class="ville-lien" href="https://share.google/XjMAhiBRWUFXTqKRt" target="_blank" rel="noopener">fiche Google</a> (5/5 sur 14 avis).</p>
        </div>'''

FAQ_OPCO = ("La formation est-elle finançable par l'OPCO ?",
            "Oui. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) et nous montons le dossier de financement avec vous. Les fonds mutualisés des OPCO sont réservés aux entreprises de moins de 50 salariés ; au-delà, la formation passe par votre budget de formation. Vous connaissez votre reste à charge avant de signer.")

def prix_faq(ville):
    return (f"Combien coûte une formation IA à {ville} ?",
            "Nos prix sont indicatifs : 1 200 € HT par jour pour le niveau 1, 1 500 € HT pour le niveau 2 et 2 000 € HT pour le niveau 3, pour un groupe de 12 personnes au plus. Le prix ferme figure dans la proposition, et vous connaissez votre reste à charge avant de signer.")

PAGES = {}

# ───────────────────────────── NANCY ─────────────────────────────
PAGES['nancy'] = dict(
    slug='formation-ia-nancy.html', nom='Nancy',
    titre='Formation IA à Nancy | Organisme Qualiopi | IA-Entrepreneur',
    desc="Formation IA à Nancy pour vos équipes, dans vos locaux : organisme certifié Qualiopi installé à Nancy, 3 niveaux sur mesure, dossier OPCO monté.",
    image='formation-2.jpg',
    zone=[{"@type": "City", "name": "Nancy"}, {"@type": "AdministrativeArea", "name": "Métropole du Grand Nancy"}, {"@type": "AdministrativeArea", "name": "Meurthe-et-Moselle"}],
    faq=[
        ("Où se déroule la formation IA à Nancy ?",
         "Dans vos locaux, à Nancy ou dans la métropole, par groupes de 12 personnes au plus. Il suffit d'une salle avec un écran et une connexion internet ; chaque participant travaille sur son propre poste. Si vous n'avez pas de salle, parlons-en lors du premier appel."),
        prix_faq('Nancy'),
        FAQ_OPCO,
        ("Venez-vous aussi à Metz et à Strasbourg ?",
         'Oui, en présentiel, dans vos locaux. Voir nos pages <a class="ville-lien" href="/formation-ia-metz.html">formation IA à Metz</a> et <a class="ville-lien" href="/formation-ia-strasbourg.html">formation IA à Strasbourg</a>.'),
        ("Et si notre entreprise est ailleurs en France ?",
         "La formation se fait à distance, en classe virtuelle avec le formateur, ou en présentiel avec un formateur de l'équipe installé dans votre région."),
        ("Sur quels outils d'IA formez-vous ?",
         "Sur ceux que vos équipes utilisent déjà : ChatGPT, Claude, Microsoft Copilot, Gemini ou Mistral. Si rien n'est encore en place, on vous aide à choisir avant d'acheter."),
        ("Formez-vous aussi les indépendants à Nancy ?",
         'Les sessions ouvertes aux indépendants et aux freelances sont en préparation. Inscrivez-vous sur la <a class="ville-lien" href="/formation-ia-independant.html">liste d\'attente</a> : un groupe ouvre dès 3 inscrits.'),
    ],
)
PAGES['nancy']['corps'] = (
    hero('Formation IA à Nancy',
         'équipes commerciales|services RH|services comptables|dirigeants|managers',
         "IA-Entrepreneur est un organisme de formation certifié Qualiopi installé à Nancy. Nos formateurs viennent dans vos locaux et apprennent à vos équipes à se servir de l'IA sur leurs propres tâches : un compte rendu, une réponse client, un tableau de suivi.",
         ['Installé à Nancy', 'Organisme certifié Qualiopi', 'Dossier OPCO monté'],
         'formation-2.jpg', 'Gabriel Vanderbecken en formation')
    + zones('Où se passe votre formation IA',
            "Nous formons vos équipes dans vos locaux, par groupes de 12 personnes au plus, de 1 à 4 jours selon le niveau.",
            [("À Nancy et dans la métropole",
              "Nos formateurs sont à Nancy. Ils viennent chez vous à Vandœuvre-lès-Nancy, Villers-lès-Nancy, Laxou, Maxéville, Essey-lès-Nancy ou Ludres, comme dans le reste de la Meurthe-et-Moselle, de Pont-à-Mousson à Toul et Lunéville."),
             ("À Metz et à Strasbourg",
              'Nous venons aussi en présentiel dans vos locaux à <a href="/formation-ia-metz.html">Metz</a> et en Moselle, et à <a href="/formation-ia-strasbourg.html">Strasbourg</a>.'),
             ("Ailleurs en Lorraine et en France",
              "À Épinal, Bar-le-Duc ou Verdun, comme partout en France, la formation se fait à distance en classe virtuelle, ou en présentiel avec un formateur de l'équipe installé dans votre région.")])
    + equipe('Une équipe de formateurs en Lorraine',
             "Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy. Il enseigne à l'ECM Nancy Business School depuis 2023, sur six modules de Master, et forme des équipes en entreprise dans tout le Grand Est.",
             [GABRIEL, RYAD, CELINE, GILLES], 'formation-1.jpg', 'Gabriel Vanderbecken en session',
             AVIS + '\n        <p class="ville-refs">Une formation déployée pour GRDF Est, des interventions régulières à l\'ECM Nancy. Grand Nancy Innovation, Bpifrance et l\'Apec font aussi partie des structures qui nous font confiance.</p>\n        <p class="ville-refs">IA-Entrepreneur porte lui-même sa certification Qualiopi (n° 883211-2, valable jusqu\'au 23 avril 2029) : le dossier OPCO se monte à notre nom, sans organisme intermédiaire.</p>')
    + modules("Ce que ça donne dans une entreprise lorraine",
              "Quelques tâches qui reviennent selon les secteurs. En formation, on part des vôtres.",
              [("BTP", "Un compte rendu de chantier dicté sur place puis remis en forme, une réponse à un appel d'offres préparée à partir de vos références, un devis relu avant l'envoi."),
               ("Industrie", "Une procédure mise à jour, un rapport qualité résumé pour la direction, une fiche technique traduite pour un client allemand ou luxembourgeois."),
               ("Propreté, maintenance et services", "Un planning d'équipe construit à partir des contraintes de chaque site, une réponse à une réclamation client, une offre d'emploi."),
               ("Commerce et artisanat", "Une réponse à un avis Google, une publication pour les réseaux sociaux, un email client rédigé à partir de quelques notes.")],
              ident='secteurs')
    + modules("Ce que vos équipes apprennent",
              "Les modules s'ajustent au niveau de chaque groupe et à votre secteur. Chaque atelier part des fichiers et des tâches réelles des participants.",
              [("Choisir le bon outil", "ChatGPT, Claude, Copilot, Gemini ou Mistral : lequel pour quelle tâche. On part de l'abonnement que vous avez déjà."),
               ("Des consignes qui marchent", "Rôle, contexte, exemples, format attendu. Chacun repart avec les consignes de son poste, testées sur ses documents."),
               ("L'IA dans vos logiciels", "Microsoft 365, Google Workspace, votre CRM : faire travailler l'IA là où sont déjà vos fichiers."),
               ("Vérifier ce que l'IA produit", "Repérer une réponse inventée, contrôler une source, savoir ce qu'on ne lui confie pas."),
               ("Données, RGPD et AI Act", "Ce qui n'entre jamais dans un outil d'IA et les règles d'usage de l'entreprise. Chaque participant reçoit une attestation individuelle de formation."),
               ("Automatiser une tâche", "Au niveau 3 : construire avec n8n ou Make une automatisation utile à votre service.")])
    + marches('<h2 class="section-title">Trois niveaux, du premier pas à l\'automatisation</h2>')
    + f'''
  <section class="imm-limites-section" id="coordonnees">
    <div class="container">
      <h2 class="section-title">IA-Entrepreneur à Nancy</h2>
      <div class="imm-limites">
          <div class="imm-limite"><h3>Adresse</h3><p>IA-Entrepreneur<br>5 rue Jacques Villermaux<br>54000 Nancy</p></div>
          <div class="imm-limite"><h3>Nous joindre</h3><p><a href="mailto:contact@ia-entrepreneur.fr">contact@ia-entrepreneur.fr</a><br>{TEL}<br><a href="/rendez-vous.html">Réserver un appel de 30 min</a></p></div>
          <div class="imm-limite"><h3>Horaires</h3><p>Du lundi au vendredi, de 9 h à 12 h 30 et de 13 h 30 à 18 h.<br><a href="https://share.google/XjMAhiBRWUFXTqKRt" target="_blank" rel="noopener">Voir notre fiche Google</a></p></div>
      </div>
    </div>
  </section>
'''
    + faq_section(PAGES['nancy']['faq'], PAGES['nancy']['nom'])
    + cta('Parlons de votre formation à Nancy',
          "Un appel de 30 minutes pour voir ce que vos équipes font aujourd'hui avec l'IA et ce qu'elles devraient savoir faire. Nous montons ensuite le dossier de financement.",
          adresse=False)
)

# ───────────────────────────── METZ ─────────────────────────────
PAGES['metz'] = dict(
    slug='formation-ia-metz.html', nom='Metz',
    titre='Formation IA à Metz | Organisme Qualiopi | IA-Entrepreneur',
    desc="Formation IA à Metz et en Moselle, dans vos locaux : organisme certifié Qualiopi installé à Nancy, 3 niveaux sur mesure, dossier OPCO monté.",
    image='accompagnement-gabriel.jpg',
    zone=[{"@type": "City", "name": "Metz"}, {"@type": "AdministrativeArea", "name": "Metz Métropole"}, {"@type": "AdministrativeArea", "name": "Moselle"}],
    faq=[
        ("Venez-vous former nos équipes à Metz ?",
         "Oui, dans vos locaux, par groupes de 12 personnes au plus. Nous sommes installés à Nancy, à moins d'une heure de Metz par l'A31."),
        prix_faq('Metz'),
        ("Quel OPCO finance la formation de nos salariés ?",
         'Votre OPCO dépend de la convention collective de votre entreprise, pas de votre ville. Notre <a class="ville-lien" href="/quel-est-mon-opco.html">outil « Quel est mon OPCO ? »</a> le retrouve à partir de votre SIRET. Les fonds mutualisés sont réservés aux entreprises de moins de 50 salariés, et nous montons le dossier avec vous.'),
        ("Peut-on réunir des salariés de Metz et de Nancy ?",
         "Oui : soit une session dans chaque site, soit une classe virtuelle qui réunit tout le monde. On en décide ensemble lors du premier appel, selon le nombre de participants."),
        ("Et pour Thionville, Forbach ou Sarreguemines ?",
         "La formation se fait en présentiel avec un formateur de l'équipe qui travaille déjà en Moselle, ou à distance en classe virtuelle."),
        ("Quel délai pour démarrer ?",
         "Comptez 2 à 4 semaines entre la demande et le premier jour de formation, dont 15 jours minimum d'instruction si vous passez par votre OPCO."),
    ],
)
PAGES['metz']['corps'] = (
    hero('Formation IA à Metz',
         'équipes commerciales|services administratifs|managers|dirigeants|services RH',
         "Installé à Nancy, IA-Entrepreneur forme aussi les équipes des entreprises de Metz et de Moselle, dans leurs locaux. Organisme certifié Qualiopi, nous montons votre dossier de financement auprès de votre OPCO.",
         ['Présentiel dans vos locaux à Metz', 'Organisme certifié Qualiopi', 'Dossier OPCO monté'],
         'accompagnement-gabriel.jpg', 'Gabriel Vanderbecken avec un participant')
    + zones('Où nous intervenons en Moselle',
            "Une formation se déroule dans vos locaux, par groupes de 12 personnes au plus, de 1 à 4 jours selon le niveau.",
            [("À Metz et dans Metz Métropole",
              "Dans vos locaux à Metz, Montigny-lès-Metz, Woippy, Marly ou Moulins-lès-Metz. Metz est à moins d'une heure de Nancy par l'A31 : nos formateurs y viennent pour la journée."),
             ("Thionville et le reste de la Moselle",
              "À Thionville, Forbach, Sarreguemines ou Sarrebourg, la formation se fait en présentiel avec un formateur de l'équipe qui travaille déjà en Moselle, ou à distance en classe virtuelle."),
             ("Des équipes sur plusieurs sites",
              'Un siège à Metz, une agence à Nancy ? Une session par site, ou une classe virtuelle qui les réunit. Voir aussi notre page <a href="/formation-ia-nancy.html">formation IA à Nancy</a>.')])
    + equipe('Des formateurs qui travaillent en Lorraine',
             "Céline Herment travaille entre la Moselle et la Meurthe-et-Moselle. Gilles Idoux forme notamment à l'IUT de Thionville-Yutz et à l'ECM Nancy. Gabriel Vanderbecken et Ryad Mimeche sont basés à Nancy.",
             [CELINE, GILLES, GABRIEL, RYAD], 'formation-2.jpg', 'Gabriel Vanderbecken en formation')
    + modules("Comment se passe une formation dans vos locaux",
              "De la première prise de contact à l'attestation remise à chaque participant.",
              [("Un appel de 30 minutes", "Ce que vos équipes font aujourd'hui avec l'IA, les outils en place, ce que vous attendez de la formation."),
               ("Un programme sur mesure", "Construit sur vos logiciels et vos cas réels, et validé avec vous avant la signature."),
               ("Le dossier OPCO", "Nous le montons avec vous. L'OPCO l'instruit en 15 jours minimum : on en tient compte pour fixer les dates."),
               ("Les journées chez vous", "Groupes de 12 personnes au plus, chacun sur son poste, et l'essentiel du temps passé à pratiquer sur ses propres documents."),
               ("L'attestation et le registre", "Chaque participant reçoit une attestation individuelle de formation (AI Act, RGPD, gouvernance, données sensibles) ; l'entreprise reçoit un registre de conformité AI Act."),
               ("Les outils que vous avez", "ChatGPT, Claude, Microsoft Copilot, Gemini ou Mistral : on forme sur ceux que vos équipes utilisent déjà.")],
              ident='deroulement')
    + zones('Une journée de formation, concrètement',
            "Une journée compte 7 heures, avec l'essentiel du temps passé à pratiquer.",
            [("Le matin", "Prise en main de l'outil de l'entreprise et des consignes qui marchent, sur les documents que chacun a apportés."),
             ("L'après-midi", "Les tâches réelles de chaque poste, puis les règles de données : ce qui peut entrer dans l'outil et ce qui ne doit jamais y entrer."),
             ("En fin de journée", "Une évaluation des acquis. Chacun repart avec les consignes de son poste et un premier usage déjà en place.")], ident='journee')
    + marches('<h2 class="section-title">Trois niveaux, selon où en sont vos équipes</h2>')
    + faq_section(PAGES['metz']['faq'], PAGES['metz']['nom'])
    + cta('Parlons de votre formation à Metz',
          "Un appel de 30 minutes pour cadrer le besoin de vos équipes messines. Nous montons ensuite le programme et le dossier de financement.")
)

# ─────────────────────────── STRASBOURG ───────────────────────────
PAGES['strasbourg'] = dict(
    slug='formation-ia-strasbourg.html', nom='Strasbourg',
    titre='Formation IA à Strasbourg | Qualiopi | IA-Entrepreneur',
    desc="Formation IA à Strasbourg, dans vos locaux : organisme certifié Qualiopi, 3 niveaux sur mesure, attestation AI Act et RGPD, dossier OPCO monté.",
    image='formation-1.jpg',
    zone=[{"@type": "City", "name": "Strasbourg"}, {"@type": "AdministrativeArea", "name": "Eurométropole de Strasbourg"}, {"@type": "AdministrativeArea", "name": "Bas-Rhin"}],
    faq=[
        ("Venez-vous former nos équipes à Strasbourg ?",
         "Oui, dans vos locaux à Strasbourg et dans l'Eurométropole, par groupes de 12 personnes au plus. Nos formateurs partent de Nancy, où IA-Entrepreneur est installé."),
        prix_faq('Strasbourg'),
        ("La formation aide-t-elle à répondre à l'AI Act ?",
         "Oui. L'article 4 demande aux entreprises qui utilisent l'IA de prendre des mesures pour développer la maîtrise de l'IA de leur personnel ; c'est une obligation de moyens. Chaque participant reçoit une attestation individuelle de formation et l'entreprise un registre de conformité AI Act."),
        ("Formez-vous aussi à Colmar ou à Mulhouse ?",
         "Oui : à distance en classe virtuelle, ou en présentiel avec un formateur de l'équipe installé dans votre région."),
        FAQ_OPCO,
        ("Les journées doivent-elles se suivre ?",
         "Non. Les niveaux 2 et 3 durent plusieurs jours, que l'on cale sur votre planning. Vos équipes appliquent entre deux journées et reviennent avec leurs questions."),
    ],
)
PAGES['strasbourg']['corps'] = (
    hero('Formation IA à Strasbourg',
         'équipes commerciales|services juridiques|services RH|dirigeants|managers',
         "IA-Entrepreneur vient former vos équipes dans vos locaux à Strasbourg et dans l'Eurométropole. Organisme de formation certifié Qualiopi installé à Nancy, nous montons votre dossier de financement auprès de votre OPCO.",
         ['Présentiel dans vos locaux à Strasbourg', 'Organisme certifié Qualiopi', 'Attestation AI Act et RGPD'],
         'formation-1.jpg', 'Gabriel Vanderbecken en session')
    + zones('Où nous intervenons en Alsace',
            "Une formation se déroule dans vos locaux, par groupes de 12 personnes au plus, de 1 à 4 jours selon le niveau.",
            [("À Strasbourg et dans l'Eurométropole",
              "Dans vos locaux à Strasbourg, Schiltigheim, Illkirch-Graffenstaden, Lingolsheim, Bischheim ou Ostwald."),
             ("Ailleurs en Alsace",
              "À Colmar, Mulhouse, Haguenau ou Sélestat, la formation se fait à distance en classe virtuelle, ou en présentiel avec un formateur de l'équipe installé dans votre région."),
             ("Et en Lorraine",
              'Nous sommes installés à Nancy et formons aussi à Metz. Voir nos pages <a href="/formation-ia-nancy.html">formation IA à Nancy</a> et <a href="/formation-ia-metz.html">formation IA à Metz</a>.')])
    + f'''
  <section class="imm-programme-section" id="ai-act">
    <div class="container">
      <h2 class="section-title">L'AI Act, voté à Strasbourg</h2>
      <p class="section-sub">Le règlement européen sur l'intelligence artificielle a été adopté par le Parlement européen le 13 mars 2024, en session plénière à Strasbourg. Son article 4 s'applique depuis le 2 février 2025.</p>
      <div class="imm-modules">
          <div class="imm-module"><h3>Ce que demande l'article 4</h3><p>Que les entreprises qui utilisent l'IA prennent des mesures pour développer la maîtrise de l'IA de leur personnel. Depuis le règlement Digital Omnibus, c'est une obligation de moyens.</p></div>
          <div class="imm-module"><h3>Ce que vous recevez</h3><p>Une attestation individuelle de formation pour chaque participant, qui mentionne les volets traités, et un registre de conformité AI Act pour l'entreprise.</p></div>
          <div class="imm-module"><h3>Ce que la formation couvre</h3><p>Les règles d'usage de l'entreprise, le RGPD, la gouvernance et les données sensibles : ce qui peut entrer dans un outil d'IA et ce qui ne doit jamais y entrer.</p></div>
          <div class="imm-module"><h3>Sur vos outils</h3><p>ChatGPT, Claude, Microsoft Copilot, Gemini ou Mistral : on forme sur ceux que vos équipes utilisent déjà, avec leurs réglages de confidentialité.</p></div>
      </div>
      <p style="margin-top:22px"><a class="imm-lien" href="/formation-ia-obligatoire-ai-act.html">Notre formation IA et AI Act</a></p>
    </div>
  </section>
'''
    + modules("Ce que vos équipes apprennent",
              "Chaque atelier part des fichiers et des tâches réelles des participants.",
              [("Choisir le bon outil", "Lequel pour quelle tâche, et ce que permet l'abonnement que vous avez déjà."),
               ("Des consignes qui marchent", "Rôle, contexte, exemples, format attendu, testés sur les documents de chacun."),
               ("Vérifier ce que l'IA produit", "Repérer une réponse inventée, contrôler une source avant de s'en servir."),
               ("Automatiser une tâche", "Au niveau 3 : une automatisation utile à votre service, construite avec n8n ou Make.")],
              ident='programme')
    + marches('<h2 class="section-title">Trois niveaux, sur mesure</h2>')
    + faq_section(PAGES['strasbourg']['faq'], PAGES['strasbourg']['nom'])
    + cta('Parlons de votre formation à Strasbourg',
          "Un appel de 30 minutes pour cadrer le besoin de vos équipes. Nous montons ensuite le programme et le dossier de financement.")
)


def jsonld(p):
    url = f"{SITE}/{p['slug']}"
    fil = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Formations IA", "item": f"{SITE}/formation-ia-entreprise.html"},
        {"@type": "ListItem", "position": 3, "name": f"Formation IA à {p['nom']}", "item": url}]}
    service = {"@context": "https://schema.org", "@type": "Service", "name": f"Formation IA à {p['nom']}",
               "serviceType": "Formation à l'intelligence artificielle pour les entreprises", "url": url,
               "description": p['desc'],
               "provider": {"@type": "LocalBusiness", "@id": f"{SITE}/#local", "name": "IA-Entrepreneur", "url": SITE, "telephone": TEL_SCHEMA, "address": ADRESSE},
               "areaServed": p['zone']}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": texte(q), "acceptedAnswer": {"@type": "Answer", "text": texte(r)}} for q, r in p['faq']]}
    return '\n'.join(f'  <script type="application/ld+json">{json.dumps(o, ensure_ascii=False, separators=(",", ":"))}</script>' for o in (fil, service, faq))


def page(p):
    t = GABARIT
    assert len(p['titre']) <= 60, (p['slug'], len(p['titre']))
    assert len(p['desc']) <= 158, (p['slug'], len(p['desc']))
    url = f"{SITE}/{p['slug']}"
    img = f"{SITE}/images/{p['image']}"
    rempl = [
        (r'<title>.*?</title>', f"<title>{p['titre']}</title>"),
        (r'<meta name="description" content="[^"]*"/>', f'<meta name="description" content="{p["desc"]}"/>'),
        (r'<link rel="canonical" href="[^"]*"/>', f'<link rel="canonical" href="{url}"/>'),
        (r'<meta property="og:title" content="[^"]*"/>', f'<meta property="og:title" content="{p["titre"]}"/>'),
        (r'<meta property="og:description" content="[^"]*"/>', f'<meta property="og:description" content="{p["desc"]}"/>'),
        (r'<meta property="og:url" content="[^"]*"/>', f'<meta property="og:url" content="{url}"/>'),
        (r'<meta property="og:image" content="[^"]*"/>', f'<meta property="og:image" content="{img}"/>'),
        (r'<meta name="twitter:title" content="[^"]*"/>', f'<meta name="twitter:title" content="{p["titre"]}"/>'),
        (r'<meta name="twitter:description" content="[^"]*"/>', f'<meta name="twitter:description" content="{p["desc"]}"/>'),
        (r'<meta name="twitter:image" content="[^"]*"/>', f'<meta name="twitter:image" content="{img}"/>'),
    ]
    for motif, rep in rempl:
        t, n = re.subn(motif, lambda m: rep, t, count=1)
        assert n == 1, motif
    # JSON-LD : on retire ceux du gabarit, on place les nôtres après twitter:image
    t = re.sub(r'\n  <script type="application/ld\+json">.*?</script>', '', t, flags=re.S)
    t = t.replace(f'<meta name="twitter:image" content="{img}"/>', f'<meta name="twitter:image" content="{img}"/>\n' + jsonld(p), 1)
    t = t.replace('</style>', CSS + '</style>', 1)
    debut = t.index('  <section class="imm-outil-hero">')
    fin = t.index('<footer>')
    t = t[:debut] + p['corps'].lstrip('\n') + '\n' + t[fin:]
    return t


if __name__ == '__main__':
    for cle, p in PAGES.items():
        (RACINE / p['slug']).write_text(page(p))
        print('écrit', p['slug'], len(p['titre']), len(p['desc']))
