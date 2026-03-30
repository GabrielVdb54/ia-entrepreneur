#!/usr/bin/env python3
"""
Fix boutons CTA → Calendly + favicon
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. Bouton "Réserver mon appel gratuit" (carte Création)
#    Fix z-index + lien Calendly + ouverture nouvel onglet
# ══════════════════════════════════════════════════════════════

old_btn_1 = '''href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:#1A3CFF;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;"'''

new_btn_1 = f'''href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:#1A3CFF;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;position:relative;z-index:2;"'''

count = html.count(old_btn_1)
if count > 0:
    html = html.replace(old_btn_1, new_btn_1)
    changes += 1
    print(f"✅ Bouton 'Réserver un appel' → Calendly ({count}x)")
else:
    # Essai avec z-index déjà présent (si fix_buttons.py a déjà tourné)
    old_btn_1_alt = old_btn_1.replace('text-decoration:none;"', 'text-decoration:none;position:relative;z-index:2;"')
    count = html.count(old_btn_1_alt)
    if count > 0:
        html = html.replace(old_btn_1_alt, new_btn_1)
        changes += 1
        print(f"✅ Bouton 'Réserver un appel' → Calendly ({count}x, variante)")
    else:
        print("⚠️  Bouton Réserver non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. Bouton "Demander un devis" (carte IA)
#    Fix z-index + lien contact
# ══════════════════════════════════════════════════════════════

old_btn_2 = '''href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:#F0F2FF;border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;text-decoration:none;"'''

new_btn_2 = '''href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:#F0F2FF;border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;text-decoration:none;position:relative;z-index:2;"'''

if old_btn_2 in html:
    html = html.replace(old_btn_2, new_btn_2)
    changes += 1
    print("✅ Bouton 'Demander un devis' → fix z-index")
else:
    old_btn_2_alt = old_btn_2.replace('text-decoration:none;"', 'text-decoration:none;position:relative;z-index:2;"')
    if old_btn_2_alt in html:
        print("ℹ️  Bouton 'Demander un devis' déjà fixé")
    else:
        print("⚠️  Bouton Devis non trouvé")

# ══════════════════════════════════════════════════════════════
# 3. Bouton vert "Comment ça marche" → Calendly
# ══════════════════════════════════════════════════════════════

old_btn_3 = '''href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#10B981;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;"'''

new_btn_3 = f'''href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#10B981;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;position:relative;z-index:2;"'''

if old_btn_3 in html:
    html = html.replace(old_btn_3, new_btn_3)
    changes += 1
    print("✅ Bouton vert 'Comment ça marche' → Calendly")
else:
    old_btn_3_alt = old_btn_3.replace('text-decoration:none;"', 'text-decoration:none;position:relative;z-index:2;"')
    if old_btn_3_alt in html:
        html = html.replace(old_btn_3_alt, new_btn_3)
        changes += 1
        print("✅ Bouton vert 'Comment ça marche' → Calendly (variante)")
    else:
        print("⚠️  Bouton vert non trouvé")

# ══════════════════════════════════════════════════════════════
# 4. Boutons hero "Démarrer maintenant" → Calendly
# ══════════════════════════════════════════════════════════════

old_hero_cta = '<a href="#contact" class="btn btn-primary">'
new_hero_cta = f'<a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">'

if old_hero_cta in html:
    html = html.replace(old_hero_cta, new_hero_cta)
    changes += 1
    print("✅ Bouton hero 'Démarrer maintenant' → Calendly")
else:
    print("⚠️  Bouton hero non trouvé")

# ══════════════════════════════════════════════════════════════
# 5. FAVICON
# ══════════════════════════════════════════════════════════════

favicon_tag = '\n  <link rel="icon" type="image/png" href="/favicon.png" />\n  <link rel="apple-touch-icon" href="/favicon.png" />'

viewport_marker = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'

if 'rel="icon"' not in html:
    if viewport_marker in html:
        html = html.replace(viewport_marker, viewport_marker + favicon_tag)
        changes += 1
        print("✅ Favicon ajouté dans le <head>")
    else:
        print("⚠️  Balise viewport non trouvée")
else:
    print("ℹ️  Favicon déjà présent")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 Vérifie que favicon.png est bien à la racine du projet")
print("   👉 git add . && git commit -m 'CTA Calendly + favicon' && git push")
