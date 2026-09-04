#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_annuaire_links.py — Ajoute « Les meilleures IA » dans la navigation, le menu
mobile et le pied de page de toutes les pages existantes du site.

Le lien est inséré juste après « Intégrations IA », qui apparaît aux trois
endroits sur chaque page (nav desktop, menu mobile, footer). Le script est
idempotent : relancé, il ne duplique rien.

Usage : python3 add_annuaire_links.py
"""

import glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
LIEN = '<a href="/meilleures-ia.html">Meilleures IA</a>'

REMPLACEMENTS = [
    ('<a href="/integrations-ia.html">Intégrations IA</a>',
     '<a href="/integrations-ia.html">Intégrations IA</a>\n        ' + LIEN),
    ('<a href="/integrations-ia.html" style="font-size:0.8rem;color:var(--muted);">Intégrations IA</a>',
     '<a href="/integrations-ia.html" style="font-size:0.8rem;color:var(--muted);">Intégrations IA</a>\n            '
     '<a href="/meilleures-ia.html" style="font-size:0.8rem;color:var(--muted);">Meilleures IA</a>'),
]

# Les articles générés par n8n ont une navigation réduite (Formations / À propos
# / Blog) : le lien s'insère alors après « À propos ».
REMPLACEMENTS_N8N = [
    ('<a href="/apropos.html">À propos</a>',
     '<a href="/apropos.html">À propos</a>' + LIEN),
    ('<a href="/apropos.html" style="font-size:0.8rem;color:var(--muted);">À propos</a>',
     '<a href="/apropos.html" style="font-size:0.8rem;color:var(--muted);">À propos</a>'
     '<a href="/meilleures-ia.html" style="font-size:0.8rem;color:var(--muted);">Meilleures IA</a>'),
]


def main():
    fichiers = [f for f in glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'blog', '*.html'))
                if os.path.basename(f) not in ('meilleures-ia.html', 'index.html.backup')]
    touches = 0
    for f in fichiers:
        src = open(f, encoding='utf-8').read()
        if 'meilleures-ia.html' in src:
            continue
        out = src
        for avant, apres in REMPLACEMENTS:
            out = out.replace(avant, apres)
        if out == src:
            for avant, apres in REMPLACEMENTS_N8N:
                out = out.replace(avant, apres)
        if out != src:
            open(f, 'w', encoding='utf-8').write(out)
            touches += 1
    print(f'{touches} pages mises à jour sur {len(fichiers)}')

if __name__ == '__main__':
    main()
