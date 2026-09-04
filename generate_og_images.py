#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_og_images.py — Génère les images de partage (Open Graph) de l'annuaire.

Une image 1200×630 par page : le hub, chaque page par usage, chaque fiche outil.
Sans navigateur ni service externe — uniquement Pillow et les polices système.
Les images sortent dans `images/og/` et sont référencées par generate_ia_pages.py.

Usage : python3 generate_og_images.py   (puis python3 generate_ia_pages.py)
"""

import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ROOT, 'images', 'og')
L, H = 1200, 630

BLANC, TEXTE, MUET = '#FFFFFF', '#0A0F2C', '#525880'
FOND, BORD, PRIMAIRE, ACCENT = '#F5F7FF', '#E3E8F5', '#1A3CFF', '#10B981'

# Polices système : Helvetica Neue d'abord (proche de Plus Jakarta Sans utilisée
# sur le site), Arial en repli, police par défaut de Pillow en dernier recours.
CANDIDATS = [
    ('/System/Library/Fonts/HelveticaNeue.ttc', {'gras': 1, 'demi': 10, 'normal': 0}),
    ('/System/Library/Fonts/Supplemental/Arial.ttf', None),
]

def police(taille, graisse='normal'):
    for chemin, index in CANDIDATS:
        if not os.path.exists(chemin):
            continue
        try:
            if index:
                return ImageFont.truetype(chemin, taille, index=index[graisse])
            gras = chemin.replace('Arial.ttf', 'Arial Bold.ttf')
            return ImageFont.truetype(gras if graisse != 'normal' and os.path.exists(gras) else chemin, taille)
        except Exception:
            continue
    return ImageFont.load_default()


def largeur(d, texte, f):
    return d.textbbox((0, 0), texte, font=f)[2]


def lignes(d, texte, f, maxi, limite=2):
    """Découpe un texte en lignes qui tiennent dans `maxi` pixels."""
    mots, out, courant = texte.split(), [], ''
    for mot in mots:
        essai = (courant + ' ' + mot).strip()
        if largeur(d, essai, f) <= maxi or not courant:
            courant = essai
        else:
            out.append(courant)
            courant = mot
            if len(out) == limite:
                break
    if courant and len(out) < limite:
        out.append(courant)
    if len(out) == limite and len(' '.join(out)) < len(texte):
        while out[-1] and largeur(d, out[-1] + '…', f) > maxi:
            out[-1] = out[-1].rsplit(' ', 1)[0]
        out[-1] += '…'
    return out


def pastille(d, x, y, texte, f, fond, couleur, bordure=None):
    p, h = 18, 44
    w = largeur(d, texte, f) + p * 2
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fond,
                        outline=bordure, width=2 if bordure else 0)
    d.text((x + p, y + h // 2), texte, font=f, fill=couleur, anchor='lm')
    return x + w + 10


def carte(chemin, titre, sous_titre, monogramme, couleur, pastilles):
    img = Image.new('RGB', (L, H), BLANC)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 18, H], fill=couleur)                 # filet de couleur
    d.rectangle([0, H - 96, L, H], fill=FOND)                # bandeau de pied
    d.line([(0, H - 96), (L, H - 96)], fill=BORD, width=2)

    d.rounded_rectangle([76, 74, 208, 206], radius=30, fill=couleur)
    d.text((142, 140), monogramme, font=police(52, 'gras'), fill=BLANC, anchor='mm')

    f_titre = police(66, 'gras')
    y = 250
    for ligne in lignes(d, titre, f_titre, L - 152, 2):
        d.text((76, y), ligne, font=f_titre, fill=TEXTE)
        y += 80

    d.text((76, y + 6), sous_titre, font=police(30, 'normal'), fill=MUET)

    x, f_p = 76, police(24, 'demi')
    for texte, style in pastilles:
        if style == 'accent':
            x = pastille(d, x, H - 210, texte, f_p, '#E8F7F1', '#047857')
        elif style == 'primaire':
            x = pastille(d, x, H - 210, texte, f_p, '#E9EDFF', PRIMAIRE)
        else:
            x = pastille(d, x, H - 210, texte, f_p, BLANC, MUET, BORD)

    f_marque = police(28, 'gras')
    d.text((76, H - 48), 'IA-Entrepreneur', font=f_marque, fill=TEXTE, anchor='lm')
    d.text((76 + largeur(d, 'IA-Entrepreneur', f_marque) + 14, H - 47),
           '· Organisme de formation certifié Qualiopi',
           font=police(24, 'normal'), fill=MUET, anchor='lm')
    d.text((L - 76, H - 47), 'ia-entrepreneur.fr', font=police(24, 'demi'), fill=PRIMAIRE, anchor='rm')

    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    img.save(chemin, 'PNG', optimize=True)


def monogramme(nom):
    lettres = ''.join(c for c in nom if c.isalnum())
    return (lettres[:2] or '?').upper()


def main():
    cats = json.load(open(os.path.join(ROOT, 'data', 'ia-categories.json'), encoding='utf-8'))
    outils = json.load(open(os.path.join(ROOT, 'data', 'ia-tools.json'), encoding='utf-8'))
    par_slug = {c['slug']: c for c in cats}

    def dans(slug_cat, t):
        return slug_cat == t['cat'] or slug_cat in t.get('cats', [])

    europe = sum(1 for t in outils if t['pays'].startswith('France') or 'open source' in t['pays'].lower()
                 or t['pays'] in ('Allemagne', 'Belgique', 'Espagne', 'Suède', 'Pays-Bas', 'Estonie',
                                  'Pologne', 'Royaume-Uni', 'Portugal / Allemagne',
                                  'Tchéquie / États-Unis', 'États-Unis / Pologne', 'États-Unis / France'))
    gratuits = sum(1 for t in outils if t['prix'] in ('Gratuit', 'Freemium'))

    carte(os.path.join(SORTIE, 'annuaire.png'),
          'Les meilleures IA du moment',
          f"{len(outils)} outils comparés par usage, prix et hébergement des données",
          'IA', PRIMAIRE,
          [(f'{len(cats)} usages', 'primaire'), (f'{europe} éditeurs européens', 'accent'),
           (f'{gratuits} gratuits ou freemium', 'neutre')])

    for c in cats:
        n = sum(1 for t in outils if dans(c['slug'], t))
        carte(os.path.join(SORTIE, f"cat-{c['slug']}.png"),
              f"Meilleures IA pour {c['court'].lower()}",
              c['desc'], monogramme(c['court']), c['couleur'],
              [(f'{n} outils comparés', 'primaire'), ('Comparatif indépendant', 'neutre')])

    for t in outils:
        c = par_slug[t['cat']]
        fr = t['pays'].startswith('France')
        carte(os.path.join(SORTIE, f"{t['slug']}.png"),
              t['name'], c['nom'], monogramme(t['name']), c['couleur'],
              [(f"Note {str(t['note']).replace('.', ',')}/5", 'primaire'),
               (t['prix'], 'neutre'), (t['niveau'], 'neutre')] +
              ([('Éditeur français', 'accent')] if fr else []))

    total = len(cats) + len(outils) + 1
    poids = sum(os.path.getsize(os.path.join(SORTIE, f)) for f in os.listdir(SORTIE))
    print(f'✓ {total} images Open Graph générées dans images/og/ ({poids // 1024} Ko)')


if __name__ == '__main__':
    main()
