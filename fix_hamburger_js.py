#!/usr/bin/env python3
"""
fix_hamburger_js.py — Ajoute null-check sur toutes les pages avec hamburger JS
Gère les deux patterns principaux trouvés dans le site.
"""
import re, glob, os

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'
files = sorted(glob.glob(BASE+'/*.html') + glob.glob(BASE+'/blog/*.html'))

fixed = 0
skipped = 0

for path in files:
    rel = path.replace(BASE+'/', '')
    with open(path) as f:
        c = f.read()

    if 'id="hamburger"' not in c:
        continue

    # Already has a guard?
    if re.search(r'if\s*\(\s*(h|hamburger|hamburgerBtn)\s*&&', c):
        skipped += 1
        continue

    changed = False

    # ── Pattern A: var h = ...; var m = ...; h.addEventListener ──────────────
    # e.g: var h=document.getElementById('hamburger');var m=...;h.addEventListener(...)
    m = re.search(
        r"(var h\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*;?\s*"
        r"var m\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;?\s*)"
        r"(h\.addEventListener\(['\"]click['\"],\s*function\(\)\s*\{[^}]+\}\s*\)\s*;?)",
        c, re.DOTALL
    )
    if m:
        decl = "var h=document.getElementById('hamburger'),m=document.getElementById('mobile-menu');"
        handler = "if(h&&m){h.addEventListener('click',function(){h.classList.toggle('open');m.classList.toggle('open');});}"
        c = c[:m.start()] + decl + '\n  ' + handler + c[m.end():]
        changed = True

    # ── Pattern B: const hamburger = ...; const mobileMenu = ...; hamburger.addEventListener ──
    if not changed:
        m = re.search(
            r"(const hamburger\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*;?\s*"
            r"const mobileMenu\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;?\s*)"
            r"(hamburger\.addEventListener\(['\"]click['\"][^;]+;)",
            c, re.DOTALL
        )
        if m:
            # Keep declarations, wrap only the event listener
            decl = m.group(1).strip()
            decl_clean = ("const hamburger=document.getElementById('hamburger'),"
                          "mobileMenu=document.getElementById('mobile-menu');")
            # check if there's a querySelectorAll follow-up
            rest_start = m.end()
            rest_match = re.search(
                r"mobileMenu\.querySelectorAll\(['\"]a['\"]\).*?;",
                c[rest_start:rest_start+300],
                re.DOTALL
            )
            if rest_match:
                qa = rest_match.group().strip()
                handler = (f"if(hamburger&&mobileMenu){{"
                           f"hamburger.addEventListener('click',()=>{{hamburger.classList.toggle('open');mobileMenu.classList.toggle('open');}});"
                           f"{qa}}}")
                c = c[:m.start()] + decl_clean + '\n  ' + handler + c[rest_start + rest_match.end():]
            else:
                handler = ("if(hamburger&&mobileMenu){"
                           "hamburger.addEventListener('click',()=>{hamburger.classList.toggle('open');mobileMenu.classList.toggle('open');});}")
                c = c[:m.start()] + decl_clean + '\n  ' + handler + c[m.end():]
            changed = True

    # ── Pattern C: index.html / formations-creation style ────────────────────
    # const hamburger = getElementById(...); const mobileMenu = getElementById(...);
    # hamburger.addEventListener('click', () => { ... });
    # mobileMenu.querySelectorAll...
    if not changed:
        m = re.search(
            r"(const hamburger\s*=\s*document\.getElementById\(['\"]hamburger['\"]\)\s*;)\s*"
            r"(const mobileMenu\s*=\s*document\.getElementById\(['\"]mobile-menu['\"]\)\s*;)\s*"
            r"(hamburger\.addEventListener\(['\"]click['\"].*?\}\s*\)\s*;)\s*"
            r"(mobileMenu\.querySelectorAll.*?;)",
            c, re.DOTALL
        )
        if m:
            handler = (
                "const hamburger=document.getElementById('hamburger'),"
                "mobileMenu=document.getElementById('mobile-menu');\n"
                "  if(hamburger&&mobileMenu){\n"
                "    hamburger.addEventListener('click',()=>{hamburger.classList.toggle('open');mobileMenu.classList.toggle('open');});\n"
                "    mobileMenu.querySelectorAll('a').forEach(l=>l.addEventListener('click',()=>{hamburger.classList.remove('open');mobileMenu.classList.remove('open');}));\n"
                "  }"
            )
            c = c[:m.start()] + handler + c[m.end():]
            changed = True

    # ── Pattern D: apropos/cgv pattern: var h=...\n var m=... ──────────────
    if not changed:
        m = re.search(
            r"var h=document\.getElementById\(['\"]hamburger['\"]\);\s*"
            r"var m=document\.getElementById\(['\"]mobile-menu['\"]\);\s*"
            r"h\.addEventListener\('click',function\(\)\{[^}]+\}\);",
            c
        )
        if m:
            handler = ("var h=document.getElementById('hamburger'),"
                       "m=document.getElementById('mobile-menu');"
                       "\n  if(h&&m){h.addEventListener('click',function(){h.classList.toggle('open');m.classList.toggle('open');});}")
            c = c[:m.start()] + handler + c[m.end():]
            changed = True

    if changed:
        with open(path, 'w') as f:
            f.write(c)
        fixed += 1
        print(f'✓ {rel}')
    else:
        # Try to identify the exact pattern for debugging
        m = re.search(r'getElementById\([\'"]hamburger[\'"]\)', c)
        if m:
            print(f'  PATTERN NOT MATCHED: {rel}')
            print(f'    {c[m.start():m.start()+200].strip()[:150]}')

print(f'\nFixed: {fixed}, Skipped (already had guard): {skipped}')
