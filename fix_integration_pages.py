#!/usr/bin/env python3
import os
import re

INTEGRATION_PAGES = [
    'integration-chatbot-client.html',
    'integration-reponse-email.html',
    'integration-contenu-seo.html',
    'integration-prospection-linkedin.html',
    'integration-veille-concurrentielle.html',
    'integration-compte-rendu-reunion.html',
    'integration-rapport-performance.html',
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

for filename in INTEGRATION_PAGES:
    path = os.path.join(base, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Remove formations-creation nav link (desktop nav, no style)
    content = re.sub(
        r'\s*<a href="/formations-creation\.html">Création d\'entreprise</a>\n',
        '\n',
        content
    )
    # Also handle without newline before
    content = re.sub(
        r'<a href="/formations-creation\.html">Création d\'entreprise</a>\n',
        '',
        content
    )

    # Remove formations-creation mobile menu link
    content = re.sub(
        r'\s*<a href="/formations-creation\.html">Création d\'entreprise</a>\n',
        '\n',
        content
    )

    # Remove formations-creation footer link (with inline style)
    content = re.sub(
        r'\s*<a href="/formations-creation\.html" style="font-size:0\.8rem;color:var\(--muted\);">Création d\'entreprise</a>\n',
        '\n',
        content
    )

    # Remove formations-creation footer link (footer-links class style, no inline style)
    content = re.sub(
        r'\s*<a href="/formations-creation\.html">Création d\'entreprise</a>\n',
        '\n',
        content
    )

    # Add mobile.css before </head> if not already present
    if '/mobile.css' not in content:
        content = content.replace('</head>', MOBILE_CSS_LINK + '</head>', 1)

    # Add sticky bar before </body> if not already present
    if 'mobile-sticky-cta' not in content:
        content = content.replace('</body>', STICKY_BAR + '</body>', 1)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'✓ Fixed: {filename}')
    else:
        print(f'- No change: {filename}')

print('\nDone.')
