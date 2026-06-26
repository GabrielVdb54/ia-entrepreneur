#!/usr/bin/env python3
"""
Correction de TOUS les articles de blog :
1. Nav : suppression lien formations-creation.html
2. Mobile menu : idem
3. Footer : idem
4. Article-footer-cta : suppression bouton "Créer mon entreprise", mise à jour texte
5. Sidebar CTA : mise à jour "Vous lancez votre entreprise ?" + suppression lien créa
6. Inline body CTA : "Vous créez votre entreprise ou vous voulez former vos équipes ?"
"""
import os, re, glob

BLOG_DIR = '/Users/GabrielV/Desktop/ia-entrepreneur/blog'
files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))

fixed = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    # ── 1. Nav desktop : supprime le lien formations-creation ────────────────
    # Pattern : <a href="/formations-creation.html">Création d'entreprise</a>
    c = re.sub(
        r'\s*<a href="/formations-creation\.html">Création d\'entreprise</a>',
        '',
        c
    )

    # ── 2. Mobile menu (one-liner) : supprime le segment ─────────────────────
    # Pattern dans la ligne mobile-menu : <a href="/formations-creation.html">Création d'entreprise</a>
    c = re.sub(
        r'<a href="/formations-creation\.html">Création d\'entreprise</a>',
        '',
        c
    )

    # ── 3. Footer : supprime le lien avec style inline ────────────────────────
    c = re.sub(
        r'\s*<a href="/formations-creation\.html" style="font-size:0\.8rem;color:var\(--muted\);">Création d\'entreprise</a>',
        '',
        c
    )

    # ── 4. Article-footer-cta ─────────────────────────────────────────────────
    # 4a. Supprime le bouton "Créer mon entreprise"
    c = re.sub(
        r'\s*<a href="/formations-creation\.html" class="btn-cta btn-primary">Créer mon entreprise</a>',
        '',
        c
    )
    # 4b. Met à jour le sous-titre du footer CTA (idée → IA)
    c = c.replace(
        "Nos formateurs praticiens vous accompagnent de l'idée au lancement, ou forment vos équipes sur les compétences qui font la différence.",
        "Nos formateurs praticiens vous accompagnent pour intégrer l'IA dans votre activité et former vos équipes aux outils qui font vraiment la différence."
    )

    # ── 5. Sidebar CTA ────────────────────────────────────────────────────────
    # 5a. Titre sidebar "Vous lancez votre entreprise ?"
    c = c.replace(
        '<h4>Vous lancez votre entreprise ?</h4>',
        '<h4>Prêt à intégrer l\'IA dans votre activité ?</h4>'
    )
    # 5b. Texte sidebar "Accompagnement personnalisé de A à Z..."
    c = c.replace(
        "Accompagnement personnalisé de A à Z. Moins de 5% d'échec parmi nos accompagnés.",
        "Formations IA et intégrations clé en main. Certifié Qualiopi, finançable OPCO."
    )
    # 5c. Supprime le bouton "Voir les offres" → formations-creation
    c = re.sub(
        r'\s*<a href="/formations-creation\.html">Voir les offres</a>',
        '',
        c
    )

    # ── 6. Inline body CTA (dans le contenu de l'article) ────────────────────
    c = c.replace(
        'Vous créez votre entreprise ou vous voulez former vos équipes ?',
        'Vous voulez intégrer l\'IA dans votre activité ou former vos équipes ?'
    )

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        fixed += 1

print(f'Fixed {fixed}/{len(files)} articles.')

# Vérification finale
remaining = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    hits = [l for l in ['formations-creation.html', 'Vous créez votre entreprise', 'Créer mon entreprise', 'Vous lancez votre entreprise']
            if l in c]
    # formations-creation dans le body d'article SEO = OK à garder
    # On filtre : on garde seulement les occurrences hors nav/sidebar
    nav_hits = []
    for h in ['formations-creation.html']:
        if re.search(r'<nav|mobile-menu|footer-links|sidebar-cta', c) and h in c:
            nav_hits.append(h)
    if nav_hits:
        print(f'  ⚠ Still has nav/sidebar refs: {os.path.basename(path)}')
        remaining += 1

if remaining == 0:
    print('✓ No nav/sidebar formations-creation refs remaining.')
