#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preparer_logo_reference.py — Normalise un logo client pour la bande
« Ils nous font confiance » (images/references/).

Les logos arrivent dans des formats incomparables : 3508x2480 pour GRDF,
816x368 pour ACF, avec des marges blanches, des cadres gris, de la
transparence, et parfois un logotype pensé pour fond sombre. Ce script les
ramène tous à la même hauteur, sans marge, aplatis sur blanc.

Trois traitements, tous nécessaires au moins une fois sur les sept logos
d'origine :
  - Détourage itératif : un simple détourage sur la couleur du coin ne suffit
    pas quand le fichier a un cadre (Apec a un liseré gris autour d'un fond
    blanc). On recommence tant que la boîte se réduit.
  - Recoloration du blanc : TurboHero est blanc sur transparence, donc
    invisible sur la bande. Son blanc devient le bleu nuit du site, l'éclair
    jaune est conservé. À remplacer par la version officielle sur fond clair
    si la marque en fournit une.
  - Aplatissement sur blanc + palette 128 couleurs : la bande est sur fond
    blanc, et un PNG palettisé pèse ~6 Ko au lieu de plusieurs centaines.

Usage : python3 preparer_logo_reference.py <fichier-source> <slug> [--recolorer]
Exemple : python3 preparer_logo_reference.py ~/Downloads/logo.png acme
"""

import os, sys
from PIL import Image, ImageChops

HAUTEUR = 120                 # 2x d'un affichage à 60 px
NAVY = (10, 15, 44)           # --text du site
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'references')


def retirer_cadre(im, marge_max=0.03, tolerance=60):
    """Retire un liseré : Apec arrive avec un cadre gris de 1 à 2 px dont
    chaque côté a une teinte légèrement différente, ce qu'un détourage par
    différence avec le pixel de coin ne voit pas. On rogne, bord par bord,
    les lignes quasi uniformes (tolérance large : les quatre côtés d'Apec vont
    de 92 à 135 de gris), dans la limite de 3 % de la dimension."""
    px = im.convert('RGB')
    l, h = px.size
    g, d, ht, bs = 0, l, 0, h

    def uniforme(pixels):
        canaux = list(zip(*pixels))
        return all(max(c) - min(c) <= tolerance for c in canaux)

    while g < d - 1 and (g + 1) <= l * marge_max and uniforme([px.getpixel((g, y)) for y in range(ht, bs)]):
        g += 1
    while d > g + 1 and (l - d + 1) <= l * marge_max and uniforme([px.getpixel((d - 1, y)) for y in range(ht, bs)]):
        d -= 1
    while ht < bs - 1 and (ht + 1) <= h * marge_max and uniforme([px.getpixel((x, ht)) for x in range(g, d)]):
        ht += 1
    while bs > ht + 1 and (h - bs + 1) <= h * marge_max and uniforme([px.getpixel((x, bs - 1)) for x in range(g, d)]):
        bs -= 1
    return im.crop((g, ht, d, bs))


def detourer(im):
    im = retirer_cadre(im.convert('RGBA'))
    for _ in range(4):
        alpha = im.getchannel('A')
        if alpha.getextrema()[0] < 250:
            boite = alpha.getbbox()
        else:
            fond = Image.new('RGBA', im.size, im.getpixel((0, 0)))
            boite = ImageChops.difference(im, fond).convert('L') \
                              .point(lambda p: 255 if p > 12 else 0).getbbox()
        if not boite or boite == (0, 0, im.width, im.height):
            break
        im = im.crop(boite)
    return im


def recolorer_blanc(im, couleur=NAVY):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, v, b, a = px[x, y]
            if a > 8 and r > 180 and v > 180 and b > 180:
                px[x, y] = (*couleur, a)
    return im


def preparer(source, slug, recolorer=False):
    im = detourer(Image.open(source))
    if recolorer:
        im = recolorer_blanc(im)
    ratio = HAUTEUR / im.height
    im = im.resize((max(1, round(im.width * ratio)), HAUTEUR), Image.LANCZOS)
    fond = Image.new('RGBA', im.size, (255, 255, 255, 255))
    fond.alpha_composite(im)
    os.makedirs(SORTIE, exist_ok=True)
    chemin = os.path.join(SORTIE, f'{slug}.png')
    fond.convert('RGB').quantize(colors=128, method=Image.MEDIANCUT).save(chemin, optimize=True)
    print(f'{slug:26} {im.width:4}x{HAUTEUR}  {os.path.getsize(chemin)/1024:5.1f} Ko')
    return chemin


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        sys.exit(__doc__.strip().splitlines()[-2])
    preparer(args[0], args[1], recolorer='--recolorer' in sys.argv)
