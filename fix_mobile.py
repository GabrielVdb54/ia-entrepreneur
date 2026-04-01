#!/usr/bin/env python3
"""
Optimisation mobile complète UX/UI :
- Hero : photo petite AU-DESSUS du titre, pas en plein écran
- Stats banner : compact sans séparateurs sur mobile
- Sections : padding réduit
- Coaching : stack correct
- Comment ça marche : 1 colonne
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. HERO MOBILE — Photo petite + texte visible sans scroll
# ══════════════════════════════════════════════════════════════

# Current mobile CSS for hero photo
old_mobile_768 = """    @media (max-width: 768px) {
      nav { display: none; }
      .hamburger { display: flex; }

      .hero-layout { grid-template-columns: 1fr; }
      .hero-photo-col {
        display: flex;
        justify-content: center;
        order: -1;
        margin-bottom: 32px;
      }
      .hero-photo {
        max-width: 320px;
        margin: 0 auto;
      }
      .hero-photo-glow { display: none; }
      .hero-title { font-size: 2.1rem; }
      .hero-stats { gap: 24px; }"""

new_mobile_768 = """    @media (max-width: 768px) {
      nav { display: none; }
      .hamburger { display: flex; }

      .hero-layout { grid-template-columns: 1fr; }
      .hero-photo-col {
        display: flex;
        justify-content: center;
        order: -1;
        margin-bottom: 16px;
      }
      .hero-photo {
        max-width: 160px;
        margin: 0 auto;
        border-radius: 50%;
        object-fit: cover;
        object-position: center top;
        width: 160px;
        height: 160px;
      }
      .hero-photo-glow { display: none; }
      .hero-title { font-size: 1.8rem; }
      .hero-stats { gap: 20px; }
      .hero-badge { margin-bottom: 16px; }
      .hero-desc { font-size: 0.95rem; margin-bottom: 24px; }
      .hero-actions { margin-bottom: 32px; }

      /* Sections padding mobile */
      #services, #apropos, #chiffres, #temoignages, #blog, #contact { padding: 60px 0; }

      /* Stats banner mobile */
      [style*="gap:40px"] { 
        flex-direction: column !important; 
        gap: 16px !important; 
        align-items: flex-start !important;
        padding-left: 16px !important;
      }
      [style*="width:1px;height:28px"] { display: none !important; }

      /* Coaching section stack */
      [style*="grid-template-columns:1fr 1fr"] { 
        grid-template-columns: 1fr !important; 
        gap: 32px !important;
      }

      /* Comment ça marche - 2 columns on tablet */
      #methode [style*="grid-template-columns:repeat(4"] {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 20px !important;
      }
      #methode [style*="position:absolute;top:48px"] { display: none !important; }"""

if old_mobile_768 in html:
    html = html.replace(old_mobile_768, new_mobile_768)
    changes += 1
    print("✅ CSS mobile 768px refait (hero photo ronde 160px + padding + stacking)")
else:
    # Try with the 280px version
    old_alt = old_mobile_768.replace("320px", "280px")
    if old_alt in html:
        html = html.replace(old_alt, new_mobile_768)
        changes += 1
        print("✅ CSS mobile 768px refait (variante 280px)")
    else:
        print("⚠️  CSS mobile 768px non trouvé, tentative d'insertion...")
        # Just inject before the 480px breakpoint
        if "@media (max-width: 480px) {" in html:
            mobile_inject = """
    /* ── Mobile hero fix ────────────────────────────────── */
    @media (max-width: 768px) {
      .hero-photo {
        max-width: 160px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
        object-position: center top !important;
        width: 160px !important;
        height: 160px !important;
      }
      .hero-photo-col { margin-bottom: 16px !important; }
      .hero-title { font-size: 1.8rem !important; }
      .hero-desc { font-size: 0.95rem !important; margin-bottom: 24px !important; }
      .hero-actions { margin-bottom: 32px !important; }
      #services, #apropos, #chiffres, #temoignages, #blog, #contact { padding: 60px 0 !important; }
      [style*="gap:40px"] { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; padding-left: 16px !important; }
      [style*="width:1px;height:28px"] { display: none !important; }
      [style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; gap: 32px !important; }
      #methode [style*="grid-template-columns:repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
      #methode [style*="position:absolute;top:48px"] { display: none !important; }
    }

"""
            html = html.replace("    @media (max-width: 480px) {", mobile_inject + "    @media (max-width: 480px) {")
            changes += 1
            print("✅ CSS mobile injecté avant 480px breakpoint")

# ══════════════════════════════════════════════════════════════
# 2. MOBILE 480px — Even smaller adjustments
# ══════════════════════════════════════════════════════════════

old_480 = """    @media (max-width: 480px) {
      .chiffres-grid { grid-template-columns: 1fr; }
      .hero-actions { flex-direction: column; }
      .hero-actions .btn { width: 100%; justify-content: center; }
      .contact-form { padding: 24px; }
    }"""

new_480 = """    @media (max-width: 480px) {
      .chiffres-grid { grid-template-columns: 1fr; }
      .hero-actions { flex-direction: column; }
      .hero-actions .btn { width: 100%; justify-content: center; }
      .contact-form { padding: 24px; }
      .hero-photo {
        max-width: 140px !important;
        width: 140px !important;
        height: 140px !important;
      }
      .hero-title { font-size: 1.6rem !important; }
      #services, #apropos, #chiffres, #temoignages, #blog, #contact { padding: 48px 0 !important; }
      #methode [style*="grid-template-columns:repeat(4"], 
      #methode [style*="grid-template-columns:repeat(2"] { 
        grid-template-columns: 1fr !important; 
      }
      .pricing-card.featured { transform: scale(1) !important; }
      .pricing-card.featured:hover { transform: translateY(-6px) !important; }
      .article-cta, .versus-box { padding: 28px 20px !important; }
    }"""

if old_480 in html:
    html = html.replace(old_480, new_480)
    changes += 1
    print("✅ CSS mobile 480px optimisé")
else:
    print("⚠️  CSS mobile 480px non trouvé")

# ══════════════════════════════════════════════════════════════
# 3. HERO SECTION — Reduce padding on mobile
# ══════════════════════════════════════════════════════════════

old_hero_padding = """    #accueil {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      overflow: hidden;
      padding: 120px 0 80px;
    }"""

new_hero_padding = """    #accueil {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      overflow: hidden;
      padding: 120px 0 80px;
    }
    @media (max-width: 768px) {
      #accueil {
        min-height: auto;
        padding: 90px 0 40px;
      }
    }"""

if old_hero_padding in html and "min-height: auto" not in html:
    html = html.replace(old_hero_padding, new_hero_padding)
    changes += 1
    print("✅ Hero padding mobile réduit + min-height auto")
else:
    if "min-height: auto" in html:
        print("ℹ️  Hero padding mobile déjà fixé")
    else:
        print("⚠️  Hero section CSS non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Optimisation mobile UX complète' && git push")
