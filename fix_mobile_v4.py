#!/usr/bin/env python3
"""
Mobile fix v4 — Approche simple et fiable :
- Supprimer les tabs (JS problématique)
- Cartes pricing compactes sur mobile (description masquée, top features seulement)
- Formations entreprises : idem, cartes compactes
- Ne touche PAS au desktop
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. SUPPRIMER LES TABS HTML
# ══════════════════════════════════════════════════════════════

# Remove tabs HTML block
tabs_html_start = '      <!-- Tabs mobile pricing -->'
tabs_html_end = '      </div>\n\n      <div class="pricing-grid">'
if tabs_html_start in html:
    start = html.index(tabs_html_start)
    end = html.index(tabs_html_end) + len(tabs_html_end)
    # Replace with just the pricing-grid marker
    html = html[:start] + '      <div class="pricing-grid">' + html[end:]
    changes += 1
    print("✅ Tabs HTML supprimés")

# ══════════════════════════════════════════════════════════════
# 2. SUPPRIMER CSS TABS
# ══════════════════════════════════════════════════════════════

tabs_css_start = "    /* ── Pricing tabs mobile ───────────────────────────────── */"
tabs_css_end = "    }\n\n    @media (max-width: 480px) {"
if tabs_css_start in html:
    start = html.index(tabs_css_start)
    end = html.index(tabs_css_end, start)
    # Keep the 480px media query
    html = html[:start] + "    @media (max-width: 480px) {" + html[end + len(tabs_css_end):]
    changes += 1
    print("✅ CSS tabs supprimé")

# ══════════════════════════════════════════════════════════════
# 3. SUPPRIMER JS TABS
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

if tabs_js in html:
    html = html.replace(tabs_js, "")
    changes += 1
    print("✅ JS tabs supprimé")

# Remove tab-active class from any cards that might have it
html = html.replace(' tab-active', '')

# ══════════════════════════════════════════════════════════════
# 4. AJOUTER CSS COMPACT PRICING MOBILE
# ══════════════════════════════════════════════════════════════

compact_css = """
    /* ── Pricing compact mobile ────────────────────────────── */
    @media (max-width: 768px) {
      .pricing-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .pricing-card {
        padding: 24px 20px !important;
      }
      .pricing-card .pricing-icon {
        font-size: 1.4rem !important;
        margin-bottom: 8px !important;
      }
      .pricing-card .pricing-name {
        font-size: 1.1rem !important;
        margin-bottom: 6px !important;
      }
      .pricing-card .pricing-desc {
        display: none !important;
      }
      .pricing-card .pricing-price {
        font-size: 2rem !important;
        margin: 12px 0 6px !important;
      }
      .pricing-card .pricing-price-note {
        font-size: 0.72rem !important;
        margin-bottom: 12px !important;
      }
      .pricing-card .pricing-features {
        margin-bottom: 16px !important;
      }
      .pricing-card .pricing-features li {
        font-size: 0.85rem !important;
        padding: 6px 0 !important;
      }
      .pricing-card .pricing-cta,
      .pricing-card .pricing-cta-outline {
        padding: 12px 20px !important;
        font-size: 0.88rem !important;
      }
      .pricing-card.featured {
        transform: scale(1) !important;
      }
    }

"""

insert_point = "    @media (max-width: 480px) {"
if "Pricing compact mobile" not in html and insert_point in html:
    html = html.replace(insert_point, compact_css + insert_point, 1)
    changes += 1
    print("✅ CSS compact pricing mobile ajouté")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE INDEX
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications sur index.html !")

# ══════════════════════════════════════════════════════════════
# 5. FORMATIONS ENTREPRISES — Supprimer tabs + compact mobile
# ══════════════════════════════════════════════════════════════

try:
    with open("formations-entreprises.html", "r", encoding="utf-8") as f:
        fe = f.read()
    
    fe_changes = 0

    # Remove formation tabs HTML if present
    fe_tabs_start = '      <!-- Tabs mobile formations -->'
    if fe_tabs_start in fe:
        start = fe.index(fe_tabs_start)
        end = fe.index('      <div class="formations-grid">', start)
        fe = fe[:start] + '      <div class="formations-grid">' + fe[end + len('      <div class="formations-grid">'):]
        fe_changes += 1
        print("✅ Tabs formations HTML supprimés")

    # Remove formation tabs CSS
    fe_tabs_css = "    /* ── Formations tabs mobile ────────────────────────────── */"
    if fe_tabs_css in fe:
        css_start = fe.index(fe_tabs_css)
        # Find the end of this CSS block (before the next non-tab CSS or </style>)
        css_end = fe.index("  </style>", css_start)
        # Only remove up to just before </style> if there's nothing else
        # Actually, let's find the closing } of the last media query in the tabs block
        # Safer: find "    }" that closes the mobile media query
        # Let's just remove everything between the marker and the next existing CSS block
        # We know the tabs CSS ends with "    }" right before either </style> or another block
        # For safety, let's search for the block
        block = fe[css_start:css_end]
        fe = fe[:css_start] + fe[css_end:]
        fe_changes += 1
        print("✅ Tabs formations CSS supprimé")

    # Remove formation tabs JS
    fe_tabs_js = """    // Formation tabs mobile
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
    if fe_tabs_js in fe:
        fe = fe.replace(fe_tabs_js, "")
        fe_changes += 1
        print("✅ Tabs formations JS supprimé")

    # Remove ftab-active classes
    fe = fe.replace(' ftab-active', '')

    # Add compact mobile CSS for formations (replace any existing)
    compact_formation_css = """
    /* ── Formations compact mobile ─────────────────────────── */
    @media (max-width: 768px) {
      .formations-grid {
        grid-template-columns: 1fr !important;
        gap: 14px !important;
      }
      .formation-card {
        padding: 20px 18px !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .formation-card .formation-icon {
        font-size: 1.6rem !important;
        margin-bottom: 8px !important;
      }
      .formation-card h3 {
        font-size: 1rem !important;
        margin-bottom: 6px !important;
      }
      .formation-card p {
        font-size: 0.82rem !important;
        line-height: 1.5 !important;
        margin-bottom: 10px !important;
      }
      .formation-tags {
        margin-bottom: 10px !important;
      }
      .formation-tag {
        font-size: 0.68rem !important;
        padding: 3px 8px !important;
      }
      .page-hero {
        padding: 60px 0 32px !important;
      }
      .page-hero h1 {
        font-size: 1.6rem !important;
      }
      .page-hero p {
        font-size: 0.9rem !important;
      }
      .method-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 16px !important;
      }
      .cta-section {
        padding: 48px 0 !important;
      }
    }
    @media (max-width: 480px) {
      .method-grid {
        grid-template-columns: 1fr !important;
      }
    }
"""

    style_close = "  </style>"
    # Remove old compact CSS if exists
    old_compact = "    @media (max-width: 480px) {\n      .formation-card { padding: 24px 20px; }"
    if old_compact in fe:
        old_block_start = fe.index(old_compact)
        old_block_end = fe.index("    }", old_block_start + 10) + 5
        fe = fe[:old_block_start] + fe[old_block_end:]

    if "Formations compact mobile" not in fe and style_close in fe:
        fe = fe.replace(style_close, compact_formation_css + style_close, 1)
        fe_changes += 1
        print("✅ CSS compact formations mobile ajouté")

    with open("formations-entreprises.html", "w", encoding="utf-8") as f:
        f.write(fe)
    
    print(f"🎉 {fe_changes} modifications sur formations-entreprises.html !")

except FileNotFoundError:
    print("⚠️  formations-entreprises.html non trouvé")

print(f"\n👉 git add . && git commit -m 'Mobile: cartes compactes pricing + formations' && git push")
