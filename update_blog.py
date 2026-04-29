#!/usr/bin/env python3
"""
update_blog.py v2
Applique le thème blanc + header/footer unifié + typographie lisible aux articles.
Usage : python3 update_blog.py   (depuis ~/Desktop/ia-entrepreneur)
"""

import os
import re

BLOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "blog")

NEW_HEADER = '''  <header>
    <div class="container">
      <div class="header-inner">
        <a href="/" class="logo" style="line-height:1.2;">
          IA<span>-</span>Entrepreneur
          <span style="display:block;font-size:0.58rem;font-weight:500;color:var(--muted);letter-spacing:0.03em;margin-top:2px;">Organisme de formation certifié Qualiopi</span>
        </a>
        <nav>
          <a href="/">Accueil</a>
          <a href="/formations-creation.html">Création d\'entreprise</a>
          <a href="/formations-entreprises.html">Formations entreprises</a>
          <a href="/#apropos">À propos</a>
          <a href="/#blog">Blog</a>
          <a href="mailto:contact@ia-entrepreneur.fr" style="display:flex;align-items:center;gap:4px;">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            contact@ia-entrepreneur.fr
          </a>
          <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>
        </nav>
        <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      <a href="/">Accueil</a>
      <a href="/formations-creation.html">Création d\'entreprise</a>
      <a href="/formations-entreprises.html">Formations entreprises</a>
      <a href="/#apropos">À propos</a>
      <a href="/#blog">Blog</a>
      <a href="mailto:contact@ia-entrepreneur.fr">contact@ia-entrepreneur.fr</a>
      <a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>
    </div>
  </header>'''

NEW_FOOTER = '''  <footer>
    <div class="container">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <img src="/qualiopi-logo.png" alt="Logo Qualiopi" style="height:44px;width:auto;" onerror="this.style.display=\'none\'" />
          <div>
            <div style="font-size:0.88rem;font-weight:800;color:var(--text);">Certifié Qualiopi — Processus certifié</div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">Certificat n° 883211-1 · Certifopac · Valable jusqu\'au 23/04/2029</div>
            <div style="font-size:0.75rem;color:var(--muted);">NDA : 44 54 04871 54 · Cofrac n° 5-0620</div>
          </div>
        </div>
        <a href="/qualiopi-certificat.pdf" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:50px;font-size:0.78rem;font-weight:700;color:var(--primary);border:1.5px solid rgba(26,60,255,0.2);background:rgba(26,60,255,0.04);text-decoration:none;">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Voir le certificat
        </a>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:20px;">
        <div style="font-size:1.1rem;font-weight:800;letter-spacing:-0.02em;">IA<span style="color:var(--primary);">-</span>Entrepreneur</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <a href="/" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">Accueil</a>
          <a href="/formations-creation.html" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">Création d\'entreprise</a>
          <a href="/formations-entreprises.html" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">Formations entreprises</a>
          <a href="/#apropos" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">À propos</a>
          <a href="/#blog" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">Blog</a>
          <a href="/#contact" style="font-size:0.82rem;color:var(--muted);text-decoration:none;">Contact</a>
        </div>
      </div>
      <div style="padding-top:16px;border-top:1px solid var(--border);">
        <p style="font-size:0.75rem;color:var(--muted);opacity:0.7;">© 2026 IA-Entrepreneur — Clindit. Tous droits réservés.</p>
        <p style="font-size:0.75rem;color:var(--muted);opacity:0.6;">NDA : 44 54 04871 54 · Formation entrepreneuriat France | IA pour TPE | Grand Est</p>
      </div>
    </div>
  </footer>'''

INJECTED_CSS = '''
    /* ══ THÈME BLANC ══════════════════════════════════════════════ */
    :root {
      --bg:        #FFFFFF;
      --bg2:       #F5F7FF;
      --bg3:       #EEF2FF;
      --primary:   #1A3CFF;
      --primary-h: #2d4fff;
      --accent:    #10B981;
      --accent-h:  #0ea372;
      --text:      #0A0F2C;
      --muted:     #525880;
      --border:    rgba(10,15,44,0.10);
      --card:      rgba(10,15,44,0.04);
      --radius:    14px;
    }

    body { background: var(--bg) !important; color: var(--text) !important; }

    /* ── Header ────────────────────────────────────────────────── */
    header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 24px rgba(10,15,44,0.06);
    }
    .header-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 16px; }
    .logo { font-size: 1rem; font-weight: 800; color: var(--text) !important; letter-spacing: -0.02em; flex-shrink: 0; line-height: 1.2; text-decoration: none; }
    .logo span { color: var(--primary); }
    nav { display: flex; align-items: center; gap: 2px; }
    nav a { padding: 6px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; color: var(--muted); transition: color 0.2s, background 0.2s; white-space: nowrap; text-decoration: none; }
    nav a:hover { color: var(--text); background: var(--card); }
    .nav-cta { background: var(--accent) !important; color: #fff !important; border-radius: 50px !important; padding: 8px 16px !important; font-size: 0.8rem !important; box-shadow: 0 3px 16px rgba(16,185,129,0.35) !important; white-space: nowrap !important; text-decoration: none !important; }
    nav a.nav-cta, header a.nav-cta, .header-inner a.nav-cta { background: var(--accent) !important; color: #fff !important; }
    .hamburger { display: none; flex-direction: column; gap: 5px; padding: 8px; background: none; border: none; cursor: pointer; }
    .hamburger span { display: block; width: 24px; height: 2px; background: var(--text); border-radius: 2px; }
    .mobile-menu { display: none; flex-direction: column; gap: 4px; padding: 16px 24px 20px; background: rgba(255,255,255,0.98); border-top: 1px solid var(--border); box-shadow: 0 8px 24px rgba(10,15,44,0.08); }
    .mobile-menu.open { display: flex; }
    .mobile-menu a { padding: 12px 16px; border-radius: var(--radius); font-weight: 600; color: var(--muted); transition: color 0.2s, background 0.2s; text-decoration: none; }
    .mobile-menu a:hover { color: var(--text); background: var(--card); }

    /* ── Typographie article ────────────────────────────────────── */
    /* Texte courant : sombre et lisible */
    p, li, td, th, dd, dt {
      color: #1a1f3a !important;
      line-height: 1.85 !important;
    }
    /* Paragraphes dans le corps de l\'article */
    .article-body p,
    .post-content p,
    .prose p,
    .content p,
    article p,
    main p,
    .article-content p {
      color: #1a1f3a !important;
      font-size: 1.05rem;
      line-height: 1.9;
      margin-bottom: 1.4em;
    }
    /* Titres */
    h1, h2, h3, h4, h5, h6 {
      color: var(--text) !important;
    }
    /* Liens dans le contenu */
    article a, .article-body a, .prose a, main a:not(.nav-cta):not(.btn) {
      color: var(--primary);
      text-decoration: underline;
      text-decoration-color: rgba(26,60,255,0.3);
      text-underline-offset: 3px;
    }
    article a:hover, .article-body a:hover {
      text-decoration-color: var(--primary);
    }
    /* Blockquote / citation */
    blockquote {
      border-left: 3px solid var(--accent);
      padding: 16px 20px;
      background: rgba(16,185,129,0.05);
      border-radius: 0 var(--radius) var(--radius) 0;
      margin: 24px 0;
    }
    blockquote p { color: #1a1f3a !important; font-style: italic; }
    /* Encarts conseil / tip */
    .conseil, .tip, .conseil-terrain, .conseil-box,
    [class*="conseil"], [class*="tip"], [class*="callout"] {
      background: rgba(16,185,129,0.06) !important;
      border: 1px solid rgba(16,185,129,0.2) !important;
      border-radius: var(--radius) !important;
      color: #1a1f3a !important;
    }
    [class*="conseil"] *, [class*="tip"] *, [class*="callout"] * {
      color: #1a1f3a !important;
    }
    /* Listes */
    ul li, ol li { color: #1a1f3a !important; margin-bottom: 6px; }
    /* Strong / em */
    strong { color: var(--text) !important; font-weight: 700; }
    /* Fil d\'ariane / breadcrumb */
    .breadcrumb a, .breadcrumb span, nav.breadcrumb * { color: var(--muted) !important; }
    /* Tags / badges */
    .tag, .badge, .category, [class*="tag"], [class*="badge"], [class*="category"] {
      background: rgba(26,60,255,0.08) !important;
      color: var(--primary) !important;
      border: 1px solid rgba(26,60,255,0.2) !important;
    }
    /* Meta (date, temps lecture) */
    .meta, .post-meta, [class*="meta"] { color: var(--muted) !important; }
    /* CTA en fin d\'article */
    .article-cta, .post-cta, [class*="cta"] {
      background: linear-gradient(135deg, rgba(26,60,255,0.05), rgba(16,185,129,0.05)) !important;
      border: 1px solid var(--border) !important;
    }
    [class*="cta"] h2, [class*="cta"] h3, [class*="cta"] p {
      color: var(--text) !important;
    }
    /* Sections alternées */
    section, .section, [class*="section"] {
      background: var(--bg) !important;
    }
    section:nth-child(even), .bg-alt, [class*="bg2"], [class*="alt"] {
      background: var(--bg2) !important;
    }
    /* Image hero article */
    .article-hero, .post-hero, .hero-image, [class*="hero"] {
      margin-top: 68px;
    }
    /* Footer */
    footer { background: var(--bg) !important; border-top: 1px solid var(--border); }
    footer * { color: var(--muted) !important; }
    footer a:hover { color: var(--text) !important; }

    @media (max-width: 768px) {
      nav { display: none !important; }
      .hamburger { display: flex !important; }
    }
'''

HAMBURGER_JS = '''
  <script>
    (function() {
      var hamburger = document.getElementById('hamburger');
      var mobileMenu = document.getElementById('mobile-menu');
      if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', function() {
          hamburger.classList.toggle('open');
          mobileMenu.classList.toggle('open');
        });
        mobileMenu.querySelectorAll('a').forEach(function(link) {
          link.addEventListener('click', function() {
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
          });
        });
      }
    })();
  </script>'''

COLOR_REPLACEMENTS = [
    ('background: #0A0F2C', 'background: var(--bg)'),
    ('background:#0A0F2C', 'background:var(--bg)'),
    ('background: #0D1340', 'background: var(--bg2)'),
    ('background:#0D1340', 'background:var(--bg2)'),
    ('background: #111847', 'background: var(--bg3)'),
    ('background:#111847', 'background:var(--bg3)'),
    ('background-color: #0A0F2C', 'background-color: var(--bg)'),
    ('background-color:#0A0F2C', 'background-color:var(--bg)'),
    ('color: #F0F2FF', 'color: var(--text)'),
    ('color:#F0F2FF', 'color:var(--text)'),
    ('color: #8A91B4', 'color: var(--muted)'),
    ('color:#8A91B4', 'color:var(--muted)'),
    ('rgba(255,255,255,0.08)', 'rgba(10,15,44,0.10)'),
    ('rgba(255,255,255,0.04)', 'rgba(10,15,44,0.04)'),
    ('rgba(255,255,255,0.06)', 'rgba(10,15,44,0.06)'),
    ('rgba(255,255,255,0.12)', 'rgba(10,15,44,0.12)'),
    ('rgba(255,255,255,0.15)', 'rgba(10,15,44,0.15)'),
    ('rgba(0,0,0,0.5)', 'rgba(0,0,0,0.10)'),
    ('rgba(0,0,0,0.4)', 'rgba(0,0,0,0.08)'),
    ('rgba(10,15,44,0.85)', 'rgba(255,255,255,0.92)'),
    ('rgba(10,15,44,0.98)', 'rgba(255,255,255,0.98)'),
    (' — ', ' : '),
]


def transform_article(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    filename = os.path.basename(filepath)
    print(f"  Traitement : {filename}")

    # 1. Supprimer l'ancien :root dark s'il existe
    html = re.sub(r':root\s*\{[^}]*--bg\s*:\s*#0A0F2C[^}]*\}', '', html, flags=re.DOTALL)

    # 2. Police Inter
    html = html.replace("'Plus Jakarta Sans', sans-serif", "'Inter', sans-serif")
    html = html.replace('"Plus Jakarta Sans"', '"Inter"')
    html = re.sub(
        r'href=["\']https://fonts\.googleapis\.com/css2\?family=Plus\+Jakarta\+Sans[^"\']*["\']',
        'href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"',
        html
    )

    # 3. Remplacer couleurs hardcodées
    for old, new in COLOR_REPLACEMENTS:
        html = html.replace(old, new)

    # 4. Injecter CSS avant </style>
    first_style_close = html.find('</style>')
    if first_style_close != -1:
        html = html[:first_style_close] + INJECTED_CSS + html[first_style_close:]

    # 5. Remplacer header
    html = re.sub(r'<header>.*?</header>', NEW_HEADER, html, flags=re.DOTALL)

    # 6. Remplacer footer
    html = re.sub(r'<footer>.*?</footer>', NEW_FOOTER, html, flags=re.DOTALL)

    # 7. JS hamburger
    if 'id="hamburger"' in html and 'hamburger.addEventListener' not in html:
        html = html.replace('</body>', HAMBURGER_JS + '\n</body>')
    elif 'id="hamburger"' not in html:
        html = html.replace('</body>', HAMBURGER_JS + '\n</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"  OK : {filename}")


def main():
    if not os.path.isdir(BLOG_DIR):
        print(f"Dossier blog introuvable : {BLOG_DIR}")
        return

    files = sorted([f for f in os.listdir(BLOG_DIR) if f.endswith('.html')])
    print(f"Transformation de {len(files)} articles...\n")
    for filename in files:
        transform_article(os.path.join(BLOG_DIR, filename))
    print(f"\nTerminé. {len(files)} articles mis à jour.")


if __name__ == '__main__':
    main()
