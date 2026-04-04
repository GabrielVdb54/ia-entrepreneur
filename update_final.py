#!/usr/bin/env python3
"""
Mise à jour finale :
- index.html : CTA → #services, photo réduite
- formations-entreprises.html : réordonnées + renommées + SEO
"""
import re

CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# INDEX.HTML
# ══════════════════════════════════════════════════════════════

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# 1. CTA "Lancer mon entreprise" → #services
m = re.search(r'href="([^"]*)"([^>]*)>\s*Lancer mon entreprise', html)
if m and m.group(1) != '#services':
    html = html.replace(m.group(0), m.group(0).replace(f'href="{m.group(1)}"', 'href="#services"'))
    changes += 1
    print(f"✅ CTA Lancer → #services (était {m.group(1)})")
elif m:
    print("ℹ️  CTA déjà vers #services")
else:
    print("⚠️  CTA Lancer non trouvé")

# 2. Photo hero taille réduite
for old_size in ["max-width: 460px;", "max-width: 520px;"]:
    if old_size in html:
        html = html.replace(old_size, "max-width: 380px;", 1)
        changes += 1
        print(f"✅ Photo hero {old_size} → 380px")
        break

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
print(f"🎉 {changes} modifications sur index.html")

# ══════════════════════════════════════════════════════════════
# FORMATIONS-ENTREPRISES.HTML — Réécriture complète du grid
# ══════════════════════════════════════════════════════════════

with open("formations-entreprises.html", "r", encoding="utf-8") as f:
    fe = f.read()

fe_changes = 0

# SEO: Title + meta
old_titles = [
    '<title>Formations Entreprises : Vente, Management, IA &amp; Prise de parole | IA-Entrepreneur</title>',
    '<title>Formation management, vente &amp; prospection pour entreprises | IA-Entrepreneur</title>'
]
new_title = '<title>Formation IA entreprise, management &amp; prospection commerciale | IA-Entrepreneur</title>'
for ot in old_titles:
    if ot in fe:
        fe = fe.replace(ot, new_title)
        fe_changes += 1
        print("✅ SEO title mis à jour")
        break

old_descs = [
    'content="Formations sur mesure pour entreprises et salariés : prospection, négociation, vente, management, prise de parole en public, IA & automatisation. Intervenant : Gabriel Vanderbecken."',
    'content="Formations professionnelles sur mesure : management des équipes, techniques de vente, prospection commerciale, négociation, prise de parole en public et IA. Certification Qualiopi en cours."'
]
new_desc = 'content="Formation IA ChatGPT pour entreprises, prospection commerciale, management, techniques de vente et prise de parole. Sur mesure, présentiel ou distanciel. Certification Qualiopi en cours."'
for od in old_descs:
    if od in fe:
        fe = fe.replace(od, new_desc)
        fe_changes += 1
        print("✅ SEO description mise à jour")
        break

# Keywords
old_kw = 'content="formation entreprise vente, formation management équipe, formation prise de parole, formation IA entreprise, formation négociation commerciale"'
new_kw = 'content="formation ia entreprise, formation chatgpt entreprise, formation management, formation prospection commerciale, formation négociation commerciale, formation prise de parole en public, formation vente"'
if old_kw in fe:
    fe = fe.replace(old_kw, new_kw)
    fe_changes += 1
    print("✅ SEO keywords mis à jour")

# Replace the entire formations-grid content
new_formations_grid = f'''<div class="formations-grid">

        <div class="formation-card">
          <div class="formation-icon">🤖</div>
          <h3>IA &amp; ChatGPT pour entreprises</h3>
          <p>Gagnez du temps au quotidien en intégrant ChatGPT, Claude et les outils IA dans votre activité. Vos équipes apprennent à automatiser les tâches répétitives, rédiger plus vite et prendre de meilleures décisions — sans compétences techniques.</p>
          <div class="formation-tags">
            <span class="formation-tag">ChatGPT</span>
            <span class="formation-tag">Automatisation</span>
            <span class="formation-tag">Productivité</span>
            <span class="formation-tag">Prompting</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">
          <div class="formation-icon">🎯</div>
          <h3>Prospection commerciale &amp; IA</h3>
          <p>Structurez votre prospection et générez des rendez-vous qualifiés grâce aux méthodes terrain et aux outils IA. De l'identification des cibles à la prise de rendez-vous, vos commerciaux apprennent à prospecter plus efficacement.</p>
          <div class="formation-tags">
            <span class="formation-tag">Ciblage</span>
            <span class="formation-tag">LinkedIn</span>
            <span class="formation-tag">Emailing</span>
            <span class="formation-tag">IA</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">
          <div class="formation-icon">👥</div>
          <h3>Management &amp; leadership</h3>
          <p>Développez le leadership de vos managers, apprenez-leur à motiver leurs collaborateurs, gérer les conflits et construire une équipe performante et autonome. Formation basée sur l'expérience terrain, pas sur la théorie.</p>
          <div class="formation-tags">
            <span class="formation-tag">Leadership</span>
            <span class="formation-tag">Motivation</span>
            <span class="formation-tag">Gestion de conflits</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">
          <div class="formation-icon">📈</div>
          <h3>Techniques de vente &amp; closing</h3>
          <p>Structurez votre processus de vente de A à Z : de la découverte client au closing. Apprenez à maximiser la valeur de chaque client grâce à l'upsell et au cross-sell, défendre vos prix et transformer les objections en opportunités.</p>
          <div class="formation-tags">
            <span class="formation-tag">Process de vente</span>
            <span class="formation-tag">Closing</span>
            <span class="formation-tag">Upsell</span>
            <span class="formation-tag">Objections</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">
          <div class="formation-icon">🤝</div>
          <h3>Négociation commerciale</h3>
          <p>Maîtrisez les techniques de négociation qui fonctionnent sur le terrain. Apprenez à défendre vos marges, traiter les objections et transformer un "je vais réfléchir" en signature. Méthodes éprouvées sur des deals grands comptes.</p>
          <div class="formation-tags">
            <span class="formation-tag">Négociation</span>
            <span class="formation-tag">Pricing</span>
            <span class="formation-tag">Grands comptes</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

        <div class="formation-card">
          <div class="formation-icon">🎤</div>
          <h3>Prise de parole en public</h3>
          <p>Apprenez à capter l'attention, structurer un message percutant et convaincre votre audience — que ce soit en réunion, en pitch ou en conférence. Méthode issue de 3 conférences publiques (Go Entrepreneur, France Travail, ECM Nancy).</p>
          <div class="formation-tags">
            <span class="formation-tag">Pitch</span>
            <span class="formation-tag">Storytelling</span>
            <span class="formation-tag">Confiance</span>
          </div>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--accent);border:1.5px solid rgba(16,185,129,0.3);transition:all 0.2s;text-decoration:none;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(16,185,129,0.3)'">Demander un devis →</a>
        </div>

      </div>'''

# Find and replace the entire formations-grid
grid_pattern = r'<div class="formations-grid">.*?</div>\s*</div>\s*</div>'
# This is tricky because of nested divs. Let me use a different approach.
grid_start_marker = '<div class="formations-grid">'
grid_end_marker = '</div>\n    </div>\n  </section>'

if grid_start_marker in fe:
    start = fe.index(grid_start_marker)
    # Find the section end after the grid
    end = fe.index(grid_end_marker, start)
    
    fe = fe[:start] + new_formations_grid + '\n    ' + fe[end:]
    fe_changes += 1
    print("✅ Formations réordonnées + renommées (IA 1er, SEO optimisé)")
else:
    print("⚠️  formations-grid non trouvé")

# Update the hero subtitle to mention IA first
old_hero_sub = "Développez les compétences commerciales, managériales et technologiques de vos équipes avec un formateur-entrepreneur qui applique ce qu'il enseigne."
new_hero_sub = "Formations IA, prospection, management et vente pour vos équipes — par un formateur-entrepreneur qui applique ce qu'il enseigne sur le terrain."
if old_hero_sub in fe:
    fe = fe.replace(old_hero_sub, new_hero_sub)
    fe_changes += 1
    print("✅ Hero subtitle mis à jour (IA en premier)")

# Update formation tabs if they exist (from earlier scripts)
# Clean up any leftover tab references
fe = fe.replace('ftab-active', '')

with open("formations-entreprises.html", "w", encoding="utf-8") as f:
    f.write(fe)

print(f"🎉 {fe_changes} modifications sur formations-entreprises.html")
print(f"\n👉 Copie aussi gabriel-hero.png (nouvelle version sans yeux transparents)")
print("   👉 git add . && git commit -m 'Formations renommées SEO + photo fixée + CTA corrigé' && git push")
