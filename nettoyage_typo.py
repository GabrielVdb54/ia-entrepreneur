#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nettoyage_typo.py — retire du texte visible les signes qui font « texte généré par IA ».

Décision de Gabriel (04/11/2026) : plus aucun tiret cadratin ou demi-cadratin
employé comme ponctuation, plus de point médian comme séparateur, plus de
flèches dans les textes et les liens, plus d'emojis. On garde les signes qui
ont une fonction : les étoiles d'une note (★ ☆), les coches de liste (✓) et la
croix d'un bouton de fermeture (✕).

Utilisé par :
  - generate_ia_pages.py, sur chaque page de l'annuaire qu'il écrit ;
  - nettoyer_symboles.py, passage unique sur les pages et le blog.
Le générateur d'articles n8n applique la même règle (voir n8n_generer_html_article.js).

Ne touche ni au code (<script> sauf JSON-LD, <style> sauf les puces en CSS,
<pre>, <code>), ni aux URL, ni aux traits d'union.
"""
import json, re

# Les signes à retirer. Les étoiles, la coche et la croix restent.
_GARDES = '★☆✓✕'
EMOJI = re.compile(
    '(?:[\U0001F000-\U0001FAFF]|[☀-➿]|[⬀-⯿]|[←-⇿]|[⌀-⏿]|⤴|⤵|〰|〽)'
    '[️‍\U0001F3FB-\U0001F3FF]*'
)

ENTITES = {'&mdash;': '—', '&#8212;': '—', '&#x2014;': '—', '&ndash;': '–', '&#8211;': '–', '&#x2013;': '–',
           '&middot;': '·', '&#183;': '·', '&#xb7;': '·', '&rarr;': '→', '&#8594;': '→', '&larr;': '←', '&#8592;': '←',
           '&nearr;': '↗', '&#8599;': '↗'}


def _emoji(m):
    return m.group(0) if m.group(0)[0] in _GARDES else ''


def nettoie_texte(t, titre=False):
    """Nettoie un morceau de texte visible (nœud texte, attribut, chaîne JSON-LD)."""
    if not t or (not any(c in t for c in '—–·→←↗') and not any(e in t for e in ENTITES) and not EMOJI.search(t.replace('★', '').replace('☆', '').replace('✓', '').replace('✕', ''))):
        return t
    origine = t
    for a, b in ENTITES.items():
        t = t.replace(a, b)
    # plages de nombres : « 2–3 jours » devient « 2 à 3 jours »
    t = re.sub(r'(\d)\s?[–—]\s?(\d)', r'\1 à \2', t)
    # tirets employés comme ponctuation
    if titre:
        t = re.sub(r'\s+[—–]\s+', ' | ', t)
    t = re.sub(r'^[—–]\s*', '', t)                                    # « — Morgane » (attribution)
    t = re.sub(r'\s+[—–]\s*$', ',', t) if re.search(r'\w\s+[—–]\s*$', t) else re.sub(r'\s*[—–]\s*$', ' ', t)
    t = re.sub(r'\s+[—–]\s+(?=[a-zàâçéèêëîïôûùüÿœ«(])', ', ', t)      # incise ou suite de phrase
    t = re.sub(r'\s+[—–]\s+', ' : ', t)                               # avant une majuscule : explication
    t = re.sub(r'(\w)—(\w)', r'\1, \2', t)
    t = re.sub(r'(\w)–(\w)', r'\1-\2', t)
    t = t.replace('—', ',').replace('–', '-')
    # points médians : une simple virgule
    t = re.sub(r'\s*·\s*', ', ', t)
    # flèches : retirées en fin ou en début de texte, « puis » entre deux mots
    t = re.sub(r'\s*[→↗➜➔]+\s*$', '', t)
    t = re.sub(r'^\s*[←]+\s*', '', t)
    t = re.sub(r'(\w)\s*[→➜➔]\s*(\w)', r'\1 puis \2', t)
    t = re.sub(r'\s*[→←↗➜➔]\s*', ' ', t)
    # emojis (sauf les signes gardés)
    t = EMOJI.sub(_emoji, t)
    # ponctuation laissée en double
    t = re.sub(r',\s*,', ',', t)
    t = re.sub(r'\s+,', ',', t)
    t = re.sub(r'(^|\n)\s*,\s*', r'\1', t)
    t = re.sub(r',\s*([.;:!?)])', r'\1', t)
    # n'écraser les espaces que là où un signe a été retiré, pas dans l'indentation du code
    t = re.sub(r'(?<=\S)[ \t]{2,}(?=\S)', ' ', t) if t != origine else t
    return t


def _json(o):
    if isinstance(o, str):
        return nettoie_texte(o)
    if isinstance(o, list):
        return [_json(x) for x in o]
    if isinstance(o, dict):
        return {k: (v if k in ('@context', '@type', '@id', 'url', 'item', 'image', 'logo', 'sameAs', 'contentUrl', 'thumbnailUrl', 'embedUrl') else _json(v))
                for k, v in o.items()}
    return o


ATTRS = re.compile(r'(\s(?:alt|title|aria-label|placeholder|data-texte|content|label)=")([^"]*)(")')
SEUL = re.compile(r'<(span|div|i|b|strong|em|small|p)(\s[^>]*)?>\s*(?:' + EMOJI.pattern + r'|[→←↗])+\s*</\1>')
PUCE_CSS = re.compile(r"""content\s*:\s*(['"])(?:→|—|–|&rarr;|\\2192|\\2014)\1""")


def nettoie_html(html):
    """Nettoie une page entière : texte visible, attributs utiles, JSON-LD, puces CSS."""
    # éléments qui ne contenaient qu'un emoji ou une flèche : on les retire
    html = SEUL.sub(lambda m: '' if not any(c in m.group(0) for c in _GARDES) else m.group(0), html)
    morceaux = re.split(r'(<!--.*?-->|<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<pre\b.*?</pre>|<code\b.*?</code>|<[^>]+>)', html, flags=re.S | re.I)
    sortie, dans_titre = [], False
    for m in morceaux:
        if not m:
            continue
        bas = m[:12].lower()
        if bas.startswith('<script'):
            if 'ld+json' in m[:120]:
                tete, corps = m.split('>', 1)
                corps, fin = corps.rsplit('</script>', 1)
                try:
                    d = json.loads(corps)
                    d2 = _json(d)
                    if d2 != d:  # ne réécrire le bloc que s'il y avait quelque chose à corriger
                        corps = json.dumps(d2, ensure_ascii=False, separators=(',', ':'))
                except ValueError:
                    pass
                m = tete + '>' + corps + '</script>' + fin
            sortie.append(m); continue
        if bas.startswith('<style'):
            sortie.append(PUCE_CSS.sub("content:'•'", m)); continue
        if bas.startswith(('<!--', '<pre', '<code')):
            sortie.append(m); continue
        if m.startswith('<'):
            if bas.startswith('<title'):
                dans_titre = True
            elif bas.startswith('</title'):
                dans_titre = False
            est_titre = bool(re.search(r'(property|name)="(og:title|twitter:title)"', m))
            m = ATTRS.sub(lambda a: a.group(1) + nettoie_texte(a.group(2), titre=est_titre and a.group(1).strip().startswith('content')) + a.group(3), m)
            sortie.append(m); continue
        sortie.append(nettoie_texte(m, titre=dans_titre))
    return ''.join(sortie)


# Formulations de financement : aucune promesse de « zéro reste à charge »
# (décision de Gabriel, 04/11/2026). On dit ce qu'on fait : monter le dossier.
RESTE_A_CHARGE = [
    (r',?\s*pour viser (?:z[ée]ro|z&eacute;ro) reste (?:à|&agrave;) charge(?: pour l\'entreprise)?', ''),
    (r'[Oo]bjectif (?:z[ée]ro|z&eacute;ro) reste (?:à|&agrave;) charge', 'Dossier de financement monté par nos soins'),
    (r'(?:viser|vise) (?:le )?(?:z[ée]ro|z&eacute;ro) reste (?:à|&agrave;) charge', 'préparer la prise en charge par votre OPCO'),
    (r'(?:z[ée]ro|z&eacute;ro|sans) reste (?:à|&agrave;) charge', 'prise en charge par votre OPCO'),
]


def reformule_financement(t):
    for a, b in RESTE_A_CHARGE:
        t = re.sub(a, b, t)
    return t
