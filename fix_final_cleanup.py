#!/usr/bin/env python3
"""
Nettoyage final : incohérences positionnement, footer taglines, apropos meta.
"""
import os

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

def patch(filename, replacements):
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c
    for old, new in replacements:
        if old in c:
            c = c.replace(old, new)
        else:
            print(f'  ⚠ NOT FOUND in {filename}: {old[:60]}...')
    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'✓ {filename}')
    else:
        print(f'- {filename} (no change)')

# ── apropos.html ──────────────────────────────────────────────────────────────
patch('apropos.html', [
    # Meta description (apparaît 3 fois : og:description, name description, twitter:description)
    (
        'Gabriel Vanderbecken, formateur en entrepreneuriat et IA. +1 500 porteurs de projet accompagnés. Certifié Qualiopi, intervenant ECM Nancy, Go Entrepreneur, France Travail.',
        'Gabriel Vanderbecken, formateur IA et expert automatisation. +1 500 professionnels accompagnés. Certifié Qualiopi, intervenant ECM Nancy, Go Entrepreneur, conférencier.'
    ),
    # Timeline : description organisme
    (
        'organisme de formation et d\'accompagnement certifié Qualiopi spécialisé en entrepreneuriat et IA appliquée.',
        'organisme de formation certifié Qualiopi spécialisé en IA appliquée et automatisation pour les entreprises.'
    ),
    # Timeline conférencier : mention porteurs de projet
    (
        'Go Entrepreneur, France Travail (salons d\'orientation, ateliers création), associations de porteurs de projet, réseaux d\'entreprises.',
        'Go Entrepreneur, France Travail, réseaux d\'entreprises et associations professionnelles.'
    ),
    # Carte Go Entrepreneur
    (
        'Conférences et ateliers sur la création d\'entreprise et l\'IA pour les porteurs de projet.',
        'Conférences et ateliers IA et entrepreneuriat pour dirigeants et porteurs de projet.'
    ),
    # Carte France Travail
    (
        'Salons d\'orientation, ateliers de création d\'entreprise et sessions de formation pour les demandeurs d\'emploi.',
        'Salons d\'orientation et sessions de formation IA et reconversion professionnelle.'
    ),
])

# ── Footer taglines : 8 pages ─────────────────────────────────────────────────
FOOTER_TAGLINE_OLD = 'Formation entrepreneuriat France | Formateur IA TPE | France entière'
FOOTER_TAGLINE_NEW = 'Formateur IA certifié Qualiopi | Expert automatisation IA | France entière'

PAGES_FOOTER = [
    'formation-prospection-commerciale.html',
    'formation-ia-automatisation.html',
    'formation-management-leadership.html',
    'formation-techniques-vente-closing.html',
    'formation-prise-de-parole.html',
    'formation-negociation-commerciale.html',
    'mentions-legales.html',
    'cgv.html',
]

for filename in PAGES_FOOTER:
    patch(filename, [(FOOTER_TAGLINE_OLD, FOOTER_TAGLINE_NEW)])

# ── formations-entreprises.html : meta description trop longue ───────────────
# Vérifions d'abord
path = os.path.join(BASE, 'formations-entreprises.html')
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
import re
m = re.search(r'<meta name="description" content="([^"]+)"', c)
if m:
    desc = m.group(1)
    print(f'\nformations-entreprises.html meta ({len(desc)} chars): {desc}')

print('\nDone.')
