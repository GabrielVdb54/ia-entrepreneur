#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
veille_annuaire.py — Veille mensuelle sur l'annuaire « Les meilleures IA ».

Quatre contrôles, à lancer une fois par mois :

1. LIENS       chaque URL d'éditeur est rappelée. Le script distingue un lien
               réellement mort d'une protection anti-bot : Cloudflare et
               consorts renvoient 403 à un script alors que la page s'ouvre
               normalement dans un navigateur. Il signale surtout les
               changements de domaine, qui trahissent un rachat ou un
               renommage — c'est ainsi qu'on a vu Yousign devenir Youtrust.

2. TARIFS      la page de tarification de chaque éditeur est cherchée
               (/pricing, /tarifs, /fr/tarifs…) et les montants en sont
               extraits. On compare au relevé du mois précédent : seules les
               grilles qui ont bougé sont signalées. Environ trois éditeurs
               sur quatre sont lisibles ainsi ; les autres (page rendue en
               JavaScript ou pare-feu) passent en revue manuelle.

3. ROTATION    les fiches dont le tarif n'est pas extractible automatiquement
               sont listées par ancienneté, pour être revues à la main.

4. COUVERTURE  le catalogue de la Bible des IA (avantagedigital.fr) est comparé
               au nôtre. Vérifié par crawl de leurs 135 pages le 04/09/2026 :
               leur site ne publie AUCUN tarif d'outil (leur base ne stocke
               qu'une catégorie « Gratuit / Freemium / Payant », et les seuls
               montants du site concernent leurs propres prestations). Cette
               source ne sert donc qu'à surveiller la couverture du catalogue.

L'état précédent est conservé dans data/veille-annuaire.json : seules les
DIFFÉRENCES depuis le dernier passage sont signalées.

Usage : python3 veille_annuaire.py            (rapport dans le terminal)
        python3 veille_annuaire.py --json     (rapport lisible par un agent)
"""

import json, os, re, sys, socket, datetime, unicodedata
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import urllib.request, urllib.error

ROOT = os.path.dirname(os.path.abspath(__file__))
ETAT = os.path.join(ROOT, 'data', 'veille-annuaire.json')
BIBLE = 'https://www.avantagedigital.fr/bible-des-ia/'
AUJOURD_HUI = datetime.date.today().isoformat()

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

# Titres servis par les pare-feux applicatifs : le lien est bon, c'est le
# script qui est refusé. Ne jamais les compter comme des liens morts.
BOUCLIERS = ('just a moment', 'un instant', 'attention required', 'security checkpoint',
             'challenge', 'verifying you are human', 'access denied')


def recuperer(url, timeout=25):
    """Retourne (statut, url finale, titre). Statut 0 = injoignable."""
    req = urllib.request.Request(url, headers={
        'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept': 'text/html,application/xhtml+xml'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            corps = r.read(200000).decode('utf-8', 'replace')
            return r.status, r.geturl(), titre_de(corps)
    except urllib.error.HTTPError as ex:
        corps = ''
        try:
            corps = ex.read(200000).decode('utf-8', 'replace')
        except Exception:
            pass
        return ex.code, ex.url or url, titre_de(corps)
    except Exception:
        return 0, url, ''


def titre_de(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    if not m:
        return ''
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(1))).strip()[:120]


def domaine(url):
    d = urlparse(url).netloc.lower()
    return d[4:] if d.startswith('www.') else d


def meme_domaine(a, b):
    da, db = domaine(a), domaine(b)
    return da == db or da.endswith('.' + db) or db.endswith('.' + da)


def domaine_resout(url):
    """Le domaine existe-t-il encore ? Distingue un site disparu d'un site qui
    refuse simplement les requetes non navigateur (Midjourney, par exemple)."""
    try:
        socket.getaddrinfo(domaine(url), 443)
        return True
    except Exception:
        return False


def protege(statut, titre):
    """403/429/503 = le pare-feu refuse le script, pas un lien mort.

    Vérifié au navigateur sur les 21 cas rencontrés en septembre 2026 : tous
    s'ouvraient normalement. On ne déclenche donc l'alerte que sur un vrai
    404/410/451, une erreur serveur persistante ou un domaine injoignable.
    """
    return statut in (401, 403, 405, 429, 503)


# Redirections normales, à ne pas confondre avec un renommage d'éditeur :
# écran de connexion, redirection de langue ou de région.
REDIRECTIONS_NORMALES = re.compile(
    r'(accounts\.google\.|/signin|/login|/sign-in|/auth/|/fr-fr|/fr/|/en/|/overview)', re.I)


def renommage(url_depart, url_finale):
    """Vrai changement d'editeur : domaine different ET marque differente."""
    if meme_domaine(url_depart, url_finale):
        return False
    if REDIRECTIONS_NORMALES.search(url_finale):
        return False
    marque = re.split(r'[.\-]', domaine(url_depart))[0]
    return marque not in domaine(url_finale)


def normaliser(nom):
    nom = unicodedata.normalize('NFD', nom.lower())
    nom = ''.join(c for c in nom if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', nom)


def controler_liens(outils):
    def un(t):
        statut, final, titre = recuperer(t['url'])
        if statut == 0:                      # second essai : un timeout isole n'est pas une panne
            statut, final, titre = recuperer(t['url'], timeout=40)
        injoignable = statut == 0 and not domaine_resout(t['url'])
        return {'slug': t['slug'], 'nom': t['name'], 'url': t['url'], 'statut': statut,
                'final': final, 'titre': titre,
                'protege': protege(statut, titre) or (statut == 0 and not injoignable),
                'redirige': bool(statut and statut < 400 and renommage(t['url'], final))}
    with ThreadPoolExecutor(max_workers=10) as pool:
        return list(pool.map(un, outils))


# Chemins de page tarifaire essayés dans l'ordre, sur le domaine de l'éditeur.
CHEMINS_TARIFS = ['/pricing', '/tarifs', '/fr/tarifs', '/fr/pricing', '/pricing/',
                  '/prix', '/plans', '/tarif', '/fr-fr/tarifs', '/pricing/plans']

MONTANT = re.compile(r'(?:€\s?\d[\d.,]{0,6}|\$\s?\d[\d.,]{0,6}|\d[\d .,]{0,6}\s?€(?:\s?(?:HT|TTC))?)', re.I)


def valeur(montant):
    """« €19.50 », « 19,50€ », « $1,913 » → 19.5, 19.5, 1913.0.

    La comparaison d'un mois sur l'autre porte sur les nombres et non sur les
    symboles : une page de tarification sert des dollars à un serveur américain
    et des euros à un visiteur français, sans que le prix ait bougé.
    """
    t = re.sub(r'[^\d.,]', '', montant)
    if ',' in t and '.' in t:
        t = t.replace(',', '')
    elif re.search(r',\d{3}\b', t):
        t = t.replace(',', '')
    else:
        t = t.replace(',', '.')
    try:
        return round(float(t), 2)
    except ValueError:
        return None


def valeurs(montants):
    return sorted({v for v in (valeur(m) for m in montants) if v is not None})


def prix_entree(montants):
    """Le plus petit montant reellement facture d'une grille.

    C'est la seule valeur qui alimente `prixDetail` (« a partir de ~X »), et la
    seule stable : les paliers superieurs bougent au gre des curseurs de volume
    et des promotions sans qu'aucun prix n'ait change.
    """
    reels = [v for v in valeurs(montants) if v >= 1]
    return reels[0] if reels else None


def ecart_significatif(avant, apres, tolerance=0.12):
    """Deux grilles different-elles vraiment ? Tolerance sur le prix d'entree."""
    a, b = prix_entree(avant), prix_entree(apres)
    if a is None or b is None:
        return a != b
    return abs(a - b) / max(a, b) > tolerance


def montants_de(html):
    html = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', html)
    texte = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html))
    vus = {re.sub(r'\s+', '', m) for m in MONTANT.findall(texte)}
    return sorted(vus)[:40]


def relever_tarifs(outils):
    """Cherche la grille tarifaire de chaque éditeur et en extrait les montants."""
    def un(t):
        base = urlparse(t['url'])
        for chemin in CHEMINS_TARIFS:
            url = f'{base.scheme}://{base.netloc}{chemin}'
            req = urllib.request.Request(url, headers={
                'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9'})
            try:
                with urllib.request.urlopen(req, timeout=20) as r:
                    if r.status != 200:
                        continue
                    montants = montants_de(r.read(400000).decode('utf-8', 'replace'))
                    if montants:
                        return {'slug': t['slug'], 'nom': t['name'], 'source': url,
                                'montants': montants}
            except Exception:
                continue
        return {'slug': t['slug'], 'nom': t['name'], 'source': None, 'montants': []}

    with ThreadPoolExecutor(max_workers=8) as pool:
        return list(pool.map(un, outils))


def catalogue_bible():
    """Noms d'outils publiés par la Bible des IA (leur tableau JS embarqué)."""
    statut, _, _ = 0, None, None
    req = urllib.request.Request(BIBLE, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            html = r.read().decode('utf-8', 'replace')
    except Exception as ex:
        return None, f'page injoignable ({ex})'
    depart = html.find('cyber-ai-001')
    if depart < 0:
        return None, 'catalogue introuvable dans la page (structure modifiée ?)'
    debut = html.rfind('=[', 0, depart) + 1
    profondeur, fin = 0, None
    for i in range(debut, len(html)):
        if html[i] == '[':
            profondeur += 1
        elif html[i] == ']':
            profondeur -= 1
            if profondeur == 0:
                fin = i + 1
                break
    try:
        données = json.loads(html[debut:fin])
    except Exception as ex:
        return None, f'catalogue illisible ({ex})'
    return [d['name'] for d in données], None


def rapport():
    outils = json.load(open(os.path.join(ROOT, 'data', 'ia-tools.json'), encoding='utf-8'))
    ancien = {}
    if os.path.exists(ETAT):
        ancien = json.load(open(ETAT, encoding='utf-8'))
    liens_avant = {l['slug']: l for l in ancien.get('liens', [])}

    liens = controler_liens(outils)
    morts, redirections, retablis = [], [], []
    for l in liens:
        avant = liens_avant.get(l['slug'], {})
        if (l['statut'] == 0 or l['statut'] >= 400) and not l['protege']:
            morts.append(l)
        elif avant.get('statut', 200) >= 400 and not avant.get('protege') and l['statut'] < 400:
            retablis.append(l)
        if l['redirige'] and not avant.get('redirige'):
            redirections.append(l)

    noms_bible, erreur_bible = catalogue_bible()
    nouveaux_chez_eux, disparus_chez_eux = [], []
    if noms_bible:
        nôtres = {normaliser(t['name'].split('—')[0].split('(')[0]) for t in outils}
        avant_bible = set(ancien.get('bible', []))
        for n in noms_bible:
            if normaliser(n) not in nôtres:
                nouveaux_chez_eux.append(n)
        disparus_chez_eux = sorted(avant_bible - set(noms_bible)) if avant_bible else []
        inedits = sorted(set(noms_bible) - avant_bible) if avant_bible else []
    else:
        inedits = []

    tarifs = relever_tarifs(outils)
    tarifs_avant = {x['slug']: x for x in ancien.get('tarifs', [])}
    # Les grilles ne sont comparables que d'un environnement a lui-meme : depuis
    # un serveur americain, les memes pages servent des dollars et parfois une
    # autre grille. Un changement d'environnement vaut donc nouveau point zero.
    ici = 'ci' if os.environ.get('GITHUB_ACTIONS') else 'local'
    comparable = ancien.get('environnement', ici) == ici
    grilles_modifiees, non_lisibles = [], []
    for x in tarifs:
        avant = tarifs_avant.get(x['slug'])
        if not x['montants']:
            non_lisibles.append(x)
        elif (comparable and avant and avant.get('montants')
              and ecart_significatif(avant['montants'], x['montants'])):
            grilles_modifiees.append({
                **x,
                'entree_avant': prix_entree(avant['montants']),
                'entree_apres': prix_entree(x['montants']),
                'avant': avant['montants'],
                'apparus': [m for m in x['montants'] if m not in avant['montants']][:8],
                'disparus': [m for m in avant['montants'] if m not in x['montants']][:8],
            })

    saisie = ancien.get('tarifs_verifies_le', {})
    a_revoir = sorted([t for t in outils if t['slug'] in {x['slug'] for x in non_lisibles}],
                      key=lambda t: (saisie.get(t['slug'], '2026-09'), t['name']))[:10]

    resultat = {
        'date': AUJOURD_HUI,
        'liens_morts': morts,
        'liens_retablis': retablis,
        'redirections': redirections,
        'bible_erreur': erreur_bible,
        'bible_total': len(noms_bible) if noms_bible else 0,
        'bible_absents_chez_nous': sorted(nouveaux_chez_eux),
        'bible_ajouts_du_mois': inedits,
        'bible_retraits_du_mois': disparus_chez_eux,
        'tarifs_comparables': comparable,
        'tarifs_lisibles': len(tarifs) - len(non_lisibles),
        'tarifs_total': len(tarifs),
        'tarifs_grilles_modifiees': grilles_modifiees,
        'tarifs_a_revoir': [{'slug': t['slug'], 'nom': t['name'],
                             'vu_le': saisie.get(t['slug'], '2026-09'),
                             'tarif': t['prixDetail']} for t in a_revoir],
    }

    json.dump({'date': AUJOURD_HUI, 'environnement': ici, 'liens': liens, 'tarifs': tarifs,
               'bible': noms_bible or ancien.get('bible', []),
               'tarifs_verifies_le': saisie},
              open(ETAT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return resultat


def afficher(r):
    print(f"\n═══ Veille annuaire IA — {r['date']} ═══\n")
    if r['liens_morts']:
        print(f"⚠️  {len(r['liens_morts'])} lien(s) mort(s) — à corriger dans data/ia-tools.json :")
        for l in r['liens_morts']:
            print(f"   · {l['nom']:22} HTTP {l['statut']}  {l['url']}")
    else:
        print("✓ Aucun lien mort.")
    if r['liens_retablis']:
        print(f"\n✓ {len(r['liens_retablis'])} lien(s) de nouveau joignable(s) : "
              + ', '.join(l['nom'] for l in r['liens_retablis']))
    if r['redirections']:
        print(f"\n⚠️  {len(r['redirections'])} changement(s) de domaine — souvent un renommage "
              "ou un rachat, à répercuter dans le nom et le texte de la fiche :")
        for l in r['redirections']:
            print(f"   · {l['nom']:22} {l['url']}\n     → {l['final']}\n       « {l['titre']} »")
    else:
        print("\n✓ Aucun changement de domaine.")

    print()
    if r['bible_erreur']:
        print(f"⚠️  Bible des IA : {r['bible_erreur']}")
    else:
        print(f"Bible des IA : {r['bible_total']} outils publiés.")
        if r['bible_ajouts_du_mois']:
            print(f"   Ajoutés depuis le dernier passage : {', '.join(r['bible_ajouts_du_mois'][:20])}")
        if r['bible_retraits_du_mois']:
            print(f"   Retirés depuis le dernier passage : {', '.join(r['bible_retraits_du_mois'][:20])}")
        n = len(r['bible_absents_chez_nous'])
        print(f"   {n} outil(s) chez eux et pas chez nous (couverture, pas une obligation) :")
        print('   ' + ', '.join(r['bible_absents_chez_nous'][:25]) + ('…' if n > 25 else ''))

    print(f"\nTarifs relevés chez l'éditeur : {r['tarifs_lisibles']}/{r['tarifs_total']} grilles lues.")
    if r['tarifs_grilles_modifiees']:
        print(f"⚠️  {len(r['tarifs_grilles_modifiees'])} grille(s) modifiée(s) depuis le dernier passage "
              "— à répercuter dans data/ia-tools.json :")
        for x in r['tarifs_grilles_modifiees']:
            print(f"   · {x['nom']:22} prix d'entrée {x['entree_avant']} → {x['entree_apres']}")
            print(f"     {x['source']}")
            if x['apparus']:
                print(f"     nouveaux montants : {', '.join(x['apparus'])}")
            if x['disparus']:
                print(f"     montants disparus : {', '.join(x['disparus'])}")
    elif not r['tarifs_comparables']:
        print("· Relevé de référence reconstruit depuis un autre environnement "
              "(devise et grille différentes) : comparaison reprise au prochain passage.")
    else:
        print("✓ Aucune grille tarifaire modifiée depuis le dernier passage.")

    if r['tarifs_a_revoir']:
        print("\nÉditeurs dont la grille n'est pas lisible automatiquement "
              "(page en JavaScript ou pare-feu) — à revoir à la main, par rotation :")
        for t in r['tarifs_a_revoir']:
            print(f"   · {t['nom']:22} (saisi {t['vu_le']}) {t['tarif'][:58]}")
    print()


def a_signaler(r):
    """Y a-t-il quelque chose qui demande une intervention humaine ?"""
    return bool(r['liens_morts'] or r['redirections'] or r['tarifs_grilles_modifiees']
                or r['bible_erreur'])


def markdown(r):
    """Rapport en Markdown, pour le corps d'une issue GitHub."""
    l = [f"Veille automatique du {r['date']} — `veille_annuaire.py`.", '']
    if r['liens_morts']:
        l.append(f"### {len(r['liens_morts'])} lien(s) mort(s)")
        l += [f"- **{x['nom']}** — HTTP {x['statut']} — {x['url']}" for x in r['liens_morts']] + ['']
    if r['redirections']:
        l.append(f"### {len(r['redirections'])} changement(s) de domaine")
        l.append("Souvent un renommage ou un rachat : à répercuter dans `url`, `name`, "
                 "`editeur` et le texte de la fiche, en gardant le slug d'origine.")
        l += [f"- **{x['nom']}** — {x['url']} → {x['final']}\n  - titre de la page : « {x['titre']} »"
              for x in r['redirections']] + ['']
    if r['tarifs_grilles_modifiees']:
        l.append(f"### {len(r['tarifs_grilles_modifiees'])} grille(s) tarifaire(s) modifiée(s)")
        l.append("Montants extraits sans contexte : ouvrir la page avant de corriger `prixDetail`.")
        for x in r['tarifs_grilles_modifiees']:
            l.append(f"- **{x['nom']}** — prix d'entrée {x['entree_avant']} → "
                     f"**{x['entree_apres']}** — {x['source']}")
            if x['apparus']:
                l.append(f"  - apparus : {', '.join(x['apparus'])}")
            if x['disparus']:
                l.append(f"  - disparus : {', '.join(x['disparus'])}")
        l.append('')
    if r['bible_erreur']:
        l.append(f"### Concurrent illisible\n{r['bible_erreur']}\n")
    if r['bible_ajouts_du_mois']:
        l.append("### Ajouts du mois chez avantagedigital.fr")
        l.append(', '.join(r['bible_ajouts_du_mois'][:30]) + '\n')
    l.append(f"---\nTarifs relevés : {r['tarifs_lisibles']}/{r['tarifs_total']} grilles lisibles. "
             f"Couverture : {len(r['bible_absents_chez_nous'])} outils chez le concurrent et pas chez nous.")
    l.append("\nAprès correction de `data/ia-tools.json` : `python3 generate_og_images.py` "
             "puis `python3 generate_ia_pages.py`.")
    return '\n'.join(l)


if __name__ == '__main__':
    r = rapport()
    if '--json' in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=1))
    elif '--markdown' in sys.argv:
        print(markdown(r))
    else:
        afficher(r)
    if '--code-sortie' in sys.argv:
        sys.exit(1 if a_signaler(r) else 0)
