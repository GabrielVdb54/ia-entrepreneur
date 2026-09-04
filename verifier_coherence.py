#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verifier_coherence.py — Contrôle de cohérence de l'annuaire des IA.

Le sélecteur ne vaut que ce que valent les données qui l'alimentent :
recommander n8n à un dirigeant débutant n'est pas un bug d'algorithme, c'est
une fiche mal classée. Ce script vérifie les règles ci-dessous sur les 129
fiches et sort en erreur si l'une d'elles est violée.

CRITÈRES DE NIVEAU (à respecter en écrivant une fiche)
  Débutant       on s'en sert le jour même, sans paramétrage ni vocabulaire
                 technique
  Intermédiaire  il faut comprendre une logique (scénarios, champs, filtres),
                 paramétrer, ou compter quelques jours de prise en main
  Expert         compétence technique requise : code, auto-hébergement,
                 administration système

Usage : python3 verifier_coherence.py   (sortie 1 si une règle est violée)
"""

import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
NIVEAUX = ['Débutant', 'Intermédiaire', 'Expert']
PRIX = ['Gratuit', 'Freemium', 'Payant']
PROFILS = ['Dirigeant', 'Commercial', 'Marketing', 'Ops', 'RH', 'Formateur', 'Développeur']
TECHNIQUES = {'Développeur', 'Ops'}

MOTS_TECHNIQUES = re.compile(
    r"(auto-héberg|autohéberg|serveur|ligne de code|écrire du code|savoir lire du code|"
    r"python|administration technique|compétences techniques|installation et maintenance)", re.I)


def controler():
    outils = json.load(open(os.path.join(ROOT, 'data', 'ia-tools.json'), encoding='utf-8'))
    cats = json.load(open(os.path.join(ROOT, 'data', 'ia-categories.json'), encoding='utf-8'))
    slugs = {t['slug'] for t in outils}
    cat_slugs = {c['slug'] for c in cats}
    par_slug = {t['slug']: t for t in outils}
    fautes = []

    def faute(t, regle, detail):
        fautes.append(f"{t['name']:24} [{regle}] {detail}")

    for t in outils:
        champs = ['slug', 'name', 'url', 'cat', 'editeur', 'pays', 'prix', 'prixDetail',
                  'niveau', 'profils', 'tags', 'note', 'resume', 'forces', 'limites',
                  'gain', 'alternatives', 'cas']
        for c in champs:
            if not t.get(c):
                faute(t, 'champ vide', c)

        # R1 — vocabulaire contrôlé
        if t['niveau'] not in NIVEAUX:
            faute(t, 'R1', f"niveau inconnu : {t['niveau']}")
        if t['prix'] not in PRIX:
            faute(t, 'R1', f"tarif inconnu : {t['prix']}")
        for p in t['profils']:
            if p not in PROFILS:
                faute(t, 'R1', f"profil inconnu : {p}")
        if t['cat'] not in cat_slugs or any(c not in cat_slugs for c in t.get('cats', [])):
            faute(t, 'R1', 'catégorie inconnue')

        # R2 — un outil Expert ne s'adresse pas à un dirigeant ni à un profil non technique
        if t['niveau'] == 'Expert':
            hors = [p for p in t['profils'] if p not in TECHNIQUES | {'Marketing', 'Formateur', 'Commercial'}]
            if 'Dirigeant' in t['profils']:
                faute(t, 'R2', 'Expert proposé à un Dirigeant')
            elif hors:
                faute(t, 'R2', f"Expert proposé à {', '.join(hors)}")

        # R3 — un outil pour développeurs n'est pas un outil de premier jour
        if 'Développeur' in t['profils'] and t['niveau'] == 'Débutant':
            faute(t, 'R3', 'destiné aux développeurs mais classé Débutant')

        # R4 — le texte ne doit pas contredire le niveau annoncé
        texte = ' '.join(t['forces'] + t['limites'] + [t['resume']])
        if t['niveau'] == 'Débutant' and MOTS_TECHNIQUES.search(texte):
            faute(t, 'R4', f"classé Débutant mais le texte parle de « {MOTS_TECHNIQUES.search(texte).group(0)} »")

        # R5 — la bande tarifaire doit correspondre au détail affiché
        det = t['prixDetail'].lower()
        gratuit_annonce = bool(re.search(r'(gratuit|freemium|open source|sans abonnement)', det))
        if t['prix'] in ('Gratuit', 'Freemium') and not gratuit_annonce:
            faute(t, 'R5', f"annoncé {t['prix']} mais le détail ne mentionne aucune gratuité")
        if t['prix'] == 'Payant' and re.search(r'^(gratuit|version gratuite)', det):
            faute(t, 'R5', 'annoncé Payant alors que le détail commence par la gratuité')

        # R6 — les alternatives doivent exister et partager un usage
        mes_cats = {t['cat']} | set(t.get('cats', []))
        for a in t['alternatives']:
            if a not in slugs:
                faute(t, 'R6', f'alternative inconnue : {a}')
            elif not (mes_cats & ({par_slug[a]['cat']} | set(par_slug[a].get('cats', [])))):
                faute(t, 'R6', f"alternative sans usage commun : {par_slug[a]['name']}")

        # R7 — la note doit rester dans la plage annoncée sur la page
        if not (3.0 <= t['note'] <= 5.0):
            faute(t, 'R7', f"note hors plage : {t['note']}")

    # R8 — couverture : chaque usage doit proposer au moins un outil abordable
    #      à un débutant, sinon le sélecteur ne peut rien répondre.
    for c in cats:
        dedans = [t for t in outils if c['slug'] in {t['cat']} | set(t.get('cats', []))]
        debutants = [t for t in dedans if t['niveau'] == 'Débutant']
        gratuits = [t for t in debutants if t['prix'] in ('Gratuit', 'Freemium')]
        if not debutants:
            fautes.append(f"{c['nom']:24} [R8] aucun outil Débutant dans cet usage")
        elif not gratuits:
            fautes.append(f"{c['nom']:24} [R8] aucun outil Débutant gratuit ou freemium")

    return outils, fautes


if __name__ == '__main__':
    outils, fautes = controler()
    if fautes:
        print(f"{len(fautes)} incohérence(s) sur {len(outils)} fiches :\n")
        for f in fautes:
            print('  ' + f)
        sys.exit(1)
    print(f"✓ {len(outils)} fiches contrôlées, aucune incohérence.")
