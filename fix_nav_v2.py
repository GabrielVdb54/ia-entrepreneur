#!/usr/bin/env python3
"""
Fix nav - version équilibrée :
Accueil | Création d'entreprise | Formations entreprises | À propos | Blog | 📞 | [Appel gratuit]
"""
import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. REMPLACER LA NAV DESKTOP
# ══════════════════════════════════════════════════════════════

nav_pattern = r'<nav>.*?</nav>'
nav_match = re.search(nav_pattern, html, re.DOTALL)

if nav_match:
    old_nav = nav_match.group()
    
    new_nav = f'''<nav>
          <a href="#accueil">Accueil</a>
          <a href="#services">Création d'entreprise</a>
          <a href="/formations-entreprises.html">Formations entreprises</a>
          <a href="#apropos">À propos</a>
          <a href="#blog">Blog</a>
          <a href="tel:+33699250344" style="display:flex;align-items:center;gap:5px;"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>06 99 25 03 44</a>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="nav-cta" style="background:var(--accent);box-shadow:0 3px 16px rgba(16,185,129,0.35);">Appel gratuit</a>
        </nav>'''
    
    html = html.replace(old_nav, new_nav, 1)
    changes += 1
    print("✅ Nav desktop : Accueil + Création + Entreprises + À propos + Blog + 📞 + CTA")
else:
    print("⚠️  Balise <nav> non trouvée")

# ══════════════════════════════════════════════════════════════
# 2. CSS NAV — Réduire légèrement le padding pour tout faire tenir
# ══════════════════════════════════════════════════════════════

old_nav_css = """    nav a {
      padding: 8px 14px;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--muted);
      transition: color 0.2s, background 0.2s;
    }"""

new_nav_css = """    nav a {
      padding: 7px 12px;
      border-radius: 50px;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--muted);
      transition: color 0.2s, background 0.2s;
      white-space: nowrap;
    }"""

if old_nav_css in html:
    html = html.replace(old_nav_css, new_nav_css)
    changes += 1
    print("✅ CSS nav ajusté (padding + nowrap)")
else:
    # Try original CSS
    old_nav_css_orig = """    nav a {
      padding: 8px 16px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--muted);
      transition: color 0.2s, background 0.2s;
    }"""
    if old_nav_css_orig in html:
        html = html.replace(old_nav_css_orig, new_nav_css)
        changes += 1
        print("✅ CSS nav ajusté (depuis original)")
    else:
        print("⚠️  CSS nav non trouvé")

# Also adjust nav-cta size
old_cta_css = """    .nav-cta {
      padding: 9px 20px;
      background: var(--primary);
      color: #fff !important;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.88rem;
      box-shadow: 0 3px 16px rgba(26,60,255,0.4);
      transition: transform 0.2s, box-shadow 0.2s !important;
    }"""

new_cta_css = """    .nav-cta {
      padding: 8px 18px;
      background: var(--primary);
      color: #fff !important;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.84rem;
      box-shadow: 0 3px 16px rgba(26,60,255,0.4);
      transition: transform 0.2s, box-shadow 0.2s !important;
      white-space: nowrap;
    }"""

if old_cta_css in html:
    html = html.replace(old_cta_css, new_cta_css)
    changes += 1
    print("✅ CSS nav-cta ajusté")
else:
    print("⚠️  CSS nav-cta non trouvé")

# ══════════════════════════════════════════════════════════════
# 3. MOBILE MENU — Version complète
# ══════════════════════════════════════════════════════════════

mobile_pattern = r'<div class="mobile-menu" id="mobile-menu">.*?</div>'
mobile_match = re.search(mobile_pattern, html, re.DOTALL)

if mobile_match:
    old_mobile = mobile_match.group()
    
    new_mobile = f'''<div class="mobile-menu" id="mobile-menu">
      <a href="#accueil">Accueil</a>
      <a href="#services">Création d'entreprise</a>
      <a href="/formations-entreprises.html">Formations entreprises</a>
      <a href="#apropos">À propos</a>
      <a href="#blog">Blog</a>
      <a href="tel:+33699250344">📞 06 99 25 03 44</a>
      <a href="#contact">Me contacter</a>
      <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;">Réserver un appel gratuit</a>
    </div>'''
    
    html = html.replace(old_mobile, new_mobile, 1)
    changes += 1
    print("✅ Mobile menu complet")
else:
    print("⚠️  Mobile menu non trouvé")

# ══════════════════════════════════════════════════════════════
# 4. NAV GAP — Réduire le gap entre les items
# ══════════════════════════════════════════════════════════════

old_nav_gap = "    nav { display: flex; align-items: center; gap: 8px; }"
new_nav_gap = "    nav { display: flex; align-items: center; gap: 4px; }"

if old_nav_gap in html:
    html = html.replace(old_nav_gap, new_nav_gap)
    changes += 1
    print("✅ Nav gap réduit (4px)")
else:
    print("⚠️  Nav gap non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Nav équilibrée : tous les items + téléphone + CTA' && git push")
