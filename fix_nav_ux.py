#!/usr/bin/env python3
"""
Fix navigation UX :
- Simplifie la nav : Logo | Particuliers | Entreprises | À propos | Blog | [Appel gratuit]
- Retire le téléphone de la nav (reste dans contact)
- Un seul bouton CTA (Appel gratuit)
- Hero CTAs mis à jour
- Mobile menu aussi
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. REMPLACER TOUTE LA NAV DESKTOP
# ══════════════════════════════════════════════════════════════

# We need to find the nav element and replace it entirely
# The nav is between <nav> and </nav>
import re

# Find the full nav block
nav_pattern = r'<nav>.*?</nav>'
nav_match = re.search(nav_pattern, html, re.DOTALL)

if nav_match:
    old_nav = nav_match.group()
    
    new_nav = f'''<nav>
          <a href="#services">Création d'entreprise</a>
          <a href="/formations-entreprises.html">Entreprises</a>
          <a href="#apropos">À propos</a>
          <a href="#blog">Blog</a>
          <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="nav-cta" style="background:var(--accent);box-shadow:0 3px 16px rgba(16,185,129,0.35);">Appel gratuit</a>
        </nav>'''
    
    html = html.replace(old_nav, new_nav, 1)
    changes += 1
    print("✅ Nav desktop simplifiée (5 items + 1 CTA)")
else:
    print("⚠️  Balise <nav> non trouvée")

# ══════════════════════════════════════════════════════════════
# 2. REMPLACER LE MOBILE MENU
# ══════════════════════════════════════════════════════════════

mobile_pattern = r'<div class="mobile-menu" id="mobile-menu">.*?</div>'
mobile_match = re.search(mobile_pattern, html, re.DOTALL)

if mobile_match:
    old_mobile = mobile_match.group()
    
    new_mobile = f'''<div class="mobile-menu" id="mobile-menu">
      <a href="#services">Création d'entreprise</a>
      <a href="/formations-entreprises.html">Formations entreprises</a>
      <a href="#apropos">À propos</a>
      <a href="#blog">Blog</a>
      <a href="#contact">Me contacter</a>
      <a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;">Réserver un appel gratuit</a>
    </div>'''
    
    html = html.replace(old_mobile, new_mobile, 1)
    changes += 1
    print("✅ Mobile menu simplifié")
else:
    print("⚠️  Mobile menu non trouvé")

# ══════════════════════════════════════════════════════════════
# 3. HERO CTAs — "Lancer mon entreprise" + "Former mes équipes"
# ══════════════════════════════════════════════════════════════

# Replace "Démarrer maintenant" button
old_hero_texts = [
    '>Démarrer maintenant',
    '>Lancer mon entreprise'
]
for old_ht in old_hero_texts:
    if old_ht in html:
        # Find the full link and update
        break

# Just do a simple text replacement for the button labels
if 'Démarrer maintenant' in html:
    # Replace first occurrence only (hero button)
    idx = html.index('Démarrer maintenant')
    html = html[:idx] + 'Lancer mon entreprise' + html[idx + len('Démarrer maintenant'):]
    changes += 1
    print("✅ Hero CTA 1 : 'Lancer mon entreprise'")

if 'Découvrir les formations' in html:
    idx = html.index('Découvrir les formations')
    html = html[:idx] + 'Former mes équipes' + html[idx + len('Découvrir les formations'):]
    changes += 1
    print("✅ Hero CTA 2 : 'Former mes équipes'")

# Update the href of "Découvrir les formations" / "Former mes équipes" button
old_discover_href = 'href="#services" class="btn btn-outline"'
new_discover_href = 'href="/formations-entreprises.html" class="btn btn-outline"'
if old_discover_href in html:
    html = html.replace(old_discover_href, new_discover_href, 1)
    print("✅ Hero CTA 2 href → formations-entreprises.html")

# Also update the "Démarrer maintenant" / "Lancer mon entreprise" href to #services
# (it might currently point to Calendly)
old_hero_href = f'href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"'
new_hero_href = 'href="#services" class="btn btn-primary"'
if old_hero_href in html:
    html = html.replace(old_hero_href, new_hero_href, 1)
    changes += 1
    print("✅ Hero CTA 1 href → #services")

# ══════════════════════════════════════════════════════════════
# 4. SOUS-TITRE PRICING
# ══════════════════════════════════════════════════════════════

old_subs = [
    "3 formules d'accompagnement à la création d'entreprise — du choix du statut au suivi post-lancement, choisissez celle qui correspond à vos besoins.",
    "3 formules d&#x27;accompagnement"
]

new_sub = "Vous lancez votre entreprise ou vous voulez structurer une activité récente ? 3 formules pour passer de l'idée au premier client — ou reprendre les bases sur de bons rails."

for old_s in old_subs:
    if old_s in html:
        html = html.replace(old_s, new_sub, 1)
        changes += 1
        print("✅ Sous-titre pricing élargi")
        break

# ══════════════════════════════════════════════════════════════
# 5. FOOTER — Mise à jour cohérente
# ══════════════════════════════════════════════════════════════

# Find footer links section and update
old_footer_patterns = [
    '<a href="#services">Services</a>',
    '<a href="/#services">Services</a>',
    '<a href="#services">Créer mon entreprise</a>'
]

for ofp in old_footer_patterns:
    if ofp in html:
        html = html.replace(ofp, '<a href="#services">Création d\'entreprise</a>')

old_footer_temo = [
    '<a href="#temoignages">Témoignages</a>',
    '<a href="/#temoignages">Témoignages</a>',
    '<a href="/formations-entreprises.html">Formations entreprises</a>'
]

# Ensure footer has formations link
has_formations_footer = '/formations-entreprises.html' in html.split('<footer>')[1] if '<footer>' in html else False

if not has_formations_footer:
    for oft in old_footer_temo:
        if oft in html:
            # Only replace in footer area
            footer_start = html.index('<footer>')
            footer_content = html[footer_start:]
            if oft in footer_content:
                footer_content = footer_content.replace(oft, '<a href="/formations-entreprises.html">Formations entreprises</a>', 1)
                html = html[:footer_start] + footer_content
                break

changes += 1
print("✅ Footer mis à jour")

# ══════════════════════════════════════════════════════════════
# 6. CSS — Ajuster taille nav pour labels plus longs
# ══════════════════════════════════════════════════════════════

old_nav_font = """    nav a {
      padding: 8px 16px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--muted);
      transition: color 0.2s, background 0.2s;
    }"""

new_nav_font = """    nav a {
      padding: 8px 14px;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--muted);
      transition: color 0.2s, background 0.2s;
    }"""

if old_nav_font in html:
    html = html.replace(old_nav_font, new_nav_font)
    changes += 1
    print("✅ CSS nav : taille réduite pour meilleur fit")
else:
    print("⚠️  CSS nav a non trouvé")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Nav UX optimisée : 5 items + 1 CTA' && git push")
