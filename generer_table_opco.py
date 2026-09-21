#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generer_table_opco.py — Construit data/idcc-opco.json à partir de la table
SIRET-OPCO officielle de France compétences.

Pourquoi cette table plutôt qu'un appel API à chaque visite : l'affectation à
un OPCO est une règle de branche, donc un IDCC détermine un OPCO et un seul.
Il n'y a que ~955 IDCC pour 3,6 millions d'établissements — autant embarquer
la correspondance (quelques dizaines de Ko) plutôt que dépendre du réseau
pour répondre à un visiteur.

Source : https://www.data.gouv.fr/datasets/table-siret-opco
Licence Ouverte 2.0. Le jeu est reconstruit depuis la DSN ; data.gouv signale
lui-même que la fréquence de mise à jour annoncée n'est pas tenue, d'où la
date de la donnée enregistrée dans le JSON et affichée côté site.

Deux pièges, tous deux gérés ici :
  - Les pseudo-IDCC 9998 et 9999 (« sans convention collective ») apparaissent
    chez les 11 OPCO à la fois et ne doivent JAMAIS être traduits en OPCO.
    Ils sont exclus.
  - 60 IDCC portent plusieurs OPCO. Le plus souvent c'est du bruit : une ou
    deux lignes aberrantes contre des centaines de milliers, le majoritaire
    tranche. Mais une trentaine sont réellement partagés — surtout les
    conventions agricoles 8xxx, entre AKTO et OCAPIAT. Ceux-là sont marqués
    `ambigu` avec la liste des candidats : le site doit afficher « à vérifier »
    plutôt qu'une réponse fausse énoncée avec aplomb.

Usage : python3 generer_table_opco.py [--garder-csv]
À relancer une fois par mois environ.
"""

import csv, collections, json, os, sys, tempfile, urllib.request

SLUG      = 'table-siret-opco'
API_JEU   = f'https://www.data.gouv.fr/api/1/datasets/{SLUG}/'
PAGE      = f'https://www.data.gouv.fr/datasets/{SLUG}'
RACINE    = os.path.dirname(os.path.abspath(__file__))
SORTIE    = os.path.join(RACINE, 'data', 'idcc-opco.json')
SORTIE_JS = os.path.join(RACINE, 'api', '_opco.js')   # consomme par api/opco.js

# Pseudo-IDCC : ils ne designent aucune convention collective et se retrouvent
# donc chez les 11 OPCO a la fois. Les traduire en OPCO produirait une reponse
# fausse avec l'apparence d'une reponse sure.
PSEUDO_IDCC = {'9998', '9999'}
SEUIL_CONFIANCE = 0.90          # en dessous, l'IDCC est marque comme ambigu

# Nom d'affichage + site officiel, pour pouvoir citer la source à l'utilisateur.
OPCO_OFFICIELS = {
    'AFDAS':                        ('Afdas',            'https://www.afdas.com'),
    'AKTO':                         ('AKTO',             'https://www.akto.fr'),
    'ATLAS':                        ('Atlas',            'https://www.opco-atlas.fr'),
    'CONSTRUCTYS':                  ('Constructys',      'https://www.constructys.fr'),
    "L'OPCOMMERCE":                 ("L'Opcommerce",     'https://www.lopcommerce.com'),
    'OCAPIAT':                      ('OCAPIAT',          'https://www.ocapiat.fr'),
    'OPCO2I':                       ('OPCO 2i',          'https://www.opco2i.fr'),
    'OPCO EP':                      ('OPCO EP',          'https://www.opcoep.fr'),
    'OPCO MOBILITES':               ('OPCO Mobilités',   'https://www.opcomobilites.fr'),
    'OPCO SANTE':                   ('OPCO Santé',       'https://www.opco-sante.fr'),
    'UNIFORMATION COHESION SOCIALE':('Uniformation',     'https://www.uniformation.fr'),
}


def ressource():
    """Retrouve le CSV courant par le jeu de donnees, pas par un id fige :
    France competences republie un extrait mensuel (SIRO_AAAAMM.csv)."""
    with urllib.request.urlopen(API_JEU, timeout=30) as r:
        jeu = json.load(r)
    csvs = [x for x in jeu['resources']
            if (x.get('format') or '').lower() == 'csv'
            or (x.get('title') or '').lower().endswith('.csv')]
    if not csvs:
        sys.exit('  ! aucune ressource CSV dans le jeu de donnees')
    res = max(csvs, key=lambda x: x.get('last_modified') or '')
    return {
        'id': res['id'],
        'titre': res.get('title', ''),
        'url': res.get('url') or f"https://www.data.gouv.fr/api/1/datasets/r/{res['id']}",
        'maj': (res.get('last_modified') or res.get('created_at') or '')[:10],
    }


def telecharger(url, dest):
    print('  téléchargement de la table SIRET-OPCO…')
    urllib.request.urlretrieve(url, dest)
    print(f'  {os.path.getsize(dest)/1e6:.1f} Mo')


def agreger(chemin):
    par_idcc = collections.defaultdict(collections.Counter)
    etablissements = 0
    with open(chemin, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f, delimiter='|'):
            etablissements += 1
            idcc = (row.get('IDCC') or '').strip()
            opco = (row.get('OPCO_PROPRIETAIRE') or '').strip()
            if not idcc or not opco or idcc in PSEUDO_IDCC:
                continue
            par_idcc[idcc][opco] += 1
    return par_idcc, etablissements


def main():
    garder = '--garder-csv' in sys.argv
    res = ressource()
    print(f"  ressource : {res['titre']} (maj {res['maj']})")
    tmp = os.path.join(tempfile.gettempdir(), 'siret-opco.csv')
    if not (garder and os.path.exists(tmp)):
        telecharger(res['url'], tmp)

    par_idcc, etablissements = agreger(tmp)

    table, douteux, inconnus = {}, [], set()
    for idcc, compte in par_idcc.items():
        opco, n = compte.most_common(1)[0]
        total = sum(compte.values())
        conf = n / total
        if opco not in OPCO_OFFICIELS:
            inconnus.add(opco)
        entree = {'opco': opco, 'etablissements': n}
        if conf < 1.0:
            entree['confiance'] = round(conf, 4)
        if conf < SEUIL_CONFIANCE:
            # Partage reel entre plusieurs OPCO (surtout les conventions
            # agricoles 8xxx, entre AKTO et OCAPIAT). On refuse de trancher :
            # le site doit dire « a verifier » plutot que donner une reponse
            # fausse avec aplomb.
            entree['ambigu'] = True
            entree['candidats'] = [o for o, _ in compte.most_common()]
            douteux.append((idcc, dict(compte)))
        table[idcc.zfill(4)] = entree

    sortie = {
        '_lisez_moi': ("Correspondance IDCC -> OPCO derivee de la table SIRET-OPCO de France "
                       "competences. Genere par generer_table_opco.py, ne pas editer a la main. "
                       "L'IDCC 9999 (sans convention collective) est volontairement absent : il "
                       "ne determine aucun OPCO."),
        'source': PAGE,
        'ressource': res['id'],
        'fichier': res['titre'],
        'licence': 'Licence Ouverte / Open Licence 2.0',
        'donnee_maj': res['maj'],
        'etablissements_source': etablissements,
        'idcc_couverts': len(table),
        'opco': {cle: {'nom': nom, 'site': site} for cle, (nom, site) in OPCO_OFFICIELS.items()},
        'idcc': dict(sorted(table.items())),
    }
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, 'w', encoding='utf-8') as f:
        json.dump(sortie, f, ensure_ascii=False, indent=1)
        f.write('\n')

    # Module generé pour la fonction serverless, sur le meme principe que
    # api/_catalogue.js : la fonction embarque la table et n'a donc aucun
    # appel reseau a faire pour repondre par IDCC.
    entete = ('/**\n'
              " * _opco.js — GENERE par generer_table_opco.py, ne pas editer a la main.\n"
              ' *\n'
              f" * Correspondance IDCC -> OPCO, derivee de la table SIRET-OPCO de France\n"
              f" * competences ({res['fichier'] if 'fichier' in res else res['titre']}, donnee du {res['maj']}).\n"
              f' * {len(table)} IDCC. Licence Ouverte 2.0. Source : {PAGE}\n'
              ' */\n\n')
    with open(SORTIE_JS, 'w', encoding='utf-8') as f:
        f.write(entete)
        f.write('export const META = ' + json.dumps({
            'source': PAGE, 'fichier': res['titre'], 'donnee_maj': res['maj'],
            'licence': 'Licence Ouverte / Open Licence 2.0',
            'idcc_couverts': len(table),
        }, ensure_ascii=False) + ';\n\n')
        f.write('export const OPCO = ' + json.dumps(
            {cle: {'nom': nom, 'site': site} for cle, (nom, site) in OPCO_OFFICIELS.items()},
            ensure_ascii=False, indent=1) + ';\n\n')
        f.write('export const IDCC = ' + json.dumps(dict(sorted(table.items())),
                                                    ensure_ascii=False) + ';\n')

    print(f'\n  {len(table)} IDCC écrits dans data/idcc-opco.json '
          f'({os.path.getsize(SORTIE)/1024:.0f} Ko) et api/_opco.js '
          f'({os.path.getsize(SORTIE_JS)/1024:.0f} Ko)')
    print(f'  donnée du {res["maj"] or "?"} · {etablissements:,} établissements source'.replace(',', ' '))
    if inconnus:
        print(f'  ! OPCO absents de OPCO_OFFICIELS, à ajouter : {sorted(inconnus)}')
    if douteux:
        print(f'  ! {len(douteux)} IDCC marqués ambigus (sous {SEUIL_CONFIANCE:.0%}) :')
        for idcc, compte in douteux[:10]:
            print(f'      {idcc} → {compte}')
    if not garder:
        os.remove(tmp)


if __name__ == '__main__':
    main()
