#!/usr/bin/env python3
"""
Mise à jour v5 :
- À propos condensé (2 paragraphes au lieu de 4)
- Pricing : remplace carte IA par carte Premium 3000€
- Encart B2B sous le pricing
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. À PROPOS — Condenser en 2 paragraphes
# ══════════════════════════════════════════════════════════════

# Current paragraph 1
old_p1 = """Je suis <strong>Gabriel Vanderbecken</strong>, formateur et entrepreneur basé dans le <strong>Grand Est</strong>. Je ne transmets pas ce que j'ai lu — <strong>je transmets ce que j'ai construit</strong>. J'ai fondé deux entreprises et accompagné plus de <strong>1 500 porteurs de projet</strong> dans la création de la leur."""

new_p1 = """Je suis <strong>Gabriel Vanderbecken</strong>, formateur et entrepreneur basé dans le <strong>Grand Est</strong>. Je ne transmets pas ce que j'ai lu — <strong>je transmets ce que j'ai construit</strong>. J'ai fondé deux entreprises et accompagné plus de <strong>1 500 porteurs de projet</strong>. Quand j'ai lancé Clindit, la V1 ne correspondait pas au marché — comme YouTube qui a démarré comme un site de rencontres. On a écouté, pivoté, et construit ce que le terrain nous demandait. C'est cette discipline que j'enseigne."""

if old_p1 in html:
    html = html.replace(old_p1, new_p1)
    changes += 1
    print("✅ À propos §1 condensé")
else:
    print("⚠️  À propos §1 non trouvé")

# Remove paragraph 2 (YouTube/BlaBlaCar) since it's now merged into §1
old_p2 = """YouTube a démarré comme un site de rencontres. BlaBlaCar ne s'appelait pas BlaBlaCar. Airbnb vendait des céréales pour survivre. L'histoire de <strong>Clindit</strong> n'est pas différente : la V1 de notre marketplace de nettoyage ne correspondait pas aux attentes réelles du marché. Au lieu de s'entêter, on a écouté les utilisateurs, tout repensé, et construit la V2 sur ce que le terrain nous demandait. <strong>C'est cette discipline — valider avec le marché avant de construire — que j'enseigne à chaque porteur de projet.</strong>"""

if old_p2 in html:
    html = html.replace(old_p2, "")
    # Clean up empty <p></p> tags
    html = html.replace("<p></p>", "")
    changes += 1
    print("✅ À propos §2 (YouTube/pivot) supprimé (fusionné dans §1)")
else:
    print("⚠️  À propos §2 non trouvé")

# Replace §3 (10K€ anecdote + entourage) with condensed version
old_p3 = """Ce que j'apporte, ce sont des <strong>résultats concrets</strong>. Exemple : j'ai accompagné un dirigeant de cabinet d'assurance sur son choix de statut. En le faisant passer de directeur général assimilé salarié à gérant majoritaire, il économise plus de <strong>10 000€ par an</strong> — juste en optimisant sa structure juridique. J'ai aussi appris qu'en entrepreneuriat, bien s'entourer est aussi important que bien exécuter. Il m'est arrivé de perdre plus de temps à motiver les mauvaises personnes qu'à avancer. Aujourd'hui, c'est un des premiers points que j'aborde avec les porteurs de projet."""

new_p3 = """Ma méthode est simple : d'abord, on valide que votre projet est en adéquation avec le marché et vos moyens. Ensuite seulement, on automatise et on pérennise avec l'IA. Aujourd'hui, l'information est gratuite — ce qui manque aux entrepreneurs, c'est <strong>l'expérience terrain</strong>. C'est ça que je transmets. <strong>C'est dans cet ordre que ça fonctionne.</strong>"""

if old_p3 in html:
    html = html.replace(old_p3, new_p3)
    changes += 1
    print("✅ À propos §3 condensé (méthode + terrain)")
else:
    print("⚠️  À propos §3 non trouvé")

# Remove §4 (terrain + IA) since it's now merged into §3
old_p4 = """Aujourd'hui, l'information est gratuite et instantanée. Ce qui manque aux entrepreneurs, c'est <strong>l'expérience terrain</strong> — savoir quoi faire quand le business plan ne suffit pas, quand le premier client dit non, quand la trésorerie se tend. Ma méthode est simple : d'abord, on valide que votre projet est en adéquation avec le marché et vos moyens. Ensuite seulement, on automatise et on pérennise avec l'IA. <strong>C'est dans cet ordre que ça fonctionne.</strong>"""

if old_p4 in html:
    html = html.replace(old_p4, "")
    html = html.replace("<p></p>", "")
    changes += 1
    print("✅ À propos §4 supprimé (fusionné dans §3)")
else:
    print("⚠️  À propos §4 non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. PRICING — Remplacer carte IA par carte Premium 3000€
# ══════════════════════════════════════════════════════════════

old_ia_card = """        <!-- IA & AUTOMATISATION -->
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
        </div>"""

new_premium_card = f"""        <!-- PREMIUM -->
        <div class="pricing-card reveal reveal-delay-3">
          <div class="pricing-icon">👑</div>
          <h3 class="pricing-name">Premium</h3>
          <p class="pricing-desc">L'accompagnement individuel et exclusif — je construis votre entreprise avec vous, en one-to-one.</p>
          <div class="pricing-price">3 000€</div>
          <p class="pricing-price-note">*Frais de tiers non inclus (frais de greffe &amp; annonce légale, environ 200€)</p>
          <ul class="pricing-features">
            <li style="color:var(--accent);font-weight:700;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:4px;">✦ Tout ce qui est inclus dans l'offre Pro</li>
            <li>Accompagnement 100% individuel (one-to-one, pas en groupe)</li>
            <li>Accès direct par téléphone &amp; WhatsApp pendant 3 mois</li>
            <li>3 sessions de suivi post-création (à 1, 2 et 3 mois)</li>
            <li>Relecture et validation personnelle de tous vos documents</li>
            <li>Stratégie d'acquisition clients sur mesure avec mise en place opérationnelle</li>
          </ul>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="pricing-cta pricing-cta-outline">
            Réserver mon appel gratuit
          </a>
        </div>"""

if old_ia_card in html:
    html = html.replace(old_ia_card, new_premium_card)
    changes += 1
    print("✅ Carte IA remplacée par carte Premium 3000€")
else:
    print("⚠️  Carte IA non trouvée")

# ══════════════════════════════════════════════════════════════
# 3. ENCART B2B sous le pricing (avant le footer note)
# ══════════════════════════════════════════════════════════════

b2b_encart = """
      <!-- Encart Formations Entreprises -->
      <div style="margin-top:48px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:36px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;" class="reveal">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-size:1.4rem;">🏢</span>
            <h3 style="font-size:1.15rem;font-weight:800;color:var(--text);">Vous êtes une entreprise ?</h3>
          </div>
          <p style="font-size:0.92rem;color:var(--muted);max-width:520px;line-height:1.6;">Formations sur mesure pour vos équipes : prospection, négociation, vente, management, prise de parole en public et IA appliquée. Éligible Qualiopi (en cours de certification).</p>
        </div>
        <a href="/formations-entreprises.html" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:var(--text);border:1.5px solid var(--border);cursor:pointer;transition:all 0.2s;text-decoration:none;white-space:nowrap;" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text)';this.style.transform='translateY(0)'">
          Découvrir nos formations entreprises
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

"""

# Insert before the pricing footer note or the article link
if "Vous êtes une entreprise" not in html:
    pricing_link_marker = """      <div style="text-align:center;margin-top:32px;" class="reveal">
        <a href="/blog/combien-coute-creation-entreprise-2026.html"""
    
    footer_note_marker = """      <p class="pricing-footer-note reveal">"""
    
    if pricing_link_marker in html:
        html = html.replace(pricing_link_marker, b2b_encart + pricing_link_marker)
        changes += 1
        print("✅ Encart B2B ajouté sous le pricing")
    elif footer_note_marker in html:
        html = html.replace(footer_note_marker, b2b_encart + footer_note_marker)
        changes += 1
        print("✅ Encart B2B ajouté (avant footer note)")
    else:
        print("⚠️  Emplacement encart B2B non trouvé")
else:
    print("ℹ️  Encart B2B déjà présent")

# ══════════════════════════════════════════════════════════════
# 4. Mise à jour du sous-titre section services
# ══════════════════════════════════════════════════════════════

old_sub = "De la création de votre statut au parcours complet avec business plan, financement et premiers clients — chaque offre est conçue pour vous faire avancer concrètement."
new_sub = "3 formules d'accompagnement à la création d'entreprise — du choix du statut au suivi post-lancement, choisissez celle qui correspond à vos besoins."

if old_sub in html:
    html = html.replace(old_sub, new_sub)
    changes += 1
    print("✅ Sous-titre services mis à jour")
else:
    print("⚠️  Sous-titre services non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'About condensé + Premium 3000€ + encart B2B' && git push")
