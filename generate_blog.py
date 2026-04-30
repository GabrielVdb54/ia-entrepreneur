#!/usr/bin/env python3
"""
generate_blog.py
Génère blog.html avec tous les articles du dossier blog/.
À lancer manuellement ou depuis n8n après chaque publication.
Usage : python3 generate_blog.py  (depuis ~/Desktop/ia-entrepreneur)
"""

import os
import re
from pathlib import Path

BLOG_DIR = Path(__file__).parent / "blog"
TEMPLATE_FILE = Path(__file__).parent / "blog.html"
OUTPUT_FILE = Path(__file__).parent / "blog.html"

# Images de fallback par catégorie
FALLBACK_IMAGES = {
    "Création d'entreprise": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80",
    "Intelligence Artificielle": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80",
    "Développement commercial": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80",
    "Management": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80",
    "Financement": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    "default": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80"
}

def extract_meta(html_content, tag, attr="content"):
    """Extrait une meta tag du HTML."""
    pattern = rf'<meta[^>]+(?:name|property)="{re.escape(tag)}"[^>]+{attr}="([^"]*)"'
    m = re.search(pattern, html_content, re.IGNORECASE)
    if not m:
        pattern = rf'<meta[^>]+{attr}="([^"]*)"[^>]+(?:name|property)="{re.escape(tag)}"'
        m = re.search(pattern, html_content, re.IGNORECASE)
    return m.group(1) if m else ""

def extract_title(html_content):
    m = re.search(r'<title>([^<|]+)', html_content)
    return m.group(1).strip() if m else ""

def extract_og_image(html_content):
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]*)"', html_content, re.IGNORECASE)
    if not m:
        m = re.search(r'<meta[^>]+content="([^"]*)"[^>]+property="og:image"', html_content, re.IGNORECASE)
    return m.group(1) if m else ""

def extract_date(html_content):
    m = re.search(r'<meta[^>]+property="article:published_time"[^>]+content="([^"]*)"', html_content, re.IGNORECASE)
    if m:
        date_str = m.group(1)[:10]
        try:
            from datetime import datetime
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
            return f"{dt.day} {months[dt.month-1]} {dt.year}", dt
        except:
            return date_str, None
    # Fallback: cherche dans le contenu
    m = re.search(r'📅\s*([^<\n]+)', html_content)
    return m.group(1).strip() if m else "2026", None

def extract_category(html_content):
    m = re.search(r'<div class="article-category">([^<]+)</div>', html_content)
    if m:
        return m.group(1).strip()
    m = re.search(r'"category"\s*:\s*"([^"]+)"', html_content)
    if m:
        return m.group(1)
    return "Création d'entreprise"

def extract_slug_from_filename(filename):
    return filename.replace(".html", "")

def parse_article(filepath):
    """Parse un article HTML et retourne ses métadonnées."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    filename = os.path.basename(filepath)
    slug = extract_slug_from_filename(filename)

    title = extract_title(html)
    description = extract_meta(html, "description")
    og_image = extract_og_image(html)
    category = extract_category(html)
    date_display, date_obj = extract_date(html)

    # Image fallback
    if not og_image:
        og_image = FALLBACK_IMAGES.get(category, FALLBACK_IMAGES["default"])

    return {
        "slug": slug,
        "filename": filename,
        "title": title,
        "description": description[:160] if description else "",
        "image": og_image,
        "category": category,
        "date_display": date_display,
        "date_obj": date_obj,
        "url": f"/blog/{filename}"
    }

def generate_card(article, delay=1):
    """Génère le HTML d'une card article."""
    return f'''        <div class="blog-card" data-cat="{article['category']}">
          <a href="{article['url']}" style="display:contents;">
            <div class="blog-thumbnail">
              <img src="{article['image']}" alt="{article['title']}" loading="lazy" />
              <div class="blog-thumbnail-overlay"></div>
            </div>
          </a>
          <div class="blog-body">
            <div class="blog-meta">
              <span class="blog-cat">{article['category']}</span>
              <span class="blog-date">{article['date_display']}</span>
            </div>
            <h3>{article['title']}</h3>
            <p>{article['description']}</p>
            <a href="{article['url']}" class="btn-blog">
              Lire la suite
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>'''

def main():
    if not BLOG_DIR.exists():
        print(f"Dossier blog introuvable : {BLOG_DIR}")
        return

    # Parser tous les articles
    articles = []
    for filepath in BLOG_DIR.glob("*.html"):
        try:
            article = parse_article(str(filepath))
            if article["title"]:
                articles.append(article)
        except Exception as e:
            print(f"  Erreur sur {filepath.name}: {e}")

    # Trier par date décroissante
    articles.sort(key=lambda a: a["date_obj"] if a["date_obj"] else __import__("datetime").datetime.min, reverse=True)

    print(f"  {len(articles)} articles trouvés")

    # Générer les cards
    cards_html = "\n".join([generate_card(a, i+1) for i, a in enumerate(articles)])

    # Lire le template blog.html et remplacer le bloc blog-grid entier
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        template = f.read()

    # Remplacer tout le contenu entre les balises blog-grid
    new_grid = f'<div class="blog-grid" id="blogGrid">\n{cards_html}\n      </div>'
    output = re.sub(
        r'<div class="blog-grid" id="blogGrid">.*?</div>',
        new_grid,
        template,
        flags=re.DOTALL
    )

    # Écrire le fichier final
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f"  blog.html généré avec {len(articles)} articles.")

if __name__ == "__main__":
    main()
