"""verifier_baremes.py data/baremes-2026/*.json : contrôle mécanique des barèmes.

Lancé par generer_baremes.py (rien n'entre dans l'email sans le passer) et
utilisable seul pour relire un fichier.

Pour chaque branche retenue :
  1. chaque citation est retrouvée mot pour mot dans la source téléchargée à
     nouveau (HTML nettoyé ou texte du PDF), espaces et apostrophes normalisés ;
  2. chaque nombre écrit dans « montant » et « detail » (ce que lira le
     prospect) figure dans au moins une citation ;
  3. le lien donné au prospect répond (HTTP 200) ;
  4. paliers cohérents (bornes, ordre, moins de 50 salariés).
Sortie : une ligne OK / ÉCHEC par branche, avec le détail des échecs.
"""
import hashlib, html, io, json, re, subprocess, sys, zipfile
from pathlib import Path

import os, tempfile
ICI = Path(__file__).resolve().parent
CACHE = Path(tempfile.gettempdir()) / 'baremes-cache'
CACHE.mkdir(exist_ok=True)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
# Le texte des PDF vient de pypdf : un Python qui l'a (PDF_PYTHON=chemin), sinon python3.
PY_PDF = os.environ.get('PDF_PYTHON', 'python3')
PDF2TXT = ('import sys\nfrom pypdf import PdfReader\n'
           'for p in PdfReader(sys.argv[1]).pages: print(p.extract_text() or \'\')')


def norm(t):
    t = t.replace('’', "'").replace('ʼ', "'").replace('‘', "'").replace('`', "'")
    t = t.replace('«', '"').replace('»', '"').replace('“', '"').replace('”', '"')
    t = t.replace('…', '...').replace('–', '-').replace('‑', '-')
    t = re.sub(r'[\s   ​]+', ' ', t)
    return t.strip().lower()


def serre(t):
    return re.sub(r'[\s"\'.,;:()\-]', '', norm(t))


# Atlas n'affiche les critères d'une branche qu'une fois le profil choisi
# (« moins de 50 salariés » = 225, puis la branche) : on remplit le même
# formulaire que le visiteur, sans compte.
ATLAS_PROFILS = {
    'bureaux-detudes-techniques-ingenieurs-et-conseils': 214, 'experts-comptables-et-commissaires-aux-comptes': 219,
    'agents-generaux-dassurance': 210, 'courtage-dassurances-et-de-reassurances': 217, 'societes-financieres': 223,
    'banque': 212, 'societes-dassurances': 222, 'caisse-depargne': 215, 'credit-mutuel': 216, 'banque-populaire': 213,
    'geometres': 220, 'economistes-de-la-construction': 218, 'marches-financiers': 209,
}


def atlas(url, f):
    branche = ATLAS_PROFILS[url.rstrip('/').rsplit('/', 1)[1]]
    jar = str(f) + '.cookies'
    page = subprocess.run(['curl', '-s', '-L', '-A', UA, '-c', jar, '-b', jar, 'https://www.opco-atlas.fr/preferences'], capture_output=True, text=True).stdout
    fbid = re.findall(r'name="form_build_id" value="([^"]*)"', page)[-1]
    donnees = {'preferences_display': 'page', 'redirect_url': 'https://www.opco-atlas.fr/criteres-financement',
               '0[fieldsetWrapper][checkboxes][Entreprise][checkboxes][225]': '225',
               f'1[fieldsetWrapper][checkboxes][checkboxes][{branche}]': str(branche),
               'form_build_id': fbid, 'form_id': 'opco_atlas_user_profiling_form', 'op': 'Enregistrer mes préférences'}
    cmd = ['curl', '-s', '-L', '-A', UA, '-b', jar, '-c', jar, '-X', 'POST', 'https://www.opco-atlas.fr/preferences', '-o', str(f), '-w', '%{http_code}']
    for k, v in donnees.items():
        cmd += ['--data-urlencode', f'{k}={v}']
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def telecharger(url):
    f = CACHE / hashlib.sha1(url.encode()).hexdigest()
    if not f.exists() and url.startswith('https://www.opco-atlas.fr/criteres-financement/') and url.rstrip('/').rsplit('/', 1)[1] in ATLAS_PROFILS:
        (CACHE / (f.name + '.code')).write_text(atlas(url, f))
    if not f.exists():
        r = subprocess.run(['curl', '-s', '-L', '--max-time', '60', '-A', UA, url, '-o', str(f), '-w', '%{http_code}'], capture_output=True, text=True)
        (CACHE / (f.name + '.code')).write_text(r.stdout)
    return f.read_bytes(), (CACHE / (f.name + '.code')).read_text()


def texte(url):
    data, code = telecharger(url)
    if data[:4] == b'%PDF':
        f = CACHE / 'tmp.pdf'
        f.write_bytes(data)
        return subprocess.run([PY_PDF, '-I', '-c', PDF2TXT, str(f)], capture_output=True, text=True).stdout, code
    if data[:2] == b'PK':
        out = []
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for n in z.namelist():
                if n.lower().endswith('.pdf'):
                    f = CACHE / 'tmp.pdf'
                    f.write_bytes(z.read(n))
                    out.append(subprocess.run([PY_PDF, '-I', '-c', PDF2TXT, str(f)], capture_output=True, text=True).stdout)
        return '\n'.join(out), code
    t = data.decode('utf-8', errors='ignore')
    t = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', ' ', t, flags=re.S)
    return html.unescape(re.sub(r'<[^>]+>', ' ', t)), code


NOMBRE = re.compile(r'\d+(?:[   ]\d{3})*(?:,\d+)?')


def verifier(e):
    pb = []
    sources = {}
    for c in e.get('citations', []):
        if c['url'] not in sources:
            sources[c['url']] = texte(c['url'])
        t, code = sources[c['url']]
        if norm(c['texte']) in norm(t):
            continue
        if serre(c['texte']) in serre(t):
            continue  # même texte, seule la mise en page du PDF diffère
        pb.append(f"citation introuvable ({code}) : {c['texte'][:90]}")
    cites = ' '.join(serre(c['texte']) for c in e.get('citations', []))
    for p in e.get('paliers', []):
        for champ in ('montant', 'detail'):
            for n in NOMBRE.findall(p.get(champ) or ''):
                if re.sub(r'\D', '', n) not in re.sub(r'\D', ' ', cites).split() and re.sub(r'[   ]', '', n) not in cites:
                    pb.append(f"nombre {n!r} ({champ}, palier {p['min']}-{p['max']}) absent des citations")
        if not (0 <= p['min'] <= p['max'] <= 49):
            pb.append(f"palier hors bornes {p['min']}-{p['max']}")
    for n in NOMBRE.findall(e.get('delai') or ''):
        if n not in ('2026',) and re.sub(r'\D', '', n) not in re.sub(r'\D', ' ', cites).split():
            pb.append(f"nombre {n!r} (délai) absent des citations")
    for p in e.get('paliers', []):
        for champ in ('montant', 'detail'):
            if ' HT' in (p.get(champ) or '') and not any(' HT' in c['texte'] or '€HT' in c['texte'] for c in e.get('citations', [])):
                pb.append(f"« HT » écrit ({champ}) alors qu'aucune citation ne le dit")
    if e.get('epuise') and not any(re.search(r'(?i)engag|épuis|suspen', c['texte']) for c in e.get('citations', [])):
        pb.append('branche dite épuisée sans citation qui le dise')
    _, code = telecharger(e['lien'])
    if code != '200':
        pb.append(f"lien {e['lien']} : HTTP {code}")
    if '2026' not in e.get('version', ''):
        pb.append('version sans 2026')
    return pb


if __name__ == '__main__':
    total = ok = 0
    for chemin in sys.argv[1:]:
        for e in json.load(open(chemin)):
            if not (e.get('retenu') or e.get('epuise')):
                continue
            total += 1
            pb = verifier(e)
            ok += not pb
            print(('OK    ' if not pb else 'ÉCHEC ') + f"{e['opco']} / {e['branche']} ({', '.join(e['idcc'])})")
            for x in pb:
                print('        ' + x)
    print(f'{ok}/{total} branches vérifiées')
