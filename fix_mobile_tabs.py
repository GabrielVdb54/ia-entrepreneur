#!/usr/bin/env python3
"""
Mobile fix v3 :
- Remplace le carousel par des TABS pricing sur mobile
- Supprime le CSS carousel
- Formations entreprises : cartes compactes sur mobile
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. SUPPRIMER LE CSS CAROUSEL (ajouté précédemment)
# ══════════════════════════════════════════════════════════════

carousel_css = """
    /* ── Pricing carousel mobile ────────────────────────────── */
    @media (max-width: 768px) {
      .pricing-grid {
        display: flex !important;
        overflow-x: auto !important;
        scroll-snap-type: x mandatory !important;
        -webkit-overflow-scrolling: touch;
        gap: 16px !important;
        padding-bottom: 20px !important;
        scrollbar-width: none;
      }
      .pricing-grid::-webkit-scrollbar { display: none; }
      .pricing-card {
        min-width: 85vw !important;
        max-width: 85vw !important;
        scroll-snap-align: center;
        flex-shrink: 0 !important;
      }
      .pricing-card.featured {
        transform: scale(1) !important;
        min-width: 85vw !important;
        max-width: 85vw !important;
      }
      .pricing-card.featured:hover { transform: translateY(-4px) !important; }
      /* Swipe hint indicator */
      .pricing-grid::after {
        content: '← Swipez pour voir les offres →';
        position: absolute;
        bottom: -8px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 0.72rem;
        color: var(--muted);
        opacity: 0.6;
      }
    }

"""

if carousel_css in html:
    html = html.replace(carousel_css, "")
    changes += 1
    print("✅ CSS carousel supprimé")
else:
    print("ℹ️  CSS carousel non trouvé (déjà supprimé ?)")

# Also remove position:relative added to pricing-grid
html = html.replace("    .pricing-grid {\n      position: relative;", "    .pricing-grid {", 1)

# ══════════════════════════════════════════════════════════════
# 2. AJOUTER CSS TABS MOBILE
# ══════════════════════════════════════════════════════════════

tabs_css = """
    /* ── Pricing tabs mobile ───────────────────────────────── */
    .pricing-tabs {
      display: none;
    }
    @media (max-width: 768px) {
      .pricing-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 20px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 4px;
      }
      .pricing-tab {
        flex: 1;
        padding: 10px 8px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 700;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        line-height: 1.3;
      }
      .pricing-tab.active {
        background: var(--primary);
        color: #fff;
        box-shadow: 0 2px 12px rgba(26,60,255,0.3);
      }
      .pricing-tab .tab-price {
        display: block;
        font-size: 0.72rem;
        font-weight: 600;
        opacity: 0.7;
        margin-top: 2px;
      }
      .pricing-tab.active .tab-price {
        opacity: 1;
      }
      .pricing-grid {
        display: block !important;
      }
      .pricing-card {
        display: none !important;
      }
      .pricing-card.tab-active {
        display: block !important;
      }
      .pricing-card.featured {
        transform: scale(1) !important;
      }
      .pricing-card.featured.tab-active {
        display: block !important;
      }
    }

"""

# Insert before the existing 480px media query
insert_point = "    @media (max-width: 480px) {"
if "pricing-tabs" not in html and insert_point in html:
    html = html.replace(insert_point, tabs_css + insert_point, 1)
    changes += 1
    print("✅ CSS tabs pricing mobile ajouté")

# ══════════════════════════════════════════════════════════════
# 3. AJOUTER LES TABS HTML avant pricing-grid
# ══════════════════════════════════════════════════════════════

tabs_html = """
      <!-- Tabs mobile pricing -->
      <div class="pricing-tabs reveal">
        <button class="pricing-tab active" data-tab="0" onclick="switchPricingTab(0)">
          Essentiel<span class="tab-price">300€</span>
        </button>
        <button class="pricing-tab" data-tab="1" onclick="switchPricingTab(1)">
          Pro ★<span class="tab-price">1 000€</span>
        </button>
        <button class="pricing-tab" data-tab="2" onclick="switchPricingTab(2)">
          Premium<span class="tab-price">3 000€</span>
        </button>
      </div>

"""

pricing_grid_marker = '      <div class="pricing-grid">'
if "pricing-tabs" not in html and pricing_grid_marker in html:
    html = html.replace(pricing_grid_marker, tabs_html + pricing_grid_marker)
    changes += 1
    print("✅ Tabs HTML ajoutés avant pricing-grid")

# ══════════════════════════════════════════════════════════════
# 4. AJOUTER LE JS pour les tabs
# ══════════════════════════════════════════════════════════════

tabs_js = """
    // Pricing tabs mobile
    function switchPricingTab(idx) {
      document.querySelectorAll('.pricing-tab').forEach((t,i) => {
        t.classList.toggle('active', i === idx);
      });
      document.querySelectorAll('.pricing-card').forEach((c,i) => {
        c.classList.toggle('tab-active', i === idx);
      });
    }
    // Init: show first tab on mobile
    if (window.innerWidth <= 768) {
      document.querySelectorAll('.pricing-card').forEach((c,i) => {
        c.classList.toggle('tab-active', i === 0);
      });
    }
"""

# Insert before closing </script> or </body>
if "switchPricingTab" not in html:
    closing_script = "</script>\n</body>"
    if closing_script in html:
        html = html.replace(closing_script, tabs_js + "\n  </script>\n</body>")
        changes += 1
        print("✅ JS tabs ajouté")
    else:
        # Try inserting before </body>
        html = html.replace("</body>", "<script>" + tabs_js + "</script>\n</body>")
        changes += 1
        print("✅ JS tabs ajouté (nouveau script)")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE INDEX
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications sur index.html !")

# ══════════════════════════════════════════════════════════════
# 5. FORMATIONS ENTREPRISES — Tabs mobile aussi
# ══════════════════════════════════════════════════════════════

try:
    with open("formations-entreprises.html", "r", encoding="utf-8") as f:
        fe = f.read()
    
    fe_changes = 0

    # Add mobile CSS: tabs for formations on mobile
    fe_mobile_css = """
    /* ── Formations tabs mobile ────────────────────────────── */
    .formation-tabs {
      display: none;
    }
    @media (max-width: 768px) {
      .formations-grid {
        display: block !important;
      }
      .formation-card {
        display: none !important;
      }
      .formation-card.ftab-active {
        display: block !important;
      }
      .formation-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 20px;
        padding: 0 0 16px;
      }
      .formation-tab {
        padding: 8px 14px;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--muted);
        font-family: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .formation-tab.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
        box-shadow: 0 2px 12px rgba(26,60,255,0.3);
      }
    }
"""

    style_close = "  </style>"
    if "formation-tabs" not in fe and style_close in fe:
        fe = fe.replace(style_close, fe_mobile_css + style_close, 1)
        fe_changes += 1
        print("✅ CSS tabs formations mobile ajouté")

    # Add tabs HTML before formations-grid
    fe_tabs_html = """
      <!-- Tabs mobile formations -->
      <div class="formation-tabs">
        <button class="formation-tab active" onclick="switchFormTab(0)">🎯 Prospection</button>
        <button class="formation-tab" onclick="switchFormTab(1)">🤝 Négociation</button>
        <button class="formation-tab" onclick="switchFormTab(2)">📈 Vente</button>
        <button class="formation-tab" onclick="switchFormTab(3)">👥 Management</button>
        <button class="formation-tab" onclick="switchFormTab(4)">🎤 Parole</button>
        <button class="formation-tab" onclick="switchFormTab(5)">🤖 IA</button>
      </div>

"""

    fe_grid_marker = '      <div class="formations-grid">'
    if "formation-tabs" not in fe and fe_grid_marker in fe:
        fe = fe.replace(fe_grid_marker, fe_tabs_html + fe_grid_marker)
        fe_changes += 1
        print("✅ Tabs formations HTML ajoutés")

    # Add JS for formation tabs
    fe_tabs_js = """
    // Formation tabs mobile
    function switchFormTab(idx) {
      document.querySelectorAll('.formation-tab').forEach((t,i) => {
        t.classList.toggle('active', i === idx);
      });
      document.querySelectorAll('.formation-card').forEach((c,i) => {
        c.classList.toggle('ftab-active', i === idx);
      });
    }
    // Init: show first tab on mobile
    if (window.innerWidth <= 768) {
      document.querySelectorAll('.formation-card').forEach((c,i) => {
        c.classList.toggle('ftab-active', i === 0);
      });
    }
"""

    if "switchFormTab" not in fe:
        fe = fe.replace("</script>\n</body>", fe_tabs_js + "\n  </script>\n</body>")
        fe_changes += 1
        print("✅ JS tabs formations ajouté")

    with open("formations-entreprises.html", "w", encoding="utf-8") as f:
        f.write(fe)
    
    print(f"🎉 {fe_changes} modifications sur formations-entreprises.html !")

except FileNotFoundError:
    print("⚠️  formations-entreprises.html non trouvé")

print(f"\n👉 git add . && git commit -m 'Mobile: tabs pricing + tabs formations' && git push")
