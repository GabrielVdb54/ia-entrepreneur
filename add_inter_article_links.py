#!/usr/bin/env python3
"""
Maillage inter-articles : relie les articles entre eux par similarité thématique.
- Extrait les titres et corps de tous les articles
- Pour chaque article, trouve les 3 articles les plus thématiquement proches
- Insère un lien naturel dans le corps du texte (première occurrence d'un mot-clé du titre cible)
- Jamais dans un titre (h1/h2/h3), jamais dans un lien existant
- Ignore si le lien existe déjà
"""
import os, re, glob, unicodedata
from collections import defaultdict

BLOG_DIR = '/Users/GabrielV/Desktop/ia-entrepreneur/blog'
MAX_LINKS_PER_ARTICLE = 3
MIN_SCORE = 2  # mots-clés communs minimum pour considérer un lien pertinent

STOP_WORDS = {
    'le','la','les','de','du','des','un','une','et','en','à','au','aux','par','sur',
    'dans','avec','pour','que','qui','est','son','sa','ses','mon','ton','notre','votre',
    'leur','leurs','ce','cette','ces','plus','tout','tous','toute','toutes','si','ou',
    'mais','donc','car','ne','pas','se','il','elle','ils','elles','on','nous','vous',
    'je','tu','quand','comment','pourquoi','quel','quelle','quels','quelles','tres',
    'bien','aussi','meme','encore','deja','lors','apres','avant','sans','guide',
    'complet','pratique','france','francais','francaise','2026','2025','2024','tpe',
    'pme','les','comment','faire','votre','vos','mes','nos','cet','cette','chaque',
    'dont','lors','afin','ainsi','chez','sous','vers','entre','peu','trop','tout',
}

# Mots-clés trop génériques qui ne doivent pas être utilisés comme ancres
GENERIC_KEYWORDS = {
    'entreprise', 'entreprises', 'entrepreneur', 'entrepreneurs', 'activite',
    'gestion', 'strategie', 'solution', 'resultat', 'service', 'services',
    'equipe', 'client', 'clients', 'marche', 'secteur', 'projet', 'objectif',
}

def normalize(text):
    """Normalise le texte : minuscules, sans accents."""
    text = text.lower()
    text = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    return text

def extract_keywords(title, min_len=4):
    """Extrait les mots-clés significatifs d'un titre."""
    norm = normalize(title)
    words = re.findall(r'\b[a-z]{%d,}\b' % min_len, norm)
    return [w for w in words if w not in STOP_WORDS and w not in GENERIC_KEYWORDS]

def extract_title(content):
    """Extrait le h1 de l'article."""
    m = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
    if m:
        return re.sub(r'<[^>]+>', '', m.group(1)).strip()
    m = re.search(r'<title>(.*?)\s*\|', content, re.IGNORECASE)
    return m.group(1).strip() if m else ''

def get_body(content):
    """Extrait le div article-body."""
    start = content.find('<div class="article-body">')
    end = content.find('</article>', start) if start != -1 else -1
    if start == -1 or end == -1:
        return '', start, end
    return content[start:end], start, end

def find_best_anchor(title_keywords_orig, body_norm, title):
    """
    Trouve le meilleur mot/groupe de mots du titre qui apparaît dans le corps.
    Préfère les groupes de mots consécutifs (plus naturels comme ancre).
    Retourne le mot à chercher dans le corps ORIGINAL (avec casse originale).
    """
    # Essaie d'abord des groupes de 2-3 mots du titre original
    title_words = re.findall(r'\b\w+\b', title)
    for size in (3, 2):
        for i in range(len(title_words) - size + 1):
            phrase = ' '.join(title_words[i:i+size])
            if len(phrase) < 6:
                continue
            phrase_norm = normalize(phrase)
            kws_in_phrase = [k for k in extract_keywords(phrase) if k not in STOP_WORDS]
            if not kws_in_phrase:
                continue
            if phrase_norm in body_norm:
                return phrase
    # Fallback : mot-clé simple le plus long présent dans le corps
    candidates = sorted(title_keywords_orig, key=len, reverse=True)
    for kw in candidates:
        kw_norm = normalize(kw)
        if kw_norm in body_norm and len(kw_norm) >= 5:
            return kw
    return None

def insert_link(content, body, body_start, body_end, anchor, url):
    """Insère un lien autour de la première occurrence de anchor dans body."""
    pattern = re.compile(r'\b' + re.escape(anchor) + r'\b', re.IGNORECASE)
    replaced = [False]

    def replace_first(m):
        if replaced[0]:
            return m.group(0)
        pos = m.start()
        before = body[:pos]
        # Pas dans un tag HTML
        if before.rfind('<') > before.rfind('>'):
            return m.group(0)
        # Pas dans un <a>
        if before.rfind('<a ') > before.rfind('</a>'):
            return m.group(0)
        # Pas dans un titre
        for h in ('h1', 'h2', 'h3'):
            if before.rfind(f'<{h}') > before.rfind(f'</{h}>'):
                return m.group(0)
        replaced[0] = True
        return f'<a href="{url}">{m.group(0)}</a>'

    new_body = pattern.sub(replace_first, body)
    if not replaced[0]:
        return content, False
    return content[:body_start] + new_body + content[body_end:], True


# ── Chargement de tous les articles ─────────────────────────────────────────
files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))
articles = []

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    slug = os.path.basename(path).replace('.html', '')
    title = extract_title(content)
    body, bstart, bend = get_body(content)
    kws = extract_keywords(title)
    articles.append({
        'path': path,
        'slug': slug,
        'title': title,
        'keywords': kws,
        'body': body,
        'body_start': bstart,
        'body_end': bend,
        'content': content,
    })

print(f'{len(articles)} articles chargés.')

# ── Calcul de similarité et ajout de liens ───────────────────────────────────
total_links = 0
articles_modified = 0

for art in articles:
    body_norm = normalize(art['body'])
    candidates = []

    for other in articles:
        if other['slug'] == art['slug']:
            continue
        url = f'/blog/{other["slug"]}.html'
        if url in art['content']:
            continue  # Déjà lié
        if not other['keywords']:
            continue

        # Score = nombre de mots-clés de l'autre article présents dans ce corps
        score = sum(1 for kw in other['keywords'] if normalize(kw) in body_norm)
        if score >= MIN_SCORE:
            anchor = find_best_anchor(other['keywords'], body_norm, other['title'])
            if anchor:
                candidates.append((score, len(anchor), other, anchor))

    # Trie : score décroissant, puis longueur de l'ancre décroissante (ancres plus précises)
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)

    content = art['content']
    body    = art['body']
    links_added = 0
    added_labels = []

    for score, _, other, anchor in candidates:
        if links_added >= MAX_LINKS_PER_ARTICLE:
            break
        url = f'/blog/{other["slug"]}.html'
        new_content, added = insert_link(content, body, art['body_start'], art['body_end'], anchor, url)
        if added:
            content = new_content
            # Met à jour le body pour les itérations suivantes
            body = content[art['body_start']:art['body_end']]
            links_added += 1
            total_links += 1
            added_labels.append(f'"{anchor}" → {other["slug"][:40]}')

    if content != art['content']:
        with open(art['path'], 'w', encoding='utf-8') as f:
            f.write(content)
        articles_modified += 1
        for label in added_labels:
            print(f'  {label}')
        print(f'  +{links_added} lien(s) dans {art["slug"][:50]}')
        print()

print(f'✓ {total_links} liens inter-articles ajoutés dans {articles_modified}/{len(articles)} articles.')
