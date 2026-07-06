#!/usr/bin/env python3
"""
fix_mobile_expert.py — Corrections mobiles expertes :
1. formations-creation.html : ajouter overflow-x:hidden au body
2. Articles récents n8n (12) : ajouter img{max-width:100%} et hamburger JS si manquant
3. Vérifier intégrité mobile.css (pas de règles hors media query)
"""

import re, os, glob

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

# ─────────────────────────────────────────────────────────────────────────────
# 1. formations-creation.html — overflow-x:hidden
# ─────────────────────────────────────────────────────────────────────────────
path = os.path.join(BASE, 'formations-creation.html')
with open(path) as f:
    c = f.read()

if 'overflow-x:hidden' not in c:
    # Insérer dans la règle body{}
    c = re.sub(r'(body\s*\{)([^}]*?)(font-family)',
               r'\1\2overflow-x:hidden;\3', c, count=1)
    with open(path, 'w') as f:
        f.write(c)
    print(f'✓ formations-creation.html — overflow-x:hidden ajouté')
else:
    print(f'  skip formations-creation.html (déjà ok)')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Articles récents n8n — vérifier img reset et hamburger JS
# ─────────────────────────────────────────────────────────────────────────────

# Les articles générés par n8n ont ce pattern dans leur CSS :
# a{color:inherit;text-decoration:none}
# On insère img{display:block;max-width:100%;height:auto} juste après.

IMG_RESET = 'img{display:block;max-width:100%;height:auto}'

# Trouver les articles n8n : ceux qui ont mobile.css mais pas d'img reset global
all_blog = glob.glob(os.path.join(BASE, 'blog/*.html'))
fixed_img = 0

for path in sorted(all_blog):
    with open(path) as f:
        c = f.read()

    # Vérifier si img reset global manque (on cherche img{display:block OU img { display:block)
    has_global_img_reset = bool(re.search(
        r'(?:^|[;}\n])img\s*\{[^}]*max-width[^}]*\}', c
    ))

    if not has_global_img_reset:
        # Insérer après a{color:inherit;text-decoration:none}
        if 'a{color:inherit;text-decoration:none}' in c:
            c = c.replace(
                'a{color:inherit;text-decoration:none}',
                'a{color:inherit;text-decoration:none}' + IMG_RESET,
                1
            )
            with open(path, 'w') as f:
                f.write(c)
            fixed_img += 1
            print(f'✓ img reset: {os.path.basename(path)}')
        elif "a{color:inherit;text-decoration:none;}" in c:
            c = c.replace(
                'a{color:inherit;text-decoration:none;}',
                'a{color:inherit;text-decoration:none;}' + IMG_RESET,
                1
            )
            with open(path, 'w') as f:
                f.write(c)
            fixed_img += 1
            print(f'✓ img reset: {os.path.basename(path)}')

print(f'\nImg reset ajouté sur {fixed_img} articles')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Vérifier que toutes les pages ont le hamburger JS
# ─────────────────────────────────────────────────────────────────────────────
HAMBURGER_JS = """<script>
  const h=document.getElementById('hamburger');
  const m=document.getElementById('mobile-menu');
  if(h&&m){h.addEventListener('click',()=>{h.classList.toggle('open');m.classList.toggle('open');});}
</script>"""

all_html = glob.glob(os.path.join(BASE, '*.html')) + glob.glob(os.path.join(BASE, 'blog/*.html'))
fixed_js = 0

for path in sorted(all_html):
    rel = path.replace(BASE+'/', '')
    with open(path) as f:
        c = f.read()

    # Seulement les pages qui ont un hamburger button
    if 'id="hamburger"' not in c:
        continue

    # Vérifier si JS présent
    if 'hamburger' in c and ('classList.toggle' in c or "getElementById('hamburger')" in c or 'querySelector' in c):
        continue

    # Insérer le JS avant </body>
    c = c.replace('</body>', HAMBURGER_JS + '\n</body>', 1)
    with open(path, 'w') as f:
        f.write(c)
    fixed_js += 1
    print(f'✓ hamburger JS: {rel}')

print(f'\nHamburger JS ajouté sur {fixed_js} pages')
print('\nDone!')
