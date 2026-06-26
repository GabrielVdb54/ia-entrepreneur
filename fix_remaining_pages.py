#!/usr/bin/env python3
import os
import re

PAGES = [
    'formation-prospection-commerciale.html',
    'formation-ia-automatisation.html',
    'mentions-legales.html',
    'formation-management-leadership.html',
    'cgv.html',
    'formation-techniques-vente-closing.html',
    'formation-prise-de-parole.html',
    'formation-negociation-commerciale.html',
    'politique-confidentialite.html',
]

MOBILE_CSS_LINK = '  <link rel="stylesheet" href="/mobile.css">\n'

STICKY_BAR = '''  <div class="mobile-sticky-cta" id="mobileStickyBar">
    <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="mobile-sticky-cta-link">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Réserver un appel gratuit
    </a>
    <button class="mobile-sticky-cta-close" onclick="this.closest('.mobile-sticky-cta').style.display='none';document.body.style.paddingBottom='0';" aria-label="Fermer">✕</button>
  </div>
'''

base = '/Users/GabrielV/Desktop/ia-entrepreneur'

for filename in PAGES:
    path = os.path.join(base, filename)
    if not os.path.exists(path):
        print(f'! Not found: {filename}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Remove all formations-creation nav/footer links (any style variant)
    # Pattern 1: plain link
    content = re.sub(
        r'[ \t]*<a href="/formations-creation\.html">Création d\'entreprise</a>\n',
        '',
        content
    )
    # Pattern 2: with inline style (muted color)
    content = re.sub(
        r'[ \t]*<a href="/formations-creation\.html" style="[^"]*">Création d\'entreprise</a>\n',
        '',
        content
    )
    # Pattern 3: no trailing newline edge case
    content = re.sub(
        r'<a href="/formations-creation\.html"[^>]*>Création d\'entreprise</a>',
        '',
        content
    )

    # Add mobile.css before </head> if not already present
    if '/mobile.css' not in content:
        content = content.replace('</head>', MOBILE_CSS_LINK + '</head>', 1)

    # Add sticky bar before </body> if not already present
    # Skip for legal/policy pages (mentions-legales, cgv, politique-confidentialite) - less critical
    SKIP_STICKY = ['mentions-legales.html', 'cgv.html', 'politique-confidentialite.html']
    if filename not in SKIP_STICKY and 'mobile-sticky-cta' not in content:
        content = content.replace('</body>', STICKY_BAR + '</body>', 1)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'✓ Fixed: {filename}')
    else:
        print(f'- No change: {filename}')

print('\nDone.')
