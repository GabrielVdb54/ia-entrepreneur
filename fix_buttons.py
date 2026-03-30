#!/usr/bin/env python3
"""
Fix: boutons CTA cliquables + ajout favicon
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. FIX — Rendre les boutons CTA cliquables dans les cartes
#    Le ::before de .service-card couvre les boutons
#    Solution : ajouter position:relative;z-index:2 aux boutons
# ══════════════════════════════════════════════════════════════

# Fix bouton "Réserver mon appel gratuit"
old_btn_1 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:#1A3CFF;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;"'
new_btn_1 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:#1A3CFF;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,60,255,0.4);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;position:relative;z-index:2;"'

count = html.count(old_btn_1)
if count > 0:
    html = html.replace(old_btn_1, new_btn_1)
    changes += 1
    print(f"✅ Bouton 'Réserver un appel' fix z-index ({count}x)")
else:
    print("⚠️  Bouton Réserver non trouvé")

# Fix bouton "Demander un devis"
old_btn_2 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:#F0F2FF;border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;text-decoration:none;"'
new_btn_2 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;font-weight:700;font-size:0.9rem;background:transparent;color:#F0F2FF;border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;text-decoration:none;position:relative;z-index:2;"'

if old_btn_2 in html:
    html = html.replace(old_btn_2, new_btn_2)
    changes += 1
    print("✅ Bouton 'Demander un devis' fix z-index")
else:
    print("⚠️  Bouton Devis non trouvé")

# Fix bouton vert "Comment ça marche" section
old_btn_3 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#10B981;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;"'
new_btn_3 = 'href="#contact" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;background:#10B981;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;position:relative;z-index:2;"'

if old_btn_3 in html:
    html = html.replace(old_btn_3, new_btn_3)
    changes += 1
    print("✅ Bouton vert 'Comment ça marche' fix z-index")
else:
    print("⚠️  Bouton vert non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. FAVICON — Ajouter la balise dans le <head>
# ══════════════════════════════════════════════════════════════

favicon_tag = '  <link rel="icon" type="image/png" href="/favicon.png" />\n  <link rel="apple-touch-icon" href="/favicon.png" />\n'

# Insert after <meta name="viewport"...>
viewport_marker = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
if viewport_marker in html:
    html = html.replace(viewport_marker, viewport_marker + '\n' + favicon_tag)
    changes += 1
    print("✅ Favicon ajouté dans le <head>")
else:
    print("⚠️  Balise viewport non trouvée")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} corrections appliquées !")
print("   👉 N'oublie pas de copier le fichier favicon.png à la racine du projet")
print("   👉 git add . && git commit -m 'Fix CTA + favicon' && git push")
