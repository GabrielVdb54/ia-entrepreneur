#!/usr/bin/env python3
"""Génère les pages métier : formation-ia-agence-immobiliere.html, formation-ia-syndic-gestion-locative.html,
formation-ia-btp.html, formation-ia-proprete.html et formation-ia-assurance.html (qui remplace l'ancienne page écrite à la main).

Demande de Gabriel (09/11/2026) : une « fiche » par métier, proposée en prospection LinkedIn,
qui soit aussi une page SEO (« ça fera d'une pierre 2 coups »). La fiche est la section #fiche :
les tâches où l'IA fait gagner du temps dans ce métier. Les relances LinkedIn y renvoient.

Même gabarit et mêmes briques que generer_pages_villes.py (en-tête, menu généré, pied de page,
scripts de formation-claude-entreprise.html). Le contenu se modifie ici, jamais dans le HTML.
Les faits viennent des recherches du 09/11/2026 (sources citées dans les pages).
Règles du site : pas de « zéro reste à charge », pas de chiffre de gain, AI Act article 4 =
obligation de moyens, pas de tiret cadratin, de point médian, de flèche ni d'emoji dans le texte.
Usage : python3 generer_pages_metiers.py (depuis la racine du dépôt). Idempotent.
"""
import json, re, sys
from pathlib import Path

RACINE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
sys.dont_write_bytecode = True  # pas de __pycache__ : Vercel servirait tout le dossier
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generer_pages_villes import (GABARIT, SITE, FLECHE, CHEVRON, ADRESSE, TEL_SCHEMA, texte, faq_html,
                                  formateur, hero, zones, equipe, marches, AVIS, GABRIEL, RYAD, CELINE, GILLES)

# Photos des métiers : Unsplash, licence Unsplash (usage commercial libre, sans attribution obligatoire), choisies le 09/11/2026.
#   agence-immobiliere-cles.jpg     https://unsplash.com/fr/photos/tenant-les-cles-de-la-maison-devant-lentree-bqUZEAeWuok
#   syndic-copropriete-immeuble.jpg https://unsplash.com/fr/photos/un-batiment-avec-de-nombreuses-fenetres-BJfKknOkuW8
#   btp-chantier-conducteur.jpg     https://unsplash.com/fr/photos/homme-en-veste-noire-et-jaune-portant-un-casque-rouge-tenant-un-baton-noir-et-blanc-PDjpA1yeonw
#   proprete-agent-bureaux.jpg      https://unsplash.com/fr/photos/un-homme-aux-gants-jaunes-passe-laspirateur-sur-un-sol-de-bureau-moquette-CVcIMnH_7so
#   assurance-conseil-client.jpg    https://unsplash.com/fr/photos/un-homme-et-une-femme-assis-a-une-table-avec-un-ordinateur-portable-M5k978V3qBc
CSS = """
  /* Pages métier (formation-ia-agence-immobiliere, -syndic-gestion-locative, -btp, -proprete), 09/11/2026 */
  /* Les liens envoyés en prospection pointent sur #fiche : l'en-tête fixe ne doit pas couvrir le titre.
     scroll-behavior:auto, car le défilement doux du gabarit était coupé par le démarrage des animations GSAP
     et l'arrivée tombait dans le haut de page (relecture design du 09/11/2026). */
  html{scroll-padding-top:72px;scroll-behavior:auto}
  .imm-limite a,.metier-lien{color:var(--primary);font-weight:700;text-decoration:underline;text-underline-offset:2px}
  .metier-source{margin-top:18px;font-size:.88rem;color:var(--muted);line-height:1.6}
  .metier-source a{color:var(--muted);text-decoration:underline;text-underline-offset:2px}
  .fiche-section{padding:70px 0;background:var(--card)}
  .fiche-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-top:30px}
  .fiche-tache{background:#fff;border:1px solid var(--border);border-radius:16px;padding:22px 22px 18px;display:flex;flex-direction:column}
  .fiche-tache h3{font-size:1.05rem;line-height:1.35;margin:0 0 10px;color:var(--text)}
  .fiche-tache p{margin:0 0 8px;font-size:.95rem;line-height:1.6;color:var(--text)}
  .fiche-tache p b{font-weight:700}
  .fiche-tache .fiche-reste{color:var(--muted)}
  .fiche-tache h3{order:-2}
  .fiche-niveau{order:-1;align-self:flex-start;margin:0 0 10px;font-size:.78rem;font-weight:700;color:var(--primary);background:rgba(26,60,255,.08);border-radius:999px;padding:4px 11px}
  .fiche-suite{margin-top:32px;padding:24px;border-radius:16px;background:#fff;border:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 28px}
  .fiche-suite p{margin:0;max-width:560px;font-size:1rem;line-height:1.6;color:var(--text)}
  .imm-outil-equipe .imm-lien,.imm-niveaux-outil .imm-lien{display:inline-block;padding:6px 0}
  .ville-avis{margin:26px 0 0;padding:20px 22px;border-radius:16px;background:#fff;border:1px solid rgba(10,15,44,.09)}
  .ville-avis p{margin:0;font-size:1rem;line-height:1.7;color:var(--text)}
  .ville-avis .ville-etoiles{color:#F5A623;letter-spacing:2px;margin-bottom:8px}
  .ville-avis .ville-auteur{margin-top:10px;font-size:.88rem;color:var(--muted)}
  .ville-lien{color:var(--primary);font-weight:700;text-decoration:underline;text-underline-offset:2px}
  .metier-voisins{padding:34px 0;border-top:1px solid var(--border)}
  .metier-voisins p{margin:0;font-size:.95rem;line-height:1.7;color:var(--muted);max-width:820px}
  @media (max-width:600px){.fiche-section{padding:50px 0}.fiche-grille{grid-template-columns:1fr;gap:12px;margin-top:22px}.fiche-tache{padding:18px 18px 14px}.fiche-suite{padding:20px}}
"""


def reperes(titre, sous, cartes, source, ident='constats'):
    """Cartes de constats, avec la source en dessous."""
    c = '\n'.join(f'          <div class="imm-limite"><h3>{h}</h3><p>{p}</p></div>' for h, p in cartes)
    return f'''
  <section class="imm-limites-section" id="{ident}">
    <div class="container">
      <h2 class="section-title">{titre}</h2>
      <p class="section-sub">{sous}</p>
      <div class="imm-limites">
{c}
      </div>
      <p class="metier-source">{source}</p>
    </div>
  </section>
'''


FICHE_INTRO = "Pour chaque tâche : ce que l'IA prépare, ce qui reste à vous, et le niveau de formation qui la travaille. En formation, on part de vos propres dossiers."


def niveau_court(n):
    """« Niveau 2, puis 3 pour l'automatiser » devient « Niveaux 2 et 3 » : une pastille, un format."""
    ch = sorted(set(re.findall(r'[123]', n)))
    return f'Niveau {ch[0]}' if len(ch) == 1 else 'Niveaux ' + ', '.join(ch[:-1]) + ' et ' + ch[-1]


def fiche(titre, sous, taches):
    """La fiche métier : (tâche, ce que l'IA change, ce qui reste à vous, niveau). « sous » est ignoré :
    l'introduction est la même sur toutes les pages (relecture design du 09/11/2026)."""
    taches = [(t, avec, reste, niveau_court(niveau)) for t, avec, reste, niveau in taches]
    c = '\n'.join(
        f'          <div class="fiche-tache"><h3>{t}</h3><p><b>Avec l\'IA :</b> {avec}</p>'
        f'<p class="fiche-reste"><b>Reste à vous :</b> {reste}</p><span class="fiche-niveau">{niveau}</span></div>'
        for t, avec, reste, niveau in taches)
    return f'''
  <section class="fiche-section" id="fiche">
    <div class="container">
      <h2 class="section-title">{titre}</h2>
      <p class="section-sub">{FICHE_INTRO}</p>
      <div class="fiche-grille">
{c}
      </div>
      <div class="fiche-suite"><p><b>Laquelle de ces tâches vous prend le plus de temps ?</b> En 30 minutes, on regarde avec vous par où commencer et quel niveau convient à votre équipe.</p><a href="/rendez-vous.html" class="btn-primary">Réserver un appel de 30 min {FLECHE}</a></div>
    </div>
  </section>
'''


def faq_section(faq, titre):
    return f'''
  <section class="faq-section" id="faq">
    <div class="container">
      <h2 class="section-title">{titre}</h2>
      <div class="faq-list" style="max-width:820px;margin-top:28px">
{faq_html(faq)}
      </div>
    </div>
  </section>
'''


def cta(titre, texte_cta):
    return f'''
  <section class="cta-final">
    <div class="container">
      <h2>{titre}</h2>
      <p>{texte_cta}</p>
      <div class="imm-voie-actions" style="justify-content:center">
        <a href="/rendez-vous.html" class="btn-primary">Réserver un appel de 30 min {FLECHE}</a>
        <a href="/formation-ia-entreprise.html#devis" class="imm-lien">Demander un devis</a>
      </div>
    </div>
  </section>
'''


BENJAMIN = formateur('/formateur-benjamin-niel.html', 'benjamin-niel.jpg', 'Benjamin Niel',
                     'Ancien dirigeant de conciergerie, à distance')

FAQ_LIEU = ("Où se déroule la formation ?",
            "Dans vos locaux à Nancy, Metz ou Strasbourg, par groupes de 12 personnes au plus. Ailleurs, à distance en classe virtuelle avec le formateur, ou en présentiel avec un formateur de l'équipe installé près de chez vous.")

FAQ_AI_ACT = ("L'AI Act oblige-t-il l'entreprise à former ses salariés ?",
              "Il demande aux entreprises qui utilisent l'IA de prendre des mesures pour développer la maîtrise de l'IA de leur personnel. Depuis la révision de juillet 2026, le texte précise qu'il n'impose pas de garantir un niveau à chaque personne : c'est une obligation de moyens. Une formation, une charte d'usage et une liste d'outils autorisés en sont les mesures les plus simples. Chaque participant reçoit une attestation individuelle de formation.")

PAGES = {}

# ───────────────────────────── AGENCES IMMOBILIÈRES ─────────────────────────────
ETUDE_OPCO_EP = ('<a href="https://www.opcoep.fr/ressources/centre-ressources/publication/revue-demains-3-opcoep.pdf" '
                 'target="_blank" rel="noopener">OPCO EP, Demains n° 3, mars 2026</a>')
PAGES['agence'] = dict(
    slug='formation-ia-agence-immobiliere.html',
    nom='Formation IA pour agences immobilières',
    titre='Formation IA pour agences immobilières | IA-Entrepreneur',
    desc="Formation IA pour agences immobilières : annonces, comptes rendus de visite, relances, dossiers locataires, sur vos dossiers. Dossier OPCO EP monté.",
    image='metiers/agence-immobiliere-cles.jpg',
    public='Agences immobilières (transaction et location)',
    faq=[
        ("La formation est-elle finançable par l'OPCO EP ?",
         'Les agences immobilières relèvent de la convention collective de l\'immobilier (IDCC 1527), rattachée à l\'OPCO EP. Il prend en charge une partie du coût pédagogique selon la taille de l\'agence, dans la limite d\'un plafond annuel et des fonds disponibles ; ses critères sont publiés sur <a class="metier-lien" href="https://www.opcoep.fr/criteres-de-financement?branche=187" target="_blank" rel="noopener">son site</a>. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) : nous montons le dossier avec vous, et vous connaissez votre reste à charge avant de signer. Les fonds mutualisés sont réservés aux entreprises de moins de 50 salariés.'),
        ("Une formation IA compte-t-elle dans mes 14 heures de formation continue ?",
         "Le décret de 2016 demande des formations qui ont « un lien direct avec l'activité professionnelle exercée », dans les domaines juridique, économique, commercial, technique ou de la déontologie. Une formation IA appliquée à la transaction ou à la gestion (annonces conformes, prospection, relation client, données des dossiers locataires) s'y rattache ; une découverte générale de ChatGPT, beaucoup moins. Notre attestation précise objectifs, contenu, durée et date. La décision revient à votre CCI au renouvellement de la carte : nous ne promettons pas une validation que personne ne peut garantir."),
        ("Nos logiciels ont déjà de l'IA : à quoi sert une formation ?",
         "Hektor, Apimo ou Modelo proposent déjà la saisie à la voix, la rédaction d'annonces ou le home staging. Beaucoup d'agences les ont sans s'en servir, ou sans savoir vérifier ce qu'ils produisent. On part de votre logiciel et de vos abonnements, puis on ajoute ChatGPT, Claude ou Copilot là où il en manque."),
        ("Peut-on mettre un dossier locataire dans ChatGPT ?",
         "Pas dans une version grand public, qui peut réutiliser ce qu'on lui confie. Avis d'imposition, bulletins de salaire et pièces d'identité sont des données personnelles : en formation, on voit quels outils et quels réglages les protègent, ce qu'on retire avant de demander quoi que ce soit à l'IA, et ce qui ne sort jamais du logiciel de l'agence."),
        ("Faut-il signaler un home staging fait avec l'IA ?",
         "Oui, s'il peut passer pour une vraie photo. L'AI Act demande de signaler clairement une image modifiée par l'IA, et les règles sur les pratiques commerciales trompeuses s'appliquent déjà aux annonces. Un aménagement virtuel reste utile : il se signale, on garde la photo d'origine et il ne cache aucun défaut."),
        FAQ_AI_ACT,
        FAQ_LIEU,
    ],
)
PAGES['agence']['corps'] = (
    hero('Formation IA pour les agences immobilières',
         'négociateurs|assistantes|gestionnaires locatifs|directeurs d\'agence',
         "Annonces, comptes rendus de visite, relances vendeurs, dossiers locataires : vos agents immobiliers et vos assistantes apprennent à confier à l'IA ce qui leur prend du temps, sur vos propres dossiers et dans vos logiciels, et à vérifier ce qu'elle produit avant que ça parte.",
         ['Organisme certifié Qualiopi', 'À Nancy, Metz et Strasbourg', 'Dossier OPCO EP monté'],
         'metiers/agence-immobiliere-cles.jpg', 'Une remise de clés')
    + reperes("Ce que l'OPCO EP a constaté dans les agences",
              "En mars 2026, l'OPCO EP, qui finance la formation de la branche immobilier, a publié un diagnostic sur le numérique et l'IA dans les agences, à partir de 255 entreprises interrogées. Trois constats guident notre façon de former.",
              [("Des formations IA jugées trop théoriques",
                "Les formations à l'IA suivies par les agences ont l'un des taux d'insatisfaction les plus élevés de l'étude : plus de 20 %. Leurs contenus sont jugés « trop théoriques, peu concrets et insuffisamment adaptés aux réalités de leur activité ». Chez nous, deux tiers du temps se passent en pratique, sur vos annonces, vos mandats et vos mails."),
               ("Les indépendants, moins outillés que les réseaux",
                "89 % des franchisés interrogés utilisent les outils numériques de leur franchiseur. Les indépendants, eux, « formalisent peu leur stratégie numérique » : aucune tête de réseau ne les forme ni ne les outille."),
               ("L'IA déjà utilisée, sans cadre",
                "L'étude décrit des salariés qui se servent de ChatGPT, Perplexity ou Mistral de leur propre initiative, « sans que les pratiques soient formalisées », avec un risque de fuite de données clients et de résultats jamais vérifiés.")],
              f"Source : {ETUDE_OPCO_EP}, diagnostic de la branche de l'immobilier sur les transitions numériques. Page mise à jour le 9 novembre 2026.")
    + fiche("Les 12 tâches où l'IA fait gagner du temps à une agence",
            "Pour chacune : ce que l'IA change, ce qui reste à faire par vous, et le niveau de formation qui la travaille. En formation, on part de vos propres dossiers.",
            [("Rédiger une annonce de vente ou de location",
              "un premier jet à partir de la fiche du bien et des photos, une version par portail et une en anglais.",
              "relire contre les mentions obligatoires (honoraires, DPE) et retirer tout critère qui pourrait être discriminant en location.",
              "Niveau 2"),
             ("Le compte rendu de visite et le point au vendeur",
              "vous dictez vos impressions en sortant de la visite, l'IA met en forme le compte rendu et le mail au propriétaire.",
              "vérifier les faits avant l'envoi.",
              "Niveau 2"),
             ("Relancer vendeurs et acquéreurs",
              "des messages personnalisés à partir de l'historique de votre logiciel, la relance des contacts qui dorment, un plan de relance par profil.",
              "valider chaque envoi.",
              "Niveau 2, puis 3 pour l'automatiser"),
             ("Répondre aux mails qui reviennent tous les jours",
              "disponibilité d'un bien, documents à fournir, horaires de visite : des réponses types qui s'adaptent à la question posée.",
              "vérifier le bien concerné et la pièce jointe.",
              "Niveau 2, puis 3"),
             ("Préparer un avis de valeur",
              "la synthèse des biens comparables et une rédaction argumentée, à partir des données que vous avez réunies.",
              "le prix. L'avis de valeur engage l'agent qui le signe, pas l'IA.",
              "Niveau 2"),
             ("Préparer un rendez-vous de prise de mandat",
              "les arguments selon le profil du vendeur, un entraînement aux objections, et une réponse au vendeur qui arrive avec une estimation trouvée sur ChatGPT.",
              "ne promettre aucun prix.",
              "Niveaux 1 et 2"),
             ("Lire un document long",
              "un DPE, des diagnostics ou un règlement de copropriété résumés, avec les points à signaler à l'acquéreur.",
              "revenir au document pour chaque point, avec un outil qui cite ses passages.",
              "Niveau 2"),
             ("Contrôler un dossier locataire",
              "la liste des pièces autorisées, les incohérences entre les pièces, le mail qui demande ce qui manque.",
              "la décision. Jamais de pièce interdite, et pas de dossier locataire dans une IA grand public.",
              "Niveau 2"),
             ("Les courriers de gestion locative",
              "régularisation des charges, fin de bail, relance de loyer, réponse à un locataire, à partir des modèles de l'agence.",
              "reprendre montants et dates dans votre logiciel, jamais dans l'IA.",
              "Niveau 2, puis 3"),
             ("Photos et home staging virtuel",
              "retoucher une photo, meubler virtuellement une pièce vide.",
              "le signaler clairement, garder la photo d'origine, ne jamais cacher un défaut.",
              "Niveau 2"),
             ("Réseaux sociaux, avis Google et lettre aux propriétaires",
              "des publications sur vos biens et votre quartier, des réponses aux avis, une lettre régulière à vos vendeurs.",
              "garder le ton de l'agence et relire.",
              "Niveaux 1 et 2"),
             ("Un nouveau mandat, de bout en bout",
              "enchaîner l'annonce, la diffusion, le tri des contacts et la proposition de créneaux de visite.",
              "valider à chaque étape, avec une charte d'usage.",
              "Niveau 3")])
    + zones("Ce qu'il faut savoir avant de s'y mettre",
            "L'IA ne change rien à vos obligations. La formation les intègre à chaque exercice.",
            [("Les mentions obligatoires",
              "Prix, honoraires et qui les paie, classement DPE, mention des logements classés F et G : une annonce écrite avec l'IA se relit contre cette liste avant d'être publiée."),
             ("Les dossiers locataires",
              'La liste des pièces qu\'on peut demander est fermée, et la <a href="https://cnil.fr/fr/location-dun-bien-immobilier-quels-justificatifs" target="_blank" rel="noopener">CNIL</a> rappelle celles qui sont interdites. Coller un avis d\'imposition dans une IA grand public revient à le confier à un tiers : on apprend ce qui peut y entrer et ce qui n\'y entre jamais.'),
             ("La non-discrimination",
              "Une IA qui rédige une annonce de location ou aide à trier des candidatures peut reprendre des critères interdits. On apprend à les repérer, dans la ligne du module non-discrimination de votre formation continue."),
             ("Les images modifiées par l'IA",
              "L'AI Act demande de signaler clairement une image modifiée par l'IA qui pourrait passer pour réelle. Un home staging virtuel reste possible, s'il est signalé et ne cache aucun défaut."),
             ("L'AI Act et vos équipes",
              'Depuis la révision de juillet 2026, l\'AI Act demande aux entreprises qui utilisent l\'IA de prendre des mesures pour développer la maîtrise de l\'IA de leur personnel. C\'est une obligation de moyens : une formation et une charte d\'usage en font partie. <a href="/formation-ia-obligatoire-ai-act.html">Ce que demande l\'AI Act</a>'),
             ("La formation continue de la carte",
              "Une formation appliquée à votre activité de transaction ou de gestion peut être présentée au titre de vos 14 heures annuelles. L'attestation précise objectifs, contenu, durée et date ; la validation revient à votre CCI.")],
            ident='cadre')
    + equipe('Qui vous forme',
             "Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy et forme des équipes en entreprise dans tout le Grand Est. Benjamin Niel a dirigé une conciergerie jusqu'à 80 logements, avec des salariés, et conçoit des logiciels de gestion, notamment pour l'immobilier. Il forme à distance, partout en France.",
             [GABRIEL, BENJAMIN], 'formation-2.jpg', 'Gabriel Vanderbecken en formation', AVIS)
    + marches('<h2 class="section-title">Trois niveaux, du premier pas à l\'automatisation</h2>')
    + faq_section(PAGES['agence']['faq'], "Vos questions sur la formation IA en agence immobilière")
    + cta('Parlons de votre agence',
          "Un appel de 30 minutes pour voir ce que votre équipe fait aujourd'hui avec l'IA et ce qui lui ferait gagner du temps. Nous montons ensuite le programme et le dossier de financement.")
)


# ───────────────────────────── SYNDICS ET GESTION LOCATIVE ─────────────────────────────
# Faits : /Users/GabrielV/Desktop/pages-metiers/recherche/syndic-gestion-locative.md, relus à la source le 09/11/2026 :
# baromètre ANGC 2026 (PDF « version finale au 4 mai 2026 », 1 584 répondants : 88,3 % / 80,6 % en 2020, logiciel 6,3/10),
# plaquette DREAL Grand Est (avril 2020, registre au 06/01/2020), critères OPCO EP Immobilier (màj 05/10/2026),
# Monimmeuble 06/01/2026 (Vilogi) et 21/10/2026 (Septeo, MIA). Aucun chiffre éditeur (Joe AI, Bellman, Lefebvre Dalloz) repris.
BAROMETRE_ANGC = ('<a href="https://angc-association.fr/wp-content/uploads/2026/05/Enquete-ANGC-2026-.pdf" '
                  'target="_blank" rel="noopener">ANGC, baromètre des métiers de la copropriété 2026</a>')
PLAQUETTE_DREAL = ('<a href="https://www.grand-est.developpement-durable.gouv.fr/IMG/pdf/plaquette_copro_ge-2.pdf" '
                   'target="_blank" rel="noopener">DREAL Grand Est, Copropriétés en région Grand Est</a>')
ARTICLE_VILOGI = ('<a href="https://monimmeuble.com/actualite/logiciel-metier-du-syndic-liberer-du-temps-utile-pour-revaloriser-le-metier" '
                  'target="_blank" rel="noopener">6 janvier 2026</a>')
ARTICLE_SEPTEO = ('<a href="https://monimmeuble.com/actualite/logiciel-immobilier-septeo-unifie-cinq-metiers-avec-modelo-et-mia" '
                  'target="_blank" rel="noopener">21 octobre 2026</a>')
DEONTOLOGIE = ('<a href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000031113441/" '
               'target="_blank" rel="noopener">code de déontologie</a>')
CNIL_IA = ('<a href="https://cnil.fr/fr/comment-deployer-une-ia-generative-la-cnil-apporte-de-premieres-precisions" '
           'target="_blank" rel="noopener">CNIL</a>')
CNIL_COPRO = ('<a href="https://www.cnil.fr/fr/la-gestion-des-donnees-personnelles-au-sein-dune-copropriete" '
              'target="_blank" rel="noopener">la CNIL le rappelle</a>')
CNIL_LOCATIF = ('<a href="https://www.cnil.fr/fr/publication-du-referentiel-relatif-la-gestion-locative" '
                'target="_blank" rel="noopener">référentiel de la CNIL sur la gestion locative</a>')
PV_ARTICLE_17 = ('<a href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000042078689" '
                 'target="_blank" rel="noopener">l\'article 17 du décret du 17 mars 1967</a>')
PV_CONTESTATION = ('<a href="https://www.justice.fr/fiche/on-contester-decision-prise-assemblee-generale-copropriete" '
                   'target="_blank" rel="noopener">dans les deux mois</a>')

PAGES['syndic'] = dict(
    slug='formation-ia-syndic-gestion-locative.html',
    nom='Formation IA pour syndics et gestion locative',
    titre='Formation IA syndic de copropriété et gestion locative',
    desc="Formation IA pour syndics de copropriété et gestion locative : mails des copropriétaires, AG, PV, devis, charges, sur vos dossiers. Dossier OPCO EP monté.",
    image='metiers/syndic-copropriete-immeuble.jpg',
    public='Syndics de copropriété et administrateurs de biens',
    faq=[
        ("Un cabinet de syndic peut-il faire financer la formation par l'OPCO EP ?",
         'Les cabinets de syndic et d\'administration de biens appliquent en général la convention collective de l\'immobilier (IDCC 1527), rattachée à l\'OPCO EP ; c\'est la convention de votre cabinet qui compte, pas seulement son code NAF. Dans ses critères, l\'OPCO EP range parmi les formations « cœur de métiers » la gestion de copropriété, la gestion locative et « la transformation numérique et digitale des entreprises (y compris IA) ». La prise en charge dépend de la taille du cabinet et des fonds disponibles ; les critères sont publiés sur <a class="metier-lien" href="https://www.opcoep.fr/criteres-de-financement?branche=187" target="_blank" rel="noopener">son site</a> et peuvent évoluer en cours d\'année. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) : nous montons le dossier avec vous, et vous connaissez votre reste à charge avant de signer. Les fonds mutualisés sont réservés aux entreprises de moins de 50 salariés.'),
        ("Une formation IA compte-t-elle dans les heures de formation continue de la carte G ou S ?",
         "Le décret de 2016 vise le titulaire de la carte, les directeurs d'établissement et les collaborateurs habilités à négocier ou à s'engager pour le cabinet : 14 heures par an, ou 42 heures sur trois ans. Un comptable ou un assistant qui n'est pas habilité n'est pas concerné. Les formations doivent avoir « un lien direct avec l'activité professionnelle exercée », et les actions prioritaires de la branche citent la gestion de copropriété, la gestion locative, les logiciels métiers et le RGPD. Une formation IA bâtie sur vos AG, vos réponses aux copropriétaires et la confidentialité des données est conçue pour s'y rattacher ; une simple découverte de ChatGPT, beaucoup moins. Notre attestation précise objectifs, contenu, durée et date. La décision revient à votre CCI au renouvellement de la carte, et personne ne peut la garantir à l'avance."),
        ("Peut-on confier le mail d'un copropriétaire à ChatGPT ?",
         f"Pas tel quel dans une version grand public, qui peut réutiliser ce qu'on lui confie. Nom, numéro de lot, impayé, litige entre voisins : ce sont des données personnelles, et le {DEONTOLOGIE} des professionnels de l'immobilier vous demande de faire preuve « de prudence et de discrétion » avec les informations de vos mandants. La {CNIL_IA} conseille de vérifier si le fournisseur réutilise ce qui est saisi, d'éviter d'y mettre des données personnelles et de lister les usages autorisés et interdits. En formation, on voit quels outils et quels réglages conviennent à un cabinet, ce qu'on retire d'un mail avant de demander quoi que ce soit, et ce qui ne sort jamais du logiciel ni de l'extranet."),
        ("Un PV d'assemblée générale rédigé avec l'IA est-il valable ?",
         f"Aucun texte ne parle d'IA. Un PV vaut par son contenu et ses signatures : {PV_ARTICLE_17} veut qu'il soit signé par le président, le secrétaire et le ou les scrutateurs, à la fin de la séance ou dans les huit jours. L'IA peut mettre au propre les décisions à partir de vos notes et de la feuille de présence ; les signataires restent responsables de ce qui est écrit. Une erreur sur une majorité ou sur la liste des opposants et des défaillants ouvre la contestation {PV_CONTESTATION} qui suivent la notification : c'est exactement ce que la formation apprend à vérifier."),
        ("Notre logiciel de syndic ne va-t-il pas bientôt faire tout ça ?",
         "En partie, et à des rythmes différents. Vilogi indique que ses logiciels rédigent déjà des résolutions d'AG et des états des lieux à partir de photos ; Septeo a présenté en octobre 2026 MIA, l'IA de sa plateforme Modelo, que le groupe déploiera progressivement. On part de votre logiciel (ICS, Thetrawin, Powimo, Vilogi, Crypto ou un autre) et de vos abonnements : ce qu'il sait déjà faire, ce qui se fait mieux à côté avec ChatGPT, Claude, Copilot ou Mistral, et ce qui ne doit jamais en sortir."),
        FAQ_AI_ACT,
        FAQ_LIEU,
    ],
)
PAGES['syndic']['corps'] = (
    hero('Formation IA pour les syndics de copropriété et la gestion locative',
         'gestionnaires de copropriété|assistants|comptables|gestionnaires locatifs|dirigeants de cabinet',
         "Mails des copropriétaires, convocations et PV d'AG, devis, sinistres, régularisation des charges : vos gestionnaires, assistants et comptables apprennent à faire préparer le premier jet par l'IA, sur les dossiers de vos immeubles, et à le vérifier avant qu'il parte. Ce qui sort au nom du cabinet reste sous votre contrôle.",
         ['Organisme certifié Qualiopi', 'Sur place à Nancy, Metz et Strasbourg', 'Dossier OPCO EP monté'],
         'metiers/syndic-copropriete-immeuble.jpg', 'Une copropriété en ville')
    + reperes("Ce que vivent les cabinets de syndic",
              "En mai 2026, l'Association nationale des gestionnaires de copropriété (ANGC) a publié son baromètre des métiers, à partir de 1 584 réponses de gestionnaires, d'assistants, de comptables, de directeurs et de dirigeants. Deux de ses constats, et la carte des copropriétés du Grand Est, guident notre façon de former.",
              [("Les mails, première charge du métier",
                "88 % des professionnels interrogés vivent la gestion des mails comme une charge psychologique permanente, contre 80,6 % en 2020. Le baromètre relève qu'« aucune formation à la gestion du flux de mails n'est proposée de manière structurée ». C'est la première tâche de la fiche ci-dessus."),
               ("Peu d'IA livrée dans les logiciels",
                "Les répondants donnent en moyenne 6,3 sur 10 à leur logiciel métier, et pour filtrer, prioriser ou répondre aux mails, « aucune solution technologique » ne s'est imposée. Les éditeurs annoncent : Vilogi dit rédiger les résolutions d'AG, Septeo a présenté en octobre 2026 une IA qu'il déploiera progressivement. En attendant, l'IA s'apprend à côté du logiciel."),
               ("Un parc de petites copropriétés",
                "La DREAL Grand Est comptait 33 377 copropriétés immatriculées dans la région en janvier 2020, alors que le registre était encore incomplet. 94 % ont moins de 50 lots, et la moitié se trouvent dans cinq agglomérations : Strasbourg, Metz, Nancy, Mulhouse et Reims. Autant d'AG, de budgets et de conseils syndicaux à suivre.")],
              f"Sources : {BAROMETRE_ANGC}, mai 2026 ; {PLAQUETTE_DREAL}, avril 2020 (registre d'immatriculation au 6 janvier 2020) ; Monimmeuble pour les annonces de Vilogi ({ARTICLE_VILOGI}) et de Septeo ({ARTICLE_SEPTEO}). Page mise à jour le 9 novembre 2026.")
    + fiche("Les 12 tâches où l'IA fait gagner du temps à un syndic ou un administrateur de biens",
            "Pour chacune : ce que l'IA prépare, ce qui reste à faire par vous, et le niveau de formation qui la travaille. En formation, on part des dossiers de vos immeubles et de vos lots en gestion.",
            [("Répondre aux mails des copropriétaires et des locataires",
              "un projet de réponse à partir du message, du règlement, du dernier appel de fonds ou du bail, sur un ton posé.",
              "vérifier chaque fait et chaque montant dans votre logiciel avant d'envoyer, et ne confier un mail nominatif qu'à un outil validé par le cabinet.",
              "Niveau 2"),
             ("Les questions qui reviennent chaque semaine",
              "solde, tantièmes, date de la prochaine AG : des réponses types écrites une fois, et une page de questions fréquentes par immeuble pour l'extranet.",
              "tenir ces réponses à jour après chaque AG et chaque appel de fonds.",
              "Niveau 2, puis 3"),
             ("Préparer l'assemblée générale",
              "l'ordre du jour, les projets de résolutions à partir des devis et des décisions passées, et une note claire pour les copropriétaires.",
              "la majorité applicable à chaque résolution et les pièces à joindre à la convocation.",
              "Niveau 2"),
             ("Mettre le PV d'AG au propre",
              "à partir de vos notes et de la feuille de présence, les décisions, les votes, les opposants et les défaillants mis en forme.",
              "relire chaque vote. Le PV reste signé par le président, le secrétaire et les scrutateurs, puis notifié dans le mois.",
              "Niveau 2"),
             ("Comparer des devis avant le conseil syndical",
              "un tableau des écarts entre deux ou trois devis : prestations incluses ou absentes, garanties, délais, conditions de paiement, et les questions à poser aux entreprises.",
              "le choix, qui revient au conseil syndical et à l'AG.",
              "Niveau 2"),
             ("Suivre un dégât des eaux ou un sinistre",
              "la chronologie du dossier, la déclaration à l'assureur de l'immeuble, les relances de l'expert ou de l'entreprise, le point d'étape au copropriétaire touché.",
              "les responsabilités et chaque montant, qui ne se décident pas avec une IA.",
              "Niveau 2, puis 3 pour les relances"),
             ("Lire un règlement de copropriété ou un plan de travaux",
              "un règlement, un diagnostic technique ou un plan pluriannuel de travaux résumés, avec les points qui demandent une décision.",
              "vérifier chaque point dans le document d'origine avant de l'avancer devant un copropriétaire.",
              "Niveau 2"),
             ("Notes d'information et affichages",
              "coupure d'eau, ramonage, travaux dans la cage d'escalier : un texte court et clair, en version affichage, mail et SMS.",
              "vérifier dates, horaires et nom de l'entreprise.",
              "Niveaux 1 et 2"),
             ("Relancer un impayé de charges ou de loyer",
              "des relances amiables graduées selon l'historique du débiteur, puis le courrier qui prépare la mise en demeure.",
              "le passage à la mise en demeure, puis la transmission à l'avocat ou au commissaire de justice.",
              "Niveau 2, puis 3 pour l'automatiser"),
             ("Expliquer une régularisation des charges",
              "une lettre qui détaille le décompte poste par poste et répond d'avance aux questions habituelles. Même chose pour la révision du loyer.",
              "les montants, tirés de votre logiciel, jamais recalculés par l'IA.",
              "Niveau 2"),
             ("Rédiger un état des lieux",
              "une description pièce par pièce à partir de vos photos ou d'une dictée, et la comparaison entre l'entrée et la sortie pour préparer les retenues.",
              "le constat contradictoire sur place, et chaque retenue sur le dépôt de garantie.",
              "Niveau 2"),
             ("Factures fournisseurs et pré-états datés",
              "la pré-saisie des factures, le repérage des doublons et des montants inhabituels, la liste des pièces à réunir pour un pré-état daté.",
              "chaque écriture, validée par le comptable, et chaque montant de l'état daté.",
              "Niveau 3")])
    + zones("Ce qu'un syndic doit savoir avant de s'y mettre",
            "Confidentialité, RGPD, règles de l'assemblée générale : vos obligations restent les mêmes avec l'IA, et chaque exercice de la formation en tient compte.",
            [("La discrétion due aux mandants",
              f"Le {DEONTOLOGIE} des professionnels de l'immobilier leur demande de faire preuve « de prudence et de discrétion » avec les données personnelles et les informations de leurs mandants, et d'y veiller pour leurs collaborateurs. Coller le mail nominatif d'un copropriétaire dans une IA grand public revient à le confier à un tiers."),
             ("Une charte d'usage pour le cabinet",
              f"Avant de déployer une IA générative, la {CNIL_IA} recommande de lister les usages autorisés et interdits et de « former et sensibiliser les utilisateurs finaux ». La charte d'usage de votre cabinet se finalise avec vous pendant la formation : quels outils, pour quoi faire, avec quelles données."),
             ("L'extranet et les données des copropriétaires",
              f"L'extranet doit garantir la sécurité et la confidentialité des données traitées, {CNIL_COPRO}. Une réponse type ou une page de questions fréquentes écrite avec l'IA se rédige sans aucune donnée nominative."),
             ("Le PV et les délais de l'AG",
              "Signatures, notification dans le mois, contestation possible par les opposants et les défaillants dans les deux mois qui suivent : l'IA met en forme, mais une majorité mal reportée reste une erreur du cabinet. On apprend à relire un PV préparé par l'IA."),
             ("Les dossiers de la gestion locative",
              f"Pièces des candidats, quittances, décomptes : le {CNIL_LOCATIF} encadre ce qu'on collecte et combien de temps on le garde. L'IA ne change pas ces règles ; aucune pièce justificative n'a sa place dans un outil grand public."),
             ("L'AI Act et vos équipes",
              'Un cabinet dont les équipes se servent de ChatGPT ou de Copilot doit, depuis la révision de juillet 2026, prendre des mesures pour développer la maîtrise de l\'IA de son personnel. C\'est une obligation de moyens : une formation, une charte d\'usage et une liste d\'outils autorisés en font partie. <a href="/formation-ia-obligatoire-ai-act.html">Ce que demande l\'AI Act</a>')],
            ident='cadre')
    + equipe('Qui vous forme',
             "Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy et forme des équipes en entreprise dans tout le Grand Est. Benjamin Niel a dirigé une conciergerie jusqu'à 80 logements, avec des salariés, et conçoit des logiciels de gestion, notamment pour l'immobilier. Il forme à distance, partout en France.",
             [GABRIEL, BENJAMIN], 'accompagnement-gabriel.jpg', 'Gabriel Vanderbecken avec un participant', AVIS)
    + marches('<h2 class="section-title">Trois niveaux, de la prise en main à l\'automatisation</h2>')
    + faq_section(PAGES['syndic']['faq'], "Vos questions sur la formation IA en cabinet de syndic et de gestion locative")
    + cta('Parlons de votre cabinet',
          "Un appel de 30 minutes pour voir où en sont vos gestionnaires avec l'IA et par quelles tâches commencer. Nous montons ensuite le programme et le dossier de financement.")
)


# ───────────────────────────── BTP ─────────────────────────────
# Faits : /Users/GabrielV/Desktop/pages-metiers/recherche/btp.md (lu le 09/11/2026). Source pivot : étude de
# l'Observatoire des métiers du BTP, janvier 2026. Le « 42 % » attribué à l'Observatoire par un vendeur n'est
# pas dans le rapport : ne pas le reprendre. Aucun chiffre de gain de temps (tous ceux qui circulent sont de vendeurs).
BTP_ETUDE = ('<a href="https://www.metiers-btp.fr/wp-content/uploads/2026/02/Rapport-Etude_IA-VF.pdf" '
             'target="_blank" rel="noopener">Observatoire des métiers du BTP, étude sur l\'IA dans les entreprises du BTP, janvier 2026</a>')
BTP_COMMUNIQUE = ('<a href="https://www.metiers-btp.fr/wp-content/uploads/2026/02/2026.02.10-Constructys-CP-Etude-IA-VF.pdf" '
                  'target="_blank" rel="noopener">communiqué de Constructys du 10 février 2026</a>')
BTP_CHARTE_FFB = ('<a href="https://www.ffbatiment.fr/actualites-batiment/actualite/intelligence-artificielle-charte-ethique" '
                  'target="_blank" rel="noopener">charte éthique</a>')
BTP_CONSTRUCTYS_JUIN = ('<a class="metier-lien" href="https://www.ffbatiment.fr/actualites-batiment/actualite/constructys-financement-entreprises-dynamique-formation" '
                        'target="_blank" rel="noopener">le 1er juin 2026</a>')
PAGES['btp'] = dict(
    slug='formation-ia-btp.html',
    nom='Formation IA pour le BTP',
    titre='Formation IA pour les entreprises du BTP | IA-Entrepreneur',
    desc="Formation IA pour les entreprises du BTP : compte rendu de chantier, mémoire technique, DCE, PPSPS, travaillés sur vos dossiers. Dossier Constructys monté.",
    image='metiers/btp-chantier-conducteur.jpg',
    public='Entreprises du bâtiment et des travaux publics',
    faq=[
        ("La formation est-elle finançable par Constructys ?",
         f"Constructys est l'OPCO de la construction, pour le bâtiment comme pour les travaux publics. Il prend en charge une partie du coût de la formation, dans la limite de plafonds par heure et du budget attribué à votre entreprise. Pour les entreprises du bâtiment de 11 à 49 salariés, ces plafonds ont baissé {BTP_CONSTRUCTYS_JUIN} et ne couvrent en général pas tout le coût ; la demande doit arriver chez Constructys au moins 15 jours avant le premier jour de formation. Les travaux publics ont leurs propres critères. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) : nous montons le dossier avec vous, et vous connaissez votre reste à charge avant de signer. Les fonds mutualisés sont réservés aux entreprises de moins de 50 salariés."),
        ("Peut-on écrire un mémoire technique avec l'IA sans prendre de risque ?",
         "Oui, si l'IA sert à écrire et jamais à promettre. On lui donne les critères du RC, vos références de chantiers, vos moyens humains et matériels, vos méthodes réelles ; elle propose un premier jet qui suit le plan demandé par l'acheteur. Ensuite, chaque engagement se relit. Si les pièces du marché rendent le mémoire contractuel, ce qui y est écrit sur les moyens, le planning ou les méthodes vous engage, que la phrase vienne de vous ou de l'IA."),
        ("Peut-on mettre les plans et les coordonnées de nos clients dans ChatGPT ?",
         "Pas dans une version grand public laissée avec ses réglages par défaut, qui peut réutiliser ce qu'on lui confie. En formation, on voit quels outils et quels réglages protègent vos données, ce qu'on retire d'un document avant de le confier à l'IA (le nom et l'adresse d'un particulier, les prix de vos fournisseurs) et ce qui ne sort jamais de l'entreprise."),
        ("Notre logiciel de devis a déjà de l'IA : à quoi sert une formation ?",
         "Obat et Batappli proposent désormais de faire un devis en décrivant les travaux à la voix, et d'autres logiciels de gestion du bâtiment n'affichent encore aucune fonction d'IA. Dans les deux cas, le devis n'est qu'une partie du travail de bureau : le compte rendu de chantier, le mémoire technique, la lecture d'un DCE ou le PPSPS se font à côté du logiciel, avec ChatGPT, Claude ou Copilot. On part de ce que vous avez déjà, abonnements compris, et on ajoute ce qui manque. Quel que soit l'outil, les quantités et les prix se vérifient."),
        ("Faut-il être à l'aise avec l'informatique ?",
         "Non. Si vous savez écrire un mail et laisser un message vocal, vous savez vous servir de ces outils. Dans l'étude de l'Observatoire des métiers du BTP, ceux qui trouvent l'IA difficile citent d'abord le manque de compétences, puis le manque de temps. C'est pour cela qu'on travaille sur vos dossiers, au rythme du groupe, avec deux tiers du temps en pratique. Le niveau 1 est fait pour ceux qui n'ont jamais ouvert ChatGPT."),
        FAQ_AI_ACT,
        FAQ_LIEU,
    ],
)
PAGES['btp']['corps'] = (
    hero('Formation IA pour les entreprises du BTP',
         'conducteurs de travaux|assistantes de gestion|chargés d\'affaires|chefs de chantier|équipes de bureau',
         "Compte rendu de chantier, mémoire technique, lecture d'un DCE, PPSPS, relance d'une situation de travaux : vos conducteurs de travaux, votre assistante et vous-même apprenez à confier à l'IA une partie de l'administratif qui se fait le soir, sur vos propres dossiers, et à relire ce qu'elle écrit avant que ça parte.",
         ['Organisme certifié Qualiopi', 'Dans vos locaux à Nancy, Metz et Strasbourg', 'Dossier Constructys monté avec vous'],
         'metiers/btp-chantier-conducteur.jpg', 'Sur le chantier')
    + reperes("Ce que l'Observatoire des métiers du BTP a constaté",
              "En janvier 2026, l'Observatoire des métiers du BTP a publié une étude sur l'IA dans les entreprises du bâtiment et des travaux publics. 621 professionnels ont répondu au questionnaire, dont 28 % dans des entreprises de 10 à 49 salariés, et 16 entreprises ont été interrogées en entretien. Trois de ses constats ont décidé de notre façon de travailler avec les entreprises du BTP.",
              [("Moins d'une entreprise sur dix s'en sert",
                "Moins de 10 % des entreprises du BTP utilisent des outils d'IA : 3 % les ont déployés, 5 % sont en train de le faire. 36 % l'envisagent. Et 43,5 % des répondants n'ont jamais utilisé ChatGPT, Copilot ou Gemini."),
               ("D'abord pour l'administratif",
                "Chez ceux qui s'en servent, l'IA sert d'abord aux tâches de bureau et à l'administratif (89 %), puis aux études et à la conception (72 %). Un dirigeant interrogé par l'Observatoire dit de ses conducteurs de travaux, « avant tout des gens de terrain », qu'ils peuvent ainsi « se débarrasser de tout ce qu'ils n'aiment pas trop : l'administratif »."),
               ("Des formations loin du chantier",
                "En 2024, Constructys a financé 1 762 actions de formation à l'IA, surtout de la découverte, et la majorité des intitulés « ne fait aucune référence au BTP ». L'étude recommande d'apprendre sur des situations réelles : « préparation de chantier, devis, réponse à appel d'offres ». C'est ce que nous faisons, sur vos dossiers.")],
              f"Sources : {BTP_ETUDE} (cabinet Plein Sens, questionnaire de 2025 et entretiens), et {BTP_COMMUNIQUE} pour la répartition des usages. Page mise à jour le 9 novembre 2026.")
    + fiche("Les 12 tâches où l'IA fait gagner du temps à une entreprise du BTP",
            "Pour chacune : ce que l'IA change, ce qui reste à vous, et le niveau de formation qui la travaille. Les quantités, les prix et la marge ne sont jamais confiés à l'IA. En formation, chacune se travaille sur un dossier réel de votre entreprise.",
            [("Le compte rendu de chantier, dicté sur place",
              "vous dictez vos notes en sortant de la réunion de chantier, l'IA en fait un compte rendu en ordre (avancement, réserves, actions) et le mail de diffusion.",
              "relire les noms, les dates et les réserves avant l'envoi : une fois diffusé, c'est votre compte rendu.",
              "Niveaux 1 et 2"),
             ("Le mémoire technique",
              "un premier jet construit sur les critères du RC et sur vos vraies références, moyens et méthodes, à partir de vos anciens mémoires.",
              "relire chaque engagement. Si les pièces du marché rendent le mémoire contractuel, ce que vous y écrivez sur les moyens, le planning ou les méthodes vous engage.",
              "Niveau 2"),
             ("Lire un DCE avant de décider d'y aller",
              "une synthèse du RC, du CCTP et du CCAP : critères et pondération, pièces à fournir, délais, pénalités, clauses qui posent question.",
              "revenir au texte d'origine pour chaque point qui compte, et décider de répondre ou non.",
              "Niveau 2"),
             ("Le dossier de candidature",
              "la liste des pièces demandées par le RC, et le DC1, le DC2 ou le DUME préparés à partir d'une fiche entreprise à jour.",
              "vérifier que chaque attestation est à jour, puis signer.",
              "Niveau 2, puis 3"),
             ("Le devis après la visite",
              "vos notes ou votre dictée de visite remises en ordre : description des travaux, désignations, questions à poser au client.",
              "les quantités, les prix et la marge. L'IA ne chiffre pas à votre place.",
              "Niveau 2"),
             ("Le PPSPS",
              "votre modèle adapté au chantier à partir du PGC : phases, risques, moyens de prévention, intervenants.",
              "valider chaque mesure de prévention avec ceux qui seront sur le chantier.",
              "Niveau 2"),
             ("Les situations de travaux et leurs relances",
              "le mail qui accompagne la situation, puis des relances graduées et polies quand le paiement tarde, à partir de votre échéancier.",
              "les montants et l'avancement, repris de votre logiciel, jamais de l'IA.",
              "Niveau 1, puis 3 pour l'automatiser"),
             ("Les factures fournisseurs à classer",
              "la facture reçue est lue, rattachée au chantier et au fournisseur, renommée et rangée au bon endroit.",
              "contrôler les rattachements les premières semaines, et garder la main sur le paiement.",
              "Niveau 3"),
             ("Le suivi des sous-traitants",
              "un tableau des attestations de vigilance, Kbis, assurances et contrats, avec un rappel avant chaque renouvellement et le mail de demande prêt à partir.",
              "vérifier chaque attestation en ligne. Les obligations du donneur d'ordre ne se délèguent pas à un outil.",
              "Niveau 3"),
             ("Le DOE avant la réception",
              "la liste des pièces attendues, le sommaire, et ce qui manque encore : fiches techniques, notices, PV d'essais.",
              "rassembler les vrais documents et vérifier qu'ils correspondent à ce qui a été posé.",
              "Niveau 2"),
             ("Les mails aux clients et les réclamations",
              "une réponse claire à un particulier inquiet, une explication technique sans jargon, un ton posé dans un litige, une réponse à un avis Google.",
              "relire avant l'envoi, surtout quand le ton monte.",
              "Niveau 1"),
             ("Comprendre un texte ou une règle",
              "un texte réglementaire, une norme ou un changement d'aide comme MaPrimeRénov' résumé, puis traduit en consignes simples pour vos équipes.",
              "revenir au texte officiel avant d'appliquer, avec un outil qui cite ses passages.",
              "Niveaux 1 et 2")])
    + zones("Ce que l'IA ne change pas à vos responsabilités",
            "C'est votre entreprise qui signe le devis, le mémoire et le PPSPS. La formation intègre ces règles à chaque exercice.",
            [("Le mémoire technique vous engage",
              "S'il est contractuel, ce que vous y promettez sur les moyens, le planning ou les méthodes vous engage. Chaque phrase écrite avec l'IA se relit comme si vous l'aviez écrite vous-même."),
             ("Les quantités, les prix et la marge",
              "L'IA ne fait ni le métré, ni le prix, ni la marge. Elle met en forme la description des travaux ; le chiffrage reste le vôtre. Même un éditeur de logiciel de devis par IA rappelle que l'utilisateur reste responsable de l'exactitude de son devis."),
             ("Les données de vos clients et de vos chantiers",
              f"Coordonnées d'un particulier, plans, prix de vos fournisseurs : on apprend ce qui peut entrer dans un outil d'IA et ce qui n'y entre jamais. La {BTP_CHARTE_FFB} proposée par la FFB à ses adhérents va dans le même sens : savoir où sont stockées les données et rester garant des décisions prises avec l'IA."),
             ("Relire, toujours",
              "« L'IA nous fait gagner du temps mais parfois nous trompe », dit un dirigeant de PME interrogé par l'Observatoire, qui répond beaucoup aux appels d'offres publics. Une IA peut inventer un article de norme, une date ou une référence de chantier : on apprend à le repérer et à revenir au document d'origine."),
             ("La facture électronique",
              "Depuis le 1er septembre 2026, toute entreprise doit pouvoir recevoir des factures électroniques ; les PME et les TPE devront les émettre à partir du 1er septembre 2027. Le circuit des factures fournisseurs, de la réception au classement par chantier, se travaille au niveau 3."),
             ("Vos équipes et l'AI Act",
              'Vos conducteurs de travaux se servent peut-être déjà de ChatGPT sur leur téléphone, sans règle commune. Depuis la révision de juillet 2026, l\'article 4 de l\'AI Act demande aux entreprises qui utilisent l\'IA de prendre des mesures pour que leur personnel la maîtrise. C\'est une obligation de moyens, sans nombre d\'heures imposé : une formation et une charte d\'usage en font partie. <a href="/formation-ia-obligatoire-ai-act.html">Ce que demande l\'AI Act</a>')],
            ident='cadre')
    + equipe('Qui vous forme',
             "Nous ne vous apprendrons pas votre métier : vous le connaissez mieux que nous. Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy ; Gilles Idoux forme à l'IA générative, à la vente et au management dans le Grand Est. Nous venons avec la méthode et les outils d'IA, vous venez avec vos dossiers : un DCE en cours, un compte rendu à faire, un mémoire à reprendre. C'est sur eux que l'on travaille, et c'est vous qui jugez si le résultat tient la route sur le chantier.",
             [GABRIEL, GILLES], 'formation-1.jpg', 'Gabriel Vanderbecken en session', AVIS)
    + marches('<h2 class="section-title">Trois niveaux, comme les trois paliers de l\'Observatoire</h2>\n'
              '        <p class="section-sub">L\'étude de l\'Observatoire décrit trois paliers : une culture commune du numérique et des données, puis des usages installés dans l\'entreprise, puis des outils reliés entre eux et automatisés. Nos trois niveaux suivent le même chemin.</p>')
    + faq_section(PAGES['btp']['faq'], "Vos questions sur la formation IA dans le BTP")
    + cta('Parlons de votre entreprise',
          "Un appel de 30 minutes pour voir ce qui vous prend le plus de temps au bureau, ce que vos équipes font déjà avec l'IA, et par quoi commencer. Nous montons ensuite le programme et le dossier Constructys.")
)


# ───────────────────────────── ENTREPRISES DE PROPRETÉ ─────────────────────────────
# Faits : recherche du 09/11/2026 (pages-metiers/recherche/proprete.md), chiffres relus à la source le 09/11/2026 :
# Monde de la Propreté « L'IA dans l'entreprise » (32 % / 23 % / 49 %, 1 sur 4 organisé, 6 %),
# étude prospective AKTO 2026 (Grand-Est 15 %, Nouvelle-Aquitaine 13 %, Jobfeed 01/10/2023-01/10/2025),
# plan d'actions IA de la branche (9 classes virtuelles, Fare Propreté), règles AKTO propreté mises à jour le 02/11/2026.
# Écartés : les gains « 30 à 50 % », « 15 minutes à 30 secondes », « 2,1 h par semaine » (vendeurs ou hors propreté),
# les montants et la date limite AKTO (ils périment), les seuils chiffrés de l'annexe 7 et du temps partiel (à revérifier).
SOURCE_MDP = ('<a href="https://www.monde-proprete.com/ia-entreprise" target="_blank" rel="noopener">'
              'Le Monde de la Propreté, « L\'IA dans l\'entreprise »</a>')
SOURCE_AKTO_PROSP = ('<a href="https://observatoire.akto.fr/content/uploads/sites/3/2026/07/Etude-propestive-proprete-et-services.pdf" '
                     'target="_blank" rel="noopener">AKTO, étude prospective Propreté et services, 2026</a>')
PAGES['proprete'] = dict(
    slug='formation-ia-proprete.html',
    nom='Formation IA pour entreprises de propreté',
    titre='Formation IA pour entreprises de propreté | IA-Entrepreneur',
    desc="Formation IA pour entreprises de propreté : mémoire technique, consignes traduites, remplacements, contrôle qualité, sur vos documents. Dossier AKTO monté.",
    image='metiers/proprete-agent-bureaux.jpg',
    public='Entreprises de propreté et de nettoyage',
    faq=[
        ("La formation est-elle finançable par AKTO ?",
         'Les entreprises de propreté relèvent de la convention collective de la propreté et services associés (IDCC 3043), rattachée à AKTO. Moins de 50 salariés : la formation peut passer par les fonds mutualisés du plan de développement des compétences, selon les forfaits et plafonds d\'AKTO. De 50 à 99 salariés : ces fonds ne sont plus ouverts, mais la branche a un plan conventionnel, alimenté par la contribution que versent les entreprises de 11 salariés et plus ; il peut prendre en charge des actions de formation si l\'entreprise est à jour de cette contribution, dans la limite des fonds disponibles. Le reste passe par le plan de formation de l\'entreprise. Les règles sont publiées sur <a class="metier-lien" href="https://www.akto.fr/regles-de-prise-en-charge-proprete/" target="_blank" rel="noopener">le site d\'AKTO</a>. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) : nous montons le dossier avec vous, et vous connaissez votre reste à charge avant de signer.'),
        ("La branche propose déjà des modules sur l'IA : quelle différence ?",
         'Le <a class="metier-lien" href="https://www.monde-proprete.com/plan-action-IA" target="_blank" rel="noopener">plan d\'actions IA de la branche</a> (FEP, Fare Propreté, INHNI) propose un e-learning sur les fondamentaux et des classes virtuelles de 2 à 3 heures par thème : cadre juridique, RH, fonctions commerciales, exploitation. Ces modules sont proposés par la branche aux entreprises à jour de leur cotisation, et c\'est un bon point de départ. Notre formation se place à côté : nous venons en présentiel dans vos locaux depuis Nancy, pour des journées entières, et nous travaillons sur vos propres documents (votre dernier dossier d\'appel d\'offres, vos fiches de site, vos modèles d\'avenant). Un responsable peut très bien suivre le module juridique de la branche, puis travailler avec nous sur ses dossiers.'),
        ("Peut-on répondre à un appel d'offres avec l'IA ?",
         "Oui pour lire le dossier de consultation, construire le plan du mémoire technique et adapter vos textes au cahier des charges de l'acheteur. Non pour le prix, que l'IA ne doit pas calculer, ni pour ce que vous n'avez pas : une référence, un effectif ou une certification inventés engagent l'entreprise qui signe. Un mémoire générique, qui ressemble à celui des concurrents, ne fait pas non plus la différence sur la valeur technique. La formation apprend à partir du besoin de l'acheteur et de vos propres éléments, sans coller un dossier confidentiel dans une version grand public."),
        ("Peut-on mettre les données de nos agents dans ChatGPT ?",
         'Pas telles quelles. La <a class="metier-lien" href="https://cnil.fr/fr/utiliser-lia-generative-dans-les-tpe-et-pme" target="_blank" rel="noopener">CNIL</a> rappelle que ce qu\'on saisit dans un outil d\'IA grand public peut servir à l\'entraîner, et recommande de ne pas y mettre de données personnelles, ou de les anonymiser. Le titre de séjour, l\'arrêt maladie, les absences ou une sanction d\'un agent n\'y ont pas leur place. En formation, on voit quels outils et quels réglages protègent ces données, comment remplacer un nom par un numéro, et ce qui ne sort jamais de votre logiciel de paie ou de planning.'),
        ("Nos agents lisent peu le français : l'IA peut-elle aider ?",
         "Oui, du côté de ceux qui écrivent pour eux. Une consigne de site, une fiche de poste ou un livret d'accueil se réécrivent en français simple, se traduisent dans la langue de l'agent et peuvent être lus à voix haute sur un téléphone. La formation s'adresse alors aux chefs d'équipe, aux responsables de secteur et au service RH. Chaque traduction se fait relire par quelqu'un qui parle la langue, et elle ne remplace ni la démonstration sur site ni les formations au français de la branche."),
        FAQ_AI_ACT,
        FAQ_LIEU,
    ],
)
PAGES['proprete']['corps'] = (
    hero('Formation IA pour les entreprises de propreté',
         'responsables d\'exploitation|services RH|chargés d\'affaires|inspecteurs|chefs d\'équipe',
         "Appels d'offres, remplacements, rapports de contrôle, reprises de personnel : dans une entreprise de propreté, l'écrit repose sur le dirigeant, l'exploitation et le service RH. La formation leur apprend à confier à l'IA la part rédactionnelle de ces tâches, sur vos propres documents, et à contrôler ce qu'elle produit.",
         ['Organisme certifié Qualiopi', 'À Nancy, Metz et Strasbourg', 'Dossier AKTO monté avec vous'],
         'metiers/proprete-agent-bureaux.jpg', 'Entretien de bureaux')
    + reperes("Où en est l'IA dans les entreprises de propreté",
              "Deux études de la branche donnent la mesure : l'enquête d'Accenture pour le Monde de la Propreté, publiée en 2025, et l'étude prospective d'AKTO, publiée en 2026. Voici ce qu'elles disent, et ce que nous en tirons pour la formation.",
              [("Déjà utilisée, surtout à titre individuel",
                "32 % des PME de propreté (10 à 249 salariés) déclarent utiliser l'IA, contre 23 % des TPE et 49 % des ETI et grandes entreprises. Dans trois entreprises utilisatrices sur quatre, c'est un usage individuel, « pour des tâches du quotidien », pas un projet d'entreprise. La formation part de ces usages pour en faire une pratique commune."),
               ("6 % ont fixé des règles",
                "Seulement 6 % des entreprises du secteur ont défini des principes d'usage responsable de l'IA et les appliquent. Le Monde de la Propreté note que les entreprises laissent « une certaine flexibilité à leurs employés pour expérimenter avec l'IA ». Savoir ce qui peut entrer dans un outil d'IA, et ce qui n'y entre jamais, est travaillé dès le premier jour."),
               ("Le Grand Est, première région pour les offres d'emploi",
                "Entre octobre 2023 et octobre 2025, 15 % des offres d'emploi du secteur ont été publiées dans le Grand Est, devant la Nouvelle-Aquitaine (13 %). L'étude d'AKTO relève aussi « une rotation importante des équipes, marquée par des abandons de poste récurrents ». Annonces, accueil des nouveaux agents et remplacements reviennent toute l'année.")],
              f"Sources : {SOURCE_MDP}, enquête Accenture pour le Monde de la Propreté, 2025 ; {SOURCE_AKTO_PROSP}, offres d'emploi relevées par Jobfeed du 1er octobre 2023 au 1er octobre 2025. Page mise à jour le 9 novembre 2026.")
    + fiche("Les 12 tâches où l'IA fait gagner du temps à une entreprise de propreté",
            "Bureaux, parties communes de copropriété, sites industriels ou vitrerie : pour chaque tâche, ce que l'IA change, ce qui reste à faire par vous, et le niveau de formation qui la travaille. En formation, on part de vos documents : un dossier d'appel d'offres, une fiche de site, un rapport de contrôle.",
            [("Le mémoire technique d'un appel d'offres",
              "un mémoire construit sur les critères du règlement et le CCTP de ce marché, à partir de vos méthodes, de vos moyens et de votre plan de contrôle qualité.",
              "les prix et les effectifs, que l'IA ne calcule pas, et la relecture ligne à ligne : aucune référence, aucun effectif, aucune certification inventés.",
              "Niveau 2"),
             ("Des consignes de site que chaque agent comprend",
              "la fiche de poste et les consignes d'un site en français simple, puis traduites dans la langue de chaque agent, en version courte.",
              "faire relire la traduction par quelqu'un qui parle la langue, et faire valider par l'encadrant tout ce qui touche aux produits et à la sécurité.",
              "Niveau 2"),
             ("Lire un dossier de consultation",
              "le règlement et le CCTP résumés : surfaces, fréquences, horaires, critères, pièces à fournir, et les questions à poser à l'acheteur.",
              "relire vous-même le règlement pour tout ce qui peut écarter votre offre : délais, pièces, signature.",
              "Niveau 2"),
             ("Les questionnaires RSE, RGPD et sécurité des acheteurs",
              "retrouver les réponses déjà données dans vos dossiers précédents et les adapter à la question posée.",
              "vérifier que chaque réponse est encore vraie aujourd'hui dans votre entreprise.",
              "Niveau 2, puis 3 pour une base de réponses"),
             ("Le devis et le plan de nettoyage après une visite",
              "vous dictez vos notes en sortant du site, l'IA en tire un descriptif par zone, le plan de nettoyage et le courrier du devis.",
              "le chiffrage et les cadences, qui restent dans votre outil de devis.",
              "Niveau 2"),
             ("Remplacements et compléments d'heures",
              "le message qui propose des heures à un agent, l'avenant temporaire à partir de votre modèle et le planning mis à jour.",
              "vérifier les règles de la convention collective et faire signer l'avenant avant le premier jour travaillé.",
              "Niveau 2"),
             ("Rapports d'intervention et contrôle qualité",
              "le chef d'équipe dicte ce qu'il a vu, l'IA remplit la fiche de contrôle et prépare la synthèse mensuelle pour le client.",
              "relire avant de signer, et ne rien affirmer au client que vos relevés ne montrent pas.",
              "Niveau 2, puis 3 pour brancher votre logiciel"),
             ("Répondre à une réclamation client",
              "une réponse précise et posée, appuyée sur le contrat, le cahier des charges et le relevé de passage du jour.",
              "vérifier les faits sur le site et décider d'un éventuel geste commercial.",
              "Niveau 2"),
             ("La reprise du personnel (annexe 7)",
              "à partir de la liste de transfert, noms remplacés par des numéros, un tableau de contrôle des conditions de reprise et les courriers types.",
              "la vérification salarié par salarié et la décision, avec votre service RH ou votre conseil. Les données des salariés n'entrent jamais dans un outil d'IA grand public.",
              "Niveau 2"),
             ("Offres d'emploi et accueil des nouveaux agents",
              "une annonce adaptée à chaque site et à chaque horaire, les réponses aux candidats, la convocation à l'entretien, le livret d'accueil en français simple.",
              "lire chaque candidature et choisir. Pas de tri automatique des CV : la décision reste humaine.",
              "Niveau 2"),
             ("Courriers RH et notes de service",
              "une première version d'un courrier à un salarié, d'une note de service ou d'un rappel des règles, relue pour le ton et la clarté.",
              "faire valider tout courrier disciplinaire ou de rupture par votre service RH ou votre conseil avant l'envoi.",
              "Niveaux 1 et 2"),
             ("Les demandes des clients, rangées par site",
              "chaque email d'un client, d'un syndic ou d'un responsable de site est rattaché au bon site et au bon responsable, avec un premier jet de réponse.",
              "valider chaque réponse avant l'envoi.",
              "Niveau 3")])
    + zones("Les règles qui ne changent pas avec l'IA",
            "Un appel d'offres, un avenant ou une reprise de personnel engagent l'entreprise. La formation intègre ces règles à chaque exercice.",
            [("Le mémoire technique engage l'entreprise",
              "Le mémoire est souvent une pièce du marché : ce qu'il promet, il faudra le tenir. Une IA peut inventer une référence client, un effectif ou une certification. On apprend à le lui interdire, à garder les prix hors de l'outil et à ne pas coller un dossier confidentiel dans une version grand public."),
             ("Les données des salariés",
              'Titres de séjour, arrêts maladie, absences, sanctions, plannings nominatifs : ce sont des données personnelles, et certaines sont sensibles. La <a href="https://cnil.fr/fr/utiliser-lia-generative-dans-les-tpe-et-pme" target="_blank" rel="noopener">CNIL</a> recommande de ne pas les saisir dans un outil d\'IA grand public, ou de les anonymiser.'),
             ("Des décisions qui restent humaines",
              "Recruter, reprendre un salarié, sanctionner, affecter un agent sur un site : l'IA prépare les documents, elle ne décide pas. Pas de tri automatique des CV, pas de classement des agents."),
             ("Des traductions relues",
              "Une traduction automatique peut se tromper sur un produit, un dosage ou une consigne de sécurité. Elle aide les agents qui lisent mal le français ; elle ne remplace ni la démonstration sur site ni les formations au français de la branche."),
             ("Les documents de vos clients",
              "Plans de sites, codes d'accès, badges, prix du marché en cours : ce que vos clients vous confient ne sort pas de l'entreprise. On voit quels outils et quels réglages protègent ces documents."),
             ("L'AI Act et l'encadrement",
              'Depuis sa révision de juillet 2026, l\'article 4 demande aux entreprises qui utilisent l\'IA de prendre des mesures pour développer la maîtrise de l\'IA de leur personnel : c\'est une obligation de moyens. Chaque participant reçoit une attestation individuelle de formation, et l\'entreprise un registre de conformité AI Act. <a href="/formation-ia-obligatoire-ai-act.html">Ce que demande l\'AI Act</a>')],
            ident='cadre')
    + equipe('Qui vous forme',
             "Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy. Il enseigne à l'ECM Nancy Business School depuis 2023 et forme des équipes en entreprise dans tout le Grand Est. Gilles Idoux forme à l'IA générative, à la vente et au management, notamment à l'IUT de Thionville-Yutz et à l'ECM Nancy. Votre métier, c'est vous qui le connaissez : le programme se construit avec vous, sur vos documents et avec vos mots, et se valide avant la signature.",
             [GABRIEL, GILLES], 'salon-demain-avec-ia.jpg', "Atelier animé par IA-Entrepreneur au salon Demain avec l'IA", AVIS)
    + marches('<h2 class="section-title">Trois niveaux, de la prise en main à l\'automatisation</h2>')
    + faq_section(PAGES['proprete']['faq'], "Vos questions sur la formation IA en entreprise de propreté")
    + cta('Parlons de votre entreprise',
          "Un appel de 30 minutes pour voir quelles tâches pèsent le plus sur votre encadrement : appels d'offres, remplacements, rapports, reprises de personnel. Nous montons ensuite le programme et le dossier de financement AKTO.")
)



# ───────────────────────────── AGENTS GÉNÉRAUX ET COURTIERS D'ASSURANCE ─────────────────────────────
# Faits : /Users/GabrielV/Desktop/pages-metiers/recherche/assurance.md, relus à la source le 09/11/2026 :
# Observatoire économique Agéa 2026 (PDF, étude Eurogroup Consulting d'octobre 2025 : entrée en relation 24 à 76 données,
# 44 en moyenne, 31 obligatoires ; vie 109 en moyenne ; sinistres 65 % au contact de l'assuré, dégât des eaux 4,02 contre 2,7),
# enquête Emploi-formation Agéa 2026 (80 % des salariés d'agence utilisent l'IA), communiqué Planète CSCA du 21/05/2026,
# Argus du 15/07/2026 (Allianz, Ask.me), code des assurances L511-2, R512-13-1, A512-8, L521-4, CNIL (questions-réponses
# sur l'IA générative), AI Act annexe III point 5 c) et règlement 2026/1744 (haut risque au 2 décembre 2027, page ACPR),
# Atlas (branches IDCC 2335 et 2247). Retiré de l'ancienne page : « Imputable sur vos 15h DDA » (aucun texte ne le permet
# d'avance), « zéro reste à charge », promesse de gain de temps, « 11 882 agents généraux + 26 953 courtiers » (non retrouvé),
# « 24 à 109 informations » (chiffres mal assemblés). Aucun chiffre de vendeur repris.
AGEA_OBS = ('<a href="https://agea.fr/actualites/observatoire-economique-des-agents-2026" '
            'target="_blank" rel="noopener">Agéa, Observatoire économique des agents généraux 2026</a>')
AGEA_EMPLOI = ('<a href="https://agea.fr/actualites/etude-emploi-formation-2026" '
               'target="_blank" rel="noopener">enquête Emploi-formation 2026</a>')
CSCA_VISION = ('<a href="https://www.planetecsca.fr/actualites/communiques-de-presse/planete-csca-lance-vision-ia-un-dispositif-exclusif-pour-accompagner-les-courtiers-dassurances-dans-ladoption-maitrisee-de-lintelligence-artificielle/" '
               'target="_blank" rel="noopener">communiqué du 21 mai 2026</a>')
ALLIANZ_ARGUS = ('<a href="https://www.argusdelassurance.com/compagnies/allianz/intelligence-artificielle-allianz-fait-de-lia-le-nouveau-copilote-de-ses-reseaux-de-distribution.JMRHWTWYFNGHLKALMXK6XNNXLI.html" '
                 'target="_blank" rel="noopener">juillet 2026</a>')
CONSEIL_L521_4 = ('<a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036920558" '
                  'target="_blank" rel="noopener">l\'article L521-4 du code des assurances</a>')
COMPETENCES_A512_8 = ('<a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037447099" '
                      'target="_blank" rel="noopener">article A512-8 du code des assurances</a>')
JUSTIFICATIFS_R512 = ('<a class="metier-lien" href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036979532" '
                      'target="_blank" rel="noopener">ce que le code demande de conserver</a>')
CNIL_IA_GEN = ('<a href="https://www.cnil.fr/fr/les-questions-reponses-de-la-cnil-sur-lutilisation-dun-systeme-dia-generative" '
               'target="_blank" rel="noopener">CNIL</a>')
ACPR_AI_ACT = ('<a href="https://acpr.banque-france.fr/fr/reglementation/focus-sur-la-reglementation/transverse/reglement-europeen-sur-lia-ai-act" '
               'target="_blank" rel="noopener">l\'ACPR</a>')
ATLAS_AGENTS = ('<a class="metier-lien" href="https://www.opco-atlas.fr/atlas/agents-generaux-assurance.html" '
                'target="_blank" rel="noopener">les agents généraux</a>')
ATLAS_COURTAGE = ('<a class="metier-lien" href="https://www.opco-atlas.fr/atlas/courtage-assurances-et-reassurances.html" '
                  'target="_blank" rel="noopener">le courtage</a>')

PAGES['assurance'] = dict(
    slug='formation-ia-assurance.html',
    nom='Formation IA pour agents généraux et courtiers d\'assurance',
    titre='Formation IA pour agents généraux et courtiers d\'assurance',
    desc="Formation IA pour agents généraux et courtiers d'assurance : recueil des besoins, devoir de conseil, sinistres, sur vos dossiers. Dossier OPCO Atlas monté.",
    image='metiers/assurance-conseil-client.jpg',
    public='Agents généraux et courtiers d\'assurance',
    faq=[
        ("La formation est-elle finançable par l'OPCO Atlas ?",
         f"Les agences générales appliquent la convention collective du personnel des agences générales d'assurances (IDCC 2335), les cabinets de courtage celle des entreprises de courtage d'assurances et/ou de réassurances (IDCC 2247). Les deux branches relèvent de l'OPCO Atlas, qui publie ses critères de prise en charge pour {ATLAS_AGENTS} et pour {ATLAS_COURTAGE}, dans la limite des fonds disponibles. Un cabinet de courtage en crédit dépend de la convention qu'il applique : <a class=\"metier-lien\" href=\"/simulateur-financement-formation-ia.html\">notre simulateur</a> retrouve votre OPCO à partir de votre SIRET. La formation de l'agent général lui-même, s'il n'est pas salarié, relève d'un autre financement, que nous regardons avec vous. IA-Entrepreneur est un organisme certifié Qualiopi (certificat n° 883211-2) : nous montons le dossier avec vous, et vous connaissez votre reste à charge avant de signer. Les fonds mutualisés sont réservés aux entreprises de moins de 50 salariés."),
        ("Une formation IA compte-t-elle dans mes 15 heures de formation continue DDA ?",
         f"Elle peut compter, si son contenu correspond à la liste de compétences de l'{COMPETENCES_A512_8}. Cette liste cite notamment les évolutions technologiques et leurs effets sur la distribution d'assurances, les outils du parcours client « y compris les outils digitaux », la formalisation du conseil et sa traçabilité, et la protection des données personnelles. Une formation bâtie sur votre recueil des besoins, votre devoir de conseil et la confidentialité des données de vos clients est conçue pour s'y rattacher ; une découverte générale de ChatGPT, beaucoup moins. Les 15 heures concernent chaque personne qui conseille, présente ou aide à conclure des contrats. Le code ne prévoit aucune validation à l'avance : c'est à vous de pouvoir justifier vos heures, l'ACPR contrôle, et pour un courtier son association professionnelle le vérifie aussi. Notre attestation reprend {JUSTIFICATIFS_R512} : l'organisme, la date, la durée, les modalités et les thèmes traités. Un courtier en crédit a sa propre obligation, centrée sur l'évolution de la réglementation : nous ne promettons pas qu'une formation IA y réponde."),
        ("Peut-on mettre le questionnaire de santé d'un client dans ChatGPT ?",
         f"Pas dans une version grand public, qui peut réutiliser ce qu'on lui confie. Un questionnaire médical, un arrêt de travail ou les garanties santé d'un salarié sont des données de santé, que le RGPD range parmi les données sensibles, et la {CNIL_IA_GEN} recommande de ne jamais partager de données personnelles ni d'informations confidentielles sur un service grand public. En formation, on voit quels outils et quels réglages conviennent à un cabinet, comment retirer un nom ou un numéro de contrat avant de demander quoi que ce soit, et ce qui ne sort jamais de votre logiciel ni de l'extranet de la compagnie."),
        ("L'IA peut-elle conseiller mes clients à ma place ?",
         f"Non. Selon {CONSEIL_L521_4}, le distributeur conseille un contrat cohérent avec les exigences et les besoins du client et « précise les raisons qui motivent ce conseil » : c'est votre conseil et votre responsabilité. L'IA prépare la trame de questions, la mise au propre de vos notes, le comparatif et le premier jet de la fiche de conseil. Vous décidez de ce qui est proposé, et la fiche que vous signez reprend ce que le client vous a dit, pas ce que l'outil a supposé. Le syndicat des courtiers Planète CSCA le dit ainsi : « la validation humaine reste le garant ultime de la qualité du conseil »."),
        ("Notre logiciel ou l'outil de notre compagnie a déjà de l'IA : à quoi sert une formation ?",
         "Les compagnies équipent leurs agents : Allianz a présenté en juillet 2026 un assistant qui répond à leurs questions sur les produits et la souscription. Côté courtage, Modulr indique proposer une connexion à ChatGPT pour rédiger des emails, et Planète CSCA s'est associé à Little John pour proposer aux cabinets un outil d'IA labellisé. Ces outils ne rendent service que si l'équipe sait leur poser la bonne question et vérifier ce qu'ils produisent. On part de votre logiciel et de ce que votre compagnie autorise, puis on ajoute ChatGPT, Claude, Copilot ou Mistral là où il en manque, sans y faire entrer ce qui doit rester dans vos outils."),
        FAQ_AI_ACT,
        FAQ_LIEU,
    ],
)
PAGES['assurance']['corps'] = (
    hero('Formation IA pour les agents généraux et les courtiers d\'assurance',
         'conseillers clientèle|gestionnaires en assurance|gestionnaires sinistres|chargés de développement commercial|collaborateurs d\'agence',
         "Recueil des besoins, devoir de conseil, comparatifs, sinistres, échéances : vos collaborateurs et vous-même apprenez à faire préparer le premier jet par l'IA, sur vos propres dossiers, dans vos outils et ceux de votre compagnie, et à le vérifier avant qu'il parte. Le conseil, lui, reste le vôtre.",
         ['Organisme certifié Qualiopi', 'À Nancy, Metz et Strasbourg', 'Dossier OPCO Atlas monté'],
         'metiers/assurance-conseil-client.jpg', 'Un rendez-vous de conseil')
    + reperes("Ce que vivent les agences et les cabinets",
              "En juillet 2026, Agéa, la fédération des syndicats d'agents généraux, a publié son Observatoire économique, avec pour la première fois une étude de terrain sur le travail en agence menée par Eurogroup Consulting, et son enquête Emploi-formation. Trois constats, dont un que partagent les courtiers, guident notre façon de former.",
              [("La collecte de données passe avant le conseil",
                "Selon les compagnies, une agence générale recueille de 24 à 76 informations à l'entrée en relation d'un client, 44 en moyenne, dont un tiers facultatives. Pour souscrire une assurance vie, la moyenne monte à 109. Le président d'Agéa parle d'un transfert de charges qui « grignote notre temps de conseil ». Le recueil des besoins ouvre donc la fiche ci-dessus."),
               ("Le sinistre, « moment de vérité »",
                "En gestion de sinistres, 65 % de l'activité d'une agence est consacrée au contact direct avec l'assuré : explications, relances, pièces à transmettre. Pour un dégât des eaux, l'agence intervient en moyenne 4 fois par dossier, contre 2,7 quand la compagnie le gère seule. L'IA peut préparer ces relances et ces points d'étape ; la relation reste la vôtre."),
               ("L'IA déjà dans les équipes",
                "80 % des salariés d'agence générale utilisent l'IA, au moins de temps en temps, selon l'enquête d'Agéa. Côté courtage, Planète CSCA a publié en mai 2026 une charte type et dix cas d'usage, dont la formalisation du devoir de conseil, en rappelant que « la validation humaine reste le garant ultime de la qualité du conseil ».")],
              f"Sources : {AGEA_OBS} (étude d'Eurogroup Consulting sur les charges de gestion, octobre 2025) et {AGEA_EMPLOI}, juillet 2026 ; Planète CSCA, {CSCA_VISION}. Page mise à jour le 10 novembre 2026.")
    + fiche("Les 12 tâches où l'IA fait gagner du temps à une agence générale ou un cabinet de courtage",
            "Pour chacune : ce que l'IA prépare, ce qui reste à faire par vous, et le niveau de formation qui la travaille. En formation, on part de vos propres dossiers, sans donnée nominative dans un outil grand public.",
            [("Le recueil des besoins",
              "une trame de questions adaptée au contrat, puis vos notes de fin de rendez-vous remises en ordre : situation du client, exigences et besoins, points ouverts.",
              "poser les questions, faire confirmer chaque réponse par le client et la saisir dans votre logiciel ou l'outil de la compagnie. Aucune donnée de santé dans un outil grand public.",
              "Niveau 2"),
             ("Le devoir de conseil écrit",
              "un premier jet de la fiche de conseil qui reprend les besoins exprimés, le contrat proposé et les raisons du choix, dans une langue que le client comprend.",
              "le conseil lui-même. La loi demande au distributeur de préciser « les raisons qui motivent ce conseil » : vous relisez, corrigez et signez.",
              "Niveau 2"),
             ("Comparer des propositions de compagnies",
              "un tableau des écarts entre deux ou trois offres : garanties, exclusions, franchises, plafonds, options, tiré des conditions générales et particulières.",
              "vérifier chaque ligne dans les documents d'origine, puis recommander. Le comparatif prépare votre conseil, il ne le remplace pas.",
              "Niveau 2"),
             ("Lire un contrat ou des conditions générales",
              "le contrat qu'un prospect vous apporte, des conditions générales ou un bail commercial résumés, avec les garanties manquantes repérées et les questions à poser.",
              "revenir au texte pour chaque point qui compte, avec un outil qui cite ses passages.",
              "Niveau 2"),
             ("Préparer un rendez-vous client",
              "une synthèse de l'historique du client et de ses contrats, les couvertures à revoir depuis le dernier entretien, les questions à poser.",
              "l'entretien, et ce que vous proposez au client.",
              "Niveau 2"),
             ("Suivre un sinistre",
              "la chronologie du dossier, la liste des pièces à réclamer, les relances de l'expert ou de la compagnie, et un point d'étape à l'assuré en termes simples.",
              "la position sur la garantie et les montants, qui reviennent à la compagnie et à l'expert, et ce que vous dites à l'assuré.",
              "Niveau 2, puis 3 pour les relances"),
             ("Les échéances et la revue du portefeuille",
              "la liste des contrats qui arrivent à échéance, un message de revue de contrat par client, la proposition de rendez-vous.",
              "vérifier les dates dans votre logiciel et valider chaque envoi.",
              "Niveau 2, puis 3 pour l'automatiser"),
             ("Les mails qui reviennent tous les jours",
              "attestation, changement de véhicule, question sur une franchise, demande de résiliation : des réponses types qui s'adaptent à la question posée.",
              "vérifier le contrat concerné et la pièce jointe avant d'envoyer.",
              "Niveau 2, puis 3"),
             ("Répondre à une réclamation",
              "un projet de réponse clair et posé, appuyé sur le contrat et l'historique, qui suit les étapes recommandées par l'ACPR.",
              "le fond de la réponse, et l'enregistrement de la réclamation.",
              "Niveau 2"),
             ("Connaissance client et lutte contre le blanchiment",
              "la liste des pièces à demander selon le profil du client et le contrat, le mail qui réclame ce qui manque, une synthèse du dossier pour le contrôle interne.",
              "l'analyse du risque, la décision et toute déclaration. Une pièce d'identité n'entre jamais dans un outil grand public.",
              "Niveau 2"),
             ("La veille réglementaire et produits",
              "une nouvelle règle, une note de compagnie ou un changement de garantie résumés, puis traduits en consignes simples pour l'équipe.",
              "revenir au texte officiel avant d'appliquer.",
              "Niveaux 1 et 2"),
             ("Prospection et relation client",
              "des publications LinkedIn, une lettre régulière aux clients, des réponses aux avis Google, un message de prise de rendez-vous pour un bilan.",
              "garder le ton du cabinet, relire, et respecter les règles du démarchage.",
              "Niveaux 1 et 2")])
    + zones("Ce que l'IA ne change pas à vos obligations",
            "Devoir de conseil, données de santé, procédures de la compagnie : vos règles restent les mêmes avec l'IA, et chaque exercice de la formation en tient compte.",
            [("Le conseil reste le vôtre",
              f"Selon {CONSEIL_L521_4}, le distributeur conseille un contrat cohérent avec les exigences et les besoins du client et « précise les raisons qui motivent ce conseil ». L'IA met en forme ce que vous avez recueilli ; elle ne connaît ni votre client ni votre responsabilité."),
             ("Les données de santé",
              f"Questionnaire médical, arrêt de travail, garanties santé d'un salarié : ce sont des données de santé, que le RGPD range parmi les données sensibles. La {CNIL_IA_GEN} recommande de ne jamais partager de données personnelles ni d'informations confidentielles « lors de l'utilisation d'un service grand public ». On voit en formation quels outils et quels réglages conviennent à un cabinet."),
             ("Les outils de votre compagnie",
              f"Une agence générale travaille dans les outils de sa compagnie, et certaines y ajoutent de l'IA : Allianz a présenté en {ALLIANZ_ARGUS} un assistant qui répond aux questions de ses agents sur les produits et la souscription. On part de ce que votre compagnie fournit et autorise, avant d'ajouter un autre outil."),
             ("Connaissance client et blanchiment",
              "Un courtier est lui-même soumis aux obligations de lutte contre le blanchiment ; une agence générale applique les procédures de sa compagnie. Dans les deux cas, l'IA aide à lister les pièces et à relancer, jamais à juger un risque ni à décider d'une déclaration."),
             ("L'AI Act et le haut risque",
              f"Écrire un mail ou résumer des conditions générales avec ChatGPT ne relève pas du haut risque. L'AI Act classe à haut risque les systèmes d'IA destinés à évaluer le risque et à fixer le tarif des personnes en assurance vie et en assurance maladie : ces règles s'appliquent à partir du 2 décembre 2027, et {ACPR_AI_ACT} en surveillera l'application dans le secteur financier. Pour vos équipes, l'article 4 demande des mesures de maîtrise de l'IA : une obligation de moyens. <a href=\"/formation-ia-obligatoire-ai-act.html\">Ce que demande l'AI Act</a>"),
             ("Vos 15 heures de formation continue",
              f"Une formation IA peut être présentée au titre de la formation continue DDA si son contenu correspond aux compétences de l'{COMPETENCES_A512_8} et à vos fonctions. Le code ne prévoit pas de validation à l'avance : c'est à vous d'en justifier. Notre attestation indique l'organisme, la date, la durée, les modalités et les thèmes traités.")],
            ident='cadre')
    + equipe('Qui vous forme',
             "Gabriel Vanderbecken a fondé IA-Entrepreneur à Nancy et forme des équipes en entreprise dans tout le Grand Est. Gilles Idoux a passé huit ans dans l'assurance, en B2B et en B2C, après vingt ans en agence bancaire, de l'accueil au guichet à la direction d'agence ; il forme aujourd'hui à l'IA générative, à la vente et au management. Votre métier, c'est vous qui le connaissez : le programme se construit sur vos dossiers et avec vos mots, et se valide avant la signature.",
             [GABRIEL, GILLES], 'accompagnement-gabriel.jpg', 'Gabriel Vanderbecken avec un participant', AVIS)
    + marches('<h2 class="section-title">Trois niveaux, de la prise en main à l\'automatisation</h2>')
    + faq_section(PAGES['assurance']['faq'], "Vos questions sur la formation IA en agence générale et en cabinet de courtage")
    + cta('Parlons de votre agence ou de votre cabinet',
          "Un appel de 30 minutes pour voir ce que votre équipe fait déjà avec l'IA, ce que vos outils et votre compagnie permettent, et par quelles tâches commencer. Nous montons ensuite le programme et le dossier de financement Atlas.")
)


METIERS = [('formation-ia-agence-immobiliere.html', 'agences immobilières'),
           ('formation-ia-syndic-gestion-locative.html', 'syndics et gestion locative'),
           ('formation-ia-btp.html', 'BTP'),
           ('formation-ia-proprete.html', 'entreprises de propreté'),
           ('formation-ia-assurance.html', 'assurance')]


def autres_metiers(slug):
    """Maillage entre pages métier, placé avant l'appel final."""
    liens = [f'<a class="metier-lien" href="/{s}">{n}</a>' for s, n in METIERS if s != slug]
    return f'''
  <section class="metier-voisins">
    <div class="container">
      <p>La formation IA dans d'autres métiers : {', '.join(liens[:-1])} et {liens[-1]}. Toutes nos formations : <a class="metier-lien" href="/formation-ia-entreprise.html">formation IA en entreprise</a>.</p>
    </div>
  </section>
'''


def jsonld(p):
    url = f"{SITE}/{p['slug']}"
    fil = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Formations IA", "item": f"{SITE}/formation-ia-entreprise.html"},
        {"@type": "ListItem", "position": 3, "name": p['nom'], "item": url}]}
    service = {"@context": "https://schema.org", "@type": "Service", "name": p['nom'],
               "serviceType": "Formation à l'intelligence artificielle pour les entreprises", "url": url,
               "description": p['desc'],
               "audience": {"@type": "BusinessAudience", "audienceType": p['public']},
               "provider": {"@type": "LocalBusiness", "@id": f"{SITE}/#local", "name": "IA-Entrepreneur", "url": SITE,
                            "telephone": TEL_SCHEMA, "address": ADRESSE},
               "areaServed": [{"@type": "AdministrativeArea", "name": "Grand Est"}, {"@type": "Country", "name": "France"}]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": texte(q), "acceptedAnswer": {"@type": "Answer", "text": texte(r)}} for q, r in p['faq']]}
    return '\n'.join(f'  <script type="application/ld+json">{json.dumps(o, ensure_ascii=False, separators=(",", ":"))}</script>'
                     for o in (fil, service, faq))


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
    t = re.sub(r'\n  <script type="application/ld\+json">.*?</script>', '', t, flags=re.S)
    t = t.replace(f'<meta name="twitter:image" content="{img}"/>', f'<meta name="twitter:image" content="{img}"/>\n' + jsonld(p), 1)
    t = t.replace('</style>', CSS + '</style>', 1)
    debut = t.index('  <section class="imm-outil-hero">')
    fin = t.index('<footer>')
    corps = p['corps']
    i = corps.rindex('\n  <section class="cta-final">')
    corps = corps[:i] + autres_metiers(p['slug']) + corps[i:]
    # immersion.js fait entrer en cascade, au défilement, tout élément .reveal (et rien si l'appareil demande moins d'animations)
    corps = corps.replace('class="imm-limite"', 'class="imm-limite reveal"')
    # Le but de la page est l'appel de 30 minutes : c'est le bouton principal du hero, et le second mène à la fiche
    nb = corps.count('class="fiche-tache"')
    ancien = (f'<a href="/formation-ia-entreprise.html#devis" class="btn-primary">Construire mon programme {FLECHE}</a>\n'
              '          <a href="/rendez-vous.html" class="imm-lien">Réserver un appel de 30 min</a>')
    assert corps.count(ancien) == 1, p['slug']
    corps = corps.replace(ancien, f'<a href="/rendez-vous.html" class="btn-primary">Réserver un appel de 30 min {FLECHE}</a>\n'
                                  f'          <a href="#fiche" class="imm-lien">Voir les {nb} tâches</a>')
    # La fiche passe avant les constats : c'est elle que le visiteur vient chercher
    f = re.search(r'\n  <section class="fiche-section" id="fiche">.*?\n  </section>\n', corps, re.S).group(0)
    k = re.search(r'\n  <section class="imm-limites-section" id="constats">.*?\n  </section>\n', corps, re.S).group(0)
    corps = corps.replace(f, '').replace(k, f + k)
    t = t[:debut] + corps.lstrip('\n') + '\n' + t[fin:]
    return t


if __name__ == '__main__':
    for cle, p in PAGES.items():
        (RACINE / p['slug']).write_text(page(p))
        print('écrit', p['slug'], len(p['titre']), len(p['desc']))
