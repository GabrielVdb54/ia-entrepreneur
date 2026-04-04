#!/usr/bin/env python3
"""
SEO technique final :
- Google Site Verification placeholder
- Schema.org JSON-LD enrichi (EducationalOrganization + Course)
- OG image fix
- Canonical vérification
- Lien sitemap dans le head
"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# 1. GOOGLE SITE VERIFICATION — Placeholder
# ══════════════════════════════════════════════════════════════

if "google-site-verification" not in html:
    verification_tag = '  <meta name="google-site-verification" content="VOTRE_CODE_VERIFICATION_ICI" />\n'
    # Insert after viewport meta
    viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    if viewport in html:
        html = html.replace(viewport, viewport + '\n' + verification_tag)
        changes += 1
        print("✅ Google Site Verification placeholder ajouté")
else:
    print("ℹ️  Google Site Verification déjà présent")

# ══════════════════════════════════════════════════════════════
# 2. JSON-LD — Enrichir avec EducationalOrganization + Course
# ══════════════════════════════════════════════════════════════

old_jsonld = """  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Gabriel Vanderbecken",
    "jobTitle": "Formateur en Entrepreneuriat & Intelligence Artificielle",
    "url": "https://ia-entrepreneur.fr",
    "sameAs": ["https://www.linkedin.com/in/gabriel-vanderbecken/"]
  }
  </script>"""

new_jsonld = """  <script type="application/ld+json">
  [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "IA-Entrepreneur",
      "url": "https://ia-entrepreneur.fr",
      "logo": "https://ia-entrepreneur.fr/favicon.png",
      "description": "Formation création d'entreprise et IA pour entrepreneurs, dirigeants TPE et salariés en reconversion.",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Grand Est",
        "addressCountry": "FR"
      },
      "founder": {
        "@type": "Person",
        "name": "Gabriel Vanderbecken",
        "jobTitle": "Formateur en Entrepreneuriat & Intelligence Artificielle",
        "sameAs": ["https://www.linkedin.com/in/gabriel-vanderbecken/"]
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+33699250344",
        "contactType": "customer service",
        "availableLanguage": "French"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Accompagnement Création d'Entreprise - Essentiel",
      "description": "Statut juridique, création de société certifiée par expert-comptable, orientation aides ACRE/ARCE.",
      "provider": {"@type": "Organization", "name": "IA-Entrepreneur", "url": "https://ia-entrepreneur.fr"},
      "offers": {"@type": "Offer", "price": "300", "priceCurrency": "EUR", "availability": "https://schema.org/InStock"}
    },
    {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Accompagnement Création d'Entreprise - Pro",
      "description": "Étude de marché, business plan 3 scénarios, financement, premières ventes et kit marketing.",
      "provider": {"@type": "Organization", "name": "IA-Entrepreneur", "url": "https://ia-entrepreneur.fr"},
      "offers": {"@type": "Offer", "price": "1000", "priceCurrency": "EUR", "availability": "https://schema.org/InStock"}
    },
    {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Accompagnement Création d'Entreprise - Premium",
      "description": "Accompagnement individuel one-to-one, accès WhatsApp 3 mois, suivi post-création.",
      "provider": {"@type": "Organization", "name": "IA-Entrepreneur", "url": "https://ia-entrepreneur.fr"},
      "offers": {"@type": "Offer", "price": "3000", "priceCurrency": "EUR", "availability": "https://schema.org/InStock"}
    }
  ]
  </script>"""

if old_jsonld in html:
    html = html.replace(old_jsonld, new_jsonld)
    changes += 1
    print("✅ JSON-LD enrichi (EducationalOrganization + 3 Courses)")
else:
    print("⚠️  JSON-LD original non trouvé")

# ══════════════════════════════════════════════════════════════
# 3. OG IMAGE — Vérifier qu'elle pointe vers gabriel-hero.png
# ══════════════════════════════════════════════════════════════

if 'content="https://ia-entrepreneur.fr/gabriel.png"' in html:
    html = html.replace(
        'content="https://ia-entrepreneur.fr/gabriel.png"',
        'content="https://ia-entrepreneur.fr/gabriel-hero.png"'
    )
    changes += 1
    print("✅ OG image → gabriel-hero.png")
elif 'gabriel-hero.png' in html:
    print("ℹ️  OG image déjà correcte")

# ══════════════════════════════════════════════════════════════
# 4. CANONICAL — Vérifier
# ══════════════════════════════════════════════════════════════

if 'rel="canonical" href="https://ia-entrepreneur.fr"' in html:
    print("ℹ️  Canonical OK")
else:
    print("⚠️  Canonical non trouvé — vérifier manuellement")

# ══════════════════════════════════════════════════════════════
# SAUVEGARDE
# ══════════════════════════════════════════════════════════════

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n🎉 {changes} modifications SEO sur index.html !")
print("   N'oublie pas : remplace VOTRE_CODE_VERIFICATION_ICI par le vrai code Google Search Console")
print("   👉 git add . && git commit -m 'SEO: sitemap + robots + JSON-LD + verification' && git push")
