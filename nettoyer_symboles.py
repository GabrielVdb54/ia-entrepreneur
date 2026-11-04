#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nettoyer_symboles.py — passage unique (idempotent) sur les pages racine, le blog et le quiz :
retire tirets, points médians, flèches et emojis du texte visible (voir nettoyage_typo.py)
et reformule les promesses de « zéro reste à charge » (décision du 04/11/2026).
Les pages de l'annuaire (ia/, meilleures-ia.html) sont nettoyées par generate_ia_pages.py.

Usage : python3 nettoyer_symboles.py
"""
import glob, os
from nettoyage_typo import nettoie_html, reformule_financement

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
fichiers = [f for f in glob.glob('*.html') + glob.glob('blog/*.html') + glob.glob('quiz/*.html')
            if f != 'meilleures-ia.html']
modifies = 0
for f in sorted(fichiers):
    src = open(f, encoding='utf-8').read()
    out = nettoie_html(reformule_financement(src))
    if out != src:
        open(f, 'w', encoding='utf-8').write(out)
        modifies += 1
print(f'{modifies} pages modifiées sur {len(fichiers)}')
