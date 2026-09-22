#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
simplifier_nav.py — Allège la navigation de toutes les pages du site.

Décision de Gabriel (04/09/2026) : la barre du haut comptait 8 entrées plus
4 boutons, elle était illisible et le numéro de téléphone en était sorti.

Barre du haut, désormais 4 liens et 2 actions :
    Formations IA · Intégrations IA · Meilleures IA · Nos formateurs
    puis le téléphone et « Appel gratuit ».

Ce qui en sort et pourquoi :
    Accueil                → le logo y mène déjà, l'entrée était redondante.
    Blog                   → menu mobile et pied de page : c'est une ressource,
                             pas une étape du parcours d'achat.
    À propos               → idem ; pour un organisme de formation, la preuve
                             se joue sur « Nos formateurs », qui reste en haut.
    Financer ma formation  → déplacé dans la page Formations, à l'endroit exact
                             où la question du financement se pose.
    Écrire un email        → menu mobile et pied de page.

Le menu mobile, lui, garde tout : sur mobile un menu déroulant n'a pas la
contrainte de largeur de la barre du haut.

Depuis le 21/09/2026 le numéro n'est plus écrit en clair : il est encodé dans
data-tel et révélé au clic par tel-reveal.js (voir masquer_telephone.py).

Usage : python3 simplifier_nav.py
"""

import glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
CAL = 'https://calendly.com/gabriel-ia-entrepreneur/decouverte'
CSS_MENUS = '<link rel="stylesheet" href="/nav-dropdown.css">'
TEL_SVG = ('<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" '
           'viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 '
           '19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 '
           '1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 '
           '1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>')

CHEVRON = ('<svg class="nav-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" '
           'stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>')

# Menus déroulants de la barre du haut. Les intitulés sont à la première
# personne parce qu'un visiteur cherche une tâche à régler, pas une rubrique :
# « Créer mon chatbot client » se choisit plus vite que « Chatbot ».
# La dernière entrée de chaque menu ramène vers la page pilier.
MENUS = [
    ('/formation-ia-entreprise.html', 'Formations IA', [
        ("Former mes équipes à l'IA",            '/formation-ia-entreprise.html'),
        ("Me former, je suis indépendant",       '/formation-ia-independant.html'),
        ("Maîtriser ChatGPT au quotidien",       '/formation-chatgpt-entreprise.html'),
        ("Exploiter Microsoft Copilot",          '/formation-microsoft-copilot-entreprise.html'),
        ("Créer mes propres automatisations",    '/formation-ia-automatisation.html'),
        ("Me mettre en conformité AI Act",       '/formation-ia-obligatoire-ai-act.html'),
        ("Être accompagné en individuel",        '/coaching-ia-dirigeant.html'),
    ], None),
    ('/integrations-ia.html', 'Intégrations IA', [
        ("Créer mon chatbot client",             '/integration-chatbot-client.html'),
        ("Automatiser ma prospection LinkedIn",  '/integration-prospection-linkedin.html'),
        ("Répondre à mes emails automatiquement",'/integration-reponse-email.html'),
        ("Générer mes comptes rendus de réunion",'/integration-compte-rendu-reunion.html'),
        ("Produire mon contenu SEO",             '/integration-contenu-seo.html'),
        ("Surveiller mes concurrents",           '/integration-veille-concurrentielle.html'),
        ("Automatiser mes rapports d'activité",  '/integration-rapport-performance.html'),
    ], ('Voir toutes les intégrations', '/integrations-ia.html')),
    ('/meilleures-ia.html', 'Meilleures IA', [
        ("Quel assistant IA choisir",            '/ia/meilleures-ia-assistants-ia.html'),
        ("Automatisation et agents IA",          '/ia/meilleures-ia-automatisation.html'),
        ("Prospection, vente et CRM",            '/ia/meilleures-ia-prospection-vente.html'),
        ("Rédaction et contenu marketing",       '/ia/meilleures-ia-redaction-contenu.html'),
        ("Réunions, notes et transcription",     '/ia/meilleures-ia-reunions-notes.html'),
        ("Images, design et vidéo",              '/ia/meilleures-ia-images-design.html'),
    ], ("Voir l'annuaire complet", '/meilleures-ia.html')),
]


def bloc_menu(url, libelle, entrees, tout):
    liens = '\n'.join(f'            <a href="{u}">{t}</a>' for t, u in entrees)
    if tout:
        liens += f'\n            <a href="{tout[1]}" class="nav-menu-tout">{tout[0]} →</a>'
    return (f'        <div class="nav-item">\n'
            f'          <a href="{url}">{libelle}{CHEVRON}</a>\n'
            f'          <div class="nav-menu"><div class="nav-menu-inner">\n{liens}\n'
            f'          </div></div>\n'
            f'        </div>')


NAV = ('<nav>\n'
       + '\n'.join(bloc_menu(*m) for m in MENUS) + '\n'
       + '        <a href="/nos-formateurs.html">Nos formateurs</a>\n'
       + f'        <a class="nav-tel tel-reveal" role="button" tabindex="0" data-tel="MzEgNzAgODkgNDEgNjA=" aria-label="Afficher le numéro de téléphone">{TEL_SVG}<span class="tel-value">Afficher le numéro</span></a>\n'
       + f'        <a href="{CAL}" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>\n'
       + '      </nav>')

MENU = f"""<div class="mobile-menu" id="mobile-menu">
    <a href="/formation-ia-entreprise.html">Formations IA</a>
    <a href="/formation-ia-independant.html">Formation indépendants</a>
    <a href="/integrations-ia.html">Intégrations IA</a>
    <a href="/meilleures-ia.html">Meilleures IA</a>
    <a href="/nos-formateurs.html">Nos formateurs</a>
    <a href="/simulateur-financement-formation-ia.html">💶 Financer ma formation</a>
    <a href="/blog.html">Blog</a>
    <a href="/apropos.html">À propos</a>
    <a href="mailto:contact@ia-entrepreneur.fr">✉ Écrire un email</a>
    <a class="tel-reveal" role="button" tabindex="0" data-tel="MzEgNzAgODkgNDEgNjA=" aria-label="Afficher le numéro de téléphone">📞 <span class="tel-value">Afficher le numéro</span></a>
    <a href="{CAL}" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>
  </div>"""


def main():
    fichiers = [f for f in glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'blog', '*.html'))
                if os.path.basename(f) != 'index.html.backup']
    nav_ok = menu_ok = css_ok = 0
    for f in fichiers:
        src = open(f, encoding='utf-8').read()
        out, n = re.subn(r'<nav>.*?</nav>', lambda m: NAV, src, count=1, flags=re.S)
        nav_ok += n
        out, m = re.subn(r'<div class="mobile-menu" id="mobile-menu">.*?</div>\s*(?=</header>)',
                         lambda x: MENU + '\n', out, count=1, flags=re.S)
        menu_ok += m
        # Le style des menus déroulants ne peut pas être dupliqué en ligne sur
        # 316 pages : il vit dans nav-dropdown.css, posé ici en même temps que
        # le <nav> qu'il habille. Après mobile.css, qui garde la main sur le
        # responsive.
        if CSS_MENUS not in out:
            if '<link rel="stylesheet" href="/mobile.css">' in out:
                out = out.replace('<link rel="stylesheet" href="/mobile.css">',
                                  '<link rel="stylesheet" href="/mobile.css">' + CSS_MENUS, 1)
            elif '<link rel="stylesheet" href="/mobile.css" />' in out:
                out = out.replace('<link rel="stylesheet" href="/mobile.css" />',
                                  '<link rel="stylesheet" href="/mobile.css" />\n  ' + CSS_MENUS, 1)
            elif '</head>' in out:
                out = out.replace('</head>', CSS_MENUS + '</head>', 1)
            css_ok += 1
        if out != src:
            open(f, 'w', encoding='utf-8').write(out)
    print(f'{nav_ok} barres de navigation et {menu_ok} menus mobiles remplacés '
          f'sur {len(fichiers)} pages · {css_ok} liens nav-dropdown.css ajoutés')
    manquants = [os.path.basename(f) for f in fichiers
                 if 'tel-reveal' not in open(f, encoding='utf-8').read()]
    print('pages sans numéro de téléphone :', manquants or 'aucune')


if __name__ == '__main__':
    main()
