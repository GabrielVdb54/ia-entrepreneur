#!/usr/bin/env python3
"""
Mise à jour photos :
- gabriel-hero.png → Hero (remplace gabriel.png)
- gabriel-about.png → Section À propos
- gabriel-coaching.jpg → Section entre Comment ça marche et Témoignages
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. HERO — Remplacer gabriel.png par gabriel-hero.png
# ══════════════════════════════════════════════════════════════

if "gabriel.png" in html and "gabriel-hero.png" not in html:
    # Replace in hero section only (the img tag with the hero photo)
    html = html.replace(
        'src="gabriel.png"',
        'src="gabriel-hero.png"'
    )
    # Also update OG image
    html = html.replace(
        'src="https://ia-entrepreneur.fr/gabriel.png"',
        'src="https://ia-entrepreneur.fr/gabriel-hero.png"'
    )
    html = html.replace(
        'content="https://ia-entrepreneur.fr/gabriel.png"',
        'content="https://ia-entrepreneur.fr/gabriel-hero.png"'
    )
    changes += 1
    print("✅ Hero : gabriel-hero.png installée")
else:
    if "gabriel-hero.png" in html:
        print("ℹ️  gabriel-hero.png déjà en place")
    else:
        print("⚠️  gabriel.png non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. ABOUT — Ajouter gabriel-about.png dans la section À propos
# ══════════════════════════════════════════════════════════════

# The about section has a 2-column layout (apropos-layout)
# Left = text (apropos-text), Right = réalisations (apropos-realisations)
# We'll add the photo above the réalisations

if "gabriel-about.png" not in html:
    old_realisations = '<div class="apropos-realisations">'
    new_realisations_with_photo = '''<div class="apropos-realisations">
          <!-- Photo À propos -->
          <div style="text-align:center;margin-bottom:24px;">
            <img src="gabriel-about.png" alt="Gabriel Vanderbecken - formateur en entrepreneuriat" style="max-width:280px;border-radius:20px;margin:0 auto;filter:drop-shadow(0 20px 40px rgba(26,60,255,0.2));" />
          </div>'''

    if old_realisations in html:
        html = html.replace(old_realisations, new_realisations_with_photo, 1)
        changes += 1
        print("✅ About : gabriel-about.png ajoutée au-dessus des réalisations")
    else:
        print("⚠️  Section réalisations non trouvée")
else:
    print("ℹ️  gabriel-about.png déjà en place")

# ══════════════════════════════════════════════════════════════
# 3. COACHING — Ajouter photo entre Comment ça marche et Témoignages
# ══════════════════════════════════════════════════════════════

if "gabriel-coaching.jpg" not in html:
    coaching_section = """
  <!-- ── Accompagnement en action ───────────────────────────────── -->
  <section style="padding:80px 0;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);"></div>
    <div class="container">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;" class="reveal">
        <div>
          <div class="section-label"><span>Accompagnement terrain</span></div>
          <h2 style="font-size:clamp(1.5rem,3vw,2.2rem);font-weight:800;line-height:1.2;margin-bottom:20px;">Pas de la théorie.<br><span style="color:var(--primary);">De la pratique.</span></h2>
          <p style="font-size:1rem;color:#8A91B4;line-height:1.85;margin-bottom:16px;">Chaque séance, on avance ensemble sur <strong style="color:#F0F2FF;">votre</strong> projet. On ouvre votre laptop, on construit votre business plan, on rédige vos statuts, on prépare votre dossier de financement — en direct.</p>
          <p style="font-size:1rem;color:#8A91B4;line-height:1.85;margin-bottom:28px;">Ce n'est pas un cours magistral. C'est un <strong style="color:#F0F2FF;">coaching opérationnel</strong> où vous repartez à chaque étape avec des livrables concrets et actionnables.</p>
          <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#1A3CFF;color:#fff;box-shadow:0 4px 24px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 32px rgba(26,60,255,0.55)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 24px rgba(26,60,255,0.4)'">
            Réserver mon appel gratuit
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </a>
        </div>
        <div style="position:relative;">
          <div style="position:absolute;inset:-16px;border-radius:24px;background:rgba(26,60,255,0.15);filter:blur(30px);z-index:0;"></div>
          <img src="gabriel-coaching.jpg" alt="Gabriel Vanderbecken en séance d'accompagnement avec un entrepreneur" style="position:relative;z-index:1;width:100%;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.5);" />
        </div>
      </div>
    </div>
  </section>

"""

    # Insert before témoignages
    temoignages_markers = ["  <!-- ── Témoignages", '<section id="temoignages">']
    inserted = False
    for marker in temoignages_markers:
        if marker in html:
            html = html.replace(marker, coaching_section + marker, 1)
            changes += 1
            inserted = True
            print("✅ Section coaching avec photo ajoutée avant témoignages")
            break
    if not inserted:
        print("⚠️  Section témoignages non trouvée pour insérer coaching")
else:
    print("ℹ️  Section coaching déjà en place")

# ══════════════════════════════════════════════════════════════
# 4. CSS RESPONSIVE pour la section coaching
# ══════════════════════════════════════════════════════════════

if "grid-template-columns:1fr 1fr" not in html or "coaching" not in html:
    # The inline styles will handle most of it, but we need mobile override
    responsive_480 = "@media (max-width: 480px) {"
    coaching_responsive = """@media (max-width: 768px) {
      [style*="grid-template-columns:1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 480px) {"""
    
    if responsive_480 in html and "[style*=\"grid-template-columns:1fr 1fr\"]" not in html:
        html = html.replace(responsive_480, coaching_responsive, 1)
        changes += 1
        print("✅ CSS responsive coaching ajouté")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 Vérifie que gabriel-hero.png, gabriel-about.png et gabriel-coaching.jpg sont dans le dossier")
print("   👉 git add . && git commit -m 'Nouvelles photos : hero + about + coaching' && git push")
