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
# Les etablissements dont l'OPCO ne se deduit PAS de la convention collective,
# repartis en 1 000 fichiers par les 3 premiers chiffres du SIRET. Embarques
# dans la fonction /api/opco (vercel.json, includeFiles) : la reponse tombe en
# une milliseconde, au lieu des 6 a 14 secondes de l'API tabulaire de
# data.gouv.fr mesurees le 09/11/2026. Meme principe que la table `siret_opco`
# d'Ella (Cathy), qui ne garde que ces etablissements-la.
DOSSIER_SIRET = os.path.join(RACINE, 'data', 'siret-opco')

# Pseudo-IDCC : ils ne designent aucune convention collective et se retrouvent
# donc chez les 11 OPCO a la fois. Les traduire en OPCO produirait une reponse
# fausse avec l'apparence d'une reponse sure.
PSEUDO_IDCC = {'9998', '9999'}
SEUIL_CONFIANCE = 0.90          # en dessous, l'IDCC est marque comme ambigu

# Nom d'affichage, site, et surtout la page ou CET OPCO publie ses criteres de
# prise en charge : c'est la seule source qui fasse foi, et elle differe pour
# chacun des onze. Les montants, eux, ne sont volontairement pas stockes ici :
# ils dependent de la branche et de l'effectif, changent au moins chaque annee,
# et une valeur perimee affichee comme certaine ferait perdre un dossier.
# `regle` decrit la FORME de la prise en charge, qui est stable ; le montant se
# lit sur la page officielle. Depuis le 09/11/2026, `criteres` reprend les
# liens fournis par Cathy (gestionnaire administrative des dossiers) pour Ella,
# les memes qu'elle utilise ; tous ouverts le 09/11/2026. Celui d'OCAPIAT porte
# l'annee (« 2026 ») : a remplacer en janvier 2027.
OPCO_OFFICIELS = {
    'AFDAS': {
        'nom': 'Afdas', 'site': 'https://www.afdas.com',
        'criteres': 'https://www.afdas.com/entreprise/financer-vos-actions-de-formation/choisir-le-bon-financement/financement-de-la-formation-pour-les-structures-de-moins-de-50-salaries.html',
        'espace': 'https://www.afdas.com/',
        'regle': "Conditions générales votées par le conseil d'administration, puis barèmes par branche. L'entreprise doit être à jour de ses contributions.",
    },
    'AKTO': {
        'nom': 'AKTO', 'site': 'https://www.akto.fr',
        'criteres': 'https://www.akto.fr/entreprise/financer-une-formation/regles-de-prise-en-charge/',
        'espace': 'https://www.akto.fr/espace-entreprise/',
        'regle': "Une fiche « Règles de prise en charge » par branche, revue chaque année.",
    },
    'ATLAS': {
        'nom': 'Atlas', 'site': 'https://www.opco-atlas.fr',
        'criteres': 'https://www.opco-atlas.fr/criteres-financement',
        'espace': 'https://www.opco-atlas.fr/entreprise/espace-entreprise.html',
        'regle': "Une page de critères par branche, avec un plafond annuel par entreprise qui varie selon l'effectif.",
    },
    'CONSTRUCTYS': {
        'nom': 'Constructys', 'site': 'https://www.constructys.fr',
        'criteres': 'https://www.constructys.fr/conditions-de-prise-en-charge-2/',
        'espace': 'https://www.constructys.fr/entreprise/',
        'regle': "Modalités de participation financière révisées chaque année. Dossier à déposer 15 jours avant le début, via eGestion.",
    },
    "L'OPCOMMERCE": {
        'nom': "L'Opcommerce", 'site': 'https://www.lopcommerce.com',
        'criteres': 'https://www.lopcommerce.com/entreprise/criteres-de-prise-en-charge-par-branche-professionnelle/',
        'espace': 'https://www.lopcommerce.com/',
        'regle': "Critères fixés branche par branche ; un document de critères par section paritaire.",
    },
    'OCAPIAT': {
        'nom': 'OCAPIAT', 'site': 'https://www.ocapiat.fr',
        'criteres': 'https://www.ocapiat.fr/wp-content/uploads/Regles-de-prise-en-charge-2026.pdf',
        'espace': 'https://www.ocapiat.fr/',
        'regle': "Règles de prise en charge publiées en PDF chaque année, avec conditions générales de gestion.",
    },
    'OPCO2I': {
        'nom': 'OPCO 2i', 'site': 'https://www.opco2i.fr',
        'criteres': 'https://www.opco2i.fr/formation-et-financement/les-regles-de-prise-en-charge/',
        'espace': 'https://www.opco2i.fr/espace-entreprise/',
        'regle': "Règles communes à l'industrie : plafond annuel par entreprise et plafond horaire, complétés par les priorités de branche.",
    },
    'OPCO EP': {
        'nom': 'OPCO EP', 'site': 'https://www.opcoep.fr',
        'criteres': 'https://www.opcoep.fr/criteres-de-financement',
        'espace': 'https://acces-formation.opcoep.fr/',
        'regle': "Critères par branche ; à défaut de montant fixé par accord de branche, un forfait horaire s'applique.",
    },
    'OPCO MOBILITES': {
        'nom': 'OPCO Mobilités', 'site': 'https://www.opcomobilites.fr',
        'criteres': 'https://www.opcomobilites.fr/ressources/?categories%5B%5D=guides-pratiques#results',
        'espace': 'https://www.opcomobilites.fr/entreprise/',
        'regle': "Conditions financières par branche, avec une enveloppe distincte pour les frais annexes. Demande un mois avant le démarrage.",
    },
    'OPCO SANTE': {
        'nom': 'OPCO Santé', 'site': 'https://www.opco-sante.fr',
        'criteres': 'https://www.opco-sante.fr/representant-du-personnel/financement-de-la-formation/regles-de-prise-en-charge/',
        'espace': 'https://www.opco-sante.fr/',
        'regle': "Fonds conventionnels et compte d'investissement formation adhérent (CIFA), selon la branche et le niveau de contribution.",
    },
    'UNIFORMATION COHESION SOCIALE': {
        'nom': 'Uniformation', 'site': 'https://www.uniformation.fr',
        'criteres': 'https://www.uniformation.fr/particulier/salaries/formation-et-financements/autres-dispositifs-de-formation/le-plan-de-developpement-des-competences/financement',
        'espace': 'https://www.uniformation.fr/',
        'regle': "Barème de coûts pédagogiques et de frais annexes, avec un plafond annuel par adhérent qui dépend de l'effectif.",
    },
}

# Les dirigeants non salaries ne relevent pas de l'OPCO mais d'un fonds
# d'assurance formation (FAF), celui qui figure sur leur attestation de
# contribution a la formation professionnelle (CFP, espace Urssaf). Aucune
# donnee publique ne relie un SIRET a son FAF, et le code APE ne suffit pas a
# le deduire (un meme code couvre commercants et liberaux) : on liste les cinq,
# on ne devine pas. Liens fournis par Cathy, ouverts le 09/11/2026 ; ceux de
# l'AGEFICE et du FAF-PM portent une annee, a remplacer en janvier 2027.
FONDS_NON_SALARIES = {
    'AGEFICE': {
        'nom': 'AGEFICE',
        'pour': "dirigeants non salariés du commerce, de l'industrie et des services",
        'criteres': 'https://communication-agefice.fr/wp-content/uploads/2025/12/Criteres-financiers-2026-Tableau-26-12-2025.pdf',
    },
    'FIF-PL': {
        'nom': 'FIF-PL',
        'pour': 'professions libérales',
        'criteres': 'https://fifpl.fr/criteres-de-prise-en-charge/',
    },
    'FAFCEA': {
        'nom': 'FAFCEA',
        'pour': 'artisans',
        'criteres': 'https://www.fafcea.com/consulter-les-criteres-de-prise-en-charge/',
    },
    'VIVEA': {
        'nom': 'VIVEA',
        'pour': "chefs d'entreprise agricole",
        'criteres': 'https://vivea.fr/chef-dentreprise-agricole/nos-criteres-de-prise-en-charge/',
    },
    'FAF-PM': {
        'nom': 'FAF-PM',
        'pour': 'médecins libéraux',
        'criteres': 'https://www.fafpm.org/nouvelles-regles-de-prise-en-charge-2025/',
    },
}

# Vrai pour les onze, et c'est la regle qui decide de tout le reste : les fonds
# mutualises du plan de developpement des competences sont reserves aux
# entreprises de moins de 50 salaries. Au-dela, la formation reste finançable,
# mais sur le budget propre de l'entreprise ou par versement volontaire.
REGLE_COMMUNE = ("Les fonds mutualisés du plan de développement des compétences sont réservés aux "
                 "entreprises de moins de 50 salariés. Au-delà, la formation se finance sur le budget "
                 "de l'entreprise ou par versement volontaire à l'OPCO. Dans tous les cas, l'organisme "
                 "de formation doit être certifié Qualiopi et le dossier déposé avant le début de la "
                 "formation.")


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


# Une lettre par OPCO dans les fichiers SIRET : 330 000 lignes, chaque octet
# compte. La correspondance est ecrite dans _opco.js (CODES_COURTS).
LETTRES = {
    'AFDAS': 'A', 'AKTO': 'K', 'ATLAS': 'T', 'CONSTRUCTYS': 'C', "L'OPCOMMERCE": 'M',
    'OCAPIAT': 'O', 'OPCO2I': 'I', 'OPCO EP': 'E', 'OPCO MOBILITES': 'B', 'OPCO SANTE': 'S',
    'UNIFORMATION COHESION SOCIALE': 'U',
}


def ecrire_exceptions(chemin, table):
    """Garde les etablissements que la convention ne suffit pas a situer :
    sans convention (IDCC vide, 9998, 9999 ou inconnu), convention partagee
    entre plusieurs OPCO, OPCO different de celui de leur convention, ou
    dossier gere par un autre OPCO que celui de declaration."""
    lettres = dict(LETTRES)
    libres = iter('DFGHJLNPQRVWXYZ')
    par_prefixe = collections.defaultdict(list)
    motifs = collections.Counter()
    with open(chemin, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f, delimiter='|'):
            siret = (row.get('SIRET') or '').strip()
            opco = (row.get('OPCO_PROPRIETAIRE') or '').strip()
            if len(siret) != 14 or not siret.isdigit() or not opco:
                continue
            gestion = (row.get('OPCO_GESTION') or '').strip()
            if gestion == opco:
                gestion = ''
            idcc = (row.get('IDCC') or '').strip().zfill(4)
            entree = table.get(idcc) if idcc not in PSEUDO_IDCC else None
            if entree is None:
                motif = 'sans convention'
            elif entree.get('ambigu'):
                motif = 'convention partagée'
            elif entree['opco'] != opco:
                motif = 'OPCO différent de la convention'
            elif gestion:
                motif = 'géré par un autre OPCO'
            else:
                continue
            motifs[motif] += 1
            for o in (opco, gestion):
                if o and o not in lettres:
                    lettres[o] = next(libres)
            par_prefixe[siret[:3]].append(siret + lettres[opco] + (lettres[gestion] if gestion else ''))

    if os.path.isdir(DOSSIER_SIRET):
        for nom in os.listdir(DOSSIER_SIRET):
            if nom.endswith('.txt'):
                os.remove(os.path.join(DOSSIER_SIRET, nom))
    os.makedirs(DOSSIER_SIRET, exist_ok=True)
    total = 0
    for prefixe, lignes in par_prefixe.items():
        lignes.sort()
        total += len(lignes)
        with open(os.path.join(DOSSIER_SIRET, prefixe + '.txt'), 'w', encoding='ascii', newline='\n') as f:
            f.write('\n'.join(lignes) + '\n')
    return {v: k for k, v in lettres.items()}, total, motifs


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

    codes_courts, nb_exceptions, motifs = ecrire_exceptions(tmp, table)

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
        'regle_commune': REGLE_COMMUNE,
        'opco': OPCO_OFFICIELS,
        'fonds_non_salaries': FONDS_NON_SALARIES,
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
        f.write('export const REGLE_COMMUNE = ' + json.dumps(REGLE_COMMUNE, ensure_ascii=False) + ';\n\n')
        f.write('export const OPCO = ' + json.dumps(OPCO_OFFICIELS, ensure_ascii=False, indent=1) + ';\n\n')
        f.write('export const FONDS_NON_SALARIES = ' + json.dumps(FONDS_NON_SALARIES, ensure_ascii=False, indent=1) + ';\n\n')
        # Lettre -> code OPCO, pour lire les fichiers data/siret-opco/*.txt.
        f.write('export const CODES_COURTS = ' + json.dumps(codes_courts, ensure_ascii=False) + ';\n\n')
        f.write('export const IDCC = ' + json.dumps(dict(sorted(table.items())),
                                                    ensure_ascii=False) + ';\n')

    print(f'\n  {len(table)} IDCC écrits dans data/idcc-opco.json '
          f'({os.path.getsize(SORTIE)/1024:.0f} Ko) et api/_opco.js '
          f'({os.path.getsize(SORTIE_JS)/1024:.0f} Ko)')
    print(f'  donnée du {res["maj"] or "?"} · {etablissements:,} établissements source'.replace(',', ' '))
    print(f'  {nb_exceptions:,} établissements hors convention écrits dans data/siret-opco/ '.replace(',', ' ')
          + '(' + ', '.join(f'{m} : {n:,}'.replace(',', ' ') for m, n in motifs.most_common()) + ')')
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
