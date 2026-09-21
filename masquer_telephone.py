#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
masquer_telephone.py — Remplace partout le numéro affiché en clair par un
bouton « Afficher le numéro ».

Décision de Gabriel (21/09/2026) : le 06 apparaissait en clair sur les 310
pages (barre du haut, menu mobile, pied de page, mentions légales). Un
aspirateur d'adresses n'a qu'à lire le HTML pour le récupérer — d'où le
démarchage. Le numéro est désormais encodé (base64 de la chaîne inversée)
dans un attribut data-tel et n'est reconstruit qu'au clic, par tel-reveal.js.
Plus aucun chiffre ni href="tel:" dans le source des pages.

Le script est idempotent : il ne retouche que les liens tel: encore en clair
et n'ajoute la balise <script> que si elle manque.

Usage : python3 masquer_telephone.py [--dry-run]
"""

import base64, glob, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
NUMERO = '06 14 98 07 13'
DATA_TEL = base64.b64encode(NUMERO[::-1].encode()).decode()
LIBELLE = 'Afficher le numéro'
SCRIPT = '<script defer src="/tel-reveal.js"></script>'

LIEN_TEL = re.compile(r'<a\b([^>]*\bhref="tel:[^"]*"[^>]*)>(.*?)</a>', re.S)
HREF = re.compile(r'\s*href="tel:[^"]*"')
CLASSE = re.compile(r'\bclass="([^"]*)"')
SVG = re.compile(r'<svg\b.*?</svg>', re.S)


def bouton(attrs, inner):
    """Reconstruit le lien en bouton révélateur, en gardant son habillage."""
    attrs = HREF.sub('', attrs).strip()

    # L'icône (svg de la barre du haut ou emoji ☎) reste visible, seul le
    # numéro est caché.
    icone = ''
    svg = SVG.search(inner)
    if svg:
        icone = svg.group(0)
    elif '📞' in inner:
        icone = '📞 '

    if CLASSE.search(attrs):
        attrs = CLASSE.sub(lambda m: 'class="%s tel-reveal"' % m.group(1), attrs, count=1)
    else:
        attrs = ('class="tel-reveal" ' + attrs).strip()

    return ('<a %s role="button" tabindex="0" data-tel="%s" '
            'aria-label="Afficher le numéro de téléphone">%s<span class="tel-value">%s</span></a>'
            % (attrs, DATA_TEL, icone, LIBELLE))


def traiter(chemin, dry_run=False):
    html = open(chemin, encoding='utf-8').read()
    avant = html

    html = LIEN_TEL.sub(lambda m: bouton(m.group(1), m.group(2)), html)

    if 'tel-reveal' in html and SCRIPT not in html and '/tel-reveal.js' not in html:
        if '</body>' in html:
            html = html.replace('</body>', '  ' + SCRIPT + '\n</body>', 1)
        else:
            html += '\n' + SCRIPT + '\n'

    if html == avant:
        return False
    if not dry_run:
        open(chemin, 'w', encoding='utf-8').write(html)
    return True


def main():
    dry_run = '--dry-run' in sys.argv
    pages = []
    for motif in ('*.html', 'blog/*.html', 'ia/*.html'):
        pages += glob.glob(os.path.join(ROOT, motif))

    modifiees = [p for p in sorted(pages) if traiter(p, dry_run)]
    print('%d page(s) %s' % (len(modifiees), 'à modifier' if dry_run else 'modifiées'))
    for p in modifiees[:5]:
        print('  ' + os.path.relpath(p, ROOT))
    if len(modifiees) > 5:
        print('  … et %d autres' % (len(modifiees) - 5))


if __name__ == '__main__':
    main()
