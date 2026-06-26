#!/usr/bin/env python3
"""
- Remplace gabriel-hero.png et og-default.png par formation-2.jpg
- Ajoute og:image sur toutes les pages qui en manquent
"""
import os, re

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'
OG_IMAGE = 'https://ia-entrepreneur.fr/images/formation-2.jpg'

def fix_file(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f'! Not found: {filename}')
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    # 1. Remplace gabriel-hero.png et og-default.png
    c = re.sub(
        r'<meta property="og:image" content="https://ia-entrepreneur\.fr/gabriel-hero\.png" />',
        f'<meta property="og:image" content="{OG_IMAGE}" />',
        c
    )
    c = re.sub(
        r'<meta property="og:image" content="https://ia-entrepreneur\.fr/og-default\.png" />',
        f'<meta property="og:image" content="{OG_IMAGE}" />',
        c
    )

    # 2. Ajoute og:image s'il est absent, juste après og:description (ou og:title en dernier recours)
    if 'og:image' not in c:
        if 'og:description' in c:
            c = re.sub(
                r'(<meta property="og:description"[^>]*/?>)',
                r'\1\n  <meta property="og:image" content="' + OG_IMAGE + r'" />',
                c, count=1
            )
        elif 'og:title' in c:
            c = re.sub(
                r'(<meta property="og:title"[^>]*/?>)',
                r'\1\n  <meta property="og:image" content="' + OG_IMAGE + r'" />',
                c, count=1
            )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'✓ {filename}')
    else:
        print(f'- {filename} (no change)')

PAGES = [
    # Corrections directes
    'index.html',
    'formation-ia-obligatoire-ai-act.html',
    # Pages sans og:image
    'formations-entreprises.html',
    'integrations-ia.html',
    'apropos.html',
    'blog.html',
    'integration-chatbot-client.html',
    'integration-reponse-email.html',
    'integration-contenu-seo.html',
    'integration-prospection-linkedin.html',
    'integration-veille-concurrentielle.html',
    'integration-compte-rendu-reunion.html',
    'integration-rapport-performance.html',
]

for p in PAGES:
    fix_file(p)

print('\nDone.')
