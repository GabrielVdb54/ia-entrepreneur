#!/usr/bin/env python3
"""
Harmonise TOUS les headers du site vers un format canonique unique.
Préserve class="active" sur le bon lien selon la page.
"""
import os, re, glob

BASE = '/Users/GabrielV/Desktop/ia-entrepreneur'

# ── Template canonique ────────────────────────────────────────────────────────
# {ACTIVE_FORMATIONS}, {ACTIVE_INTEGRATIONS}, {ACTIVE_APROPOS}, {ACTIVE_BLOG}
# seront remplacés par class="active" ou rien

EMAIL_SVG = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>'

def make_header(active=None, header_id=''):
    """
    active: 'formations' | 'integrations' | 'apropos' | 'blog' | None
    header_id: '' or ' id="header"'
    """
    def a(key, label, href):
        cls = ' class="active"' if active == key else ''
        return f'<a href="{href}"{cls}>{label}</a>'

    return f'''<header{header_id}>
    <div class="container">
      <div class="header-inner">
        <a href="/" class="logo" style="line-height:1.2;">
          IA<span>-</span>Entrepreneur
          <span style="display:block;font-size:0.58rem;font-weight:500;color:var(--muted);letter-spacing:0.03em;margin-top:2px;">Organisme de formation certifié Qualiopi</span>
        </a>
        <nav>
          {a(None, 'Accueil', '/')}
          {a('formations', 'Formations IA', '/formations-entreprises.html')}
          {a('integrations', 'Intégrations IA', '/integrations-ia.html')}
          {a('apropos', 'À propos', '/apropos.html')}
          {a('blog', 'Blog', '/blog.html')}
          <a href="mailto:contact@ia-entrepreneur.fr" style="display:flex;align-items:center;gap:4px;">{EMAIL_SVG}contact@ia-entrepreneur.fr</a>
          <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>
        </nav>
        <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      <a href="/">Accueil</a>
      <a href="/formations-entreprises.html">Formations IA</a>
      <a href="/integrations-ia.html">Intégrations IA</a>
      <a href="/apropos.html">À propos</a>
      <a href="/blog.html">Blog</a>
      <a href="mailto:contact@ia-entrepreneur.fr">contact@ia-entrepreneur.fr</a>
      <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>
    </div>
  </header>'''

def replace_header(content, new_header):
    """Remplace le bloc <header ...> ... </header> entier."""
    return re.sub(
        r'<header[^>]*>.*?</header>',
        new_header,
        content,
        count=1,
        flags=re.DOTALL
    )

# ── Mapping pages → active link ───────────────────────────────────────────────
PAGES = {
    # (fichier, active, header_id)
    'index.html':                               (None,          ' id="header"'),
    'formations-entreprises.html':              ('formations',  ''),
    'integrations-ia.html':                     ('integrations',''),
    'apropos.html':                             ('apropos',     ''),
    'blog.html':                                ('blog',        ''),
    'formation-ia-obligatoire-ai-act.html':     ('formations',  ''),
    # Pages formation
    'formation-ia-automatisation.html':         ('formations',  ''),
    'formation-prospection-commerciale.html':   ('formations',  ''),
    'formation-management-leadership.html':     ('formations',  ''),
    'formation-techniques-vente-closing.html':  ('formations',  ''),
    'formation-prise-de-parole.html':           ('formations',  ''),
    'formation-negociation-commerciale.html':   ('formations',  ''),
    # Pages intégration
    'integration-chatbot-client.html':          ('integrations',''),
    'integration-reponse-email.html':           ('integrations',''),
    'integration-contenu-seo.html':             ('integrations',''),
    'integration-prospection-linkedin.html':    ('integrations',''),
    'integration-veille-concurrentielle.html':  ('integrations',''),
    'integration-compte-rendu-reunion.html':    ('integrations',''),
    'integration-rapport-performance.html':     ('integrations',''),
    # Pages légales
    'mentions-legales.html':                    (None,          ''),
    'cgv.html':                                 (None,          ''),
    'politique-confidentialite.html':           (None,          ''),
}

fixed = 0
for filename, (active, hid) in PAGES.items():
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f'! Not found: {filename}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c
    new_header = make_header(active=active, header_id=hid)
    c = replace_header(c, new_header)
    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        fixed += 1
        print(f'✓ {filename}')
    else:
        print(f'- {filename} (no change)')

# ── Blog articles ─────────────────────────────────────────────────────────────
blog_header = make_header(active='blog', header_id='')
blog_files = sorted(glob.glob(os.path.join(BASE, 'blog', '*.html')))
blog_fixed = 0
for path in blog_files:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c
    c = replace_header(c, blog_header)
    if c != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        blog_fixed += 1

print(f'\n✓ {fixed} main pages + {blog_fixed} blog articles fixed.')
print('Total:', fixed + blog_fixed, 'files updated.')
