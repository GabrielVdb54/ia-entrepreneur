#!/usr/bin/env python3
"""generer_baremes.py : data/baremes-2026/*.json -> api/_baremes-2026.js

Les montants que l'email « Quel est mon OPCO ? » annonce (Gabriel, 09/11/2026 :
« d'après vos infos, voici le budget auquel vous avez droit ; attention, merci
de vérifier » puis « il faut le lien vers là où on a trouvé l'info »).

Une branche n'entre dans le fichier généré que si :
  1. verifier_baremes.py la valide : chaque citation est retrouvée mot pour mot
     dans la source téléchargée à nouveau, chaque nombre lu par le prospect est
     dans une citation, « HT » n'est écrit que si la source le dit, le lien
     répond ;
  2. chacun de ses IDCC est rattaché au même OPCO dans data/idcc-opco.json
     (table France compétences) ;
  3. aucun IDCC n'est déjà pris par une autre branche.
Tout refus est affiché ; rien n'est deviné.

Lancer : PDF_PYTHON=<python avec pypdf> python3 generer_baremes.py
"""
import datetime, json, sys
from pathlib import Path

sys.dont_write_bytecode = True  # pas de __pycache__ : Vercel servirait tout le dossier
RACINE = Path(__file__).resolve().parent
sys.path.insert(0, str(RACINE))
import verifier_baremes as v

ANNEE = '2026'
FIN = f'{ANNEE}-12-31'
SORTIE = RACINE / 'api' / f'_baremes-{ANNEE}.js'
# Règles d'écriture du site (CLAUDE.md) : ni tirets longs, ni points médians,
# ni flèches, ni CPF, ni « 100 % » / « sans reste à charge ».
INTERDITS = ['\u2014', '\u2013', '\u00b7', '\u2192', 'CPF', '100 %', '100%', 'reste à charge', 'gratuit']
CODES = {  # nom écrit dans les relevés -> code de data/idcc-opco.json
    'OPCO EP': 'OPCO EP', 'AKTO': 'AKTO', 'ATLAS': 'ATLAS', 'CONSTRUCTYS': 'CONSTRUCTYS',
    "L'OPCOMMERCE": "L'OPCOMMERCE", 'OPCOMMERCE': "L'OPCOMMERCE", 'OPCO MOBILITES': 'OPCO MOBILITES',
    'OPCO MOBILITÉS': 'OPCO MOBILITES', 'OCAPIAT': 'OCAPIAT', 'OPCO 2I': 'OPCO2I', 'OPCO2I': 'OPCO2I',
    'AFDAS': 'AFDAS', 'UNIFORMATION': 'UNIFORMATION COHESION SOCIALE',
    'UNIFORMATION COHESION SOCIALE': 'UNIFORMATION COHESION SOCIALE', 'OPCO SANTE': 'OPCO SANTE', 'OPCO SANTÉ': 'OPCO SANTE',
}


def main():
    table = json.loads((RACINE / 'data' / 'idcc-opco.json').read_text())['idcc']
    aujourdhui = datetime.date.today().isoformat()
    pris, sortie, refus = {}, [], []
    for chemin in sorted((RACINE / 'data' / f'baremes-{ANNEE}').glob('*.json')):
        for e in json.loads(chemin.read_text()):
            if not (e.get('retenu') or e.get('epuise')):
                continue
            nom = f"{e['opco']} / {e['branche']}"
            code = CODES.get(e['opco'].upper().replace('’', "'"))
            if not code:
                refus.append(f'{nom} : OPCO inconnu'); continue
            idcc = []
            for i in e['idcc']:
                i4 = i.zfill(4)
                if table.get(i4, {}).get('opco') != code:
                    refus.append(f"{nom} : IDCC {i4} rattaché à {table.get(i4, {}).get('opco')} dans la table, pas à {code}")
                elif i4 in pris:
                    refus.append(f'{nom} : IDCC {i4} déjà pris par {pris[i4]}')
                else:
                    idcc.append(i4)
            if not idcc:
                continue
            visibles = [e['branche'], e['version'], e.get('delai') or '', e.get('epuise') or ''] + [p.get(k) or '' for p in e.get('paliers', []) for k in ('montant', 'detail')]
            interdits = [m for m in INTERDITS if any(m.lower() in t.lower() for t in visibles)]
            if interdits:
                refus.append(f'{nom} : texte interdit dans l\'email ({", ".join(interdits)})'); continue
            pb = v.verifier(e)
            if pb:
                refus.append(f'{nom} : ' + ' ; '.join(pb)); continue
            for i in idcc:
                pris[i] = nom
            fin = min(FIN, e.get('delai_jusquau') or FIN)  # après la date limite de l'année, plus de montant annoncé
            sortie.append({
                'opco': code, 'branche': e['branche'], 'idcc': idcc, 'lien': e['lien'], 'version': e['version'],
                'lu_le': e.get('lu_le') or aujourdhui, 'valable_jusquau': fin,
                **({'epuise': e['epuise']} if e.get('epuise') else {
                    'paliers': [{k: p[k] for k in ('min', 'max', 'montant', 'detail') if p.get(k) is not None} for p in e['paliers']],
                    'delai': e.get('delai')}),
                'sources': sorted({c['url'] for c in e['citations']}),
            })
    corps = ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in sortie)
    SORTIE.write_text(
        f'// Généré par generer_baremes.py le {aujourdhui} à partir de data/baremes-{ANNEE}/ : ne pas modifier à la main.\n'
        f'// Chaque entrée a passé verifier_baremes.py (citations retrouvées à la source, chiffres dans les citations).\n'
        f'export const BAREMES_{ANNEE} = [\n{corps},\n];\n')
    print(f'{len(sortie)} branches écrites dans {SORTIE.relative_to(RACINE)} ({len(pris)} IDCC)')
    for r in refus:
        print('REFUS', r)


if __name__ == '__main__':
    main()
