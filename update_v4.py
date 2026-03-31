#!/usr/bin/env python3
"""
Mise à jour finale v4 :
- Section À propos : 4 paragraphes validés (pivot + 10K€ + terrain + IA)
- Carte Pro : format "Tout Essentiel +"
- Lien article pricing sous les cartes
- Bandeau stats entre hero et services
- CTA "Appel gratuit" dans le header
"""
import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0
CALENDLY = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

# ══════════════════════════════════════════════════════════════
# 1. SECTION À PROPOS — Remplacement complet des paragraphes
# ══════════════════════════════════════════════════════════════

# Try multiple possible versions of paragraph 1
p1_options = [
    """Je suis <strong>Gabriel Vanderbecken</strong>, formateur et entrepreneur basé dans le <strong>Grand Est</strong>. Avant de former, j'ai créé. J'ai fondé deux entreprises — <strong>Clindit</strong>, une marketplace de services de nettoyage, et <strong>Gains Analyses B2B</strong> — et accompagné plus de <strong>1500 porteurs de projet</strong> dans la création de leur entreprise en France.""",
    """Je suis <strong>Gabriel Vanderbecken</strong>, formateur et entrepreneur basé dans le <strong>Grand Est</strong>. Avant de former, j'ai créé — et j'ai galéré. Mauvais choix de statut au démarrage, trésorerie tendue, clients qui ne paient pas, un projet qui a pivoté avant de trouver son marché. Ces erreurs m'ont coûté du temps et de l'argent. Aujourd'hui, elles sont devenues la base de ma méthode d'accompagnement : je sais exactement où ça coince, parce que je suis passé par là."""
]

new_p1 = """Je suis <strong>Gabriel Vanderbecken</strong>, formateur et entrepreneur basé dans le <strong>Grand Est</strong>. Je ne transmets pas ce que j'ai lu — <strong>je transmets ce que j'ai construit</strong>. J'ai fondé deux entreprises et accompagné plus de <strong>1 500 porteurs de projet</strong> dans la création de la leur."""

for old_p1 in p1_options:
    if old_p1 in html:
        html = html.replace(old_p1, new_p1)
        changes += 1
        print("✅ À propos §1 (accroche expert) mis à jour")
        break
else:
    print("⚠️  À propos §1 non trouvé")

# Replace paragraph 2 — multiple possible versions
p2_options = [
    """Formateur en école de commerce depuis 2 ans, j'ai surtout appliqué les méthodes d'IA et d'automatisation à <strong>mes propres entreprises</strong>. Résultat concret : les emails sont traités automatiquement, les clients sont fidélisés sans intervention manuelle et la prospection tourne en continu. Ce modèle, je l'ai rendu <strong>duplicable pour les dirigeants de TPE et les salariés en reconversion</strong> qui veulent gagner du temps et accélérer leur croissance.""",
    """Formateur en école de commerce depuis 2 ans, j'interviens également auprès d'entreprises pour les aider à intégrer l'IA dans leurs processus. Spécialisé en optimisation et en génération de leads, j'ai contribué à générer plus de <strong>100 rendez-vous qualifiés par mois</strong> pour mes partenaires, avec des partenariats grands comptes à la clé.""",
    """<strong>Ma conviction :</strong> d'abord, on valide que le projet est 100% en adéquation avec le marché et vos moyens — humains et financiers. Ensuite seulement, on automatise et on pérennise. C'est dans cet ordre que j'ai construit <strong>Clindit</strong> (marketplace de nettoyage) et <strong>Gains Analyses B2B</strong>. Résultat : emails traités automatiquement, clients fidélisés sans intervention manuelle, prospection en continu. Ce modèle, je l'ai rendu <strong>duplicable pour les porteurs de projet, dirigeants de TPE et salariés en reconversion</strong>."""
]

new_p2 = """YouTube a démarré comme un site de rencontres. BlaBlaCar ne s'appelait pas BlaBlaCar. Airbnb vendait des céréales pour survivre. L'histoire de <strong>Clindit</strong> n'est pas différente : la V1 de notre marketplace de nettoyage ne correspondait pas aux attentes réelles du marché. Au lieu de s'entêter, on a écouté les utilisateurs, tout repensé, et construit la V2 sur ce que le terrain nous demandait. <strong>C'est cette discipline — valider avec le marché avant de construire — que j'enseigne à chaque porteur de projet.</strong>"""

for old_p2 in p2_options:
    if old_p2 in html:
        html = html.replace(old_p2, new_p2)
        changes += 1
        print("✅ À propos §2 (pivot Clindit) mis à jour")
        break
else:
    print("⚠️  À propos §2 non trouvé")

# Replace "Ma différence" paragraph with §3 (10K€) + §4 (terrain + IA)
difference_options = [
    """Ma différence ? Je ne transmets que ce que j'ai moi-même expérimenté sur le terrain.""",
    """Aujourd'hui, l'information est gratuite et instantanée. Ce qui manque aux entrepreneurs, c'est <strong>l'expérience terrain</strong> — savoir quoi faire quand le business plan ne suffit pas, quand le premier client dit non, quand la trésorerie se tend. C'est ça que je transmets : pas de la théorie, mais des réflexes d'entrepreneur forgés sur le terrain."""
]

new_p3_p4 = """Ce que j'apporte, ce sont des <strong>résultats concrets</strong>. Exemple : j'ai accompagné un dirigeant de cabinet d'assurance sur son choix de statut. En le faisant passer de directeur général assimilé salarié à gérant majoritaire, il économise plus de <strong>10 000€ par an</strong> — juste en optimisant sa structure juridique. J'ai aussi appris qu'en entrepreneuriat, bien s'entourer est aussi important que bien exécuter. Il m'est arrivé de perdre plus de temps à motiver les mauvaises personnes qu'à avancer. Aujourd'hui, c'est un des premiers points que j'aborde avec les porteurs de projet.</p>
          <p>Aujourd'hui, l'information est gratuite et instantanée. Ce qui manque aux entrepreneurs, c'est <strong>l'expérience terrain</strong> — savoir quoi faire quand le business plan ne suffit pas, quand le premier client dit non, quand la trésorerie se tend. Ma méthode est simple : d'abord, on valide que votre projet est en adéquation avec le marché et vos moyens. Ensuite seulement, on automatise et on pérennise avec l'IA. <strong>C'est dans cet ordre que ça fonctionne.</strong>"""

for old_diff in difference_options:
    if old_diff in html:
        html = html.replace(old_diff, new_p3_p4)
        changes += 1
        print("✅ À propos §3-§4 (10K€ + terrain + IA) mis à jour")
        break
else:
    print("⚠️  Paragraphe 'Ma différence' non trouvé")

# ══════════════════════════════════════════════════════════════
# 2. CARTE PRO — Format "Tout ce qui est dans Essentiel +"
# ══════════════════════════════════════════════════════════════

old_pro_features = """<li>Étude de marché complète : concurrence, positionnement &amp; produit/service</li>
            <li>Business plan avec 3 scénarios (pessimiste, réaliste, optimiste)</li>
            <li>Choix du statut juridique + création de société incluse*</li>
            <li>Dossier de financement complet (ACRE, ARCE, prêt d'honneur, aides régionales)</li>
            <li>Stratégie premières ventes &amp; acquisition clients</li>
            <li>Kit de lancement marketing (Google My Business + site web)</li>"""

# Also try with the updated creation text
old_pro_features_v2 = old_pro_features.replace(
    "Choix du statut juridique + création de société incluse*",
    "Choix du statut juridique + création complète de votre société : rédaction des statuts, dépôt de capital, dépôt du dossier &amp; obtention du Kbis — certifié par un expert-comptable"
)

new_pro_features = """<li style="color:var(--accent);font-weight:700;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:4px;">✦ Tout ce qui est inclus dans l'offre Essentiel</li>
            <li>Étude de marché complète : concurrence, positionnement &amp; produit/service</li>
            <li>Business plan avec 3 scénarios (pessimiste, réaliste, optimiste)</li>
            <li>Dossier de financement complet (ACRE, ARCE, prêt d'honneur, aides régionales)</li>
            <li>Stratégie premières ventes &amp; acquisition clients</li>
            <li>Kit de lancement marketing (Google My Business + site web)</li>"""

if old_pro_features_v2 in html:
    html = html.replace(old_pro_features_v2, new_pro_features)
    changes += 1
    print("✅ Carte Pro : format 'Tout Essentiel +' (v2)")
elif old_pro_features in html:
    html = html.replace(old_pro_features, new_pro_features)
    changes += 1
    print("✅ Carte Pro : format 'Tout Essentiel +'")
else:
    print("⚠️  Features Pro non trouvées")

# ══════════════════════════════════════════════════════════════
# 3. LIEN ARTICLE PRICING sous les cartes
# ══════════════════════════════════════════════════════════════

if "combien-coute-creation-entreprise" not in html:
    old_footer_note = """<p class="pricing-footer-note reveal">"""
    new_footer_note = """<div style="text-align:center;margin-top:32px;" class="reveal">
        <a href="/blog/combien-coute-creation-entreprise-2026.html" style="display:inline-flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:var(--primary);transition:gap 0.2s;" onmouseover="this.style.gap='12px'" onmouseout="this.style.gap='8px'">
          📊 Voir le détail : combien coûte réellement la création d'une entreprise ?
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

      <p class="pricing-footer-note reveal">"""

    if old_footer_note in html:
        html = html.replace(old_footer_note, new_footer_note, 1)
        changes += 1
        print("✅ Lien article pricing ajouté")
    else:
        print("⚠️  Footer note pricing non trouvé")
else:
    print("ℹ️  Lien article pricing déjà présent")

# ══════════════════════════════════════════════════════════════
# 4. BANDEAU STATS entre hero et services
# ══════════════════════════════════════════════════════════════

if "1 entreprise sur 2" not in html:
    stats_banner = """
  <!-- ── Stats Impact ──────────────────────────────────────────── -->
  <div style="background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:28px 0;">
    <div class="container">
      <div style="display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;text-align:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.1rem;">📉</span>
          <span style="font-size:0.88rem;color:var(--muted);line-height:1.4;"><strong style="color:var(--text);">1 entreprise sur 2</strong> ferme avant 5 ans en France <span style="font-size:0.72rem;opacity:0.6;">(INSEE)</span></span>
        </div>
        <div style="width:1px;height:28px;background:var(--border);"></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.1rem;">📈</span>
          <span style="font-size:0.88rem;color:var(--muted);line-height:1.4;"><strong style="color:var(--accent);">+20 points de survie</strong> avec un accompagnement structuré <span style="font-size:0.72rem;opacity:0.6;">(INSEE/BGE)</span></span>
        </div>
        <div style="width:1px;height:28px;background:var(--border);"></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.1rem;">🇫🇷</span>
          <span style="font-size:0.88rem;color:var(--muted);line-height:1.4;"><strong style="color:var(--text);">1,2 million</strong> d'entreprises créées en 2025</span>
        </div>
      </div>
    </div>
  </div>

"""

    services_marker = "  <!-- ── Services"
    alt_marker = '<section id="services">'
    if services_marker in html:
        html = html.replace(services_marker, stats_banner + services_marker)
        changes += 1
        print("✅ Bandeau stats ajouté")
    elif alt_marker in html:
        html = html.replace(alt_marker, stats_banner + "  " + alt_marker)
        changes += 1
        print("✅ Bandeau stats ajouté (alt)")
    else:
        print("⚠️  Section services non trouvée pour stats")
else:
    print("ℹ️  Bandeau stats déjà présent")

# ══════════════════════════════════════════════════════════════
# 5. CTA "APPEL GRATUIT" DANS LE HEADER (bouton vert)
# ══════════════════════════════════════════════════════════════

if "Appel gratuit" not in html:
    # Find the nav-cta in the desktop nav (first occurrence only)
    old_cta = '<a href="#contact" class="nav-cta">Me contacter</a>'
    if old_cta in html:
        new_cta = f'<a href="{CALENDLY}" target="_blank" rel="noopener noreferrer" style="padding:9px 18px;background:var(--accent);color:#fff;border-radius:50px;font-weight:700;font-size:0.85rem;box-shadow:0 3px 14px rgba(16,185,129,0.35);transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 20px rgba(16,185,129,0.5)\'" onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'0 3px 14px rgba(16,185,129,0.35)\'">Appel gratuit</a>\n          <a href="#contact" class="nav-cta">Me contacter</a>'
        html = html.replace(old_cta, new_cta, 1)
        changes += 1
        print("✅ CTA 'Appel gratuit' ajouté dans le header")
    else:
        print("⚠️  Nav CTA non trouvé")
else:
    print("ℹ️  CTA 'Appel gratuit' déjà présent")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications appliquées !")
print("   👉 git add . && git commit -m 'Refonte about + pricing link + stats + header CTA' && git push")
