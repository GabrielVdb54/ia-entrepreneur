#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_ia_pages.py — Génère l'annuaire « Les meilleures IA du moment ».

Produit, à partir de data/ia-tools.json et data/ia-categories.json :
  - meilleures-ia.html                     (hub : moteur de recherche + filtres + sélecteur)
  - ia/meilleures-ia-<categorie>.html      (une page par usage)
  - ia/<outil>.html                        (une fiche par outil)

Tout le contenu est écrit en HTML statique : le JavaScript ne fait que filtrer
et masquer des cartes déjà présentes dans la page. C'est ce qui rend l'annuaire
lisible par Google et par les crawlers IA (ChatGPT, Perplexity, Claude), à la
différence des annuaires concurrents entièrement rendus en JS.

Usage : python3 generate_ia_pages.py
"""

import json, os, re, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://ia-entrepreneur.fr"
TODAY = datetime.date.today().isoformat()
ANNEE = datetime.date.today().year

CAL = "https://calendly.com/gabriel-ia-entrepreneur/decouverte"

def e(s):
    return html.escape(str(s), quote=True)


def couper(texte, limite):
    """Tronque sur une frontiere de mot, sans couper un mot en deux."""
    texte = texte.strip()
    if len(texte) <= limite:
        return texte
    coupe = texte[:limite].rsplit(' ', 1)[0].rstrip(' ,;:—-')
    return coupe + '…'


def titre_seo(variantes, limite=60):
    """Premiere variante qui tient dans la limite d'affichage de Google."""
    for v in variantes:
        if len(v) <= limite:
            return v
    return couper(variantes[-1], limite)


def description_seo(debut, complement, limite=158):
    """Description unique et non tronquee dans les resultats.

    On n'ajoute le complement que s'il tient : mieux vaut une phrase entiere
    qu'une phrase coupee suivie d'une liste de mots-cles.
    """
    debut = debut.strip()
    if len(debut) + 1 + len(complement) <= limite:
        return debut + ' ' + complement
    if len(debut) <= limite:
        return debut
    return couper(debut, limite)

# ─────────────────────────────────────────────────────────────────────────────
#  CSS de base : on réutilise les règles du site (index.html) pour que l'entête,
#  le pied de page et les boutons soient rigoureusement identiques aux autres
#  pages, sans dupliquer les 45 Ko de styles spécifiques à la page d'accueil.
# ─────────────────────────────────────────────────────────────────────────────
KEEP = re.compile(
    r'^(\*|:root|html|body|a|img|h1|h2|h3|p|ul|li|'
    r'\.container|\.btn|\.btn-[a-z]+|\.gradient|'
    r'header|header\.scrolled|\.header-inner|\.header-inner nav|\.logo|\.logo span|'
    r'nav|nav a|nav a:hover|\.nav-cta|\.nav-cta:hover|'
    r'\.hamburger|\.hamburger span|\.hamburger\.open[^,]*|'
    r'\.mobile-menu|\.mobile-menu\.open|\.mobile-menu a|\.mobile-menu a:hover|'
    r'footer|\.footer-[a-z]+|\.footer-[a-z]+ [a-z:]+|\.footer-links a[^,]*|\.footer-linkedin[^,]*'
    r')(:hover|::before|::after)?$'
)

def split_blocks(css):
    """Découpe une feuille de style en blocs de premier niveau (sélecteur, corps)."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        sel = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        out.append((sel, css[j + 1:k - 1]))
        i = k
    return out

def base_css():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    kept = []
    for sel, body in split_blocks(css):
        if sel.startswith('@media'):
            inner = [f'{s}{{{b}}}' for s, b in split_blocks(body)
                     if all(KEEP.match(p.strip()) for p in s.split(','))]
            if inner:
                kept.append(f'{sel}{{{"".join(inner)}}}')
        elif sel.startswith('@'):
            continue
        elif all(KEEP.match(p.strip()) for p in sel.split(',')):
            kept.append(f'{sel}{{{body}}}')
    out = '\n'.join(kept)
    return re.sub(r'\n\s*\n', '\n', out)

BASE_CSS = base_css()

# ─────────────────────────────────────────────────────────────────────────────
#  Styles propres à l'annuaire
# ─────────────────────────────────────────────────────────────────────────────
IA_CSS = """
    .ia-hero { padding: 120px 0 40px; background: linear-gradient(180deg, var(--bg2), var(--bg)); }
    .ia-hero h1 { font-size: clamp(1.9rem, 4.4vw, 3rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 16px; }
    .ia-hero p.lead { font-size: 1.05rem; color: var(--muted); max-width: 720px; }
    .ia-badge { display:inline-flex; align-items:center; gap:7px; padding:6px 14px; border-radius:50px; background:rgba(26,60,255,0.08); color:var(--primary); font-weight:700; font-size:0.76rem; margin-bottom:18px; }
    .ia-stats { display:flex; flex-wrap:wrap; gap:26px; margin-top:24px; }
    .ia-stats div b { display:block; font-size:1.5rem; font-weight:800; color:var(--text); line-height:1.2; }
    .ia-stats div span { font-size:0.8rem; color:var(--muted); }

    .ia-search-wrap { position: sticky; top: 68px; z-index: 40; background: rgba(255,255,255,0.94); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 14px 0; }
    .ia-search { display:flex; align-items:center; gap:10px; background:var(--bg); border:1.5px solid var(--border); border-radius:50px; padding:11px 18px; box-shadow:0 2px 14px rgba(10,15,44,0.05); }
    .ia-search:focus-within { border-color: var(--primary); box-shadow: 0 4px 20px rgba(26,60,255,0.12); }
    .ia-search input { flex:1; border:0; outline:0; background:transparent; font-family:inherit; font-size:0.95rem; color:var(--text); min-width:0; }
    .ia-search svg { flex-shrink:0; color:var(--muted); }
    .ia-reset { border:0; background:transparent; color:var(--muted); cursor:pointer; font-family:inherit; font-size:1.1rem; line-height:1; padding:2px 4px; }
    .ia-filters { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; align-items:center; }
    .ia-filters select { font-family:inherit; font-size:0.8rem; padding:7px 12px; border-radius:50px; border:1.5px solid var(--border); background:var(--bg); color:var(--text); cursor:pointer; }
    .ia-filters select:focus { outline:0; border-color:var(--primary); }
    .ia-count { font-size:0.8rem; color:var(--muted); font-weight:600; margin-left:auto; }

    #annuaire { scroll-margin-top: 190px; }
    .ia-chips { display:flex; flex-wrap:wrap; gap:8px; margin:22px 0 4px; }
    .ia-chip { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:50px; border:1.5px solid var(--border); background:var(--bg); font-size:0.79rem; font-weight:600; color:var(--muted); cursor:pointer; font-family:inherit; transition:all .18s; text-decoration:none; }
    .ia-chip:hover { border-color:var(--primary); color:var(--primary); }
    .ia-chip.is-active { background:var(--primary); border-color:var(--primary); color:#fff; }

    .ia-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(275px,1fr)); gap:16px; margin:26px 0 10px; }
    .ia-item { position:relative; display:flex; }
    .ia-card { position:relative; flex:1; display:flex; flex-direction:column; gap:10px; padding:20px 46px 20px 20px; border:1px solid var(--border); border-left:4px solid var(--tool); border-radius:var(--radius); background:var(--bg); text-decoration:none; color:inherit; transition:transform .18s, box-shadow .18s, border-color .18s; }
    .ia-card:hover { transform:translateY(-3px); box-shadow:0 10px 30px rgba(10,15,44,0.10); }
    .ia-fav { position:absolute; top:10px; right:10px; z-index:2; width:32px; height:32px; border-radius:50%; border:0; background:transparent; color:var(--muted); font-size:1.15rem; line-height:1; cursor:pointer; font-family:inherit; transition:background .15s, color .15s, transform .15s; }
    .ia-fav:hover { background:var(--card); color:var(--primary); transform:scale(1.12); }
    .ia-fav.is-on { color:#F59E0B; }
    .ia-fav-long { position:static; width:100%; height:auto; border-radius:50px; border:1.5px solid var(--border); padding:11px 18px; font-size:0.84rem; font-weight:700; }
    .ia-fav-long:hover { transform:none; }
    .ia-toast { position:fixed; left:50%; bottom:26px; transform:translate(-50%, 20px); z-index:9999; padding:12px 22px; border-radius:50px; background:var(--text); color:#fff; font-size:0.85rem; font-weight:600; box-shadow:0 10px 30px rgba(10,15,44,0.28); opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; }
    .ia-toast.is-on { opacity:1; transform:translate(-50%, 0); }
    .ia-card-top { display:flex; align-items:center; gap:12px; }
    .ia-logo { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.05rem; color:#fff; background:var(--tool); flex-shrink:0; }
    .ia-card-top strong { display:block; font-size:1rem; font-weight:800; line-height:1.25; }
    .ia-card-top small { display:block; font-size:0.72rem; color:var(--muted); margin-top:2px; }
    .ia-card p { font-size:0.85rem; color:var(--muted); line-height:1.55; flex:1; }
    .ia-pills { display:flex; flex-wrap:wrap; gap:6px; }
    .ia-pill { font-size:0.68rem; font-weight:700; padding:4px 10px; border-radius:50px; background:var(--card); color:var(--muted); }
    .ia-pill.fr { background:rgba(16,185,129,0.12); color:#047857; }
    .ia-pill.note { background:rgba(26,60,255,0.09); color:var(--primary); }
    .ia-empty { grid-column:1/-1; padding:48px 20px; text-align:center; color:var(--muted); border:1.5px dashed var(--border); border-radius:var(--radius); }

    .ia-section { padding:56px 0; }
    .ia-section h2 { font-size:clamp(1.4rem,2.6vw,2rem); margin-bottom:10px; letter-spacing:-0.01em; }
    .ia-section > .container > p.intro { color:var(--muted); max-width:760px; margin-bottom:22px; }
    .ia-cats { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
    .ia-cat { display:block; padding:20px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg); text-decoration:none; color:inherit; transition:transform .18s, box-shadow .18s; }
    .ia-cat:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(10,15,44,0.08); }
    .ia-cat .emo { font-size:1.5rem; }
    .ia-cat b { display:block; margin:8px 0 5px; font-size:0.98rem; }
    .ia-cat span { font-size:0.82rem; color:var(--muted); line-height:1.5; }
    .ia-cat em { display:block; margin-top:9px; font-size:0.74rem; font-weight:700; color:var(--primary); font-style:normal; }

    .ia-selector { background:var(--bg2); border:1px solid var(--border); border-radius:20px; padding:28px; }
    .ia-q { margin-bottom:18px; }
    .ia-q > label { display:block; font-size:0.84rem; font-weight:800; margin-bottom:9px; }
    .ia-choices { display:flex; flex-wrap:wrap; gap:7px; }
    .ia-choice { padding:7px 14px; border-radius:50px; border:1.5px solid var(--border); background:var(--bg); font-family:inherit; font-size:0.79rem; font-weight:600; color:var(--muted); cursor:pointer; transition:all .18s; }
    .ia-choice:hover { border-color:var(--primary); color:var(--primary); }
    .ia-choice[aria-pressed="true"] { background:var(--primary); border-color:var(--primary); color:#fff; }
    .ia-reco { margin-top:20px; display:grid; gap:10px; }
    .ia-reco a { display:flex; align-items:center; gap:12px; padding:14px 16px; border:1px solid var(--border); border-left:4px solid var(--tool); border-radius:12px; background:var(--bg); text-decoration:none; color:inherit; }
    .ia-reco a:hover { box-shadow:0 6px 20px rgba(10,15,44,0.08); }
    .ia-reco b { font-size:0.92rem; }
    .ia-reco small { display:block; color:var(--muted); font-size:0.78rem; margin-top:2px; }

    .ia-crumb { font-size:0.78rem; color:var(--muted); padding-top:100px; }
    .ia-crumb a { color:var(--muted); text-decoration:none; }
    .ia-crumb a:hover { color:var(--primary); }

    .ia-tool-head { display:flex; align-items:flex-start; gap:18px; flex-wrap:wrap; margin:18px 0 14px; }
    .ia-tool-head .ia-logo { width:64px; height:64px; border-radius:16px; font-size:1.5rem; }
    .ia-tool-head h1 { font-size:clamp(1.6rem,3.4vw,2.3rem); line-height:1.2; letter-spacing:-0.02em; }
    .ia-tool-head .sub { color:var(--muted); font-size:0.88rem; margin-top:4px; }
    .ia-layout { display:grid; grid-template-columns:1fr 320px; gap:34px; align-items:start; padding-bottom:56px; }
    .ia-body h2 { font-size:1.15rem; margin:28px 0 10px; letter-spacing:-0.01em; }
    .ia-body h2:first-child { margin-top:0; }
    .ia-body p { color:var(--text); line-height:1.7; margin-bottom:12px; }
    .ia-body ul { margin:0 0 12px 0; padding-left:0; list-style:none; }
    .ia-body ul li { position:relative; padding-left:26px; margin-bottom:9px; color:var(--text); line-height:1.6; }
    .ia-body ul.plus li::before { content:"✓"; position:absolute; left:0; color:var(--accent); font-weight:800; }
    .ia-body ul.moins li::before { content:"—"; position:absolute; left:0; color:#EF4444; font-weight:800; }
    .ia-body ul.cas li::before { content:"→"; position:absolute; left:0; color:var(--primary); font-weight:800; }
    .ia-note { padding:16px 18px; border-radius:12px; background:rgba(16,185,129,0.07); border-left:4px solid var(--accent); font-size:0.9rem; line-height:1.6; }
    .ia-note.warn { background:rgba(239,68,68,0.06); border-left-color:#EF4444; }
    .ia-note b { display:block; margin-bottom:4px; }
    .ia-aside { position:sticky; top:92px; display:grid; gap:14px; }
    .ia-box { border:1px solid var(--border); border-radius:var(--radius); padding:18px; background:var(--bg); }
    .ia-box h3 { font-size:0.82rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom:12px; }
    .ia-kv { display:flex; justify-content:space-between; gap:12px; font-size:0.85rem; padding:7px 0; border-bottom:1px solid var(--border); }
    .ia-kv:last-child { border-bottom:0; }
    .ia-kv span { color:var(--muted); }
    .ia-kv b { text-align:right; }
    .ia-box .btn { width:100%; justify-content:center; }
    .ia-alts { display:flex; flex-wrap:wrap; gap:7px; }
    .ia-alts a { padding:6px 13px; border-radius:50px; border:1.5px solid var(--border); font-size:0.78rem; font-weight:600; text-decoration:none; color:var(--muted); }
    .ia-alts a:hover { border-color:var(--primary); color:var(--primary); }

    .ia-faq { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
    .ia-faq details { border-bottom:1px solid var(--border); }
    .ia-faq details:last-child { border-bottom:0; }
    .ia-faq summary { cursor:pointer; padding:16px 20px; font-weight:700; font-size:0.93rem; list-style:none; display:flex; justify-content:space-between; gap:14px; align-items:center; }
    .ia-faq summary::-webkit-details-marker { display:none; }
    .ia-faq summary::after { content:"+"; color:var(--primary); font-size:1.3rem; font-weight:400; line-height:1; }
    .ia-faq details[open] summary::after { content:"–"; }
    .ia-faq .answer { padding:0 20px 18px; color:var(--muted); font-size:0.9rem; line-height:1.65; }

    .ia-cta { background:linear-gradient(135deg, var(--primary), #4B6BFF); color:#fff; border-radius:20px; padding:38px; text-align:center; }
    .ia-cta h2 { color:#fff; margin-bottom:10px; }
    .ia-cta p { color:rgba(255,255,255,0.9); max-width:620px; margin:0 auto 22px; }
    .ia-cta .btn { background:#fff; color:var(--primary); }
    .ia-cta .btn:hover { background:#F1F4FF; }
    .ia-cta-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .ia-cta .btn.ghost { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.5); }

    .ia-maj { font-size:0.76rem; color:var(--muted); margin-top:24px; }
    .ia-prev-next { display:flex; flex-wrap:wrap; gap:10px; margin-top:30px; }

    @media (max-width: 1024px) {
      .ia-layout { grid-template-columns:1fr; gap:26px; }
      .ia-aside { position:static; }
    }
    @media (max-width: 900px) {
      .ia-search-wrap { top:0; }
    }
    @media (max-width: 768px) {
      .ia-hero { padding:96px 0 30px; }
      .ia-grid { grid-template-columns:1fr; gap:12px; }
      .ia-cats { grid-template-columns:1fr; }
      .ia-count { margin-left:0; width:100%; }
      .ia-search-wrap { position:static; }
      .ia-toast { bottom:86px; }
      #annuaire { scroll-margin-top: 80px; }
      .ia-filters select { flex:1 1 calc(50% - 4px); min-width:0; }
      .ia-selector, .ia-cta { padding:22px; border-radius:16px; }
      .ia-section { padding:38px 0; }
      .ia-crumb { padding-top:88px; }
      .ia-tool-head .ia-logo { width:52px; height:52px; font-size:1.2rem; }
      .ia-cta-actions .btn { width:100%; justify-content:center; }
    }
"""

# ─────────────────────────────────────────────────────────────────────────────
#  Script commun à l'annuaire : favoris (localStorage) et partage.
#  Chargé sur le hub, les pages par usage et les fiches — d'où un fichier
#  externe plutôt que 40 lignes dupliquées dans 146 pages.
# ─────────────────────────────────────────────────────────────────────────────
ANNUAIRE_JS = r"""/* ia-annuaire.js — genere par generate_ia_pages.py, ne pas editer a la main */
(function () {
  var CLE = 'ia-entrepreneur-favoris';

  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) { return []; }
  }
  function ecrire(liste) {
    try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch (e) { /* navigation privee */ }
  }
  function est(slug) { return lire().indexOf(slug) >= 0; }
  function basculer(slug) {
    var l = lire(), i = l.indexOf(slug);
    if (i >= 0) l.splice(i, 1); else l.push(slug);
    ecrire(l);
    return i < 0;
  }

  var minuteur;
  function toast(message) {
    var el = document.querySelector('.ia-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ia-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  function rafraichir() {
    var favoris = lire();
    Array.prototype.forEach.call(document.querySelectorAll('[data-fav]'), function (b) {
      var on = favoris.indexOf(b.dataset.fav) >= 0;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (b.classList.contains('ia-fav-long')) {
        b.textContent = on ? '★ Dans vos favoris' : '☆ Ajouter à mes favoris';
      } else {
        b.textContent = on ? '★' : '☆';
        b.title = on ? 'Retirer de mes favoris' : 'Ajouter à mes favoris';
      }
    });
    document.dispatchEvent(new CustomEvent('ia-favoris-maj', { detail: favoris }));
  }

  document.addEventListener('click', function (ev) {
    var bouton = ev.target.closest('[data-fav]');
    if (bouton) {
      ev.preventDefault();
      ev.stopPropagation();
      var ajoute = basculer(bouton.dataset.fav);
      rafraichir();
      toast(ajoute ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
      return;
    }
    var partage = ev.target.closest('[data-partager]');
    if (partage) {
      ev.preventDefault();
      var donnees = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(donnees).catch(function () { /* partage annule */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () { toast('Lien copié'); });
      } else {
        toast(location.href);
      }
    }
  });

  window.IAFavoris = { lire: lire, est: est, toast: toast };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rafraichir);
  } else {
    rafraichir();
  }
})();
"""

# ─────────────────────────────────────────────────────────────────────────────
#  Entête / pied de page, repris à l'identique du reste du site
# ─────────────────────────────────────────────────────────────────────────────
NAV_ITEMS = [
    ('/', 'Accueil'),
    ('/formations-entreprises.html', 'Formations IA'),
    ('/integrations-ia.html', 'Intégrations IA'),
    ('/meilleures-ia.html', 'Meilleures IA'),
    ('/apropos.html', 'À propos'),
    ('/nos-formateurs.html', 'Nos formateurs'),
    ('/blog.html', 'Blog'),
]

def header_html():
    nav = '\n'.join(f'        <a href="{u}">{t}</a>' for u, t in NAV_ITEMS)
    mob = '\n'.join(f'    <a href="{u}">{t}</a>' for u, t in NAV_ITEMS)
    return f"""  <header id="header">
    <div class="container">
      <div class="header-inner">
        <a href="/" class="logo" style="line-height:1.2;">
          IA<span>-</span>Entrepreneur
          <span style="display:block;font-size:0.58rem;font-weight:500;color:var(--muted);letter-spacing:0.03em;margin-top:2px;">Organisme de formation certifié Qualiopi</span>
        </a>
        <nav>
{nav}
        <a href="tel:+33614980713" style="display:flex;align-items:center;gap:5px;">06 14 98 07 13</a>
        <a href="{CAL}" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>
      </nav>
        <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
{mob}
    <a href="mailto:contact@ia-entrepreneur.fr">✉ Écrire un email</a>
    <a href="tel:+33614980713">📞 06 14 98 07 13</a>
    <a href="{CAL}" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>
  </div>
</header>"""

FOOTER_HTML = f"""  <footer>
    <div class="container">
      <div class="footer-inner">
        <div class="footer-logo">IA<span>-</span>Entrepreneur</div>
        <div class="footer-center">
          <div class="footer-links">
            <a href="/">Accueil</a>
            <a href="/apropos.html">À propos</a>
            <a href="/nos-formateurs.html">Nos formateurs</a>
            <a href="/formations-entreprises.html">Formations IA</a>
            <a href="/integrations-ia.html">Intégrations IA</a>
            <a href="/meilleures-ia.html">Les meilleures IA</a>
            <a href="/blog.html">Blog</a>
            <a href="/simulateur-financement-formation-ia.html">Simulateur de financement</a>
            <a href="/mentions-legales.html">Mentions légales</a>
            <a href="/cgv.html">CGV</a>
            <a href="/politique-confidentialite.html">Politique de confidentialité</a>
          </div>
          <a href="tel:+33614980713" style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--muted);margin-top:8px;">📞 06 14 98 07 13</a>
        </div>
        <div class="footer-right">
          <p class="footer-copy">© {ANNEE} IA-Entrepreneur · Clindit SASU. Tous droits réservés. · NDA : 44 54 04871 54</p>
          <p class="footer-tagline">Organisme de formation certifié Qualiopi · Certificat n° 883211-1</p>
        </div>
      </div>
    </div>
  </footer>

  <script>
    const header = document.getElementById('header');
    window.addEventListener('scroll', function () {{
      if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    }}, {{ passive: true }});
    const burger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (burger && mobileMenu) {{
      burger.addEventListener('click', function () {{
        burger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
      }});
      mobileMenu.querySelectorAll('a').forEach(function (a) {{
        a.addEventListener('click', function () {{
          burger.classList.remove('open');
          mobileMenu.classList.remove('open');
        }});
      }});
    }}
  </script>
</body>
</html>"""

GA = """<script async src="https://www.googletagmanager.com/gtag/js?id=G-SZG9XPNNNC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-SZG9XPNNNC');
</script>"""

EDITEUR_LD = {
    "@type": "Organization",
    "name": "IA-Entrepreneur",
    "url": SITE,
    "logo": {"@type": "ImageObject", "url": f"{SITE}/favicon.png"},
    "sameAs": ["https://www.linkedin.com/in/gabriel-vanderbecken/"],
}


def head_html(title, desc, canonical, jsonld, keywords='', og_type='website',
              og_image='/images/og/annuaire.png', og_alt=None):
    ld = '\n'.join(
        '  <script type="application/ld+json">\n%s\n  </script>' % json.dumps(b, ensure_ascii=False, indent=2)
        for b in jsonld)
    kw = f'\n  <meta name="keywords" content="{e(keywords)}" />' if keywords else ''
    maj_html = (f'\n  <meta property="article:modified_time" content="{TODAY}" />'
                f'\n  <meta property="article:publisher" content="{SITE}" />') if og_type == 'article' else ''
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
{GA}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />

  <title>{e(title)}</title>
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta name="description" content="{e(desc)}" />{kw}
  <link rel="canonical" href="{canonical}" />

  <meta name="author" content="IA-Entrepreneur" />

  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{SITE}{og_image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{e(og_alt or title)}" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:site_name" content="IA-Entrepreneur" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:updated_time" content="{TODAY}" />{maj_html}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{e(title)}" />
  <meta name="twitter:description" content="{e(desc)}" />
  <meta name="twitter:image" content="{SITE}{og_image}" />
  <meta name="twitter:image:alt" content="{e(og_alt or title)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

{ld}
  <link rel="stylesheet" href="/ia-annuaire.css" />
  <link rel="stylesheet" href="/mobile.css" />
  <script src="/ia-annuaire.js" defer></script>
</head>
<body>
{header_html()}
"""

# ─────────────────────────────────────────────────────────────────────────────
#  Données
# ─────────────────────────────────────────────────────────────────────────────
CATS = json.load(open(os.path.join(ROOT, 'data', 'ia-categories.json'), encoding='utf-8'))
TOOLS = json.load(open(os.path.join(ROOT, 'data', 'ia-tools.json'), encoding='utf-8'))
CAT_BY = {c['slug']: c for c in CATS}
TOOL_BY = {t['slug']: t for t in TOOLS}
TOOLS.sort(key=lambda t: t['name'].lower())

UE = {'France', 'Allemagne', 'Belgique', 'Espagne', 'Suède', 'Pays-Bas', 'Estonie',
      'Portugal / Allemagne', 'Pologne', 'Tchéquie / États-Unis', 'États-Unis / Pologne',
      'Royaume-Uni', 'États-Unis / France'}

PROFILS = ['Dirigeant', 'Commercial', 'Marketing', 'Ops', 'RH', 'Formateur', 'Développeur']
NIVEAUX = ['Débutant', 'Intermédiaire', 'Expert']
PRIX = ['Gratuit', 'Freemium', 'Payant']

def souverainete(t):
    """Retourne (libellé du badge, classe CSS) selon l'origine de l'éditeur."""
    p = t.get('pays', '')
    if p.startswith('France'):
        return '🇫🇷 Éditeur français', 'fr'
    if p in UE or 'open source' in p.lower():
        return '🇪🇺 Éditeur européen' if p in UE else '🔓 Open source', 'fr'
    return '', ''

def monogram(name):
    m = re.sub(r'[^A-Za-z0-9]', '', name)
    return (m[:2] or '?').upper() if len(m) > 1 else (m or '?').upper()

def norm(s):
    s = s.lower()
    for a, b in zip('àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def tool_url(t):
    return f"/ia/{t['slug']}.html"

def cat_url(c):
    return f"/ia/meilleures-ia-{c['slug']}.html"

def all_cats(t):
    return [t['cat']] + [c for c in t.get('cats', []) if c != t['cat']]

def card_html(t, lien_interne=True):
    c = CAT_BY[t['cat']]
    badge, cls = souverainete(t)
    badge_html = f'<span class="ia-pill {cls}">{badge}</span>' if badge else ''
    # data-txt ne porte que les mots-cles absents du texte visible de la carte :
    # le reste du champ de recherche est reconstruit en JS depuis textContent.
    visible = norm(t['name'] + ' ' + t['resume'] + ' ' + CAT_BY[t['cat']]['nom'])
    mots = set()
    for src in [t['tags'], t.get('editeur', ''), ' '.join(t.get('cas', [])),
                ' '.join(CAT_BY[x]['nom'] for x in all_cats(t)), ' '.join(t.get('profils', []))]:
        mots.update(w for w in norm(src).split() if len(w) > 2 and w not in visible)
    data = ' '.join(sorted(mots))
    return f"""        <div class="ia-item" style="--tool:{c['couleur']}" data-slug="{t['slug']}"
           data-cat="{' '.join(all_cats(t))}" data-prof="{e(' '.join(t.get('profils', [])))}"
           data-niv="{e(t['niveau'])}" data-prix="{e(t['prix'])}" data-note="{t['note']}" data-fr="{'1' if badge else '0'}"
           data-txt="{e(data)}">
          <a class="ia-card" href="{tool_url(t)}">
            <div class="ia-card-top">
              <div class="ia-logo" aria-hidden="true">{monogram(t['name'])}</div>
              <div><strong>{e(t['name'])}</strong><small>{c['emoji']} {e(c['nom'])}</small></div>
            </div>
            <p>{e(t['resume'])}</p>
            <div class="ia-pills"><span class="ia-pill">{e(t['niveau'])}</span><span class="ia-pill">{e(t['prix'])}</span><span class="ia-pill note">★ {t['note']}/5</span>{badge_html}</div>
          </a>
          <button class="ia-fav" type="button" data-fav="{t['slug']}" aria-pressed="false"
                  aria-label="Ajouter {e(t['name'])} à mes favoris" title="Ajouter à mes favoris">☆</button>
        </div>"""

def faq_html(items):
    rows = '\n'.join(
        f"""        <details><summary>{e(q)}</summary><div class="answer">{a}</div></details>"""
        for q, a in items)
    return f'      <div class="ia-faq">\n{rows}\n      </div>'

def faq_ld(items):
    return {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer",
                                           "text": re.sub(r'<[^>]+>', '', a)}} for q, a in items]
    }

def crumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n,
                                 "item": SITE + u} for i, (n, u) in enumerate(items)]}

CTA = f"""  <section class="ia-section">
    <div class="container">
      <div class="ia-cta">
        <h2>Vos équipes savent-elles vraiment s'en servir ?</h2>
        <p>Connaître les outils ne suffit pas. Nous formons vos équipes aux IA qui correspondent à vos processus, et nous délivrons une attestation mentionnant les volets AI Act (article 4), RGPD et gouvernance des données. Organisme certifié Qualiopi, formations finançables par votre OPCO.</p>
        <div class="ia-cta-actions">
          <a class="btn" href="{CAL}" target="_blank" rel="noopener noreferrer">Appel gratuit de 15 min</a>
          <a class="btn ghost" href="/formations-entreprises.html">Voir les formations IA</a>
        </div>
      </div>
    </div>
  </section>"""

# ─────────────────────────────────────────────────────────────────────────────
#  Sélecteur : objectif → catégories pertinentes
# ─────────────────────────────────────────────────────────────────────────────
OBJECTIFS = [
    ("Gagner du temps sur l'administratif", ['automatisation', 'finance-admin', 'reunions-notes']),
    ("Trouver plus de clients", ['prospection-vente', 'seo-visibilite', 'redaction-contenu']),
    ("Mieux répondre à mes clients", ['relation-client', 'assistants-ia', 'reunions-notes']),
    ("Produire du contenu", ['redaction-contenu', 'images-design', 'video-audio']),
    ("Analyser mes données", ['data-analyse', 'finance-admin', 'assistants-ia']),
    ("Former et organiser mes équipes", ['rh-formation', 'presentations-documents', 'assistants-ia']),
    ("Créer un site ou un outil interne", ['sites-apps-nocode', 'automatisation']),
    ("Sécuriser mes données et me mettre en conformité", ['juridique-conformite', 'assistants-ia']),
]

HUB_FAQ = [
    ("Quelle est la meilleure IA en " + str(ANNEE) + " ?",
     "Il n'y a pas de meilleure IA dans l'absolu, seulement une meilleure IA <em>pour un usage donné</em>. Pour un usage généraliste en entreprise (rédiger, analyser, résumer), <a href='/ia/chatgpt.html'>ChatGPT</a> et <a href='/ia/claude.html'>Claude</a> sont les deux références, et <a href='/ia/mistral-le-chat.html'>Mistral Le Chat</a> s'impose dès que les données doivent rester en Europe. Pour automatiser des tâches, c'est <a href='/ia/n8n.html'>n8n</a> ou <a href='/ia/make.html'>Make</a>. Pour les comptes rendus de réunion, <a href='/ia/fathom.html'>Fathom</a> ou <a href='/ia/noota.html'>Noota</a>. Le bon réflexe est de partir du problème à résoudre, pas de l'outil."),
    ("Comment savoir quelle IA utiliser pour mon entreprise ?",
     "Partez du temps que vous perdez. Listez les trois tâches qui vous coûtent le plus d'heures chaque semaine, puis cherchez l'outil correspondant dans cet annuaire à l'aide du sélecteur. Vérifiez ensuite trois points avant d'adopter un outil : où sont hébergées les données, ce que coûte réellement l'abonnement en usage réel, et qui, dans l'entreprise, saura s'en servir. Un outil que personne n'utilise ne fait gagner aucun temps."),
    ("Quelles IA peut-on utiliser avec des données confidentielles ?",
     "Celles dont l'éditeur est soumis au droit européen ou qui s'installent sur votre propre infrastructure : <a href='/ia/mistral-le-chat.html'>Mistral Le Chat</a> (France), <a href='/ia/dust.html'>Dust</a> (France), <a href='/ia/n8n.html'>n8n</a> en auto-hébergement, <a href='/ia/ollama.html'>Ollama</a> ou <a href='/ia/anythingllm.html'>AnythingLLM</a> en local. Sur les outils américains, les offres Team et Entreprise excluent contractuellement l'entraînement sur vos échanges : c'est ce point qu'il faut vérifier et documenter, pas la version grand public. Chaque fiche de cet annuaire indique le pays de l'éditeur et le point de vigilance associé."),
    ("Existe-t-il des IA gratuites suffisantes pour une TPE ?",
     "Oui, et elles couvrent une bonne partie des besoins. <a href='/ia/chatgpt.html'>ChatGPT</a>, <a href='/ia/claude.html'>Claude</a>, <a href='/ia/gemini.html'>Gemini</a> et <a href='/ia/mistral-le-chat.html'>Mistral</a> ont des versions gratuites utilisables au quotidien. <a href='/ia/notebooklm.html'>NotebookLM</a>, <a href='/ia/google-search-console.html'>Google Search Console</a> et <a href='/ia/looker-studio.html'>Looker Studio</a> sont entièrement gratuits. <a href='/ia/fathom.html'>Fathom</a> et <a href='/ia/canva.html'>Canva</a> ont des offres gratuites généreuses. Utilisez le filtre « Gratuit » ou « Freemium » de l'annuaire pour ne voir que celles-là."),
    ("Faut-il former ses salariés avant de déployer une IA ?",
     "Ce n'est pas seulement recommandé, c'est une obligation. L'article 4 de l'AI Act, en vigueur depuis le 2 février 2025, impose aux entreprises qui déploient des systèmes d'IA de garantir un niveau suffisant de maîtrise de l'IA chez les personnes qui les utilisent. Au-delà du texte, c'est surtout ce qui distingue un abonnement payé et inutilisé d'un gain de temps réel. <a href='/formations-entreprises.html'>Nos formations</a> délivrent une attestation individuelle mentionnant les volets AI Act, RGPD et gouvernance des données."),
    ("Cet annuaire contient-il des liens sponsorisés ou affiliés ?",
     "Non, aucun. Chaque « Site officiel » pointe directement vers le domaine de l'éditeur, sans identifiant de parrainage, sans redirection et sans paramètre de suivi. Aucun éditeur ne paie pour figurer dans cet annuaire, pour y être mieux classé ou pour en être retiré. Les notes et les limites sont celles que nous constatons en formation et en mission chez nos clients — y compris quand elles ne servent pas l'outil."),
    ("À quelle fréquence cet annuaire est-il mis à jour ?",
     "Il est revu régulièrement : les outils qui disparaissent sont retirés, les nouveaux entrants sérieux sont ajoutés, et les tarifs indiqués sont réévalués. Les prix mentionnés restent indicatifs — sur ce marché, ils évoluent vite : vérifiez toujours sur le site de l'éditeur avant de vous engager."),
]

def build_hub():
    cards = '\n'.join(card_html(t) for t in TOOLS)
    chips = '\n'.join(
        f"""          <button class="ia-chip" type="button" data-chip="{c['slug']}">{c['emoji']} {e(c['court'])}</button>"""
        for c in CATS)
    cat_cards = '\n'.join(
        f"""        <a class="ia-cat" href="{cat_url(c)}">
          <span class="emo">{c['emoji']}</span>
          <b>{e(c['nom'])}</b>
          <span>{e(c['desc'])}</span>
          <em>{sum(1 for t in TOOLS if c['slug'] in all_cats(t))} outils →</em>
        </a>""" for c in CATS)
    obj = '\n'.join(
        f"""            <button class="ia-choice" type="button" role="button" aria-pressed="false" data-q="obj" data-val="{' '.join(cs)}">{e(lib)}</button>"""
        for lib, cs in OBJECTIFS)
    rol = '\n'.join(
        f"""            <button class="ia-choice" type="button" aria-pressed="false" data-q="prof" data-val="{p}">{p}</button>"""
        for p in PROFILS)
    niv = '\n'.join(
        f"""            <button class="ia-choice" type="button" aria-pressed="false" data-q="niv" data-val="{n}">{n}</button>"""
        for n in NIVEAUX)
    bud = '\n'.join(
        f"""            <button class="ia-choice" type="button" aria-pressed="false" data-q="prix" data-val="{p}">{p}</button>"""
        for p in ['Gratuit', 'Freemium', 'Payant'])
    opts_cat = '\n'.join(f'<option value="{c["slug"]}">{e(c["nom"])}</option>' for c in CATS)
    opts_prof = '\n'.join(f'<option value="{p}">{p}</option>' for p in PROFILS)
    opts_niv = '\n'.join(f'<option value="{n}">{n}</option>' for n in NIVEAUX)
    opts_prix = '\n'.join(f'<option value="{p}">{p}</option>' for p in PRIX)

    nb_fr = sum(1 for t in TOOLS if souverainete(t)[0])
    title = titre_seo([
        f"Les meilleures IA du moment : {len(TOOLS)} outils comparés ({ANNEE})",
        f"Les meilleures IA : {len(TOOLS)} outils comparés ({ANNEE})",
    ])
    desc = (f"Quelle IA utiliser ? {len(TOOLS)} outils comparés par usage, niveau, prix et pays d'hébergement "
            "des données. Moteur de recherche et sélecteur gratuits.")
    canonical = f"{SITE}/meilleures-ia.html"

    ld = [
        crumb_ld([("Accueil", "/"), ("Les meilleures IA", "/meilleures-ia.html")]),
        {"@context": "https://schema.org", "@type": "ItemList",
         "name": f"Les meilleures IA du moment ({ANNEE})",
         "description": desc, "numberOfItems": len(TOOLS),
         "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": t['name'],
              "url": SITE + tool_url(t)} for i, t in enumerate(TOOLS)]},
        faq_ld(HUB_FAQ),
        {"@context": "https://schema.org", "@type": "CollectionPage",
         "name": title, "description": desc, "url": canonical,
         "inLanguage": "fr-FR", "dateModified": TODAY,
         "publisher": EDITEUR_LD,
         "about": {"@type": "Thing", "name": "Outils d'intelligence artificielle pour les entreprises"}},
    ]

    body = f"""
  <section class="ia-hero">
    <div class="container">
      <div class="ia-badge">Annuaire indépendant · mis à jour le {datetime.date.today().strftime('%d/%m/%Y')}</div>
      <h1>Les meilleures IA du moment :<br />trouvez celle qui règle <span class="gradient">votre</span> problème</h1>
      <p class="lead">Il n'existe pas une « meilleure IA », mais une meilleure IA par usage. {len(TOOLS)} outils sélectionnés et classés
      par besoin métier, niveau requis, budget réel et — c'est rare — pays d'hébergement des données.
      Cherchez, filtrez, ou laissez le sélecteur vous orienter en quatre questions.</p>
      <div class="ia-stats">
        <div><b>{len(TOOLS)}</b><span>outils référencés</span></div>
        <div><b>{len(CATS)}</b><span>usages en entreprise</span></div>
        <div><b>{nb_fr}</b><span>éditeurs européens ou open source</span></div>
        <div><b>{sum(1 for t in TOOLS if t['prix'] in ('Gratuit', 'Freemium'))}</b><span>utilisables gratuitement</span></div>
      </div>
    </div>
  </section>

  <div class="ia-search-wrap">
    <div class="container">
      <label class="ia-search" for="ia-q">
        <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="ia-q" type="search" placeholder="Que voulez-vous faire ? (ex. : compte rendu de réunion, prospection, facture)" autocomplete="off" />
        <button class="ia-reset" type="button" id="ia-clear" aria-label="Effacer la recherche">✕</button>
      </label>
      <div class="ia-filters">
        <select id="f-cat" aria-label="Filtrer par usage"><option value="">Tous les usages</option>
{opts_cat}
        </select>
        <select id="f-prof" aria-label="Filtrer par profil"><option value="">Tous les profils</option>
{opts_prof}
        </select>
        <select id="f-niv" aria-label="Filtrer par niveau"><option value="">Tous les niveaux</option>
{opts_niv}
        </select>
        <select id="f-prix" aria-label="Filtrer par prix"><option value="">Tous les tarifs</option>
{opts_prix}
        </select>
        <button class="ia-chip" type="button" id="f-fr" aria-pressed="false">🇪🇺 Éditeurs européens</button>
        <button class="ia-chip" type="button" id="f-fav" aria-pressed="false">★ Mes favoris</button>
        <span class="ia-count" id="ia-count">{len(TOOLS)} outils affichés</span>
      </div>
    </div>
  </div>

  <section class="ia-section" id="annuaire" style="padding-top:26px;">
    <div class="container">
      <div class="ia-chips">
{chips}
      </div>
      <div class="ia-grid" id="ia-grid">
{cards}
        <div class="ia-empty" id="ia-empty" hidden>Aucun outil ne correspond. Essayez un autre mot ou réinitialisez les filtres.</div>
      </div>
      <p class="ia-maj">Notes attribuées par l'équipe IA-Entrepreneur selon quatre critères : facilité de prise en main, utilité réelle pour une TPE-PME, rapport qualité/prix et maturité de l'outil. Les tarifs sont indicatifs et constatés en {datetime.date.today().strftime('%m/%Y')} — vérifiez-les sur le site de l'éditeur. Aucun lien de cet annuaire n'est rémunéré.</p>
    </div>
  </section>

  <section class="ia-section" style="background:var(--bg2);">
    <div class="container">
      <h2>Le sélecteur : quelle IA pour votre situation ?</h2>
      <p class="intro">Quatre questions, cinq recommandations. Le classement croise votre objectif, votre rôle, votre niveau et votre budget avec les {len(TOOLS)} outils de l'annuaire.</p>
      <div class="ia-selector">
        <div class="ia-q"><label>1. Qu'est-ce que vous cherchez à régler ?</label><div class="ia-choices">
{obj}
        </div></div>
        <div class="ia-q"><label>2. Qui va s'en servir ?</label><div class="ia-choices">
{rol}
        </div></div>
        <div class="ia-q"><label>3. Quel est le niveau de la personne concernée ?</label><div class="ia-choices">
{niv}
        </div></div>
        <div class="ia-q"><label>4. Quel budget acceptez-vous ?</label><div class="ia-choices">
{bud}
        </div></div>
        <div class="ia-reco" id="ia-reco"></div>
        <p id="ia-reco-hint" style="font-size:0.82rem;color:var(--muted);margin-top:14px;">Répondez aux quatre questions pour obtenir vos recommandations.</p>
      </div>
    </div>
  </section>

  <section class="ia-section">
    <div class="container">
      <h2>Les {len(CATS)} usages de l'IA en entreprise</h2>
      <p class="intro">Chaque page réunit les outils d'un même usage, avec ce qu'ils font vraiment gagner et leurs limites.</p>
      <div class="ia-cats">
{cat_cards}
      </div>
    </div>
  </section>

  <section class="ia-section" style="background:var(--bg2);">
    <div class="container">
      <h2>Questions fréquentes</h2>
      <p class="intro">Les questions que se posent les dirigeants avant de choisir un outil d'IA.</p>
{faq_html(HUB_FAQ)}
    </div>
  </section>

{CTA}

  <script>
  (function () {{
    var grid = document.getElementById('ia-grid');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.ia-item'));
    var q = document.getElementById('ia-q'),
        fcat = document.getElementById('f-cat'), fprof = document.getElementById('f-prof'),
        fniv = document.getElementById('f-niv'), fprix = document.getElementById('f-prix'),
        ffr = document.getElementById('f-fr'), ffav = document.getElementById('f-fav'),
        count = document.getElementById('ia-count'),
        empty = document.getElementById('ia-empty'), chips = document.querySelectorAll('[data-chip]');

    function norm(s) {{
      return (s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
    }}
    cards.forEach(function (c) {{
      c._hay = norm(c.textContent) + ' ' + (c.dataset.txt || '');
      c._nom = norm(c.querySelector('strong').textContent);
      c._cat = norm(c.querySelector('small').textContent);
    }});
    var ordreInitial = cards.slice();
    var ALIAS = {{
      'reunion': 'reunion compte rendu transcription note visio',
      'client': 'client relation support chatbot prospection crm',
      'prospect': 'prospection commercial vente crm lead client',
      'facture': 'facture comptabilite finance devis administratif',
      'video': 'video montage sous-titre audio avatar',
      'image': 'image design visuel graphique photo',
      'site': 'site web application no-code page',
      'automatiser': 'automatisation workflow scenario agent tache repetitive',
      'gratuit': 'gratuit freemium',
      'rgpd': 'rgpd conformite donnees france europe souverainete confidentiel',
      'email': 'email mail messagerie emailing newsletter',
      'recrutement': 'recrutement rh candidat entretien'
    }};
    // Mots vides francais : ils ne doivent jamais peser dans la recherche.
    var STOP = ' de la le les du des un une mes mon ma pour avec sur dans que qui quoi est sont ai je nous vous mon notre plus comment quel quelle quels quelles ';
    // Chaque mot de la requete devient un groupe d'alternatives (le mot + ses
    // synonymes). Un outil est retenu s'il satisfait TOUS les groupes.
    function groups(s) {{
      return norm(s).split(' ').filter(function (w) {{
        return w.length > 2 && STOP.indexOf(' ' + w + ' ') < 0;
      }}).map(function (w) {{
        var alt = [w];
        Object.keys(ALIAS).forEach(function (k) {{
          if (k.indexOf(w) === 0 || w.indexOf(k) === 0) alt = alt.concat(ALIAS[k].split(' '));
        }});
        return alt;
      }});
    }}

    function apply() {{
      var terms = groups(q.value), cat = fcat.value, prof = fprof.value,
          niv = fniv.value, prix = fprix.value, fr = ffr.getAttribute('aria-pressed') === 'true',
          fav = ffav.getAttribute('aria-pressed') === 'true',
          favoris = (window.IAFavoris ? window.IAFavoris.lire() : []), n = 0;
      // 1) filtres stricts (usage, profil, niveau, tarif, origine)
      var pool = cards.filter(function (c) {{
        if (cat && c.dataset.cat.split(' ').indexOf(cat) < 0) return false;
        if (prof && c.dataset.prof.indexOf(prof) < 0) return false;
        if (niv && c.dataset.niv !== niv) return false;
        if (prix && c.dataset.prix !== prix) return false;
        if (fr && c.dataset.fr !== '1') return false;
        if (fav && favoris.indexOf(c.dataset.slug) < 0) return false;
        return true;
      }});

      // 2) recherche : les mots exacts d'abord. Les synonymes ne sont ouverts
      //    que si la recherche exacte ne remonte presque rien — sans quoi un mot
      //    comme « prospection » ramenerait la moitie de l'annuaire.
      function match(c, avecSynonymes) {{
        var hay = c._hay, score = 0;
        var ok = terms.every(function (g) {{
          if (hay.indexOf(g[0]) >= 0) {{
            score += c._nom.indexOf(g[0]) === 0 ? 12 : 6;
            if (c._cat.indexOf(g[0]) >= 0) score += 5;  // l'usage principal prime
            return true;
          }}
          if (avecSynonymes && g.some(function (w) {{ return w.length > 2 && hay.indexOf(w) >= 0; }})) {{
            score += 2;
            return true;
          }}
          return false;
        }});
        c._score = ok ? score + parseFloat(c.dataset.note) / 10 : 0;
        return ok;
      }}

      var res = pool;
      if (terms.length) {{
        res = pool.filter(function (c) {{ return match(c, false); }});
        if (res.length < 5) res = pool.filter(function (c) {{ return match(c, true); }});
        res.sort(function (a, b) {{
          return b._score - a._score || a._nom.localeCompare(b._nom, 'fr');
        }});
        res.forEach(function (c) {{ grid.appendChild(c); }});
      }} else if (ordreInitial) {{
        ordreInitial.forEach(function (c) {{ grid.appendChild(c); }});
      }}
      grid.appendChild(empty);

      var visibles = res;
      cards.forEach(function (c) {{ c.hidden = visibles.indexOf(c) < 0; }});
      n = visibles.length;
      count.textContent = n + ' outil' + (n > 1 ? 's affichés' : ' affiché');
      empty.hidden = n > 0;
      empty.textContent = (fav && !favoris.length)
        ? "Vous n'avez pas encore de favori. Cliquez sur l'étoile d'une carte pour garder un outil sous la main."
        : 'Aucun outil ne correspond. Essayez un autre mot ou réinitialisez les filtres.';
      chips.forEach(function (ch) {{ ch.classList.toggle('is-active', ch.dataset.chip === cat); }});
    }}

    // Recherche pré-remplie depuis une autre page du site : /meilleures-ia.html?q=…
    var params = new URLSearchParams(window.location.search);
    if (params.get('q')) q.value = params.get('q');
    if (params.get('cat')) fcat.value = params.get('cat');
    if (params.get('q') || params.get('cat')) {{
      setTimeout(function () {{
        document.getElementById('annuaire').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
      }}, 120);
    }}

    [q, fcat, fprof, fniv, fprix].forEach(function (el) {{
      el.addEventListener('input', apply); el.addEventListener('change', apply);
    }});
    document.getElementById('ia-clear').addEventListener('click', function () {{ q.value = ''; apply(); q.focus(); }});
    apply();
    ffav.addEventListener('click', function () {{
      var on = ffav.getAttribute('aria-pressed') === 'true';
      ffav.setAttribute('aria-pressed', on ? 'false' : 'true');
      ffav.classList.toggle('is-active', !on);
      apply();
    }});
    // une etoile cliquee ailleurs sur la page doit rafraichir la liste filtree
    document.addEventListener('ia-favoris-maj', function (ev) {{
      ffav.textContent = ev.detail.length ? '★ Mes favoris (' + ev.detail.length + ')' : '★ Mes favoris';
      if (ffav.getAttribute('aria-pressed') === 'true') apply();
    }});
    ffr.addEventListener('click', function () {{
      var on = ffr.getAttribute('aria-pressed') === 'true';
      ffr.setAttribute('aria-pressed', on ? 'false' : 'true');
      ffr.classList.toggle('is-active', !on);
      apply();
    }});
    chips.forEach(function (ch) {{
      ch.addEventListener('click', function () {{
        fcat.value = (fcat.value === ch.dataset.chip) ? '' : ch.dataset.chip;
        apply();
        document.getElementById('annuaire').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
      }});
    }});

    // ── Sélecteur ────────────────────────────────────────────────
    var sel = {{}}, reco = document.getElementById('ia-reco'), hint = document.getElementById('ia-reco-hint');
    document.querySelectorAll('.ia-choice').forEach(function (b) {{
      b.addEventListener('click', function () {{
        var k = b.dataset.q;
        document.querySelectorAll('.ia-choice[data-q="' + k + '"]').forEach(function (o) {{
          o.setAttribute('aria-pressed', 'false');
        }});
        b.setAttribute('aria-pressed', 'true');
        sel[k] = b.dataset.val;
        recommend();
      }});
    }});
    function recommend() {{
      if (!sel.obj || !sel.prof || !sel.niv || !sel.prix) return;
      var wanted = sel.obj.split(' ');
      var scored = cards.map(function (c) {{
        var s = parseFloat(c.dataset.note) || 0;
        var cats = c.dataset.cat.split(' ');
        if (wanted.some(function (w) {{ return cats.indexOf(w) >= 0; }})) s += 5;
        if (cats[0] === wanted[0]) s += 3;  // l'outil dont c'est LE metier passe devant
        if (c.dataset.prof.indexOf(sel.prof) >= 0) s += 2;
        if (c.dataset.niv === sel.niv) s += 1.5;
        if (c.dataset.prix === sel.prix) s += 2;
        else if (sel.prix === 'Payant' && c.dataset.prix === 'Freemium') s += 1;
        else if (sel.prix === 'Freemium' && c.dataset.prix === 'Gratuit') s += 1.5;
        else if (sel.prix === 'Gratuit' && c.dataset.prix === 'Freemium') s += 1;  // offre gratuite limitee
        return {{ c: c, s: s }};
      }}).sort(function (a, b) {{ return b.s - a.s; }}).slice(0, 5);
      hint.textContent = 'Vos 5 recommandations, classées. Cliquez pour voir la fiche complète.';
      reco.innerHTML = scored.map(function (o, i) {{
        var t = o.c.querySelector('strong').textContent,
            cat = o.c.querySelector('small').textContent,
            use = o.c.querySelector('p').textContent,
            col = o.c.style.getPropertyValue('--tool');
        return '<a href="' + o.c.querySelector('a').getAttribute('href') + '" style="--tool:' + col + '">' +
          '<div class="ia-logo">' + (i + 1) + '</div><div><b>' + t + '</b><small>' + cat + ' · ' + use + '</small></div></a>';
      }}).join('');
    }}
  }})();
  </script>
"""
    return head_html(title, desc, canonical, ld,
                     keywords="meilleures IA, quelle IA utiliser, comparatif outils IA, annuaire intelligence artificielle, IA entreprise, IA gratuite, IA française RGPD",
                     og_image="/images/og/annuaire.png",
                     og_alt=f"Annuaire IA-Entrepreneur : {len(TOOLS)} outils d'IA comparés par usage") + body + FOOTER_HTML

# ─────────────────────────────────────────────────────────────────────────────
#  Pages par usage
# ─────────────────────────────────────────────────────────────────────────────
def build_category(c):
    tools = sorted([t for t in TOOLS if c['slug'] in all_cats(t)],
                   key=lambda t: (-t['note'], t['name'].lower()))
    cards = '\n'.join(card_html(t) for t in tools)
    top = tools[0] if tools else None
    autres = '\n'.join(
        f"""          <a class="ia-chip" href="{cat_url(o)}">{o['emoji']} {e(o['court'])}</a>"""
        for o in CATS if o['slug'] != c['slug'])

    gratuits = [t for t in tools if t['prix'] in ('Gratuit', 'Freemium')]
    fr = [t for t in tools if souverainete(t)[0]]
    faq = [
        (c['question'],
         f"Pour cet usage, notre recommandation par défaut est <a href='{tool_url(top)}'>{e(top['name'])}</a> : {e(top['resume'][0].lower() + top['resume'][1:])} "
         f"Les {len(tools)} outils de cette page couvrent le même besoin avec des niveaux d'exigence et des budgets différents." if top else ""),
        (f"Existe-t-il une solution gratuite pour {c['court'].lower()} ?",
         ("Oui : " + ', '.join(f"<a href='{tool_url(t)}'>{e(t['name'])}</a>" for t in gratuits[:5]) +
          " proposent une version gratuite ou freemium utilisable en entreprise. Vérifiez surtout les limites de la version gratuite en usage réel : c'est souvent le volume, pas la fonctionnalité, qui finit par imposer le passage au payant.")
         if gratuits else "Les solutions de cette catégorie sont principalement payantes : le besoin est trop spécifique pour être couvert par une offre gratuite viable."),
        ("Ces outils sont-ils compatibles avec le RGPD ?",
         ("Certains le sont nettement plus que d'autres. Dans cette catégorie, " +
          ', '.join(f"<a href='{tool_url(t)}'>{e(t['name'])}</a>" for t in fr[:5]) +
          " s'appuient sur un éditeur européen ou sur une solution auto-hébergeable, ce qui simplifie considérablement la justification auprès d'un DPO. Chaque fiche indique le pays de l'éditeur et le point de vigilance à documenter."
          if fr else "Aucun éditeur européen ne s'impose ici : si vous traitez des données personnelles avec ces outils, vérifiez l'offre entreprise (non-entraînement sur vos données) et documentez le transfert hors UE dans votre registre.")),
        ("Faut-il former les équipes à ces outils ?",
         "Un abonnement ne produit aucun gain de temps tant que personne ne sait s'en servir — c'est la cause la plus fréquente d'un déploiement IA qui ne donne rien. L'article 4 de l'AI Act impose d'ailleurs, depuis le 2 février 2025, un niveau suffisant de maîtrise de l'IA chez les personnes qui l'utilisent. <a href='/formations-entreprises.html'>Nos formations</a> sont construites sur les outils que vous utilisez réellement et donnent lieu à une attestation mentionnant les volets AI Act, RGPD et gouvernance des données."),
    ]

    title = titre_seo([
        f"Meilleures IA pour {c['court'].lower()} : {len(tools)} outils comparés ({ANNEE})",
        f"Meilleures IA pour {c['court'].lower()} : {len(tools)} outils ({ANNEE})",
        f"Meilleures IA {c['court'].lower()} ({ANNEE})",
    ])
    desc = description_seo(
        f"{c['question']} {len(tools)} outils comparés",
        ": temps gagné, limites, prix et pays d'hébergement des données.")
    canonical = f"{SITE}{cat_url(c)}"
    ld = [
        crumb_ld([("Accueil", "/"), ("Les meilleures IA", "/meilleures-ia.html"), (c['nom'], cat_url(c))]),
        {"@context": "https://schema.org", "@type": "ItemList", "name": title,
         "description": desc, "numberOfItems": len(tools),
         "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": t['name'],
                              "url": SITE + tool_url(t)} for i, t in enumerate(tools)]},
        faq_ld(faq),
        {"@context": "https://schema.org", "@type": "CollectionPage",
         "name": title, "description": desc, "url": canonical,
         "inLanguage": "fr-FR", "dateModified": TODAY, "publisher": EDITEUR_LD,
         "about": {"@type": "Thing", "name": c['nom']}},
    ]
    body = f"""
  <div class="container">
    <p class="ia-crumb"><a href="/">Accueil</a> › <a href="/meilleures-ia.html">Les meilleures IA</a> › {e(c['nom'])}</p>
  </div>

  <section class="ia-section" style="padding-top:18px;">
    <div class="container">
      <div class="ia-badge">{c['emoji']} {e(c['nom'])} · {len(tools)} outils</div>
      <h1 style="font-size:clamp(1.7rem,3.6vw,2.5rem);line-height:1.18;letter-spacing:-0.02em;margin-bottom:16px;">Les meilleures IA pour {e(c['court'].lower())} en {ANNEE}</h1>
      <p class="intro" style="font-size:1rem;">{e(c['intro'])}</p>
      <div class="ia-note"><b>Notre conseil avant de choisir</b>{e(c['conseil'])}</div>
      <div class="ia-grid">
{cards}
      </div>
      <p class="ia-maj">Classement par note IA-Entrepreneur (prise en main, utilité pour une TPE-PME, rapport qualité/prix, maturité). Tarifs indicatifs constatés en {datetime.date.today().strftime('%m/%Y')}. Aucun lien rémunéré.</p>
    </div>
  </section>

  <section class="ia-section" style="background:var(--bg2);">
    <div class="container">
      <h2>Questions fréquentes</h2>
{faq_html(faq)}
    </div>
  </section>

  <section class="ia-section">
    <div class="container">
      <h2>Les autres usages de l'IA en entreprise</h2>
      <p class="intro">Un besoin différent ? Les {len(CATS)} usages de l'annuaire :</p>
      <div class="ia-chips">
{autres}
      </div>
      <div class="ia-prev-next">
        <a class="btn btn-outline" href="/meilleures-ia.html">← Voir les {len(TOOLS)} outils de l'annuaire</a>
      </div>
    </div>
  </section>

{CTA}
"""
    return head_html(title, desc, canonical, ld,
                     keywords=f"{c['court'].lower()} IA, {c['question'].lower()}, meilleures IA {c['court'].lower()}, outils IA entreprise",
                     og_image=f"/images/og/cat-{c['slug']}.png",
                     og_alt=f"Les meilleures IA pour {c['court'].lower()} : {len(tools)} outils comparés") + body + FOOTER_HTML


# ─────────────────────────────────────────────────────────────────────────────
#  Fiches outils
# ─────────────────────────────────────────────────────────────────────────────
def build_tool(t):
    c = CAT_BY[t['cat']]
    badge, cls = souverainete(t)
    alts = [TOOL_BY[a] for a in t['alternatives'] if a in TOOL_BY]
    meme_cat = [o for o in TOOLS if o['cat'] == t['cat'] and o['slug'] != t['slug']][:6]

    forces = '\n'.join(f'        <li>{e(f)}</li>' for f in t['forces'])
    limites = '\n'.join(f'        <li>{e(l)}</li>' for l in t['limites'])
    cas = '\n'.join(f'        <li>{e(x)}</li>' for x in t['cas'])
    alts_html = ' '.join(f'<a href="{tool_url(a)}">{e(a["name"])}</a>' for a in alts) or '—'
    cats_html = ' '.join(
        f'<a class="ia-chip" href="{cat_url(CAT_BY[x])}">{CAT_BY[x]["emoji"]} {e(CAT_BY[x]["court"])}</a>'
        for x in all_cats(t))
    autres_html = '\n'.join(card_html(o) for o in meme_cat)

    faq = [
        (f"{t['name']} est-il gratuit ?",
         f"{e(t['prixDetail'])}. Les tarifs évoluent vite sur ce marché : vérifiez-les sur le site de l'éditeur avant de vous engager."),
        (f"Peut-on utiliser {t['name']} avec des données d'entreprise ?",
         e(t.get('conformite') or f"L'éditeur est basé en {t['pays']}. Vérifiez dans votre contrat si vos contenus sont utilisés pour entraîner les modèles, et documentez ce traitement dans votre registre RGPD.")),
        (f"Quelles sont les alternatives à {t['name']} ?",
         (("Les alternatives les plus pertinentes sont " +
           ', '.join(f"<a href='{tool_url(a)}'>{e(a['name'])}</a>" for a in alts) +
           f". Elles répondent au même besoin — {e(c['desc'].lower())} — avec des compromis différents sur le prix, le niveau requis et l'hébergement des données.")
          if alts else f"Voir les autres outils de la catégorie <a href='{cat_url(c)}'>{e(c['nom'])}</a>.")),
        (f"Combien de temps faut-il pour être opérationnel sur {t['name']} ?",
         {"Débutant": "Quelques heures suffisent pour un usage courant : l'outil est conçu pour être pris en main sans compétence technique. Le vrai sujet n'est pas l'outil mais la méthode — savoir quoi lui demander, et sur quels processus l'utiliser.",
          "Intermédiaire": "Comptez une à deux journées pour être autonome, et davantage pour concevoir des usages solides. C'est le type d'outil où une formation courte fait gagner plusieurs semaines de tâtonnement.",
          "Expert": "C'est un outil technique : prévoyez un accompagnement ou une compétence interne. Une mauvaise mise en place coûte plus cher que le temps qu'elle devait faire gagner."}[t['niveau']] +
         " <a href='/formations-entreprises.html'>Nos formations IA</a> sont construites sur les outils que vous utilisez déjà."),
    ]

    title = titre_seo([
        f"{t['name']} : avis, prix et cas d'usage en entreprise ({ANNEE})",
        f"{t['name']} : avis, prix et cas d'usage ({ANNEE})",
        f"{t['name']} : avis, prix et usages ({ANNEE})",
        f"{t['name']} : avis et prix ({ANNEE})",
    ])
    desc = description_seo(t['resume'], "Prix, limites, données et alternatives.")
    canonical = f"{SITE}{tool_url(t)}"
    ld = [
        crumb_ld([("Accueil", "/"), ("Les meilleures IA", "/meilleures-ia.html"),
                  (c['nom'], cat_url(c)), (t['name'], tool_url(t))]),
        {"@context": "https://schema.org", "@type": "Review",
         "itemReviewed": {"@type": "SoftwareApplication", "name": t['name'],
                          "applicationCategory": "BusinessApplication", "url": t['url'],
                          "operatingSystem": "Web",
                          "offers": {"@type": "Offer", "category": t['prix']}},
         "reviewRating": {"@type": "Rating", "ratingValue": t['note'], "bestRating": 5, "worstRating": 1},
         "name": title, "reviewBody": t['resume'],
         "author": {"@type": "Organization", "name": "IA-Entrepreneur", "url": SITE},
         "publisher": EDITEUR_LD,
         "inLanguage": "fr-FR",
         "datePublished": TODAY},
        faq_ld(faq),
        {"@context": "https://schema.org", "@type": "WebPage",
         "name": title, "description": desc, "url": canonical,
         "inLanguage": "fr-FR", "dateModified": TODAY, "publisher": EDITEUR_LD,
         "primaryImageOfPage": {"@type": "ImageObject",
                                "url": f"{SITE}/images/og/{t['slug']}.png",
                                "width": 1200, "height": 630}},
    ]

    conformite_html = f"""      <h2>Où vont vos données</h2>
      <div class="ia-note{' warn' if t['pays'] in ('Chine', 'Chine / Singapour', 'Singapour') else ''}"><b>Éditeur basé en {e(t['pays'])}</b>{e(t['conformite'])}</div>
""" if t.get('conformite') else ''

    body = f"""
  <div class="container">
    <p class="ia-crumb"><a href="/">Accueil</a> › <a href="/meilleures-ia.html">Les meilleures IA</a> › <a href="{cat_url(c)}">{e(c['nom'])}</a> › {e(t['name'])}</p>
    <div class="ia-tool-head">
      <div class="ia-logo" style="--tool:{c['couleur']}" aria-hidden="true">{monogram(t['name'])}</div>
      <div>
        <h1>{e(t['name'])} : avis, prix et cas d'usage en entreprise</h1>
        <p class="sub">{c['emoji']} {e(c['nom'])} · Édité par {e(t['editeur'])} ({e(t['pays'])}) · Mis à jour le {datetime.date.today().strftime('%d/%m/%Y')}</p>
      </div>
    </div>
    <div class="ia-chips" style="margin-top:0;">{cats_html}</div>

    <div class="ia-layout">
      <div class="ia-body">
        <h2>À quoi sert {e(t['name'])} ?</h2>
        <p>{e(t['resume'])}</p>

        <h2>Points forts</h2>
        <ul class="plus">
{forces}
        </ul>

        <h2>Limites à connaître</h2>
        <ul class="moins">
{limites}
        </ul>

        <h2>Ce que ça fait gagner</h2>
        <div class="ia-note"><b>Temps gagné</b>{e(t['gain'])}</div>

{conformite_html}
        <h2>Cas d'usage en entreprise</h2>
        <ul class="cas">
{cas}
        </ul>

        <h2>Alternatives à {e(t['name'])}</h2>
        <div class="ia-alts">{alts_html}</div>

        <h2>Questions fréquentes sur {e(t['name'])}</h2>
{faq_html(faq)}
      </div>

      <aside class="ia-aside">
        <div class="ia-box">
          <h3>La fiche en bref</h3>
          <div class="ia-kv"><span>Note</span><b>★ {t['note']}/5</b></div>
          <div class="ia-kv"><span>Usage principal</span><b>{e(c['court'])}</b></div>
          <div class="ia-kv"><span>Niveau requis</span><b>{e(t['niveau'])}</b></div>
          <div class="ia-kv"><span>Modèle tarifaire</span><b>{e(t['prix'])}</b></div>
          <div class="ia-kv"><span>Éditeur</span><b>{e(t['editeur'])}</b></div>
          <div class="ia-kv"><span>Pays</span><b>{e(t['pays'])}{(' ' + badge.split(' ')[0]) if badge else ''}</b></div>
          <div class="ia-kv"><span>Tarifs</span><b style="font-weight:600;font-size:0.8rem;">{e(t['prixDetail'])}</b></div>
          <div class="ia-kv"><span>Profils concernés</span><b style="font-weight:600;font-size:0.8rem;">{e(', '.join(t['profils']))}</b></div>
          <a class="btn btn-outline" style="margin-top:14px;" href="{e(t['url'])}" target="_blank" rel="noopener">Site officiel ↗</a>
          <p style="font-size:0.72rem;color:var(--muted);margin-top:8px;text-align:center;">Lien direct vers l'éditeur, sans affiliation ni parrainage.</p>
          <button class="ia-fav ia-fav-long" type="button" data-fav="{t['slug']}" aria-pressed="false" style="margin-top:8px;">☆ Ajouter à mes favoris</button>
          <button class="btn btn-outline" type="button" data-partager style="margin-top:8px;width:100%;justify-content:center;">Partager cette fiche</button>
        </div>
        <div class="ia-box" style="background:var(--bg2);">
          <h3>Vous hésitez ?</h3>
          <p style="font-size:0.86rem;color:var(--muted);line-height:1.6;margin-bottom:14px;">Un outil mal choisi coûte plus cher que pas d'outil du tout. 15 minutes au téléphone pour cadrer le besoin avant de vous engager.</p>
          <a class="btn btn-accent" href="{CAL}" target="_blank" rel="noopener noreferrer">Appel gratuit de 15 min</a>
        </div>
      </aside>
    </div>
  </div>

  <section class="ia-section" style="background:var(--bg2);">
    <div class="container">
      <h2>Les autres outils de la catégorie {e(c['nom'])}</h2>
      <p class="intro">{e(c['desc'])}</p>
      <div class="ia-grid">
{autres_html}
      </div>
      <div class="ia-prev-next">
        <a class="btn btn-outline" href="{cat_url(c)}">Voir la catégorie complète</a>
        <a class="btn btn-outline" href="/meilleures-ia.html">← Les {len(TOOLS)} outils de l'annuaire</a>
      </div>
    </div>
  </section>

{CTA}
"""
    return head_html(title, desc, canonical, ld,
                     keywords=f"{t['name']}, {t['name']} avis, {t['name']} prix, {t['name']} entreprise, alternative {t['name']}",
                     og_type='article',
                     og_image=f"/images/og/{t['slug']}.png",
                     og_alt=f"{t['name']} — {c['nom']} · fiche IA-Entrepreneur") + body + FOOTER_HTML


# ─────────────────────────────────────────────────────────────────────────────
#  Sitemap
# ─────────────────────────────────────────────────────────────────────────────
def update_sitemap(urls):
    path = os.path.join(ROOT, 'sitemap.xml')
    xml = open(path, encoding='utf-8').read()
    # on retire les entrées de l'annuaire déjà présentes, puis on les réinsère
    xml = re.sub(r'\s*<url>\s*<loc>[^<]*/(meilleures-ia\.html|ia/[^<]*)</loc>.*?</url>', '', xml, flags=re.S)
    bloc = ''.join(
        f"\n  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for u, cf, pr in urls)
    xml = xml.replace('</urlset>', bloc + '\n\n</urlset>')
    open(path, 'w', encoding='utf-8').write(xml)
    return len(urls)


def main():
    os.makedirs(os.path.join(ROOT, 'ia'), exist_ok=True)

    # Feuille de style commune à l'annuaire : reprend les règles d'entête, de
    # pied de page et de boutons du site, puis les styles propres aux pages IA.
    # Chargée avant mobile.css, qui garde donc la priorité sur le responsive.
    open(os.path.join(ROOT, 'ia-annuaire.css'), 'w', encoding='utf-8').write(
        "/* ia-annuaire.css — genere par generate_ia_pages.py, ne pas editer a la main */\n"
        + BASE_CSS + IA_CSS)
    print('✓ ia-annuaire.css')
    open(os.path.join(ROOT, 'ia-annuaire.js'), 'w', encoding='utf-8').write(ANNUAIRE_JS)
    print('✓ ia-annuaire.js')
    urls = [(f"{SITE}/meilleures-ia.html", 'weekly', '0.9')]

    open(os.path.join(ROOT, 'meilleures-ia.html'), 'w', encoding='utf-8').write(build_hub())
    print('✓ meilleures-ia.html')

    for c in CATS:
        open(os.path.join(ROOT, 'ia', f"meilleures-ia-{c['slug']}.html"), 'w', encoding='utf-8').write(build_category(c))
        urls.append((SITE + cat_url(c), 'monthly', '0.8'))
    print(f'✓ {len(CATS)} pages par usage')

    for t in TOOLS:
        open(os.path.join(ROOT, 'ia', f"{t['slug']}.html"), 'w', encoding='utf-8').write(build_tool(t))
        urls.append((SITE + tool_url(t), 'monthly', '0.6'))
    print(f'✓ {len(TOOLS)} fiches outils')

    print(f'✓ sitemap.xml : {update_sitemap(urls)} URL')


if __name__ == '__main__':
    main()
