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

Usage : python3 simplifier_nav.py
"""

import glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
CAL = 'https://calendly.com/gabriel-ia-entrepreneur/decouverte'
TEL_SVG = ('<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" '
           'viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 '
           '19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 '
           '1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 '
           '1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>')

NAV = f"""<nav>
        <a href="/formations-entreprises.html">Formations IA</a>
        <a href="/integrations-ia.html">Intégrations IA</a>
        <a href="/meilleures-ia.html">Meilleures IA</a>
        <a href="/nos-formateurs.html">Nos formateurs</a>
        <a href="tel:+33614980713" class="nav-tel">{TEL_SVG}06 14 98 07 13</a>
        <a href="{CAL}" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>
      </nav>"""

MENU = f"""<div class="mobile-menu" id="mobile-menu">
    <a href="/formations-entreprises.html">Formations IA</a>
    <a href="/integrations-ia.html">Intégrations IA</a>
    <a href="/meilleures-ia.html">Meilleures IA</a>
    <a href="/nos-formateurs.html">Nos formateurs</a>
    <a href="/simulateur-financement-formation-ia.html">💶 Financer ma formation</a>
    <a href="/blog.html">Blog</a>
    <a href="/apropos.html">À propos</a>
    <a href="mailto:contact@ia-entrepreneur.fr">✉ Écrire un email</a>
    <a href="tel:+33614980713">📞 06 14 98 07 13</a>
    <a href="{CAL}" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>
  </div>"""


def main():
    fichiers = [f for f in glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'blog', '*.html'))
                if os.path.basename(f) != 'index.html.backup']
    nav_ok = menu_ok = 0
    for f in fichiers:
        src = open(f, encoding='utf-8').read()
        out, n = re.subn(r'<nav>.*?</nav>', lambda m: NAV, src, count=1, flags=re.S)
        nav_ok += n
        out, m = re.subn(r'<div class="mobile-menu" id="mobile-menu">.*?</div>\s*(?=</header>)',
                         lambda x: MENU + '\n', out, count=1, flags=re.S)
        menu_ok += m
        if out != src:
            open(f, 'w', encoding='utf-8').write(out)
    print(f'{nav_ok} barres de navigation et {menu_ok} menus mobiles remplacés '
          f'sur {len(fichiers)} pages')
    manquants = [os.path.basename(f) for f in fichiers
                 if 'tel:+33614980713' not in open(f, encoding='utf-8').read()]
    print('pages sans numéro de téléphone :', manquants or 'aucune')


if __name__ == '__main__':
    main()
