#!/usr/bin/env python3
"""
Mise à jour complète du site ia-entrepreneur.fr
- Cartes services (features + prix + CTA)
- Section À propos (nouveau texte IA)
- Section Comment ça marche (nouvelle)
- Téléphone dans le header
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. CARTE SERVICE 1 — Features + Prix + CTA
# ══════════════════════════════════════════════════════════════

old_features_1 = """            <li>Valider son idée et son marché</li>
            <li>Construire un business model solide</li>
            <li>Choisir son statut juridique</li>
            <li>Pitcher face aux financeurs</li>
            <li>Développer ses premières ventes</li>
          </ul>
          <span class="service-badge">Pour porteurs de projet &amp; nouveaux dirigeants</span>"""

new_features_1 = """            <li>Valider l'idée : étude de marché, concurrence &amp; produit/service</li>
            <li>Business plan avec 3 scénarios pour anticiper toute éventualité</li>
            <li>Choisir le bon statut juridique (+ création de société offerte)*</li>
            <li>Préparer le dossier de financement</li>
            <li>Développer ses premières ventes</li>
            <li>Kit de lancement marketing (Google My Business + site web)</li>
          </ul>
          <div style="margin:20px 0 8px;display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:1.6rem;font-weight:800;color:#10B981;">À partir de 1 500€</span>
          </div>
          <p style="font-size:0.78rem;color:#8A91B4;margin-bottom:20px;line-height:1.5;">*Hors frais légaux — Non éligible CPF, certification Qualiopi en cours</p>
          <a href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:#1A3CFF;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 32px rgba(26,60,255,0.55)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(26,60,255,0.4)'">
            Réserver mon appel gratuit
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </a>
          <div style="margin-top:16px;">
            <span class="service-badge">Pour porteurs de projet &amp; nouveaux dirigeants</span>
          </div>"""

if old_features_1 in html:
    html = html.replace(old_features_1, new_features_1)
    changes += 1
    print("✅ Carte Création : features + prix + CTA mis à jour")
else:
    print("⚠️  Carte Création non trouvée")

# ══════════════════════════════════════════════════════════════
# 2. CARTE SERVICE 2 — Prix + CTA
# ══════════════════════════════════════════════════════════════

old_features_2 = """            <li>Outils 100% accessibles</li>
          </ul>
          <span class="service-badge">Pour TPE, dirigeants &amp; équipes</span>"""

new_features_2 = """            <li>Outils 100% accessibles</li>
          </ul>
          <div style="margin:20px 0 8px;display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:1.3rem;font-weight:700;color:#8A91B4;">Sur devis — adapté à vos besoins</span>
          </div>
          <a href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:#F0F2FF;border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;text-decoration:none;" onmouseover="this.style.borderColor='#1A3CFF';this.style.color='#1A3CFF';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='#F0F2FF';this.style.transform='translateY(0)'">
            Demander un devis
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <div style="margin-top:16px;">
            <span class="service-badge">Pour TPE, dirigeants &amp; équipes</span>
          </div>"""

if old_features_2 in html:
    html = html.replace(old_features_2, new_features_2)
    changes += 1
    print("✅ Carte IA : prix + CTA mis à jour")
else:
    print("⚠️  Carte IA non trouvée")

# ══════════════════════════════════════════════════════════════
# 3. À PROPOS — Nouveau texte paragraphe 2
# ══════════════════════════════════════════════════════════════

old_apropos_p2 = """Formateur en école de commerce depuis 2 ans, j'interviens également auprès d'entreprises pour les aider à intégrer l'IA dans leurs processus. Spécialisé en optimisation et en génération de leads, j'ai contribué à générer plus de <strong>100 rendez-vous qualifiés par mois</strong> pour mes partenaires, avec des partenariats grands comptes à la clé."""

new_apropos_p2 = """Formateur en école de commerce depuis 2 ans, j'ai surtout appliqué les méthodes d'IA et d'automatisation à <strong>mes propres entreprises</strong>. Résultat concret : les emails sont traités automatiquement, les clients sont fidélisés sans intervention manuelle et la prospection tourne en continu. Ce modèle, je l'ai rendu <strong>duplicable pour les dirigeants de TPE et les salariés en reconversion</strong> qui veulent gagner du temps et accélérer leur croissance."""

if old_apropos_p2 in html:
    html = html.replace(old_apropos_p2, new_apropos_p2)
    changes += 1
    print("✅ Section À propos mise à jour")
else:
    print("⚠️  Texte À propos non trouvé")

# ══════════════════════════════════════════════════════════════
# 4. SECTION "COMMENT ÇA MARCHE" — Insertion
# ══════════════════════════════════════════════════════════════

comment_ca_marche = """
  <!-- ── Comment ça marche ──────────────────────────────────────── -->
  <section id="methode" style="padding:100px 0;position:relative;">
    <div style="content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);"></div>
    <div class="container">
      <div class="section-label reveal"><span>Votre parcours</span></div>
      <h2 class="section-title reveal">Comment ça marche</h2>
      <p class="section-sub reveal">Un accompagnement structuré en 4 étapes — de la prise de contact au lancement de votre activité.</p>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;position:relative;" class="reveal">
        <!-- Ligne de connexion -->
        <div style="position:absolute;top:48px;left:calc(12.5% + 24px);right:calc(12.5% + 24px);height:2px;background:linear-gradient(90deg,#1A3CFF,#10B981);opacity:0.3;z-index:0;"></div>

        <div style="text-align:center;position:relative;z-index:1;">
          <div style="width:96px;height:96px;border-radius:50%;background:rgba(26,60,255,0.15);border:2px solid rgba(26,60,255,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;">📞</div>
          <div style="font-size:0.75rem;font-weight:800;color:#1A3CFF;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Étape 1</div>
          <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:8px;color:#F0F2FF;">Appel découverte gratuit</h3>
          <p style="font-size:0.88rem;color:#8A91B4;line-height:1.6;">On échange 20 min sur votre projet, vos objectifs et vos freins. Sans engagement.</p>
        </div>

        <div style="text-align:center;position:relative;z-index:1;">
          <div style="width:96px;height:96px;border-radius:50%;background:rgba(26,60,255,0.15);border:2px solid rgba(26,60,255,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;">🎯</div>
          <div style="font-size:0.75rem;font-weight:800;color:#1A3CFF;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Étape 2</div>
          <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:8px;color:#F0F2FF;">Programme personnalisé</h3>
          <p style="font-size:0.88rem;color:#8A91B4;line-height:1.6;">Je construis un programme adapté à votre situation, votre rythme et vos priorités.</p>
        </div>

        <div style="text-align:center;position:relative;z-index:1;">
          <div style="width:96px;height:96px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;">🚀</div>
          <div style="font-size:0.75rem;font-weight:800;color:#10B981;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Étape 3</div>
          <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:8px;color:#F0F2FF;">Accompagnement terrain</h3>
          <p style="font-size:0.88rem;color:#8A91B4;line-height:1.6;">On avance ensemble, étape par étape. Business plan, statut, financement, premières ventes.</p>
        </div>

        <div style="text-align:center;position:relative;z-index:1;">
          <div style="width:96px;height:96px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;">🏆</div>
          <div style="font-size:0.75rem;font-weight:800;color:#10B981;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Étape 4</div>
          <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:8px;color:#F0F2FF;">Lancement &amp; premiers clients</h3>
          <p style="font-size:0.88rem;color:#8A91B4;line-height:1.6;">Votre entreprise est créée, votre offre est en ligne et vos premiers clients sont signés.</p>
        </div>
      </div>

      <div style="text-align:center;margin-top:48px;" class="reveal">
        <a href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#10B981;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 32px rgba(16,185,129,0.5)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 24px rgba(16,185,129,0.35)'">
          Réserver mon appel gratuit
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
        </a>
      </div>
    </div>
  </section>

"""

# Insert before Témoignages section
temoignages_marker = "  <!-- ── Témoignages"
if temoignages_marker in html:
    html = html.replace(temoignages_marker, comment_ca_marche + temoignages_marker)
    changes += 1
    print("✅ Section 'Comment ça marche' ajoutée")
else:
    # Try alternate marker
    alt_marker = '<section id="temoignages">'
    if alt_marker in html:
        html = html.replace(alt_marker, comment_ca_marche.rstrip() + "\n\n  " + alt_marker)
        changes += 1
        print("✅ Section 'Comment ça marche' ajoutée (méthode alt)")
    else:
        print("⚠️  Marqueur témoignages non trouvé")

# ══════════════════════════════════════════════════════════════
# 5. TÉLÉPHONE DANS LE HEADER
# ══════════════════════════════════════════════════════════════

old_nav_cta = '<a href="#contact" class="nav-cta">Me contacter</a>'
new_nav_cta = '<a href="tel:+33699250344" style="font-size:0.88rem;font-weight:600;color:#8A91B4;display:flex;align-items:center;gap:6px;transition:color 0.2s;" onmouseover="this.style.color=\'#F0F2FF\'" onmouseout="this.style.color=\'#8A91B4\'"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>06 99 25 03 44</a>\n          <a href="#contact" class="nav-cta">Me contacter</a>'

if old_nav_cta in html:
    html = html.replace(old_nav_cta, new_nav_cta, 1)
    changes += 1
    print("✅ Téléphone ajouté dans le header")
else:
    print("⚠️  Nav CTA non trouvé dans le header")

# ══════════════════════════════════════════════════════════════
# 6. RESPONSIVE "COMMENT ÇA MARCHE"
# ══════════════════════════════════════════════════════════════

# Add responsive CSS for the new section
old_responsive_480 = "@media (max-width: 480px) {"
new_responsive = """@media (max-width: 1024px) {
      #methode [style*="grid-template-columns:repeat(4"] {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      #methode [style*="position:absolute;top:48px"] {
        display: none !important;
      }
    }

    @media (max-width: 480px) {
      #methode [style*="grid-template-columns:repeat(4"] {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 480px) {"""

if old_responsive_480 in html:
    html = html.replace(old_responsive_480, new_responsive, 1)
    changes += 1
    print("✅ CSS responsive ajouté pour 'Comment ça marche'")
else:
    print("⚠️  Media query 480px non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées avec succès !")
print("   👉 git add . && git commit -m 'Refonte services + methode + tel + about' && git push")
