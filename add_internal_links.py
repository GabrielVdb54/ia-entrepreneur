#!/usr/bin/env python3
"""
Ajoute des liens internes SEO dans les articles de blog existants.
- Max 3 liens par article
- Uniquement dans le corps de l'article (<div class="article-body">)
- Jamais dans un titre (h1/h2/h3) ni dans un lien existant (<a>)
- Première occurrence uniquement par mot-clé
- Ignore si l'URL cible est déjà présente dans l'article
"""
import os, re, glob

BLOG_DIR = '/Users/GabrielV/Desktop/ia-entrepreneur/blog'

# (keyword, url) — plus spécifique en premier pour éviter les conflits
LINKS = [
    ('Microsoft Copilot',          '/formation-microsoft-copilot-entreprise.html'),
    ('ChatGPT',                    '/formation-chatgpt-entreprise.html'),
    ('AI Act',                     '/formation-ia-obligatoire-ai-act.html'),
    ('prospection commerciale',    '/formation-prospection-commerciale.html'),
    ('automatisation',             '/formation-ia-automatisation.html'),
    ('Copilot',                    '/formation-microsoft-copilot-entreprise.html'),
    ('management',                 '/formation-management-leadership.html'),
]

def add_link(content, keyword, url):
    """
    Insère un lien pour keyword dans l'article-body.
    Retourne (nouveau_contenu, True) si un lien a été ajouté, sinon (contenu_original, False).
    """
    if url in content:
        return content, False

    body_start = content.find('<div class="article-body">')
    body_end   = content.find('</article>', body_start) if body_start != -1 else -1
    if body_start == -1 or body_end == -1:
        return content, False

    body = content[body_start:body_end]
    pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
    replaced = [False]

    def replace_first(m):
        if replaced[0]:
            return m.group(0)
        pos    = m.start()
        before = body[:pos]

        # Pas à l'intérieur d'un tag HTML
        if before.rfind('<') > before.rfind('>'):
            return m.group(0)

        # Pas à l'intérieur d'un <a>
        if before.rfind('<a ') > before.rfind('</a>'):
            return m.group(0)

        # Pas à l'intérieur d'un titre
        for h in ('h1', 'h2', 'h3'):
            if before.rfind(f'<{h}') > before.rfind(f'</{h}>'):
                return m.group(0)

        replaced[0] = True
        return f'<a href="{url}">{m.group(0)}</a>'

    new_body = pattern.sub(replace_first, body)
    if not replaced[0]:
        return content, False

    return content[:body_start] + new_body + content[body_end:], True


files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))
total_links = 0
articles_modified = 0

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    links_added = 0
    added_labels = []

    for keyword, url in LINKS:
        if links_added >= 3:
            break
        content, added = add_link(content, keyword, url)
        if added:
            links_added += 1
            total_links += 1
            added_labels.append(f'"{keyword}"')

    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        articles_modified += 1
        print(f'  +{links_added} lien(s) [{", ".join(added_labels)}] → {os.path.basename(path)}')

print(f'\n✓ {total_links} liens ajoutés dans {articles_modified}/{len(files)} articles.')
