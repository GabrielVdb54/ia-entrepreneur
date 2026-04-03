#!/usr/bin/env python3
"""
Optimisation mobile complète :
1. Hero stats mis à jour
2. Pricing carousel swipeable sur mobile
3. Lien article pricing remonté AVANT les cartes
4. CTAs sous chaque formation B2B
5. Mobile menu nettoyé
6. Formations compactes sur mobile
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. HERO STATS — Mettre à jour les 3 stats du hero
# ══════════════════════════════════════════════════════════════

old_hero_stats = """          <div class="hero-stats">
            <div class="hero-stat">
              <strong>1 500+</strong>
              <span>Entrepreneurs accompagnés</span>
            </div>
            <div class="hero-stat">
              <strong>7 ans</strong>
              <span>D'expérience terrain</span>
            </div>
            <div class="hero-stat">
              <strong>100%</strong>
              <span>France &amp; à distance</span>
            </div>
          </div>"""

new_hero_stats = """          <div class="hero-stats">
            <div class="hero-stat">
              <strong>1 500+</strong>
              <span>Porteurs de projet accompagnés</span>
            </div>
            <div class="hero-stat">
              <strong>2</strong>
              <span>Entreprises créées &amp; dirigées</span>
            </div>
            <div class="hero-stat">
              <strong>6</strong>
              <span>Modules enseignés en entreprise &amp; école de commerce</span>
            </div>
          </div>"""

if old_hero_stats in html:
    html = html.replace(old_hero_stats, new_hero_stats)
    changes += 1
    print("✅ Hero stats mis à jour (1500+ / 2 entreprises / 6 modules)")
else:
    print("⚠️  Hero stats non trouvées")

# ══════════════════════════════════════════════════════════════
# 2. PRICING CAROUSEL — CSS scroll-snap sur mobile
# ══════════════════════════════════════════════════════════════

# Add carousel CSS before the 480px media query
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

# Find where to insert - before the existing 480px mobile pricing fix
insert_marker = "    @media (max-width: 480px) {"
if "scroll-snap-type: x mandatory" not in html and insert_marker in html:
    html = html.replace(insert_marker, carousel_css + insert_marker, 1)
    changes += 1
    print("✅ CSS carousel pricing mobile ajouté")
else:
    if "scroll-snap-type: x mandatory" in html:
        print("ℹ️  Carousel CSS déjà présent")
    else:
        print("⚠️  Point d'insertion carousel non trouvé")

# Make pricing-grid position relative for the ::after pseudo-element
old_pricing_grid_css = "    .pricing-grid {"
if old_pricing_grid_css in html:
    # Check if there's already position:relative
    # Find the pricing-grid CSS block
    idx = html.index(old_pricing_grid_css)
    block_end = html.index("}", idx)
    block = html[idx:block_end+1]
    if "position:" not in block:
        html = html.replace(old_pricing_grid_css, "    .pricing-grid {\n      position: relative;", 1)
        changes += 1
        print("✅ pricing-grid position:relative ajouté")

# ══════════════════════════════════════════════════════════════
# 3. LIEN ARTICLE PRICING — Remonter AVANT les cartes
# ══════════════════════════════════════════════════════════════

# Current position: after encart B2B (line ~1618)
# Target position: just after the section-sub, before pricing-grid

article_link_block = """      <div style="text-align:center;margin-top:32px;" class="reveal">
        <a href="/blog/combien-coute-creation-entreprise-2026.html" style="display:inline-flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:var(--primary);transition:gap 0.2s;" onmouseover="this.style.gap='12px'" onmouseout="this.style.gap='8px'">
          📊 Voir le détail : combien coûte réellement la création d'une entreprise ?
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>"""

if article_link_block in html:
    # Remove from current position
    html = html.replace(article_link_block, "")
    
    # Insert before pricing-grid
    pricing_grid_marker = '      <div class="pricing-grid">'
    article_link_new = """      <div style="text-align:center;margin-top:16px;margin-bottom:32px;" class="reveal">
        <a href="/blog/combien-coute-creation-entreprise-2026.html" style="display:inline-flex;align-items:center;gap:8px;font-size:0.88rem;font-weight:600;color:var(--primary);transition:gap 0.2s;padding:10px 20px;border:1px solid rgba(26,60,255,0.2);border-radius:50px;background:rgba(26,60,255,0.05);" onmouseover="this.style.gap='12px';this.style.background='rgba(26,60,255,0.1)'" onmouseout="this.style.gap='8px';this.style.background='rgba(26,60,255,0.05)'">
          📊 Combien coûte réellement la création d'une entreprise ?
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

"""
    if pricing_grid_marker in html:
        html = html.replace(pricing_grid_marker, article_link_new + pricing_grid_marker)
        changes += 1
        print("✅ Lien article pricing remonté avant les cartes (style bouton)")
    else:
        print("⚠️  pricing-grid marker non trouvé")
else:
    print("⚠️  Bloc article link non trouvé")

# ══════════════════════════════════════════════════════════════
# 4. MOBILE MENU — Nettoyer (garder 1 seul CTA)
# ══════════════════════════════════════════════════════════════

# The mobile menu currently shows both hero CTAs AND the Calendly CTA
# We need to ensure the mobile menu doesn't show the hero buttons
# This is handled by the mobile-menu div, which is separate from hero buttons
# The hero buttons are visible because they're inside the hero section
# The mobile menu should just have nav links + 1 CTA

# No change needed here - the hero CTAs are part of the page content, not the menu
# The issue in screenshot 2 is that the mobile menu AND the hero show CTAs together
# which is expected behavior

# ══════════════════════════════════════════════════════════════
# 5. ENCART B2B — Plus compact sur mobile
# ══════════════════════════════════════════════════════════════

old_encart_style = 'style="margin-top:48px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:36px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;"'

new_encart_style = 'style="margin-top:32px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;"'

if old_encart_style in html:
    html = html.replace(old_encart_style, new_encart_style)
    changes += 1
    print("✅ Encart B2B padding réduit")
else:
    print("⚠️  Encart B2B style non trouvé")

# ══════════════════════════════════════════════════════════════
# 6. HERO PHOTO — Fix src (still points to gabriel.png)
# ══════════════════════════════════════════════════════════════

if 'src="gabriel.png"' in html and 'src="gabriel-hero.png"' not in html:
    html = html.replace('src="gabriel.png"', 'src="gabriel-hero.png"')
    changes += 1
    print("✅ Hero photo src → gabriel-hero.png")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées sur index.html !")

# ══════════════════════════════════════════════════════════════
# 7. FORMATIONS ENTREPRISES — CTA sous chaque carte + compact mobile
# ══════════════════════════════════════════════════════════════

try:
    with open("formations-entreprises.html", "r", encoding="utf-8") as f:
        fe_html = f.read()

    fe_changes = 0

    # Add CTA button under each formation card's tags
    # Current pattern: </div>\n        </div>\n\n        <div class="formation-card">
    # We need to add a CTA before the closing </div> of each card

    # Replace each formation-tags closing with tags + CTA
    old_tags_close = """</div>
        </div>

        <div class="formation-card">"""

    new_tags_close = f"""</div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">"""

    count = fe_html.count(old_tags_close)
    if count > 0:
        fe_html = fe_html.replace(old_tags_close, new_tags_close)
        fe_changes += count
        print(f"✅ {count} CTA ajoutés entre les cartes formation")

    # Add CTA to the LAST formation card (IA & Automatisation)
    last_card_close = """</div>

      </div>
    </div>
  </section>

  <section class="method-section">"""

    last_card_with_cta = f"""</div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

      </div>
    </div>
  </section>

  <section class="method-section">"""

    if last_card_close in fe_html:
        fe_html = fe_html.replace(last_card_close, last_card_with_cta)
        fe_changes += 1
        print("✅ CTA ajouté sur la dernière carte formation")

    # Add compact mobile CSS for formation cards
    mobile_formation_css = """
    @media (max-width: 480px) {
      .formation-card { padding: 24px 20px; }
      .formation-card p { font-size: 0.85rem; margin-bottom: 12px; }
      .page-hero { padding: 60px 0 40px; }
      .page-hero h1 { font-size: 1.8rem; }
      .method-grid { grid-template-columns: 1fr !important; gap: 24px; }
      .cta-section { padding: 60px 0; }
      .cta-section h2 { font-size: 1.4rem; }
    }"""

    # Insert before </style>
    style_close = "  </style>\n</head>"
    if style_close in fe_html and "formation-card { padding: 24px" not in fe_html:
        fe_html = fe_html.replace(style_close, mobile_formation_css + "\n  </style>\n</head>")
        fe_changes += 1
        print("✅ CSS mobile compact formations ajouté")

    with open("formations-entreprises.html", "w", encoding="utf-8") as f:
        f.write(fe_html)

    print(f"🎉 {fe_changes} modifications sur formations-entreprises.html !")

except FileNotFoundError:
    print("⚠️  formations-entreprises.html non trouvé")

print(f"\n👉 git add . && git commit -m 'Mobile: carousel pricing + hero stats + CTAs formations' && git push")
