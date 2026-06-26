#!/usr/bin/env python3
"""
Correction des anciens articles (layout différent) qui ont encore des patterns
formations-creation non capturés par le premier script.
"""
import os, re, glob

BLOG_DIR = '/Users/GabrielV/Desktop/ia-entrepreneur/blog'
files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))

fixed = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    # Pattern 1 : footer link avec style muted
    c = re.sub(
        r'\s*<a href="/formations-creation\.html" style="font-size:0\.82rem;color:var\(--muted\);text-decoration:none;">Création d\'entreprise</a>',
        '',
        c
    )

    # Pattern 2 : footer tagline "NDA ... Formation entrepreneuriat ... IA pour TPE | Grand Est"
    c = re.sub(
        r'NDA\s*:\s*44 54 04871 54\s*·\s*<a href="/formations-creation\.html"[^>]*>Formation entrepreneuriat</a>\s*France\s*\|\s*IA pour TPE\s*\|\s*Grand Est',
        'NDA : 44 54 04871 54 · Formateur IA certifié Qualiopi | France entière',
        c
    )

    # Catch-all : tout lien restant vers formations-creation dans nav/footer
    # (hors liens dans le corps de l'article qui sont du SEO)
    # On cible uniquement les balises <a> "pures" sans contenu IA dans le texte
    c = re.sub(
        r'<a href="/formations-creation\.html"[^>]*>Création d\'entreprise</a>',
        '',
        c
    )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        fixed += 1

print(f'Fixed {fixed} additional articles.')

# Vérification finale stricte
problems = []
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    # Cherche formations-creation.html HORS du corps de l'article
    # Indicateur : dans les 200 premières ou 200 dernières lignes (nav/footer)
    lines = c.split('\n')
    header = '\n'.join(lines[:220])
    footer = '\n'.join(lines[-80:])
    if 'formations-creation' in header or 'formations-creation' in footer:
        problems.append(os.path.basename(path))

if problems:
    print(f'⚠ Still has nav/footer refs:')
    for p in problems:
        print(f'  - {p}')
else:
    print('✓ All articles clean in nav/footer.')
