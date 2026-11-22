#!/usr/bin/env python3
"""Génère developpement-application-sur-mesure.html : la page « Développement ».

Gabriel, 21/11/2026 : « on est un centre de formation IA et on remplace
l'onglet intégration par développement, et dedans on ajoute en page principale
que je fais du développement web, mobile, interne, avec des images de Clindit,
IA-Entrepreneur, Ella, mon profil Codeur.com, et il faut dire aussi les exemples
de ce qu'on a mis comme intégration dans ces apps : chatbot, SEO automatique,
prospection LinkedIn ».

Ordre validé le même jour : l'accroche de sa bannière Codeur, le parcours
formation, intégration en 48 h, sur mesure, les réalisations avec les visuels
du portfolio, sa méthode (tri des fonctionnalités, devis au forfait,
maintenance), le rendez-vous avec lui.

Règles de texte (mémoire « Offre dev : tout type d'app ») : ouvrir sur toute la
gamme (application à lancer, logiciel vendu par abonnement, marketplace, outil
interne), jamais réduire le développement à « un outil qui fait gagner du
temps ». Le développement n'est pas finançable par un budget formation ; seules
les formations le sont. Ella reste sans le nom de la cliente ni de son
organisme (captures en données de démonstration).

Même gabarit que les pages villes (en-tête, menu généré, pied de page de
formation-claude-entreprise.html) : relancer ce script après un changement de
menu. Idempotent.
Usage : python3 generer_page_developpement.py
"""
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # pas de __pycache__ servi par Vercel
RACINE = Path(__file__).resolve().parent
sys.path.insert(0, str(RACINE))
import generer_pages_villes as v  # noqa: E402  (gabarit, FAQ, JSON-LD communs)
from nettoyage_typo import nettoie_html  # noqa: E402

SITE = v.SITE
SLUG = 'developpement-application-sur-mesure.html'
FLECHE = v.FLECHE
IMG = '/images/developpement'

# Le rendez-vous se prend avec Gabriel seul (ses deux agendas lus), et la page
# de RDV adapte son texte au projet d'application (sujet=application).
RDV = '/rendez-vous.html?avec=gabriel&amp;sujet=application'

# Liens publics de Clindit, relevés sur clindit.com le 21/11/2026.
APP_STORE = 'https://apps.apple.com/fr/app/clindit-m%C3%A9nage-nettoyage/id6767279190'
GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.clindit.app&amp;hl=fr'
CLINDIT = 'https://www.clindit.com/'

# Adresse publique du profil Codeur.com : à renseigner (Gabriel). Tant qu'elle
# manque, la carte s'affiche sans lien.
CODEUR = None

TITRE = "Développement d'application sur mesure, web et mobile"
DESC = ("Applications mobiles, logiciels web, SaaS et outils internes, de l'idée à la maintenance, "
        "par un fondateur dont l'app est sur l'App Store et Google Play.")


def cas(surtitre, titre, intro, points, techno, image, alt, legende='', liens='', inverse=False, ident=''):
    pts = '\n'.join(f'            <li>{p}</li>' for p in points)
    leg = f'<figcaption>{legende}</figcaption>' if legende else ''
    idt = f' id="{ident}"' if ident else ''
    return f'''
      <article class="dv-cas{' inverse' if inverse else ''}"{idt}>
        <figure class="dv-cas-visuel"><img src="{IMG}/{image}" alt="{alt}" width="1280" height="680" loading="lazy" decoding="async">{leg}</figure>
        <div class="dv-cas-texte">
          <p class="dv-surtitre">{surtitre}</p>
          <h3>{titre}</h3>
          <p>{intro}</p>
          <ul>
{pts}
          </ul>
          <p class="dv-techno"><b>Technologies :</b> {techno}</p>{liens}
        </div>
      </article>'''


def integration(titre, texte, lien=None):
    a = f'\n          <a class="imm-lien" href="{lien[1]}">{lien[0]}</a>' if lien else ''
    return f'''        <div class="dv-integ-carte">
          <h3>{titre}</h3>
          <p>{texte}</p>{a}
        </div>'''


CLINDIT_CAS = cas(
    'Ma propre application',
    'Clindit, la marketplace du nettoyage',
    "Clindit met en relation particuliers et entreprises avec des professionnels du nettoyage vérifiés, sans commission. "
    "Je l'ai conçue, développée et mise en ligne, et je la fais évoluer. Elle est sur l'App Store depuis juillet 2026.",
    [
        "Le site web et l'application iOS et Android, avec une API et une base de données communes.",
        "La publication d'une demande sans créer de compte, la messagerie entre clients et professionnels, le filtre par budget.",
        "Trois formules d'abonnement pour les professionnels, avec paiement en ligne par Stripe.",
        "Les alertes de nouvelles missions, le parrainage et les relances automatiques.",
        "Un agent IA (Claude) qui vérifie les dossiers des professionnels, me demande mon avis en cas de doute et répond aux messages du support.",
    ],
    'Next.js, React, React Native (Expo), Supabase, Stripe, API Claude.',
    'clindit-site-et-app.jpg',
    "Le site Clindit sur ordinateur et l'application Clindit sur téléphone",
    liens=f'''
          <div class="dv-liens">
            <a class="imm-lien" href="{APP_STORE}" target="_blank" rel="noopener">Voir sur l'App Store</a>
            <a class="imm-lien" href="{GOOGLE_PLAY}" target="_blank" rel="noopener">Voir sur Google Play</a>
            <a class="imm-lien" href="{CLINDIT}" target="_blank" rel="noopener">Visiter clindit.com</a>
          </div>''',
    ident='clindit')

ELLA_CAS = cas(
    'Pour une cliente',
    "Ella, le logiciel de gestion des organismes de formation",
    "Un logiciel en ligne qui gère l'administratif d'un organisme de formation. Je l'ai conçu et développé de A à Z "
    "pour une dirigeante qui va le vendre par abonnement à d'autres organismes.",
    [
        "Une session saisie une seule fois produit les 14 documents réglementaires : convention, convocation, émargements, évaluations, attestations, facture.",
        "Les évaluations partent aux dates prévues, avec une relance automatique des stagiaires qui n'ont pas répondu.",
        "La fiche entreprise se remplit à partir du SIRET (API de l'État) et l'OPCO se retrouve grâce aux données ouvertes de France compétences.",
        "Signature électronique des conventions par simple lien, émargement signé du doigt sur téléphone.",
        "Plusieurs organismes sur la même plateforme, chacun ne voit que ses données ; abonnements et paiements par Stripe.",
    ],
    'Next.js, TypeScript, Supabase, Stripe, Resend, Microsoft Teams.',
    'ella-logiciel.jpg',
    "Le tableau de bord d'Ella sur ordinateur et la feuille d'émargement sur téléphone",
    legende='Captures réalisées avec des données de démonstration.',
    inverse=True, ident='ella')

IAE_CAS = cas(
    'Notre organisme de formation',
    "IA-Entrepreneur, le site et les outils de l'équipe",
    "Le site que vous lisez, et les outils internes avec lesquels nos commerciaux et nos formateurs travaillent chaque jour.",
    [
        "Un blog alimenté automatiquement : 144 articles rédigés par l'IA et publiés par une automatisation depuis avril 2026.",
        "Un annuaire de 130 outils d'IA, avec un conseiller qui recommande les bons outils selon la situation que décrit le visiteur.",
        "Un outil gratuit qui trouve l'OPCO et le budget formation d'une entreprise à partir de son SIRET.",
        "Un CRM sur mesure pour l'équipe : emails triés par l'IA et rattachés au bon client, relances préparées, rendez-vous répartis entre les commerciaux selon leurs agendas.",
        "Un espace formateur : dossier en ligne, pièces lues par l'IA, contrat signé en ligne, évaluations de fin de formation par QR code.",
    ],
    'HTML et JavaScript sans framework, Vercel, Supabase, n8n, API Claude, Brevo, API Gmail et Google Agenda.',
    'ia-entrepreneur-site.jpg',
    "La page d'accueil d'IA-Entrepreneur sur ordinateur et sur téléphone",
    legende="Le CRM et l'espace formateur restent internes : ils contiennent des données de clients.",
    ident='ia-entrepreneur')

if CODEUR:
    LIEN_CODEUR = f'\n          <a class="dv-codeur-lien" href="{CODEUR}" target="_blank" rel="noopener">Voir mon profil Codeur.com</a>'
else:
    LIEN_CODEUR = ''

CODEUR_CARTE = f'''
      <div class="dv-codeur" id="codeur">
        <img src="{IMG}/codeur-banniere.png" alt="Bannière du profil Codeur.com de Gabriel Vanderbecken : votre application, développée par quelqu'un qui gère déjà la sienne" width="3100" height="640" loading="lazy" decoding="async">
        <div>
          <h3>Mon profil sur Codeur.com</h3>
          <p>Vous me trouverez aussi sur Codeur.com, la plateforme française de freelances, avec mon portfolio et mes réalisations.</p>{LIEN_CODEUR}
        </div>
      </div>'''

INTEGRATIONS = [
    ("Un chatbot qui répond aux clients",
     "Dans Clindit, un agent IA répond aux messages du support. Sur notre site, un conseiller IA recommande les outils adaptés à la situation que décrit le visiteur.",
     ("Créer mon chatbot client", '/integration-chatbot-client.html')),
    ("Du contenu SEO publié automatiquement",
     "144 articles du blog d'IA-Entrepreneur ont été rédigés par l'IA et publiés par une automatisation, avec leur image et leurs liens vers les autres articles.",
     ("Produire mon contenu SEO", '/integration-contenu-seo.html')),
    ("La prospection LinkedIn suivie dans le CRM",
     "Invitations envoyées, messages préparés par l'IA puis validés, réponses repérées chaque matin et rangées dans la fiche du prospect.",
     ("Automatiser ma prospection LinkedIn", '/integration-prospection-linkedin.html')),
    ("Des emails triés et des réponses préparées",
     "Chaque email reçu est lu par l'IA, rattaché au bon client dans le CRM avec la tâche à faire, et les relances sont rédigées à partir de l'historique des échanges.",
     ("Répondre à mes emails automatiquement", '/integration-reponse-email.html')),
    ("Des documents vérifiés par l'IA",
     "Clindit fait vérifier les dossiers des professionnels par un agent IA, qui me demande mon avis en cas de doute. Notre espace formateur lit chaque pièce reçue et signale celles qui expirent.",
     None),
    ("Des relances qui partent toutes seules",
     "Ella envoie les évaluations aux dates prévues et relance les stagiaires qui n'ont pas répondu. Clindit prévient les professionnels des nouvelles missions près de chez eux.",
     None),
]

FAQ = [
    ("Combien coûte le développement d'une application ?",
     "Le prix dépend de ce que la première version doit contenir. Je vous propose un contenu à partir de mon expérience, vous le validez ou l'adaptez, puis vous recevez un devis au forfait, découpé en étapes : vous connaissez le prix avant que le développement commence."),
    ("Quels types d'applications développez-vous ?",
     "Des applications mobiles iOS et Android, des sites et des plateformes web, des logiciels en ligne (SaaS) à vendre par abonnement, des marketplaces, des outils internes pour vos équipes (CRM, espace client, back-office) et des automatisations avec l'IA."),
    ("Pouvez-vous reprendre un projet commencé avec Lovable ou Bolt ?",
     "Oui. Je reprends aussi les projets commencés avec Lovable, Bolt ou un autre prestataire, pour les terminer, les mettre en ligne et les maintenir."),
    ("Le développement est-il finançable par le budget formation ?",
     "Non. Le budget formation finance la formation des salariés, pas le développement d'une application. Si vous voulez que vos équipes apprennent à construire leurs propres outils, nos <a class=\"ville-lien\" href=\"/formation-ia-entreprise.html\">formations IA</a>, elles, sont finançables sur votre budget formation : IA-Entrepreneur est un organisme de formation certifié Qualiopi."),
    ("Avec quelles technologies travaillez-vous ?",
     "Next.js, React et TypeScript pour le web, React Native (Expo) pour les applications mobiles, Node.js, Supabase (PostgreSQL), Stripe pour les paiements, Vercel pour l'hébergement, n8n et l'API Claude pour les automatisations et l'IA."),
    ("Qui sera mon interlocuteur ?",
     "Moi, Gabriel Vanderbecken, du premier conseil à la maintenance : je vous conseille, je développe, je mets en ligne et je maintiens votre application."),
]

CORPS = f'''
  <section class="dv-hero">
    <div class="container dv-hero-grille">
      <div>
        <p class="dv-auteur"><img src="/images/gabriel-vanderbecken.jpg" alt="" width="64" height="64">Gabriel Vanderbecken, fondateur d'IA-Entrepreneur et créateur de Clindit</p>
        <h1>Votre application, développée par quelqu'un qui gère déjà la sienne.</h1>
        <ul class="dv-services">
          <li>Applications mobiles</li>
          <li>Sites et logiciels web</li>
          <li>Outils internes</li>
          <li>Automatisations et IA</li>
        </ul>
        <p class="lead">Vous voulez lancer une application, un logiciel à vendre par abonnement, une marketplace, ou équiper vos équipes d'un outil interne sur mesure ? Je le construis avec vous, de l'idée à la maintenance, en commençant par ce qui compte le plus pour votre projet.</p>
        <div class="imm-voie-actions">
          <a href="{RDV}" class="btn-primary">Parler de mon projet {FLECHE}</a>
          <a href="#realisations" class="imm-lien">Voir mes réalisations</a>
        </div>
        <ul class="imm-outil-faits">
          <li>Ma propre app sur l'App Store et Google Play</li>
          <li>2 logiciels conçus de A à Z</li>
          <li>Plus de 150 stagiaires formés à l'IA</li>
        </ul>
      </div>
      <figure class="dv-tel">
        <div class="dv-tel-cadre"><img src="{IMG}/clindit-app-ecran.jpg" alt="L'application Clindit sur iPhone : les missions de nettoyage disponibles" width="720" height="1560" fetchpriority="high"></div>
        <figcaption><b>Clindit, mon application</b>
          <span class="dv-stores"><a href="{APP_STORE}" target="_blank" rel="noopener">App Store</a><a href="{GOOGLE_PLAY}" target="_blank" rel="noopener">Google Play</a></span>
        </figcaption>
      </figure>
    </div>
  </section>

  <section class="dv-section dv-alt" id="parcours">
    <div class="container">
      <h2 class="section-title">Former, installer ou développer</h2>
      <p class="section-sub">IA-Entrepreneur est d'abord un organisme de formation à l'IA. Quand vos équipes n'ont pas le temps d'apprendre, on installe l'outil pour vous. Quand aucun outil existant ne convient, je le développe.</p>
      <div class="dv-voies">
        <div class="dv-voie">
          <h3>Former vos équipes</h3>
          <p>Vos salariés apprennent l'IA sur leurs cas réels, jusqu'à créer leurs propres outils : agents IA, automatisations, outils internes. Formations finançables sur votre budget formation, organisme certifié Qualiopi.</p>
          <a class="imm-lien" href="/formation-ia-entreprise.html">Voir les formations IA</a>
        </div>
        <div class="dv-voie">
          <h3>Installer une intégration en 48 h</h3>
          <p>Un chatbot pour vos clients, des réponses aux emails préparées, vos contenus SEO publiés au fil de l'eau : des outils éprouvés, configurés pour vous et opérationnels en 48 h après validation du devis.</p>
          <a class="imm-lien" href="/integrations-ia.html">Voir les intégrations IA</a>
        </div>
        <div class="dv-voie dv-voie-ici">
          <h3>Développer sur mesure</h3>
          <p>Une application mobile, un logiciel à vendre par abonnement, une marketplace, un outil interne : conçu pour votre projet, puis mis en ligne et maintenu.</p>
          <span class="dv-ici">Vous êtes sur cette page</span>
        </div>
      </div>
    </div>
  </section>

  <section class="dv-section" id="realisations">
    <div class="container">
      <h2 class="section-title">Mes réalisations</h2>
      <p class="section-sub">Trois projets conçus et développés de A à Z : mon application, le logiciel d'une cliente, et le site et les outils internes de notre organisme de formation.</p>
{CLINDIT_CAS}
{ELLA_CAS}
{IAE_CAS}
{CODEUR_CARTE}
    </div>
  </section>

  <section class="dv-section dv-alt" id="integrations">
    <div class="container">
      <h2 class="section-title">L'IA intégrée dans ces applications</h2>
      <p class="section-sub">Les intégrations que je vous propose, je les ai d'abord construites pour ces produits, et elles servent tous les jours.</p>
      <div class="dv-integ">
{chr(10).join(integration(*i) for i in INTEGRATIONS)}
      </div>
      <p class="dv-integ-tout"><a class="imm-lien" href="/integrations-ia.html">Voir toutes les intégrations IA</a></p>
    </div>
  </section>

  <section class="dv-section" id="methode">
    <div class="container">
      <h2 class="section-title">Ma méthode</h2>
      <p class="section-sub">Faire vivre Clindit m'a appris ce qu'on ne voit pas au moment du devis : ce que les utilisateurs attendent vraiment, les fonctions dont ils se servent et celles qu'ils ignorent, les paiements, les mises à jour sur les stores, les corrections à faire vite. Ma façon de travailler en découle.</p>
      <ol class="dv-etapes">
        <li><h3>Des conseils avant le code</h3><p>Mon expérience me sert à préparer au mieux le lancement de votre projet. Je vous signale ce qui est indispensable à vos utilisateurs dès la première version, ce qui peut venir dans une version suivante, et ce qui coûterait du temps de développement sans rien apporter. Inscription, paiement, notifications, espace client : je m'appuie sur ce que j'ai vu marcher, ou non, sur mes propres produits. La décision vous revient : je propose, puis je m'adapte à vos exigences et à vos priorités.</p></li>
        <li><h3>Un devis au forfait</h3><p>Une fois le contenu de la première version validé par vous, vous recevez un devis au forfait, découpé en étapes : vous connaissez le prix avant de commencer. Pendant le développement, je vous montre régulièrement l'avancement.</p></li>
        <li><h3>La mise en ligne</h3><p>Je m'occupe de tout ce qu'il faut pour ouvrir au public : l'hébergement, le nom de domaine, le paiement en ligne, la publication sur l'App Store et Google Play.</p></li>
        <li><h3>La maintenance</h3><p>Après la mise en ligne, je corrige, je mets à jour et je fais évoluer votre application. Le premier mois après la mise en ligne est compris.</p></li>
      </ol>
      <p class="dv-un-seul">Un seul interlocuteur, du premier conseil à la maintenance.</p>
    </div>
  </section>

  <section class="faq-section" id="faq">
    <div class="container">
      <h2 class="section-title">Vos questions sur le développement sur mesure</h2>
      <div class="faq-list" style="max-width:820px;margin-top:28px">
{v.faq_html(FAQ)}
      </div>
    </div>
  </section>

  <section class="cta-final">
    <div class="container">
      <h2>Parlez-moi de votre projet</h2>
      <p>30 minutes en visio : je vous donnerai un avis franc sur ce qui vaut la peine d'être développé maintenant, et ce qui peut attendre.</p>
      <div class="imm-voie-actions" style="justify-content:center">
        <a href="{RDV}" class="btn-primary">Choisir un créneau avec moi {FLECHE}</a>
      </div>
    </div>
  </section>
'''

CSS = """
  /* Page « Développement » (generer_page_developpement.py, 21/11/2026) */
  html{scroll-padding-top:72px}
  .dv-hero{padding:calc(var(--imm-haut,68px) + 52px) 0 56px;background:#F0F3FF;border-bottom:1px solid var(--border)}
  .dv-hero-grille{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:56px;align-items:center}
  .dv-auteur{display:inline-flex;align-items:center;gap:10px;margin:0 0 20px;padding:5px 14px 5px 5px;border-radius:999px;background:#fff;border:1px solid var(--border);font-size:.85rem;font-weight:600;color:var(--text);line-height:1.35}
  .dv-auteur img{width:32px;height:32px;border-radius:50%;object-fit:cover;object-position:top center;flex:none}
  .dv-hero h1{font-size:clamp(2.1rem,4.1vw,3.2rem);font-weight:900;line-height:1.07;letter-spacing:-.02em;margin:0 0 18px;max-width:17ch}
  .dv-services{display:flex;flex-wrap:wrap;gap:6px 22px;list-style:none;margin:0 0 18px;padding:0;font-weight:700;font-size:.98rem;color:var(--text)}
  .dv-services li{display:flex;align-items:center;gap:9px}
  .dv-services li::before{content:"";width:7px;height:7px;border-radius:2px;background:var(--accent);flex:none}
  .dv-hero .lead{font-size:1.08rem;color:var(--muted);line-height:1.7;max-width:58ch;margin:0 0 24px}
  .dv-hero .imm-outil-faits{margin-top:20px}
  .dv-tel{margin:0;display:flex;flex-direction:column;align-items:center;gap:16px}
  .dv-tel-cadre{width:min(270px,100%);border-radius:42px;background:#0b0d10;padding:10px;box-shadow:0 40px 80px rgba(26,60,255,.20),0 0 0 1px rgba(10,15,44,.08)}
  .dv-tel-cadre img{width:100%;height:auto;aspect-ratio:720/1560;border-radius:32px;display:block}
  .dv-tel figcaption{text-align:center;font-size:.92rem;color:var(--text)}
  .dv-tel figcaption b{display:block;margin-bottom:8px}
  .dv-stores{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
  .dv-stores a{font-size:.84rem;font-weight:700;color:var(--text);padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:#fff;text-decoration:none}
  .dv-stores a:hover{border-color:var(--text)}
  .dv-section{padding:72px 0}
  .dv-alt{background:var(--bg2)}
  .dv-voies{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:28px}
  .dv-voie{background:#fff;border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
  .dv-voie h3{font-size:1.08rem;font-weight:800;margin:0}
  .dv-voie p{margin:0 0 6px;font-size:.94rem;line-height:1.7;color:var(--muted)}
  .dv-voie .imm-lien,.dv-ici{margin-top:auto}
  .dv-voie-ici{border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}
  .dv-ici{font-size:.84rem;font-weight:700;color:var(--primary)}
  .dv-cas{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:52px;align-items:start;padding:48px 0;border-top:1px solid var(--border)}
  .dv-cas:first-of-type{border-top:0;padding-top:32px}
  .dv-cas.inverse .dv-cas-visuel{order:2}
  .dv-cas-visuel{margin:0;position:sticky;top:calc(var(--imm-haut,68px) + 24px)}
  .dv-cas-visuel img{width:100%;height:auto;border-radius:16px;display:block;border:1px solid var(--border)}
  .dv-cas-visuel figcaption{font-size:.82rem;color:var(--muted);margin-top:10px;line-height:1.5}
  .dv-surtitre{font-size:.82rem;font-weight:700;color:var(--primary);margin:0 0 8px}
  .dv-cas h3{font-size:1.45rem;font-weight:800;line-height:1.2;margin:0 0 12px}
  .dv-cas-texte>p{font-size:.98rem;line-height:1.7;color:var(--muted);margin:0 0 14px}
  .dv-cas ul{margin:0 0 16px;padding:0;list-style:none}
  .dv-cas li{position:relative;padding-left:22px;margin-bottom:9px;font-size:.94rem;line-height:1.6;color:var(--text)}
  .dv-cas li::before{content:"\\2713";position:absolute;left:0;top:0;color:#0B7A57;font-weight:800}
  .dv-cas-texte>p.dv-techno{font-size:.88rem;margin-bottom:12px}
  .dv-techno b{color:var(--text)}
  .dv-liens{display:flex;flex-wrap:wrap;gap:8px 20px}
  .dv-codeur{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:32px;align-items:center;margin-top:24px;padding:24px;border-radius:18px;background:#0d1014;color:#f4f6f8}
  .dv-codeur img{width:100%;height:auto;border-radius:10px;display:block;border:1px solid #2a323d}
  .dv-codeur h3{font-size:1.2rem;font-weight:800;margin:0 0 8px;color:#fff}
  .dv-codeur p{margin:0 0 12px;font-size:.95rem;line-height:1.7;color:#c9d1db}
  .dv-codeur-lien{font-weight:700;font-size:.92rem;color:#c4f06a;text-decoration:underline;text-underline-offset:3px}
  .dv-integ{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:28px}
  .dv-integ-carte{background:#fff;border:1px solid var(--border);border-radius:16px;padding:22px 24px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
  .dv-integ-carte h3{font-size:1.02rem;font-weight:800;margin:0}
  .dv-integ-carte p{margin:0 0 6px;font-size:.93rem;line-height:1.7;color:var(--muted)}
  .dv-integ-carte .imm-lien{margin-top:auto}
  .dv-integ-tout{margin:24px 0 0}
  .dv-etapes{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;counter-reset:etape}
  .dv-etapes li{counter-increment:etape;position:relative;padding:22px 0 22px 54px;border-top:1px solid var(--border)}
  .dv-etapes li::before{content:counter(etape);position:absolute;left:0;top:20px;width:36px;height:36px;border-radius:50%;background:var(--text);color:#fff;font-weight:800;font-size:.95rem;display:flex;align-items:center;justify-content:center}
  .dv-etapes h3{font-size:1.05rem;font-weight:800;margin:0 0 6px}
  .dv-etapes p{margin:0;font-size:.94rem;line-height:1.7;color:var(--muted)}
  .dv-un-seul{margin:22px 0 0;font-weight:700;color:var(--text)}
  @media (max-width:1024px){
    .dv-hero-grille,.dv-cas,.dv-codeur{grid-template-columns:1fr;gap:28px}
    .dv-cas.inverse .dv-cas-visuel{order:0}
    .dv-cas-visuel{position:static}
    .dv-voies,.dv-integ{grid-template-columns:repeat(2,minmax(0,1fr))}
    .dv-hero h1{max-width:none}
  }
  @media (max-width:768px){
    .dv-hero{padding:calc(var(--imm-haut,72px) + 24px) 0 40px}
    .dv-section{padding:52px 0}
    .dv-voies,.dv-integ,.dv-etapes{grid-template-columns:1fr}
    .dv-tel-cadre{width:190px;border-radius:32px;padding:7px}
    .dv-tel-cadre img{border-radius:25px}
    .dv-cas{padding:36px 0}
    .dv-cas h3{font-size:1.25rem}
    .dv-codeur{padding:18px}
  }
"""


def jsonld():
    url = f'{SITE}/{SLUG}'
    fil = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Développement", "item": url}]}
    service = {"@context": "https://schema.org", "@type": "Service", "name": "Développement d'applications sur mesure",
               "serviceType": "Développement d'applications web et mobiles", "url": url, "description": DESC,
               "areaServed": {"@type": "Country", "name": "France"},
               "provider": {"@type": "Person", "name": "Gabriel Vanderbecken",
                            "jobTitle": "Fondateur d'IA-Entrepreneur",
                            "worksFor": {"@type": "Organization", "@id": f"{SITE}/#local", "name": "IA-Entrepreneur", "url": SITE}}}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": v.texte(q), "acceptedAnswer": {"@type": "Answer", "text": v.texte(r)}} for q, r in FAQ]}
    return '\n'.join(f'  <script type="application/ld+json">{json.dumps(o, ensure_ascii=False, separators=(",", ":"))}</script>'
                     for o in (fil, service, faq))


def construire():
    # Espace insécable devant « : ; ? ! » : un deux-points ne commence jamais une ligne.
    corps = re.sub(r' ([:;?!])(?=[\s<])', '\u00a0\\1', CORPS)
    p = {'slug': SLUG, 'titre': TITRE, 'desc': DESC, 'image': 'developpement/clindit-site-et-app.jpg',
         'faq': FAQ, 'corps': corps, 'nom': '', 'zone': []}
    t = v.page(p)
    # JSON-LD propre à cette page (le gabarit des villes pose un Service local).
    t = re.sub(r'\n  <script type="application/ld\+json">.*?</script>', '', t, flags=re.S)
    img = f'{SITE}/images/developpement/clindit-site-et-app.jpg'
    t = t.replace(f'<meta name="twitter:image" content="{img}"/>', f'<meta name="twitter:image" content="{img}"/>\n' + jsonld(), 1)
    t = t.replace(v.CSS + '</style>', v.CSS + CSS + '</style>', 1)
    # Pas d'outil OPCO sur cette page : le script du gabarit ne sert à rien ici.
    t = t.replace('<script defer src="/outil-opco.js"></script>\n', '')
    return nettoie_html(t)


if __name__ == '__main__':
    html = construire()
    (RACINE / SLUG).write_text(html)
    print('écrit', SLUG, len(TITRE), len(DESC))
