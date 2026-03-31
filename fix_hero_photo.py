#!/usr/bin/env python3
"""
Fix hero photo: remove black box, enlarge, proper drop-shadow for cutout PNG
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. FIX CSS — Hero photo styling for transparent PNG
# ══════════════════════════════════════════════════════════════

old_hero_css = """    .hero-photo {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 340px;
      border-radius: 20px;
      object-fit: cover;
      object-position: center top;
      animation: float 3s ease-in-out infinite;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }"""

new_hero_css = """    .hero-photo {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      border-radius: 0;
      object-fit: contain;
      object-position: center bottom;
      animation: float 3s ease-in-out infinite;
      filter: drop-shadow(0 20px 40px rgba(26,60,255,0.3));
    }"""

if old_hero_css in html:
    html = html.replace(old_hero_css, new_hero_css)
    changes += 1
    print("✅ CSS hero-photo corrigé (drop-shadow, pas de box, plus grand)")
else:
    print("⚠️  CSS hero-photo non trouvé")

# Fix the glow behind - make it smaller and more centered
old_glow = """    .hero-photo-glow {
      position: absolute;
      inset: -20px;
      border-radius: 40px;
      background: rgba(26,60,255,0.4);
      filter: blur(40px);
      z-index: 0;
      animation: float 3s ease-in-out infinite;
    }"""

new_glow = """    .hero-photo-glow {
      position: absolute;
      top: 20%;
      left: 10%;
      right: 10%;
      bottom: 0;
      border-radius: 50%;
      background: rgba(26,60,255,0.25);
      filter: blur(60px);
      z-index: 0;
      animation: float 3s ease-in-out infinite;
    }"""

if old_glow in html:
    html = html.replace(old_glow, new_glow)
    changes += 1
    print("✅ CSS glow corrigé (centré derrière le buste)")
else:
    print("⚠️  CSS glow non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. Fix mobile - larger photo on mobile too
# ══════════════════════════════════════════════════════════════

old_mobile_photo = """      .hero-photo {
        max-width: 280px;
        margin: 0 auto;
      }"""

new_mobile_photo = """      .hero-photo {
        max-width: 320px;
        margin: 0 auto;
      }"""

if old_mobile_photo in html:
    html = html.replace(old_mobile_photo, new_mobile_photo)
    changes += 1
    print("✅ Mobile hero photo agrandi")
else:
    print("⚠️  Mobile hero CSS non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} corrections appliquées !")
print("   👉 Remplace gabriel-hero.png par la nouvelle version recadrée")
print("   👉 git add . && git commit -m 'Fix hero photo: plus grand, sans cadre noir' && git push")
