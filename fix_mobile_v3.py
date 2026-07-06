#!/usr/bin/env python3
"""
fix_mobile_v3.py — Corrections mobiles précises :
1. CSS load order : mobile.css après </style> sur 3 pages
2. Hamburger JS : ajouter null-check sur 11 pages
"""
import re, os

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

# ─── 1. CSS load order fix ────────────────────────────────────────────────────
order_pages = [
    'formation-chatgpt-entreprise.html',
    'formation-microsoft-copilot-entreprise.html',
    'simulateur-financement-formation-ia.html',
]

for rel in order_pages:
    path = os.path.join(BASE, rel)
    with open(path) as f:
        c = f.read()

    mobile_link = re.search(r'\s*<link[^>]+mobile\.css[^>]*>', c)
    if not mobile_link:
        print(f'  skip {rel} (no mobile.css link found)')
        continue

    link_tag = mobile_link.group()
    style_end = c.rfind('</style>')
    link_pos = c.find(link_tag)

    if link_pos < style_end:
        # Remove existing mobile.css link
        c = c.replace(link_tag, '', 1)
        # Insert after </style>
        c = c.replace('</style>', '</style>\n' + link_tag.strip(), 1)
        with open(path, 'w') as f:
            f.write(c)
        print(f'✓ CSS order fixed: {rel}')
    else:
        print(f'  skip {rel} (already in correct order)')

# ─── 2. Hamburger JS null-check ───────────────────────────────────────────────
# Pages missing the null-check guard
nullcheck_pages = [
    'blog/quel-statut-juridique-choisir-2026.html',
    'formation-ia-obligatoire-ai-act.html',
    'formations-entreprises.html',
    'integration-chatbot-client.html',
    'integration-compte-rendu-reunion.html',
    'integration-contenu-seo.html',
    'integration-prospection-linkedin.html',
    'integration-rapport-performance.html',
    'integration-reponse-email.html',
    'integration-veille-concurrentielle.html',
    'politique-confidentialite.html',
]

# Patterns to replace (various JS styles found across pages)
PATTERNS = [
    # Pattern: var h = getElementById(); var m = getElementById(); h.addEventListener(...)
    (
        r"(var h\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*;?\s*)"
        r"(var m\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;?\s*)"
        r"(h\.addEventListener\([^)]+\)\s*\{[^}]+\}\s*;?)",
        r"var h=document.getElementById('hamburger'),m=document.getElementById('mobile-menu');\n  if(h&&m){h.addEventListener('click',function(){h.classList.toggle('open');m.classList.toggle('open');});}"
    ),
    # Pattern: const h=..., m=...; h.addEventListener(...)
    (
        r"(const h\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*,\s*m\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;?\s*)"
        r"(h\.addEventListener[^;]+;)",
        r"const h=document.getElementById('hamburger'),m=document.getElementById('mobile-menu');\n  if(h&&m){h.addEventListener('click',()=>{h.classList.toggle('open');m.classList.toggle('open');});}"
    ),
]

for rel in nullcheck_pages:
    path = os.path.join(BASE, rel)
    with open(path) as f:
        c = f.read()

    # Check if already has null guard
    if '&&m)' in c or 'if(h&&' in c or 'if (h &&' in c or 'if (h&&' in c:
        print(f'  skip {rel} (already has guard)')
        continue

    # Find the hamburger JS block and wrap it
    # Most pages use one of these patterns:
    fixed = False

    # Pattern A: var h = ... ; var m = ... ; h.addEventListener
    m = re.search(
        r"(var h\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*;)\s*"
        r"(var m\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;)\s*"
        r"(h\.addEventListener\('click'\s*,\s*function\(\)\s*\{[^}]+\}\s*\);)",
        c
    )
    if m:
        replacement = ("var h=document.getElementById('hamburger'),"
                       "m=document.getElementById('mobile-menu');"
                       "\n  if(h&&m){h.addEventListener('click',function(){"
                       "h.classList.toggle('open');m.classList.toggle('open');});}")
        c = c[:m.start()] + replacement + c[m.end():]
        fixed = True

    # Pattern B: const h=...,m=...;\n h.addEventListener(...)
    if not fixed:
        m = re.search(
            r"(const h\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*,"
            r"\s*m\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;)\s*"
            r"(h\.addEventListener\([^)]+\)\s*=>\s*\{[^}]+\}\s*\);)",
            c
        )
        if m:
            replacement = ("const h=document.getElementById('hamburger'),"
                           "m=document.getElementById('mobile-menu');"
                           "\n  if(h&&m){h.addEventListener('click',()=>{"
                           "h.classList.toggle('open');m.classList.toggle('open');});}")
            c = c[:m.start()] + replacement + c[m.end():]
            fixed = True

    if fixed:
        with open(path, 'w') as f:
            f.write(c)
        print(f'✓ null-check: {rel}')
    else:
        # Fallback: try a simpler regex
        # find h.addEventListener and wrap surrounding block
        m = re.search(r"getElementById\(['\"]hamburger['\"]\)", c)
        if m:
            # Get the script block
            script_start = c.rfind('<script', 0, m.start())
            script_end = c.find('</script>', m.end())
            if script_start != -1 and script_end != -1:
                block = c[script_start:script_end+9]
                print(f'  MANUAL: {rel} — JS block found, inspect manually')
                print(f'    Block preview: {block[8:200].strip()[:150]}')
            else:
                print(f'  WARN: {rel} — pattern not matched, skip')

print('\nDone!')
