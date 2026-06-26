#!/usr/bin/env python3
"""
Retire "TPE/PME" des éléments de positionnement (titres, taglines, meta, schema)
sur les pages principales. Préserve les mentions dans le body content et les articles de blog.
"""
import re, os

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

# ── index.html ────────────────────────────────────────────────────────────────
def fix_index():
    path = os.path.join(BASE, 'index.html')
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    # Title tag
    c = c.replace(
        '<title>Formation IA & Intégrations Clé en Main pour TPE/PME | IA-Entrepreneur</title>',
        '<title>Formation IA & Intégrations Clé en Main pour Entreprises | IA-Entrepreneur</title>'
    )
    # OG title
    c = c.replace(
        'content="Formation IA & Intégrations Clé en Main pour TPE/PME | IA-Entrepreneur"',
        'content="Formation IA & Intégrations Clé en Main pour Entreprises | IA-Entrepreneur"'
    )
    # Meta description
    c = c.replace(
        'content="Formations IA et intégrations clé en main pour TPE/PME. Certifié Qualiopi, finançable OPCO. Opérationnel en 48h."',
        'content="Formations IA et intégrations clé en main pour toutes les entreprises. Certifié Qualiopi, finançable OPCO. Opérationnel en 48h."'
    )
    # OG description
    c = c.replace(
        'content="Formations IA et intégrations clé en main pour TPE/PME. Certifié Qualiopi, finançable OPCO. Opérationnel en 48h."',
        'content="Formations IA et intégrations clé en main pour toutes les entreprises. Certifié Qualiopi, finançable OPCO. Opérationnel en 48h."'
    )
    # EducationalOrganization description
    c = c.replace(
        '"description": "Organisme de formation certifié Qualiopi. Création d\'entreprise, IA appliquée et compétences clés pour dirigeants de TPE/PME. Présentiel, distanciel et e-learning. France entière."',
        '"description": "Organisme de formation certifié Qualiopi. IA appliquée et compétences clés pour dirigeants et équipes. Présentiel, distanciel et e-learning. France entière."'
    )
    # jobTitle
    c = c.replace(
        '"jobTitle": "Formateur en Intelligence Artificielle & Expert Automatisation TPE/PME"',
        '"jobTitle": "Formateur en Intelligence Artificielle & Expert Automatisation"'
    )
    # Course description Essentiel
    c = c.replace(
        '"description": "Prise en main des outils IA, prompting et premiers cas d\'usage métier pour TPE/PME. Session inter-entreprises."',
        '"description": "Prise en main des outils IA, prompting et premiers cas d\'usage métier. Session inter-entreprises."'
    )
    # LocalBusiness description
    c = c.replace(
        '"description":"Organisme de formation certifié Qualiopi spécialisé en IA appliquée pour TPE/PME. Formations IA et intégrations clé en main."',
        '"description":"Organisme de formation certifié Qualiopi spécialisé en IA appliquée. Formations IA et intégrations clé en main pour toutes les entreprises."'
    )
    # FAQ schema question
    c = c.replace(
        '"name":"Combien coûte une intégration IA pour une TPE/PME ?"',
        '"name":"Combien coûte une intégration IA pour mon entreprise ?"'
    )
    # Blog section title
    c = c.replace(
        '<h2 class="section-title reveal">Le blog IA pour TPE/PME<br /><span style="color:var(--primary)">qui fait avancer</span></h2>',
        '<h2 class="section-title reveal">Le blog IA<br /><span style="color:var(--primary)">qui fait avancer</span></h2>'
    )
    # Blog section subtitle
    c = c.replace(
        'IA appliquée, automatisation, outils IA pour TPE/PME : des articles concrets publiés chaque semaine, écrits par des praticiens.',
        'IA appliquée, automatisation, outils IA en entreprise : des articles concrets publiés chaque semaine, écrits par des praticiens.'
    )
    # Footer tagline
    c = c.replace(
        '<p class="footer-tagline">Formateur IA certifié Qualiopi | Expert automatisation TPE/PME | France entière</p>',
        '<p class="footer-tagline">Formateur IA certifié Qualiopi | Expert automatisation IA | France entière</p>'
    )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print('✓ index.html')
    else:
        print('- index.html (no change)')

# ── apropos.html ──────────────────────────────────────────────────────────────
def fix_apropos():
    path = os.path.join(BASE, 'apropos.html')
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    c = c.replace(
        'Formateur IA certifié Qualiopi | Expert automatisation TPE/PME | France entière',
        'Formateur IA certifié Qualiopi | Expert automatisation IA | France entière'
    )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print('✓ apropos.html')
    else:
        print('- apropos.html (no change)')

# ── integrations-ia.html ──────────────────────────────────────────────────────
def fix_integrations_ia():
    path = os.path.join(BASE, 'integrations-ia.html')
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    c = c.replace(
        '<title>Intégrations IA clé en main pour TPE/PME | IA-Entrepreneur</title>',
        '<title>Intégrations IA clé en main pour Entreprises | IA-Entrepreneur</title>'
    )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print('✓ integrations-ia.html')
    else:
        print('- integrations-ia.html (no change)')

# ── pages intégration (titles/og:title/schema name) ──────────────────────────
INTEGRATION_FIXES = {
    'integration-reponse-email.html': [
        ('Réponse email automatique avec IA pour TPE/PME | IA-Entrepreneur',
         'Réponse email automatique avec IA pour votre entreprise | IA-Entrepreneur'),
        ('"Réponse email automatique avec IA pour TPE/PME"',
         '"Réponse email automatique avec IA pour votre entreprise"'),
    ],
    'integration-contenu-seo.html': [
        ('Génération de contenu SEO automatique pour site web TPE/PME | IA-Entrepreneur',
         'Génération de contenu SEO automatique pour votre site web | IA-Entrepreneur'),
        ('"Génération de contenu SEO automatique pour site web TPE/PME"',
         '"Génération de contenu SEO automatique pour votre site web"'),
    ],
    'integration-prospection-linkedin.html': [
        ('Assistant prospection LinkedIn avec IA pour TPE/PME | IA-Entrepreneur',
         'Assistant prospection LinkedIn avec IA pour dirigeants | IA-Entrepreneur'),
        ('"Assistant prospection LinkedIn avec IA pour TPE/PME"',
         '"Assistant prospection LinkedIn avec IA pour dirigeants"'),
        ('"name":"Assistant prospection LinkedIn avec IA pour TPE/PME"',
         '"name":"Assistant prospection LinkedIn avec IA pour dirigeants"'),
    ],
    'integration-veille-concurrentielle.html': [
        ('Veille concurrentielle automatisée avec IA pour TPE/PME | IA-Entrepreneur',
         'Veille concurrentielle automatisée avec IA pour votre entreprise | IA-Entrepreneur'),
    ],
    'integration-rapport-performance.html': [
        ('Rapport de performance hebdomadaire automatique IA pour dirigeants TPE/PME | IA-Entrepreneur',
         'Rapport de performance hebdomadaire automatique IA pour dirigeants | IA-Entrepreneur'),
        ('"Rapport de performance hebdomadaire automatique IA pour dirigeants TPE/PME"',
         '"Rapport de performance hebdomadaire automatique IA pour dirigeants"'),
        ('"name":"Rapport de performance hebdomadaire automatique IA pour dirigeants TPE/PME"',
         '"name":"Rapport de performance hebdomadaire automatique IA pour dirigeants"'),
    ],
}

def fix_integration_pages():
    for filename, replacements in INTEGRATION_FIXES.items():
        path = os.path.join(BASE, filename)
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        orig = c
        for old, new in replacements:
            c = c.replace(old, new)
        if c != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'✓ {filename}')
        else:
            print(f'- {filename} (no change)')

if __name__ == '__main__':
    fix_index()
    fix_apropos()
    fix_integrations_ia()
    fix_integration_pages()
    print('\nDone.')
