#!/usr/bin/env python3
"""
Optimisation desktop :
- Réduire les paddings sections (100px → 70px)
- Texte justifié partout
- Réduire les gaps (60px → 40px)
- Hero plus compact
- Supprimer position:relative résiduel sur pricing-grid
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. SECTIONS PADDING — 100px → 70px
# ══════════════════════════════════════════════════════════════

sections = [
    ("    #services {\n      padding: 100px 0;", "    #services {\n      padding: 70px 0;"),
    ("    #apropos {\n      padding: 100px 0;", "    #apropos {\n      padding: 70px 0;"),
    ("    #chiffres {\n      padding: 100px 0;", "    #chiffres {\n      padding: 70px 0;"),
    ("    #temoignages {\n      padding: 100px 0;", "    #temoignages {\n      padding: 70px 0;"),
    ("    #blog {\n      padding: 100px 0;", "    #blog {\n      padding: 70px 0;"),
    ("    #contact {\n      padding: 100px 0;", "    #contact {\n      padding: 70px 0;"),
]

for old, new in sections:
    if old in html:
        html = html.replace(old, new)
        changes += 1

if changes > 0:
    print(f"✅ {changes} sections : padding 100px → 70px")
    changes = 1  # Count as 1 change

# ══════════════════════════════════════════════════════════════
# 2. HERO PADDING — 120px/80px → 100px/60px
# ══════════════════════════════════════════════════════════════

old_hero = "      padding: 120px 0 80px;"
new_hero = "      padding: 100px 0 60px;"
if old_hero in html:
    html = html.replace(old_hero, new_hero)
    changes += 1
    print("✅ Hero padding réduit (100px/60px)")

# ══════════════════════════════════════════════════════════════
# 3. HERO STATS GAP — 40px → 32px
# ══════════════════════════════════════════════════════════════

old_stats_gap = "      gap: 40px;\n      flex-wrap: wrap;\n    }\n    .hero-stat {"
new_stats_gap = "      gap: 32px;\n      flex-wrap: wrap;\n    }\n    .hero-stat {"
if old_stats_gap in html:
    html = html.replace(old_stats_gap, new_stats_gap)
    changes += 1
    print("✅ Hero stats gap réduit (32px)")

# ══════════════════════════════════════════════════════════════
# 4. HERO MARGIN BOTTOM — 56px → 40px
# ══════════════════════════════════════════════════════════════

old_actions = "    .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 56px; }"
new_actions = "    .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 40px; }"
if old_actions in html:
    html = html.replace(old_actions, new_actions)
    changes += 1
    print("✅ Hero actions margin réduit (40px)")

# ══════════════════════════════════════════════════════════════
# 5. HERO DESC MARGIN — 40px → 28px
# ══════════════════════════════════════════════════════════════

old_desc = "      margin-bottom: 40px;\n      line-height: 1.7;\n    }"
new_desc = "      margin-bottom: 28px;\n      line-height: 1.7;\n    }"
if old_desc in html:
    html = html.replace(old_desc, new_desc)
    changes += 1
    print("✅ Hero desc margin réduit (28px)")

# ══════════════════════════════════════════════════════════════
# 6. TEXTE JUSTIFIÉ — Ajouter text-align: justify
# ══════════════════════════════════════════════════════════════

justify_rules = """
    /* ── Texte justifié ────────────────────────────────────── */
    .section-sub,
    .pricing-desc,
    .pricing-footer-note,
    .apropos-text p,
    .service-card p,
    .hero-desc {
      text-align: justify;
    }
"""

# Insert after the body base styles
body_marker = "    body {\n      font-family: 'Plus Jakarta Sans', sans-serif;"
if "text-align: justify" not in html and body_marker in html:
    # Find the closing } of body
    body_start = html.index(body_marker)
    body_end = html.index("}", body_start) + 1
    html = html[:body_end] + "\n" + justify_rules + html[body_end:]
    changes += 1
    print("✅ Texte justifié ajouté")

# ══════════════════════════════════════════════════════════════
# 7. APROPOS LAYOUT GAP — 60px → 40px
# ══════════════════════════════════════════════════════════════

old_apropos_gap = "      gap: 60px;"
new_apropos_gap = "      gap: 40px;"
# Replace all occurrences of gap: 60px in CSS
html = html.replace("      gap: 60px;", "      gap: 40px;")
changes += 1
print("✅ Gaps 60px → 40px")

# ══════════════════════════════════════════════════════════════
# 8. INLINE GAPS 60px — dans les style="" inline
# ══════════════════════════════════════════════════════════════

html = html.replace("gap:60px;", "gap:40px;")
changes += 1
print("✅ Gaps inline 60px → 40px")

# ══════════════════════════════════════════════════════════════
# 9. INLINE PADDING methode/coaching — 100px → 70px
# ══════════════════════════════════════════════════════════════

html = html.replace('style="padding:100px 0;position:relative;"', 'style="padding:70px 0;position:relative;"')
html = html.replace('style="padding:80px 0;position:relative;overflow:hidden;"', 'style="padding:70px 0;position:relative;overflow:hidden;"')
changes += 1
print("✅ Sections inline padding → 70px")

# ══════════════════════════════════════════════════════════════
# 10. POSITION RELATIVE RÉSIDUEL — pricing-grid
# ══════════════════════════════════════════════════════════════

old_pg = "    .pricing-grid {\n      position: relative;"
new_pg = "    .pricing-grid {"
if old_pg in html:
    html = html.replace(old_pg, new_pg)
    changes += 1
    print("✅ position:relative résiduel supprimé de pricing-grid")

# ══════════════════════════════════════════════════════════════
# 11. SECTION TITLE MARGIN — Réduire l'espace sous les titres
# ══════════════════════════════════════════════════════════════

old_title_margin = "    .section-title {\n      font-size: clamp(1.8rem, 4vw, 2.8rem);\n      font-weight: 800;\n      line-height: 1.2;\n      margin-bottom: 16px;"
new_title_margin = "    .section-title {\n      font-size: clamp(1.8rem, 4vw, 2.8rem);\n      font-weight: 800;\n      line-height: 1.2;\n      margin-bottom: 12px;"
if old_title_margin in html:
    html = html.replace(old_title_margin, new_title_margin)
    changes += 1
    print("✅ Section title margin réduit (12px)")

# ══════════════════════════════════════════════════════════════
# 12. SECTION SUB MARGIN — Réduire l'espace sous les sous-titres
# ══════════════════════════════════════════════════════════════

old_sub_margin = "      margin-bottom: 56px;"
new_sub_margin = "      margin-bottom: 40px;"
if old_sub_margin in html:
    html = html.replace(old_sub_margin, new_sub_margin, 1)
    changes += 1
    print("✅ Section sub margin réduit (40px)")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications desktop appliquées !")
print("   👉 git add . && git commit -m 'Desktop: spacing + justify + gaps optimisés' && git push")
