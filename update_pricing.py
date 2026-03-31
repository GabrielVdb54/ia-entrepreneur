#!/usr/bin/env python3
"""
Remplacement de la section Services par 3 cartes pricing
Essentiel (500€) | Pro (1000€) recommandé | IA & Automatisation (sur devis)
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. AJOUTER LE CSS PRICING avant </style>
# ══════════════════════════════════════════════════════════════

pricing_css = """
    /* ── Pricing ─────────────────────────────────────────── */
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      align-items: stretch;
    }
    .pricing-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px 32px 36px;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
    }
    .pricing-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    }
    .pricing-card.featured {
      border: 2px solid var(--primary);
      background: linear-gradient(165deg, rgba(26,60,255,0.08) 0%, var(--card) 40%);
      transform: scale(1.04);
      z-index: 2;
    }
    .pricing-card.featured:hover {
      transform: scale(1.04) translateY(-6px);
      box-shadow: 0 24px 60px rgba(26,60,255,0.25);
    }
    .pricing-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 20px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 16px rgba(26,60,255,0.4);
      white-space: nowrap;
    }
    .pricing-icon {
      font-size: 2rem;
      margin-bottom: 16px;
    }
    .pricing-name {
      font-size: 1.3rem;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .pricing-desc {
      font-size: 0.88rem;
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .pricing-price {
      font-size: 2.4rem;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }
    .pricing-price-note {
      font-size: 0.78rem;
      color: var(--muted);
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .pricing-features {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
      flex: 1;
    }
    .pricing-features li {
      font-size: 0.9rem;
      color: #c8cfe8;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      line-height: 1.5;
    }
    .pricing-features li::before {
      content: '✓';
      color: var(--accent);
      font-weight: 800;
      font-size: 0.85rem;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .pricing-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      border: none;
      text-align: center;
    }
    .pricing-cta-primary {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 24px rgba(26,60,255,0.4);
    }
    .pricing-cta-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(26,60,255,0.55);
    }
    .pricing-cta-outline {
      background: transparent;
      color: var(--text);
      border: 1.5px solid var(--border);
    }
    .pricing-cta-outline:hover {
      border-color: var(--primary);
      color: var(--primary);
      transform: translateY(-2px);
    }
    .pricing-footer-note {
      text-align: center;
      margin-top: 32px;
      font-size: 0.82rem;
      color: var(--muted);
      line-height: 1.6;
    }

    @media (max-width: 1024px) {
      .pricing-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
      .pricing-card.featured { transform: scale(1); }
      .pricing-card.featured:hover { transform: translateY(-6px); }
    }
"""

style_close = "  </style>"
if style_close in html:
    html = html.replace(style_close, pricing_css + style_close)
    changes += 1
    print("✅ CSS pricing ajouté")
else:
    print("⚠️  Balise </style> non trouvée")

# ══════════════════════════════════════════════════════════════
# 2. REMPLACER LA GRILLE SERVICES PAR LES 3 CARTES PRICING
# ══════════════════════════════════════════════════════════════

# On cherche la div services-grid et tout son contenu
import re

# Find the services-grid div and replace it
old_grid_pattern = r'<div class="services-grid">.*?</div>\s*</div>\s*</div>\s*</div>'

CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

new_pricing = f'''<div class="pricing-grid">

        <!-- ESSENTIEL -->
        <div class="pricing-card reveal reveal-delay-1">
          <div class="pricing-icon">⚡</div>
          <h3 class="pricing-name">Essentiel</h3>
          <p class="pricing-desc">Vous avez votre idée, vous savez où vous allez — il vous faut le bon statut et la bonne structure pour démarrer.</p>
          <div class="pricing-price">500€</div>
          <p class="pricing-price-note">*Hors frais légaux</p>
          <ul class="pricing-features">
            <li>Conseil personnalisé sur le choix du statut juridique (micro, EURL, SASU)</li>
            <li>Création de votre société incluse*</li>
            <li>Orientation vers les aides disponibles (ACRE, ARCE)</li>
            <li>Accompagnement par un entrepreneur expérimenté</li>
          </ul>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="pricing-cta pricing-cta-outline">
            Réserver mon appel gratuit
          </a>
        </div>

        <!-- PRO — FEATURED -->
        <div class="pricing-card featured reveal reveal-delay-2">
          <div class="pricing-badge">Le + populaire</div>
          <div class="pricing-icon">🚀</div>
          <h3 class="pricing-name">Pro</h3>
          <p class="pricing-desc">Le parcours complet pour créer votre entreprise de A à Z — de l'idée au premier client.</p>
          <div class="pricing-price">1 000€</div>
          <p class="pricing-price-note">*Hors frais légaux — Tarif lancement (1 500€ après éligibilité CPF)</p>
          <ul class="pricing-features">
            <li>Étude de marché complète : concurrence, positionnement &amp; produit/service</li>
            <li>Business plan avec 3 scénarios (pessimiste, réaliste, optimiste)</li>
            <li>Choix du statut juridique + création de société incluse*</li>
            <li>Dossier de financement complet (ACRE, ARCE, prêt d'honneur, aides régionales)</li>
            <li>Stratégie premières ventes &amp; acquisition clients</li>
            <li>Kit de lancement marketing (Google My Business + site web)</li>
          </ul>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="pricing-cta pricing-cta-primary">
            Réserver mon appel gratuit
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </a>
        </div>

        <!-- IA & AUTOMATISATION -->
        <div class="pricing-card reveal reveal-delay-3">
          <div class="pricing-icon">🤖</div>
          <h3 class="pricing-name">IA &amp; Automatisation</h3>
          <p class="pricing-desc">Gagnez 10h par semaine en automatisant vos tâches répétitives grâce à l'IA — sans compétences techniques.</p>
          <div class="pricing-price" style="font-size:1.6rem;color:var(--muted);">Sur devis</div>
          <p class="pricing-price-note">Adapté à vos besoins et à la taille de votre équipe</p>
          <ul class="pricing-features">
            <li>Maîtriser ChatGPT, Claude &amp; Gemini pour votre activité</li>
            <li>Automatiser prospection, emails &amp; relation client</li>
            <li>Créer des workflows IA sur mesure</li>
            <li>Optimiser votre productivité globale</li>
            <li>Formation applicable immédiatement — outils 100% accessibles</li>
          </ul>
          <a href="#contact" class="pricing-cta pricing-cta-outline">
            Demander un devis
          </a>
        </div>

      </div>

      <p class="pricing-footer-note reveal">
        Toutes les formations sont dispensées en présentiel, distanciel ou e-learning.<br>
        Non éligible CPF — certification Qualiopi en cours. <strong>Profitez du tarif lancement avant augmentation.</strong>
      </p>'''

# Try to find and replace the services grid
# We need to match from <div class="services-grid"> to the closing of the section content
services_grid_start = '<div class="services-grid">'
if services_grid_start in html:
    # Find the start position
    start_idx = html.index(services_grid_start)
    
    # Find the end of the services grid - we need to count divs
    # The services-grid contains 2 service-cards, each with nested divs
    # Let's find the pattern more carefully
    # After the services-grid, the next major element is the closing of the container div
    
    # Look for the section closing pattern after services-grid
    # The structure is: <div class="services-grid">..cards..</div> then </div></section>
    
    # Count opening and closing div tags from start
    depth = 0
    i = start_idx
    found_end = False
    while i < len(html):
        if html[i:i+4] == '<div':
            depth += 1
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                end_idx = i + 6
                found_end = True
                break
        i += 1
    
    if found_end:
        old_grid = html[start_idx:end_idx]
        html = html[:start_idx] + new_pricing + html[end_idx:]
        changes += 1
        print("✅ Cartes pricing (3 colonnes) installées")
    else:
        print("⚠️  Fin de la grille services non trouvée")
else:
    print("⚠️  Grille services non trouvée")

# ══════════════════════════════════════════════════════════════
# 3. METTRE À JOUR LE TITRE DE LA SECTION
# ══════════════════════════════════════════════════════════════

old_section_title = """Formations en <em>création d'entreprise</em> et <em>automatisation IA</em>"""
new_section_title = """Nos <em>formations</em> — choisissez votre parcours"""

if old_section_title in html:
    html = html.replace(old_section_title, new_section_title)
    changes += 1
    print("✅ Titre section mis à jour")
else:
    # Try alternate format
    old_alt = "Formations en"
    if old_alt in html and "automatisation IA" in html:
        # Find the h2 containing this
        old_h2 = re.search(r'<h2 class="section-title reveal">.*?</h2>', html, re.DOTALL)
        if old_h2:
            old_h2_text = old_h2.group()
            if "Formations en" in old_h2_text and "services" in html[max(0,old_h2.start()-200):old_h2.start()]:
                new_h2 = '<h2 class="section-title reveal">Nos formations — <span style="color:var(--primary)">choisissez votre parcours</span></h2>'
                html = html.replace(old_h2_text, new_h2, 1)
                changes += 1
                print("✅ Titre section mis à jour (méthode alt)")
        else:
            print("⚠️  Titre section non trouvé")

# ══════════════════════════════════════════════════════════════
# 4. METTRE À JOUR LE SOUS-TITRE
# ══════════════════════════════════════════════════════════════

old_sub = "Présentiel, distanciel ou e-learning — j'adapte chaque format à votre réalité de terrain et aux enjeux concrets de votre projet."
new_sub = "De la création de votre statut au parcours complet avec business plan, financement et premiers clients — chaque offre est conçue pour vous faire avancer concrètement."

if old_sub in html:
    html = html.replace(old_sub, new_sub)
    changes += 1
    print("✅ Sous-titre section mis à jour")
else:
    print("⚠️  Sous-titre section non trouvé")

# ══════════════════════════════════════════════════════════════
# 5. SUPPRIMER L'ANCIEN CSS services-grid responsive si conflit
# ══════════════════════════════════════════════════════════════

# The old .services-grid CSS won't cause issues since the class is no longer used
# But let's clean up the responsive rule
old_responsive_services = "      .services-grid { grid-template-columns: 1fr; }"
if old_responsive_services in html:
    html = html.replace(old_responsive_services, "      .services-grid { grid-template-columns: 1fr; }\n      .pricing-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }")
    # Actually this is already handled in the CSS we added, so let's not duplicate
    # Revert
    html = html.replace("      .services-grid { grid-template-columns: 1fr; }\n      .pricing-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }", old_responsive_services)

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Pricing 3 offres : Essentiel + Pro + IA' && git push")
