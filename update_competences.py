#!/usr/bin/env python3
"""
Restructuration compétences → formations :
1. Chiffres clés : 1500+ BP / 2 entreprises / 6 modules / 3 conférences
2. Réalisations : 3 blocs liés aux formations
3. Transition phrase
"""
import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. CHIFFRES CLÉS — Remplacer les 4 stats
# ══════════════════════════════════════════════════════════════

# Find the chiffres-grid div and replace its content
# Current stats: 1500+ / 7 ans / 100+ / 3
# New stats: 1500+ BP / 2 entreprises / 6 modules / 3 conférences

# Match the entire chiffres-grid content
chiffres_pattern = r'(<div class="chiffres-grid">)(.*?)(</div>\s*</div>\s*</section>)'
chiffres_match = re.search(chiffres_pattern, html, re.DOTALL)

if chiffres_match:
    new_chiffres_content = """
        <div class="chiffre-item">
          <div class="chiffre-num accent">1 500+</div>
          <div class="chiffre-label">Porteurs de projet<br>accompagnés</div>
        </div>
        <div class="chiffre-item">
          <div class="chiffre-num">2</div>
          <div class="chiffre-label">Entreprises créées<br>&amp; dirigées</div>
        </div>
        <div class="chiffre-item">
          <div class="chiffre-num accent">6</div>
          <div class="chiffre-label">Modules enseignés<br>en entreprise &amp; école de commerce</div>
        </div>
        <div class="chiffre-item">
          <div class="chiffre-num">3</div>
          <div class="chiffre-label">Conférences publiques<br>Go Entrepreneur, France Travail, ECM</div>
        </div>
      """
    
    html = chiffres_match.group(1) + new_chiffres_content + chiffres_match.group(3)
    changes += 1
    print("✅ Chiffres clés : 1500+ BP / 2 entreprises / 6 modules / 3 conférences")
else:
    print("⚠️  Section chiffres-grid non trouvée")

# Fix the counter animation JS - it's currently set for old values
# Change animateCounter for the first number to not use + suffix logic
# Actually, let's just update the JS targets
old_counter_1500 = "animateCounter(nums[0], 1500, '+');"
new_counter_1500 = "animateCounter(nums[0], 1500, '+');"  # Keep same
# The second counter was "7 ans" with a custom handler, now it's "2"
# Let's replace the whole counter logic
old_counter_block = """        animateCounter(nums[0], 1500, '+');
        animateCounter(nums[2], 100, '+');"""

new_counter_block = """        animateCounter(nums[0], 1500, '+');
        if (nums[1]) nums[1].textContent = '2';
        if (nums[2]) { animateCounter(nums[2], 6, ''); }
        if (nums[3]) nums[3].textContent = '3';"""

if old_counter_block in html:
    html = html.replace(old_counter_block, new_counter_block)
    changes += 1
    print("✅ Animations compteurs mises à jour")
else:
    print("⚠️  Bloc animation compteurs non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. RÉALISATIONS — Remplacer par 3 blocs compétences
# ══════════════════════════════════════════════════════════════

# Find the apropos-realisations div
realisations_pattern = r'<div class="apropos-realisations">(.*?)</div>\s*</div>\s*</div>\s*</section>'
realisations_match = re.search(realisations_pattern, html, re.DOTALL)

if realisations_match:
    new_realisations = """<div class="apropos-realisations">

          <!-- Bloc 1: Création d'entreprise -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--primary);margin-bottom:12px;">→ Création d'entreprise</div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">📋</div>
              <div class="realisation-text">1 500+ porteurs de projet accompagnés<span>En cabinet comptable &amp; en formation</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">🏢</div>
              <div class="realisation-text">2 entreprises créées &amp; dirigées<span>Clindit &amp; Gains Analyses B2B</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">💰</div>
              <div class="realisation-text">10 000€ économisés/an pour un client<span>Optimisation de statut juridique</span></div>
            </div>
          </div>

          <!-- Bloc 2: Vente, négociation & prospection -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;">→ Vente, négociation &amp; prospection</div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">🎯</div>
              <div class="realisation-text">+100 RDV qualifiés/mois<span>Système de prospection automatisé créé par mes soins</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">🤝</div>
              <div class="realisation-text">Partenariats grands comptes négociés<span>Dont Derichebourg — closing terrain</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">🎓</div>
              <div class="realisation-text">Modules négociation &amp; prospection<span>Enseignés en entreprise &amp; à ECM Nancy (école de commerce)</span></div>
            </div>
          </div>

          <!-- Bloc 3: Prise de parole, management & IA -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#7a9fff;margin-bottom:12px;">→ Prise de parole, management &amp; IA</div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">🎤</div>
              <div class="realisation-text">3 conférences publiques<span>Go Entrepreneur, France Travail, ECM Nancy</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">👥</div>
              <div class="realisation-text">+10 personnes managées<span>En cabinet et dans mes entreprises</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:8px 0;">
              <div class="realisation-icon">⚡</div>
              <div class="realisation-text">5h gagnées/semaine grâce à l'IA<span>Automatisation appliquée sur mes propres entreprises</span></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>"""

    # Replace the whole block from apropos-realisations to end of section
    full_old = '<div class="apropos-realisations">' + realisations_match.group(1) + '</div>\n      </div>\n    </div>\n  </section>'
    
    # Actually let me be more careful - find exact boundaries
    start_marker = '<div class="apropos-realisations">'
    start_idx = html.index(start_marker)
    
    # Find the closing of the apropos section
    # Look for the next </section> after start_idx
    section_end = html.index('</section>', start_idx)
    section_end_full = section_end + len('</section>')
    
    old_block = html[start_idx:section_end_full]
    html = html[:start_idx] + new_realisations + html[section_end_full:]
    
    changes += 1
    print("✅ Réalisations : 3 blocs compétences liés aux formations")
else:
    print("⚠️  Section réalisations non trouvée, tentative alternative...")
    # Try to find by looking for the first realisation-item
    if 'realisation-item' in html:
        print("   → realisation-item trouvé, mais pattern global non matché")
    else:
        print("   → Aucun realisation-item trouvé")

# ══════════════════════════════════════════════════════════════
# 3. TITRE À PROPOS — Ajouter transition
# ══════════════════════════════════════════════════════════════

old_apropos_title = """Un entrepreneur qui forme<br /><span style="color:var(--accent)">des entrepreneurs</span>"""

new_apropos_title = """Un entrepreneur qui forme<br /><span style="color:var(--accent)">des entrepreneurs</span></h2>
          <p style="font-size:0.9rem;color:var(--primary);font-weight:600;margin-bottom:24px;border-left:3px solid var(--primary);padding-left:12px;">Chaque formation est construite à partir d'expériences réelles — pas de théorie descendante, pas de slides récités. Voici d'où vient ma méthode.</p>
          <div style="display:none;">"""

# We need to close the hidden div and remove the duplicate </h2>
# Actually this is getting complex. Let me just add the phrase after the h2 closing tag

old_title_simple = 'Un entrepreneur qui forme'
if old_title_simple in html:
    # Find the closing </h2> after this title
    title_idx = html.index(old_title_simple)
    h2_close = html.index('</h2>', title_idx)
    h2_close_full = h2_close + len('</h2>')
    
    transition = '\n          <p style="font-size:0.9rem;color:var(--primary);font-weight:600;margin-bottom:24px;border-left:3px solid var(--primary);padding-left:12px;">Chaque formation est construite à partir d\'expériences réelles — pas de théorie descendante, pas de slides récités.</p>'
    
    # Check if transition already exists
    if "Chaque formation est construite" not in html:
        html = html[:h2_close_full] + transition + html[h2_close_full:]
        changes += 1
        print("✅ Phrase de transition ajoutée sous le titre À propos")
    else:
        print("ℹ️  Phrase de transition déjà présente")
else:
    print("⚠️  Titre À propos non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Compétences liées aux formations + chiffres mis à jour' && git push")
