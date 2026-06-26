#!/usr/bin/env python3
"""
Ajoute mobile.css + sticky CTA bar à tous les articles de blog.
"""
import os, re, glob

BLOG_DIR = '/Users/GabrielV/Desktop/ia-entrepreneur/blog'
files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))

MOBILE_CSS = '  <link rel="stylesheet" href="/mobile.css">\n'

STICKY_BAR = '''  <div class="mobile-sticky-cta" id="mobileStickyBar">
    <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="mobile-sticky-cta-link">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Réserver un appel gratuit
    </a>
    <button class="mobile-sticky-cta-close" onclick="this.closest('.mobile-sticky-cta').style.display='none';document.body.style.paddingBottom='0';" aria-label="Fermer">✕</button>
  </div>
'''

fixed = 0
skipped = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c

    # Add mobile.css before </head> if not already present
    if 'mobile.css' not in c:
        c = c.replace('</head>', MOBILE_CSS + '</head>', 1)

    # Add sticky bar before </body> if not already present
    if 'mobile-sticky-cta' not in c:
        c = c.replace('</body>', STICKY_BAR + '</body>', 1)

    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        fixed += 1
    else:
        skipped += 1

print(f'Fixed: {fixed} / Skipped (already had it): {skipped}')
