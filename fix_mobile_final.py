#!/usr/bin/env python3
"""
fix_mobile_final.py — Fixes mobiles restants :
1. Ajoute mobile.css + sticky CTA aux 12 articles récents qui en manquent
2. Corrige simulateur padding-bottom
3. Override padding-bottom body sur pages sans sticky CTA (mentions-legales, cgv, politique-confidentialite)
"""

import re
import os

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

MOBILE_CSS_LINK = '  <link rel="stylesheet" href="/mobile.css">'

STICKY_CTA_HTML = '''  <div class="mobile-sticky-cta" id="mobileStickyBar">
    <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="mobile-sticky-cta-link">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Réserver un appel gratuit
    </a>
    <button class="mobile-sticky-cta-close" onclick="this.closest('.mobile-sticky-cta').style.display='none';document.body.style.paddingBottom='0';" aria-label="Fermer">✕</button>
  </div>
</body>
</html>'''

# ── 1. Articles récents manquant mobile.css + sticky CTA ─────────────────────
missing_articles = [
    'blog/calendrier-marketing-ia-2026-ete-rentree.html',
    'blog/carrefour-ia-2026-lecons-pme.html',
    'blog/crypto-clipper-malware-entrepreneurs-2026.html',
    'blog/cybersecurite-tpe-pme-guide-pratique-2026.html',
    'blog/gemini-live-gratuit-guide-entrepreneurs-2026.html',
    'blog/guerre-des-puces-ia-consequences-entreprises-francaises.html',
    'blog/ia-2026-adoption-cadres-tpe-pme.html',
    'blog/ia-entreprise-adoption-cadres-2026.html',
    'blog/nvidia-rubin-2026-ia-pme.html',
    'blog/seo-ia-2026-changements-entreprise.html',
    'blog/traduction-ia-guide-tpe-pme-2026.html',
    'blog/x-portrait-2-ia-animation-photo-video-entreprise.html',
]

for rel in missing_articles:
    path = os.path.join(BASE, rel)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ajouter mobile.css avant </head>
    if 'mobile.css' not in content:
        content = content.replace('</head>', MOBILE_CSS_LINK + '\n</head>', 1)

    # Ajouter sticky CTA avant </body></html>
    if 'mobile-sticky-cta' not in content:
        content = re.sub(r'\s*</body>\s*</html>\s*$', '\n' + STICKY_CTA_HTML, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'✓ {rel}')

# ── 2. Simulateur : padding-bottom 80px → 40px ───────────────────────────────
sim_path = os.path.join(BASE, 'simulateur-financement-formation-ia.html')
with open(sim_path, 'r', encoding='utf-8') as f:
    sim_content = f.read()

# Réduire padding-bottom dans .sim-page
sim_content = sim_content.replace('padding-bottom:80px;', 'padding-bottom:40px;')

# Override body padding-bottom sur mobile (pas de sticky CTA sur cette page)
no_sticky_override = '\n  @media(max-width:768px){body{padding-bottom:0!important}}'
if 'padding-bottom:0!important' not in sim_content:
    # Insérer juste avant </style> dans la section CSS principale (header/footer)
    sim_content = sim_content.replace(
        '@media(max-width:480px){.container{padding:0 16px}}',
        '@media(max-width:480px){.container{padding:0 16px}}' + no_sticky_override
    )

with open(sim_path, 'w', encoding='utf-8') as f:
    f.write(sim_content)
print(f'✓ simulateur-financement-formation-ia.html')

# ── 3. Pages statiques sans sticky CTA : override body padding-bottom ─────────
static_no_cta = [
    'mentions-legales.html',
    'cgv.html',
    'politique-confidentialite.html',
]

NO_CTA_STYLE = '\n<style>@media(max-width:768px){body{padding-bottom:0!important}}</style>'

for rel in static_no_cta:
    path = os.path.join(BASE, rel)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'padding-bottom:0!important' not in content and 'mobile-sticky-cta' not in content:
        # Insérer après le dernier </style> ou avant </head>
        content = content.replace('</head>', NO_CTA_STYLE + '\n</head>', 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'✓ {rel}')
    else:
        print(f'  skip {rel} (already handled)')

print('\nDone!')
