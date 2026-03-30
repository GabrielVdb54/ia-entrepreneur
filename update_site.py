#!/usr/bin/env python3
"""Met à jour les cartes blog, ajoute téléphone et NDA dans index.html"""

import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. Remplacer les 4 cartes blog ──────────────────────────────

old_blog_grid = '''      <div class="blog-grid">

        <div class="blog-card reveal reveal-delay-1">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"
              alt="Outils IA pour TPE et entrepreneurs en 2026"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Intelligence Artificielle</span>
              <span class="blog-date">12 mars 2026</span>
            </div>
            <h3>ChatGPT, Gemini, Claude : quel outil IA choisir pour votre TPE en 2026 ?</h3>
            <p>Face à l'explosion des outils IA, difficile de savoir par où commencer. On compare les 3 assistants les plus utilisés par les entrepreneurs pour vous aider à choisir celui qui correspond à vos besoins réels.</p>
            <a href="/blog/7-etapes-creer-son-entreprise-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-2">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"
              alt="Créer son entreprise en France - guide étape par étape"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Création d\'entreprise</span>
              <span class="blog-date">5 mars 2026</span>
            </div>
            <h3>Les 7 étapes incontournables pour créer son entreprise en 2026</h3>
            <p>De la validation de votre idée à votre premier client payant : voici le chemin exact que j'ai vu parcourir les entrepreneurs qui réussissent. Un guide sans jargon, orienté action.</p>
            <a href="/blog/5-erreurs-porteurs-de-projet.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-3">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80"
              alt="Outils IA gratuits pour améliorer la productivité d\'une TPE"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Outils &amp; Ressources</span>
              <span class="blog-date">20 février 2026</span>
            </div>
            <h3>15 outils IA 100% gratuits pour booster votre TPE</h3>
            <p>Pas besoin d'un budget colossal pour intégrer l'IA dans votre activité. Cette sélection d'outils gratuits couvre votre marketing, votre comptabilité, votre relation client et bien plus encore.</p>
            <a href="/blog/quel-statut-juridique-choisir-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-4">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80"
              alt="Témoignage reconversion salarié entrepreneur"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Témoignage</span>
              <span class="blog-date">8 février 2026</span>
            </div>
            <h3>De salarié à entrepreneur : comment Julien a lancé sa micro-entreprise en 60 jours</h3>
            <p>À 34 ans, Julien a quitté son CDI pour créer une activité de conseil en organisation. Retour sur les 60 jours qui ont tout changé — les doutes, les décisions et les outils IA qui ont accéléré son lancement.</p>
            <a href="/blog/aides-financements-creation-entreprise-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

      </div>'''

new_blog_grid = '''      <div class="blog-grid">

        <div class="blog-card reveal reveal-delay-1">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"
              alt="Les 7 étapes pour créer son entreprise en 2026"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Création d'entreprise</span>
              <span class="blog-date">5 mars 2026</span>
            </div>
            <h3>Les 7 étapes incontournables pour créer son entreprise en 2026</h3>
            <p>De la validation de votre idée à votre premier client payant : voici le chemin exact que j'ai vu parcourir les entrepreneurs qui réussissent. Un guide sans jargon, orienté action.</p>
            <a href="/blog/7-etapes-creer-son-entreprise-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-2">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80"
              alt="5 erreurs fatales des porteurs de projet"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Création d'entreprise</span>
              <span class="blog-date">20 février 2026</span>
            </div>
            <h3>5 erreurs fatales qui tuent les projets de création d'entreprise</h3>
            <p>Après avoir accompagné +1 500 porteurs de projet, je vois toujours les mêmes erreurs revenir. Voici celles qui font la différence entre un projet qui décolle et un projet qui s'enlise.</p>
            <a href="/blog/5-erreurs-porteurs-de-projet.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-3">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80"
              alt="Quel statut juridique choisir pour créer son entreprise"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Statut juridique</span>
              <span class="blog-date">12 février 2026</span>
            </div>
            <h3>Quel statut juridique choisir pour créer son entreprise en 2026 ?</h3>
            <p>Micro-entreprise, EURL, SASU, SAS… Le choix du statut paralyse beaucoup de créateurs. Voici un comparatif clair et des critères concrets pour faire le bon choix rapidement.</p>
            <a href="/blog/quel-statut-juridique-choisir-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="blog-card reveal reveal-delay-4">
          <div class="blog-thumbnail">
            <img
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"
              alt="Aides et financements création entreprise 2026"
              loading="lazy"
            />
            <div class="blog-thumbnail-overlay"></div>
          </div>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">Financements</span>
              <span class="blog-date">28 janvier 2026</span>
            </div>
            <h3>Aides et financements pour créer son entreprise en 2026 : le guide complet</h3>
            <p>ACRE, ARCE, prêts d'honneur, subventions régionales… La France est l'un des pays les plus généreux pour les créateurs. Encore faut-il connaître les aides et les demander au bon moment.</p>
            <a href="/blog/aides-financements-creation-entreprise-2026.html" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

      </div>'''

if old_blog_grid in html:
    html = html.replace(old_blog_grid, new_blog_grid)
    print("✅ Cartes blog mises à jour")
else:
    print("⚠️  Blog grid non trouvé tel quel, tentative par lignes...")
    # Fallback: replace individual elements
    replacements = [
        ('src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"', 'src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"'),
        ('alt="Outils IA pour TPE et entrepreneurs en 2026"', 'alt="Les 7 étapes pour créer son entreprise en 2026"'),
        ('<span class="blog-cat">Intelligence Artificielle</span>', '<span class="blog-cat">Création d\'entreprise</span>'),
        ('<span class="blog-date">12 mars 2026</span>', '<span class="blog-date">5 mars 2026</span>'),
        ('ChatGPT, Gemini, Claude : quel outil IA choisir pour votre TPE en 2026 ?', 'Les 7 étapes incontournables pour créer son entreprise en 2026'),
        ("Face à l'explosion des outils IA, difficile de savoir par où commencer. On compare les 3 assistants les plus utilisés par les entrepreneurs pour vous aider à choisir celui qui correspond à vos besoins réels.", "De la validation de votre idée à votre premier client payant : voici le chemin exact que j'ai vu parcourir les entrepreneurs qui réussissent. Un guide sans jargon, orienté action."),

        ('src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"\n              alt="Créer son entreprise en France - guide étape par étape"', 'src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80"\n              alt="5 erreurs fatales des porteurs de projet"'),
        ('<span class="blog-date">5 mars 2026</span>\n            </div>\n            <h3>Les 7 étapes incontournables pour créer son entreprise en 2026</h3>', '<span class="blog-date">20 février 2026</span>\n            </div>\n            <h3>5 erreurs fatales qui tuent les projets de création d\'entreprise</h3>'),

        ('src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80"', 'src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80"'),
        ('alt="Outils IA gratuits pour améliorer la productivité d\'une TPE"', 'alt="Quel statut juridique choisir pour créer son entreprise"'),
        ('<span class="blog-cat">Outils &amp; Ressources</span>', '<span class="blog-cat">Statut juridique</span>'),
        ('<span class="blog-date">20 février 2026</span>\n            </div>\n            <h3>15 outils IA 100% gratuits pour booster votre TPE</h3>', '<span class="blog-date">12 février 2026</span>\n            </div>\n            <h3>Quel statut juridique choisir pour créer son entreprise en 2026 ?</h3>'),
        ("Pas besoin d'un budget colossal pour intégrer l'IA dans votre activité. Cette sélection d'outils gratuits couvre votre marketing, votre comptabilité, votre relation client et bien plus encore.", "Micro-entreprise, EURL, SASU, SAS… Le choix du statut paralyse beaucoup de créateurs. Voici un comparatif clair et des critères concrets pour faire le bon choix rapidement."),

        ('alt="Témoignage reconversion salarié entrepreneur"', 'alt="Aides et financements création entreprise 2026"'),
        ('<span class="blog-cat">Témoignage</span>', '<span class="blog-cat">Financements</span>'),
        ('<span class="blog-date">8 février 2026</span>', '<span class="blog-date">28 janvier 2026</span>'),
        ("De salarié à entrepreneur : comment Julien a lancé sa micro-entreprise en 60 jours", "Aides et financements pour créer son entreprise en 2026 : le guide complet"),
        ("À 34 ans, Julien a quitté son CDI pour créer une activité de conseil en organisation. Retour sur les 60 jours qui ont tout changé — les doutes, les décisions et les outils IA qui ont accéléré son lancement.", "ACRE, ARCE, prêts d'honneur, subventions régionales… La France est l'un des pays les plus généreux pour les créateurs. Encore faut-il connaître les aides et les demander au bon moment."),

        ('src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80"\n              alt="Témoignage reconversion salarié entrepreneur"', 'src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"\n              alt="Aides et financements création entreprise 2026"'),
    ]
    count = 0
    for old, new in replacements:
        if old in html:
            html = html.replace(old, new)
            count += 1
    print(f"✅ {count} remplacements effectués par fallback")

# ── 2. Ajouter le téléphone dans la section contact ─────────────

old_contact_email = '''            <div class="contact-item reveal reveal-delay-1">
              <div class="contact-item-icon">✉️</div>
              <div class="contact-item-text">
                <strong>E-mail</strong>
                <a href="mailto:gabriel@ia-entrepreneur.fr">gabriel@ia-entrepreneur.fr</a>
              </div>
            </div>'''

new_contact_email_phone = '''            <div class="contact-item reveal reveal-delay-1">
              <div class="contact-item-icon">✉️</div>
              <div class="contact-item-text">
                <strong>E-mail</strong>
                <a href="mailto:gabriel@ia-entrepreneur.fr">gabriel@ia-entrepreneur.fr</a>
              </div>
            </div>
            <div class="contact-item reveal reveal-delay-2">
              <div class="contact-item-icon">📞</div>
              <div class="contact-item-text">
                <strong>Téléphone</strong>
                <a href="tel:+33699250344">06 99 25 03 44</a>
              </div>
            </div>'''

if old_contact_email in html:
    html = html.replace(old_contact_email, new_contact_email_phone)
    print("✅ Téléphone ajouté")
else:
    print("⚠️  Bloc email non trouvé, tentative alternative...")
    # Try to insert phone after email block by finding partial match
    if "gabriel@ia-entrepreneur.fr" in html:
        html = html.replace(
            '</a>\n              </div>\n            </div>\n            <div class="contact-item reveal reveal-delay-2">\n              <div class="contact-item-icon">📍</div>',
            '</a>\n              </div>\n            </div>\n            <div class="contact-item reveal reveal-delay-2">\n              <div class="contact-item-icon">📞</div>\n              <div class="contact-item-text">\n                <strong>Téléphone</strong>\n                <a href="tel:+33699250344">06 99 25 03 44</a>\n              </div>\n            </div>\n            <div class="contact-item reveal reveal-delay-3">\n              <div class="contact-item-icon">📍</div>'
        )
        print("✅ Téléphone ajouté (méthode alternative)")

# ── 3. Ajouter le NDA dans le footer ────────────────────────────

old_footer_tagline = '<p class="footer-tagline">Formation entrepreneuriat France | Formateur IA TPE | Grand Est</p>'
new_footer_tagline = '<p class="footer-tagline">Formation entrepreneuriat France | Formateur IA TPE | Grand Est</p>\n          <p class="footer-tagline">N° de déclaration d\'activité : 44 54 04871 54</p>'

if old_footer_tagline in html:
    html = html.replace(old_footer_tagline, new_footer_tagline)
    print("✅ NDA ajouté dans le footer")
else:
    print("⚠️  Footer tagline non trouvé")

# ── Sauvegarde ──────────────────────────────────────────────────

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("\n🎉 Fichier index.html mis à jour avec succès !")
print("   Prochaine étape : git add . && git commit -m 'MAJ blog + tel + NDA' && git push")
