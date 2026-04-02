#!/usr/bin/env python3
"""
Navigation restructurée + Hero CTAs + sous-titre pricing
- Nav: Accueil | Créer mon entreprise | Formations entreprises | À propos | Blog
- Hero CTA: "Lancer mon entreprise" + "Former mes équipes"
- Sous-titre pricing élargi aux jeunes dirigeants
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. DESKTOP NAV — Restructurer
# ══════════════════════════════════════════════════════════════

# Find the desktop nav links
old_nav_links = """<a href="/">Accueil</a>
          <a href="/#services">Services</a>
          <a href="/#apropos">À propos</a>
          <a href="/#temoignages">Témoignages</a>
          <a href="/#blog">Blog</a>"""

# Try alternate without / prefix (for index.html internal links)
old_nav_links_v2 = """<a href="#accueil">Accueil</a>
          <a href="#services">Services</a>
          <a href="#apropos">À propos</a>
          <a href="#temoignages">Témoignages</a>
          <a href="#blog">Blog</a>"""

new_nav_links = """<a href="#accueil">Accueil</a>
          <a href="#services">Créer mon entreprise</a>
          <a href="/formations-entreprises.html">Formations entreprises</a>
          <a href="#apropos">À propos</a>
          <a href="#blog">Blog</a>"""

for old in [old_nav_links, old_nav_links_v2]:
    if old in html:
        html = html.replace(old, new_nav_links, 1)  # Only first occurrence (desktop nav)
        changes += 1
        print("✅ Desktop nav restructurée")
        break
else:
    print("⚠️  Desktop nav non trouvée, tentative par éléments individuels...")
    # Try replacing individual elements
    replacements_done = 0
    
    # Replace "Services" link text
    for old_s in ['href="#services">Services</a>', 'href="/#services">Services</a>']:
        if old_s in html:
            html = html.replace(old_s, 'href="#services">Créer mon entreprise</a>', 1)
            replacements_done += 1
            break
    
    # Replace "Témoignages" with "Formations entreprises"
    for old_t in ['href="#temoignages">Témoignages</a>', 'href="/#temoignages">Témoignages</a>']:
        if old_t in html:
            html = html.replace(old_t, 'href="/formations-entreprises.html">Formations entreprises</a>', 1)
            replacements_done += 1
            break
    
    if replacements_done > 0:
        changes += 1
        print(f"✅ Desktop nav : {replacements_done} éléments remplacés")

# ══════════════════════════════════════════════════════════════
# 2. MOBILE NAV — Same restructure
# ══════════════════════════════════════════════════════════════

# Mobile menu has similar structure
old_mobile_items = [
    '<a href="#temoignages">Témoignages</a>',
    '<a href="/#temoignages">Témoignages</a>'
]

for old_m in old_mobile_items:
    while old_m in html:
        html = html.replace(old_m, '<a href="/formations-entreprises.html">Formations entreprises</a>')
        changes += 1
        print("✅ Mobile nav : Témoignages → Formations entreprises")

# Replace Services in mobile menu too
old_mobile_services = [
    '<a href="#services">Services</a>',
    '<a href="/#services">Services</a>'
]

for old_ms in old_mobile_services:
    while old_ms in html:
        html = html.replace(old_ms, '<a href="#services">Créer mon entreprise</a>')

# ══════════════════════════════════════════════════════════════
# 3. HERO CTA — "Lancer mon entreprise" + "Former mes équipes"
# ══════════════════════════════════════════════════════════════

# Current hero buttons - try multiple patterns
hero_btn_patterns = [
    # Pattern with Calendly link
    (f'<a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">', 
     'Démarrer maintenant'),
    # Pattern with #contact
    ('<a href="#contact" class="btn btn-primary">', 
     'Démarrer maintenant'),
]

for btn_open, btn_text in hero_btn_patterns:
    if btn_open in html and btn_text in html:
        # Replace the green CTA text
        old_btn_full = btn_open + '\n              ' + btn_text
        new_btn_full = '<a href="#services" class="btn btn-primary">\n              Lancer mon entreprise'
        if old_btn_full in html:
            html = html.replace(old_btn_full, new_btn_full, 1)
            changes += 1
            print("✅ Hero CTA 1 : 'Lancer mon entreprise'")
            break

# Second CTA - "Découvrir les formations" → "Former mes équipes"
old_discover = '>Découvrir les formations</a>'
new_discover = ' href="/formations-entreprises.html">Former mes équipes</a>'

if old_discover in html:
    # Need to also update the href
    old_full_discover = 'href="#services" class="btn btn-outline">Découvrir les formations</a>'
    new_full_discover = 'href="/formations-entreprises.html" class="btn btn-outline">Former mes équipes</a>'
    
    if old_full_discover in html:
        html = html.replace(old_full_discover, new_full_discover, 1)
        changes += 1
        print("✅ Hero CTA 2 : 'Former mes équipes'")
    else:
        # Just replace the text
        html = html.replace(old_discover, old_discover.replace('Découvrir les formations', 'Former mes équipes'), 1)
        changes += 1
        print("✅ Hero CTA 2 : texte remplacé")

# ══════════════════════════════════════════════════════════════
# 4. SOUS-TITRE PRICING — Inclure jeunes dirigeants
# ══════════════════════════════════════════════════════════════

old_pricing_sub = "3 formules d'accompagnement à la création d'entreprise — du choix du statut au suivi post-lancement, choisissez celle qui correspond à vos besoins."

new_pricing_sub = "Vous lancez votre entreprise ou vous voulez structurer une activité récente ? 3 formules pour passer de l'idée au premier client — ou reprendre les bases sur de bons rails."

if old_pricing_sub in html:
    html = html.replace(old_pricing_sub, new_pricing_sub)
    changes += 1
    print("✅ Sous-titre pricing élargi aux jeunes dirigeants")
else:
    print("⚠️  Sous-titre pricing non trouvé")

# ══════════════════════════════════════════════════════════════
# 5. FOOTER — Même restructure
# ══════════════════════════════════════════════════════════════

old_footer_links = [
    '<a href="#services">Services</a>',
    '<a href="/#services">Services</a>'
]

for old_fl in old_footer_links:
    if old_fl in html:
        html = html.replace(old_fl, '<a href="#services">Créer mon entreprise</a>')

old_footer_temoignages = [
    '<a href="#temoignages">Témoignages</a>',
    '<a href="/#temoignages">Témoignages</a>'
]

for old_ft in old_footer_temoignages:
    if old_ft in html:
        html = html.replace(old_ft, '<a href="/formations-entreprises.html">Formations entreprises</a>')

print("✅ Footer links mis à jour")
changes += 1

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Nav restructurée + Hero CTAs + pricing élargi' && git push")
