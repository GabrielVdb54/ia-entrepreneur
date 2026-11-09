#!/usr/bin/env python3
"""Génère la boîte à skills : la page skills-ia-gratuits.html et les fichiers à télécharger skills/<slug>.zip.

Demande de Gabriel (09/11/2026) : une page où l'on télécharge gratuitement des skills pour Claude,
ChatGPT et les autres, adaptés à son métier. Décisions du même jour :
  - une page générale (l'adresse donnée dans les vidéos et les messages) et un bloc de skills sur
    chaque page métier (bloc_metier(), appelé par generer_pages_metiers.py) ;
  - le texte d'un skill ne vit que sur la page générale ; les pages métier montrent la carte et le lien ;
  - chaque skill en deux versions : le fichier (dossier avec un SKILL.md, standard ouvert Agent Skills)
    et la version texte à coller dans un assistant qui ne gère pas les skills ;
  - aucun script dans les skills, rien que du texte lisible ; aucun temps gagné chiffré.

La source d'un skill est skills/<slug>/SKILL.md : on le modifie là, puis on relance ce script.
L'exemple de chaque carte vient de skills/<slug>/exemple-entree.txt (cas inventé) et
skills/<slug>/exemple-sortie.md (ce que l'IA a vraiment rendu avec le skill, sans retouche
de fond). Les zip sont reproductibles : même contenu, mêmes octets.
Usage : python3 generer_boite_skills.py (depuis la racine du dépôt). Idempotent.
"""
import html, json, re, sys, zipfile
from pathlib import Path

RACINE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
sys.dont_write_bytecode = True  # pas de __pycache__ : Vercel servirait tout le dossier
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generer_pages_villes import GABARIT, SITE, FLECHE, CHEVRON, texte, faq_html
from nettoyage_typo import nettoie_texte

SLUG_PAGE = 'skills-ia-gratuits.html'
DOSSIER = RACINE / 'skills'
DATE_ZIP = (2026, 11, 9, 0, 0, 0)

METIERS = {
    'btp': ('BTP', '/formation-ia-btp.html'),
    'proprete': ('Propreté', '/formation-ia-proprete.html'),
}

# Ordre d'affichage. « metiers » décide sur quelles pages métier la carte apparaît.
SKILLS = [
    dict(slug='compte-rendu-chantier', metiers=['btp'],
         titre='Le compte rendu de chantier',
         resume="Vos notes de réunion de chantier, dictées en sortant, deviennent un compte rendu en ordre et le mail qui l'accompagne.",
         donne='vos notes ou votre dictée, même en vrac.',
         rend="les présents, l'avancement par lot, les réserves, les décisions, les actions avec qui et quand, la prochaine réunion, le mail de diffusion et la liste de ce qu'il reste à vérifier.",
         reste='relire les noms, les dates et les réserves avant l\'envoi.'),
    dict(slug='devis-apres-visite-btp', metiers=['btp'],
         titre='Le devis après la visite',
         resume='Vos notes de visite chez un client remises en ordre pour préparer le devis.',
         donne='vos notes ou votre dictée de visite.',
         rend='le descriptif par zone ou par lot, un tableau de désignations à reprendre dans votre logiciel, les points techniques à vérifier, les questions au client et le mail.',
         reste='les quantités, les prix, la marge et le délai : le skill ne chiffre jamais.'),
    dict(slug='analyse-appel-offres', metiers=['btp', 'proprete'],
         titre="Lire un dossier d'appel d'offres",
         resume="Le règlement, le CCTP et le CCAP résumés pour décider vite d'y aller ou non. Chaque point renvoie à son article.",
         donne='les documents du dossier, en PDF ou en texte collé.',
         rend="le calendrier, les critères et leur pondération, les pièces à fournir en liste à cocher, les exigences, les clauses à surveiller, les questions à poser à l'acheteur et les éléments pour décider.",
         reste="revenir au texte d'origine pour chaque point qui compte, puis décider."),
    dict(slug='devis-plan-nettoyage', metiers=['proprete'],
         titre='Le devis et le plan de nettoyage après une visite',
         resume="Vos notes de visite d'un site deviennent la fiche site, le plan de nettoyage par zone et le courrier du devis.",
         donne='vos notes ou votre dictée de visite.',
         rend="la fiche site, le descriptif par zone, le plan de nettoyage avec les fréquences, les prestations ponctuelles, les questions au client et le courrier d'accompagnement.",
         reste="les heures, les cadences, l'effectif et le prix, dans votre outil de devis."),
    dict(slug='consignes-de-site', metiers=['proprete'],
         titre='Des consignes de site que chaque agent comprend',
         resume="Les consignes d'un site en français simple, en version complète et en une page, puis traduites dans la langue de l'agent.",
         donne='ce que vous savez du site (notes, ancienne fiche, cahier des charges) et la langue voulue.',
         rend="la fiche complète, la version courte d'une page et sa traduction, sans aucun code d'accès recopié.",
         reste='faire relire la traduction par une personne qui parle la langue, et valider les produits et la sécurité.'),
    dict(slug='reponse-reclamation-client', metiers=['proprete', 'btp'],
         titre='Répondre à une réclamation client',
         resume='Une réponse posée et précise à un client mécontent, qui ne reconnaît aucune faute avant vérification.',
         donne="le mail ou l'avis du client, et ce que vous savez : relevé de passage, contrat, notes.",
         rend='ce que reproche le client et le risque, les faits à vérifier, la réponse prête à envoyer, la variante si le client a raison et une réponse publique pour un avis Google.',
         reste="vérifier les faits sur place et décider d'un éventuel geste commercial."),
]


# ---------------------------------------------------------------- lecture des skills

def lire_skill(slug):
    brut = (DOSSIER / slug / 'SKILL.md').read_text()
    m = re.match(r'---\n(.*?)\n---\n', brut, re.S)
    assert m, f'{slug} : frontmatter absent'
    entete = {k: v.strip().strip('"') for k, v in re.findall(r'^(\w+): (.*)$', m.group(1), re.M)}
    assert entete.get('name') == slug, f'{slug} : name différent du dossier'
    assert re.fullmatch(r'[a-z0-9-]{1,64}', slug)
    # Claude refuse une description de plus de 200 caractères (le standard en permet 1 024), et un
    # « : » hors guillemets casse le YAML strict : la description reste courte et entre guillemets.
    assert 0 < len(entete.get('description', '')) <= 200, f'{slug} : description vide ou de plus de 200 caractères'
    assert re.search(r'^description: ".*"$', m.group(1), re.M), f'{slug} : description sans guillemets'
    corps = brut[m.end():].strip() + '\n'
    for signe in '—–·→←↗':
        assert signe not in brut, f'{slug} : signe interdit {signe}'
    return brut, entete, corps


def ecrire_zip(slug, brut):
    """Un dossier <slug>/SKILL.md dans le zip, horodatage fixe : le zip ne change que si le skill change."""
    chemin = DOSSIER / f'{slug}.zip'
    info = zipfile.ZipInfo(f'{slug}/SKILL.md', date_time=DATE_ZIP)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    with zipfile.ZipFile(chemin, 'w') as z:
        z.writestr(info, brut.encode())
    return chemin


# ---------------------------------------------------------------- Markdown de l'exemple

def _inline(t):
    t = html.escape(nettoie_texte(t), quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    return t


def md_html(md):
    """Le Markdown que rend l'IA (titres, gras, tableaux, listes, citations, cases à cocher), sans dépendance."""
    md = re.sub(r'(\d+ ?h(?: ?\d+)?)\s*[–—]\s*(\d)', r'\1 à \2', md)  # « 6 h – 7 h 30 »
    lignes = md.split('\n')
    out, i = [], 0
    while i < len(lignes):
        l = lignes[i]
        if not l.strip():
            i += 1
            continue
        if re.match(r'^-{3,}\s*$', l):
            out.append('<hr>'); i += 1; continue
        m = re.match(r'^(#{1,4})\s+(.*)', l)
        if m:
            niveau = min(len(m.group(1)) + 3, 6)
            out.append(f'<h{niveau}>{_inline(m.group(2))}</h{niveau}>'); i += 1; continue
        if l.lstrip().startswith('|'):
            bloc = []
            while i < len(lignes) and lignes[i].lstrip().startswith('|'):
                bloc.append(lignes[i].strip()); i += 1
            cellules = [[c.strip() for c in b.strip('|').split('|')] for b in bloc if not re.match(r'^\|[\s:|-]+\|$', b)]
            tete, *rangs = cellules
            out.append('<div class="sk-tableau"><table><thead><tr>' + ''.join(f'<th>{_inline(c)}</th>' for c in tete)
                       + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{_inline(c)}</td>' for c in r) + '</tr>' for r in rangs)
                       + '</tbody></table></div>')
            continue
        if l.startswith('>'):
            bloc = []
            while i < len(lignes) and lignes[i].startswith('>'):
                bloc.append(lignes[i][1:].strip()); i += 1
            paras = '\n'.join(bloc).split('\n\n')
            out.append('<blockquote>' + ''.join('<p>' + '<br>'.join(_inline(x) for x in p.split('\n')) + '</p>' for p in paras if p.strip()) + '</blockquote>')
            continue
        m = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', l)
        if m:
            ordonnee = m.group(2)[0].isdigit()
            items = []
            while i < len(lignes):
                m2 = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', lignes[i])
                if not m2:
                    break
                contenu = m2.group(3)
                case = re.match(r'^\[( |x)\]\s+(.*)', contenu)
                if case:
                    contenu = ('☐ ' if case.group(1) == ' ' else '✓ ') + case.group(2)
                items.append(('  ' if m2.group(1) else '') + contenu); i += 1
            balise = 'ol' if ordonnee else 'ul'
            out.append(f'<{balise}>' + ''.join(f'<li{" class=sk-sous" if it.startswith("  ") else ""}>{_inline(it.strip())}</li>' for it in items) + f'</{balise}>')
            continue
        bloc = []
        while i < len(lignes) and lignes[i].strip() and not re.match(r'^(#{1,4}\s|\||>|\s*([-*]|\d+\.)\s|-{3,}\s*$)', lignes[i]):
            bloc.append(lignes[i].strip()); i += 1
        out.append('<p>' + '<br>'.join(_inline(x) for x in bloc) + '</p>')
    return '\n'.join(out)


# ---------------------------------------------------------------- blocs de la page

CSS = """
  /* Boîte à skills (skills-ia-gratuits.html), 09/11/2026 */
  /* même réglage que les pages métier : les liens envoyés en prospection visent une carte (#slug) ;
     le défilement doux du gabarit, coupé par le démarrage de GSAP, laissait l'arrivée dans le hero */
  html{scroll-padding-top:72px;scroll-behavior:auto}
  .sk-lien{color:var(--primary);font-weight:700;text-decoration:underline;text-underline-offset:2px}
  .sk-demo{background:#fff;border:1px solid var(--border);border-radius:18px;padding:18px;display:grid;gap:12px;box-shadow:0 10px 30px rgba(10,15,44,.06)}
  .sk-demo-etiquette{display:block;font-size:.74rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .sk-demo-avant{background:#F5F7FF;border-radius:12px;padding:14px 16px;font-size:.92rem;line-height:1.6;color:var(--muted)}
  .sk-demo-avant p{margin:0}
  .sk-demo-apres{padding:4px 4px 0}
  .sk-demo-apres b{display:block;font-size:.98rem;margin-bottom:8px}
  .sk-demo table{width:100%;border-collapse:collapse;font-size:.84rem}
  .sk-demo th,.sk-demo td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:top}
  .sk-demo th{font-weight:800;color:var(--muted);font-size:.76rem}
  .sk-demo-verif{margin:10px 0 0;font-size:.84rem;font-weight:700;color:var(--accent-text,#0B7A57)}
  .sk-demo-legende{margin:10px 0 0;font-size:.8rem;color:var(--muted)}
  .sk-section{padding:70px 0}
  .sk-section.alt{background:var(--card)}
  .sk-filtres{display:flex;flex-wrap:wrap;gap:8px;margin:-24px 0 26px}
  .sk-filtres button{font:inherit;font-size:.9rem;font-weight:700;padding:8px 16px;border-radius:999px;border:1px solid var(--border);background:#fff;color:var(--text);cursor:pointer}
  .sk-filtres button[aria-pressed="true"]{background:var(--text);border-color:var(--text);color:#fff}
  .sk-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;align-items:start}
  .sk-carte{background:#fff;border:1px solid var(--border);border-radius:16px;padding:24px 24px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}
  .sk-carte details,.sk-exemple,.sk-sortie{min-width:0;max-width:100%}
  .sk-texte,.sk-entree{overflow-wrap:anywhere}
  .sk-carte[hidden]{display:none}
  .sk-metiers{font-size:.76rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--primary)}
  .sk-carte h3{font-size:1.15rem;line-height:1.3;margin:0}
  .sk-carte > p{margin:0;font-size:.97rem;line-height:1.6}
  .sk-io{margin:0;display:grid;gap:8px;font-size:.92rem;line-height:1.55}
  .sk-io div{margin:0}
  .sk-io dt{display:inline;font-weight:800}
  .sk-io dd{display:inline;margin:0}
  .sk-io .sk-reste{color:var(--muted)}
  .sk-actions{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-top:4px}
  .sk-actions .btn-primary{padding:11px 20px;font-size:.9rem}
  .sk-copier{font:inherit;font-size:.9rem;font-weight:700;padding:10px 16px;border-radius:999px;border:1.5px solid var(--text);background:#fff;color:var(--text);cursor:pointer}
  .sk-formats{margin:0;font-size:.82rem;color:var(--muted);line-height:1.55}
  .sk-formats a{color:var(--muted);text-decoration:underline;text-underline-offset:2px}
  .sk-copier.ok{border-color:var(--accent);color:var(--accent-text,#0B7A57)}
  .sk-carte details{border-top:1px solid var(--border);padding-top:10px}
  .sk-carte summary{cursor:pointer;font-weight:700;font-size:.92rem;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .sk-carte summary::-webkit-details-marker{display:none}
  .sk-carte summary svg{flex:none;transition:transform .2s}
  .sk-carte details[open] summary svg{transform:rotate(180deg)}
  .sk-texte{white-space:pre-wrap;font:inherit;font-size:.84rem;line-height:1.6;background:#F5F7FF;border-radius:10px;padding:14px;margin:10px 0 0;max-height:420px;overflow:auto}
  .sk-exemple{margin-top:10px;font-size:.88rem;line-height:1.6}
  .sk-exemple .sk-entree{background:#F5F7FF;border-radius:10px;padding:12px 14px;white-space:pre-wrap;color:var(--muted);max-height:260px;overflow:auto}
  .sk-exemple .sk-sortie{border:1px solid var(--border);border-radius:10px;padding:4px 14px 12px;max-height:520px;overflow:auto;margin-top:10px}
  .sk-exemple h4,.sk-exemple h5,.sk-exemple h6{font-size:.95rem;margin:14px 0 6px}
  .sk-exemple p,.sk-exemple ul,.sk-exemple ol,.sk-exemple blockquote{margin:6px 0}
  .sk-exemple ul,.sk-exemple ol{padding-left:20px}
  .sk-exemple li.sk-sous{margin-left:16px}
  .sk-exemple blockquote{border:1px solid var(--border);border-radius:8px;padding:6px 12px;background:#fff}
  .sk-exemple hr{border:0;border-top:1px solid var(--border);margin:12px 0}
  .sk-tableau{overflow-x:auto;margin:8px 0}
  .sk-tableau table{border-collapse:collapse;font-size:.82rem;min-width:100%}
  .sk-tableau th,.sk-tableau td{border:1px solid var(--border);padding:5px 7px;text-align:left;vertical-align:top}
  .sk-tableau th{background:#F5F7FF}
  .sk-legende{font-size:.82rem;color:var(--muted);margin:6px 0 0}
  .sk-outils{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
  .sk-outil{background:#fff;border:1px solid var(--border);border-radius:16px;padding:22px}
  .sk-outil h3{font-size:1.05rem;margin:0 0 4px}
  .sk-outil .sk-offres{font-size:.85rem;color:var(--muted);margin:0 0 10px}
  .sk-outil ol{margin:0;padding-left:20px;font-size:.93rem;line-height:1.6}
  .sk-outil li{margin:4px 0}
  .sk-outil .sk-note{font-size:.85rem;color:var(--muted);margin:10px 0 0;line-height:1.55}
  .sk-sources{margin-top:18px;font-size:.84rem;color:var(--muted);line-height:1.6}
  .sk-sources a{color:var(--muted);text-decoration:underline;text-underline-offset:2px}
  @media (max-width:600px){.sk-section{padding:50px 0}.sk-grille{grid-template-columns:1fr}.sk-carte{padding:20px 18px 16px}.sk-filtres{margin-top:-30px}}
"""


def hero():
    return f'''
  <section class="imm-outil-hero">
    <div class="container imm-outil-hero-grille">
      <div class="imm-outil-hero-texte">
        <h1>Des skills IA gratuits pour votre métier</h1>
        <p class="imm-pour">Pour vos <span class="imm-rotatif" data-mots="comptes rendus de chantier|devis après visite|appels d'offres|consignes de site|réponses aux réclamations">comptes rendus de chantier</span></p>
        <p class="lead">Un skill est une consigne écrite une fois pour toutes. Vous donnez vos notes en vrac, l'IA rend un document en ordre, avec ce qu'il vous reste à vérifier. Installez-le dans Claude ou Gemini en une minute, ou copiez sa version texte dans ChatGPT, Mistral ou Copilot.</p>
        <div class="imm-voie-actions" style="margin-top:0">
          <a href="#skills" class="btn-primary">Voir les skills {FLECHE}</a>
          <a href="#installer" class="imm-lien">Comment l'installer</a>
        </div>
        <ul class="imm-outil-faits"><li>Gratuits, sans inscription</li><li>Du texte que vous pouvez lire, aucun code</li><li>Testés sur des cas de BTP et de propreté</li></ul>
      </div>
      <figure class="sk-demo" style="margin:0">
        <div class="sk-demo-avant"><span class="sk-demo-etiquette">Vos notes, dictées en sortant</span><p>« bon alors réunion de chantier numéro 7 ce matin, résidence Les Tilleuls à Laxou [...] Karim dit fin de semaine prochaine [...] le garde-corps provisoire au R+2 côté rue a été retiré, Karim doit le remettre aujourd'hui [...] »</p></div>
        <div class="sk-demo-apres"><span class="sk-demo-etiquette">Ce que l'IA rend avec le skill</span><b>Compte rendu n° 7, résidence Les Tilleuls</b>
          <table><thead><tr><th>Action</th><th>Qui</th><th>Pour quand</th></tr></thead><tbody>
            <tr><td>Remettre en place le garde-corps provisoire au R+2 côté rue</td><td>Karim (Batiroc)</td><td>Aujourd'hui</td></tr>
            <tr><td>Réaliser le constat de l'infiltration, cage d'escalier côté nord</td><td>[qui ?]</td><td>Avant la prochaine réunion</td></tr>
            <tr><td>Relancer Plâtres de l'Est pour caler l'intervention</td><td>Rédacteur</td><td>[date ?]</td></tr>
          </tbody></table>
          <p class="sk-demo-verif">Puis la liste « À vérifier avant envoi » : 16 points</p>
        </div>
        <figcaption class="sk-demo-legende">Cas inventé pour l'exemple. Le résultat est celui que l'IA a rendu avec le skill «&nbsp;Compte rendu de chantier&nbsp;».</figcaption>
      </figure>
    </div>
  </section>
'''


def principe():
    cartes = [
        ("Une consigne écrite une fois", "Le skill dit à l'IA quoi produire, dans quel ordre, et surtout ce qu'elle ne doit jamais inventer : un prix, une date, une quantité, un nom."),
        ("Vos notes en entrée", "Vous dictez ou collez vos notes, le dossier reçu, le mail du client. Pas besoin de bien formuler la demande : le skill s'en charge."),
        ("Un document à relire", "L'IA rend un document en ordre. Là où une information manque, elle écrit [À COMPLÉTER] au lieu de deviner, puis liste ce qu'il vous reste à vérifier."),
    ]
    c = '\n'.join(f'          <div class="imm-limite"><h3>{h}</h3><p>{p}</p></div>' for h, p in cartes)
    return f'''
  <section class="imm-limites-section" id="principe">
    <div class="container">
      <h2 class="section-title">Un skill, comment ça marche ?</h2>
      <p class="section-sub">C'est un fichier texte qui apprend à votre assistant IA une tâche précise de votre métier. Une fois installé, il sert à chaque fois que vous en avez besoin. Dans Claude, ChatGPT, Gemini et Copilot en français, les skills s'appellent des « compétences ».</p>
      <div class="imm-limites">
{c}
      </div>
    </div>
  </section>
'''


def carte(s, corps, entree, sortie):
    metiers = ', '.join(METIERS[m][0] for m in s['metiers'])
    return f'''        <article class="sk-carte" id="{s['slug']}" data-metiers="{' '.join(s['metiers'])}">
          <span class="sk-metiers">{metiers}</span>
          <h3>{s['titre']}</h3>
          <p>{s['resume']}</p>
          <dl class="sk-io">
            <div><dt>Vous lui donnez :</dt> <dd>{s['donne']}</dd></div>
            <div><dt>Il vous rend :</dt> <dd>{s['rend']}</dd></div>
            <div class="sk-reste"><dt>Reste à vous :</dt> <dd>{s['reste']}</dd></div>
          </dl>
          <div class="sk-actions">
            <a class="btn-primary" href="/skills/{s['slug']}.zip" download data-skill="{s['slug']}">Télécharger le skill (.zip)</a>
            <button type="button" class="sk-copier" data-cible="texte-{s['slug']}" data-skill="{s['slug']}">Copier la version texte</button>
          </div>
          <p class="sk-formats">Le .zip pour Claude. Le <a href="/skills/{s['slug']}/SKILL.md" download="SKILL.md" data-skill="{s['slug']}">fichier SKILL.md seul</a> pour Gemini et Copilot. La version texte pour ChatGPT et Mistral.</p>
          <details>
            <summary>Voir un exemple{CHEVRON}</summary>
            <div class="sk-exemple">
              <p class="sk-legende">Ce qu'on lui a donné (cas inventé) :</p>
              <div class="sk-entree">{html.escape(entree, quote=False)}</div>
              <p class="sk-legende" style="margin-top:12px">Ce que l'IA a rendu avec le skill :</p>
              <div class="sk-sortie">
{sortie}
              </div>
            </div>
          </details>
          <details>
            <summary>Lire le skill en entier{CHEVRON}</summary>
            <pre class="sk-texte" id="texte-{s['slug']}">{html.escape(corps, quote=False)}</pre>
          </details>
        </article>'''


def section_skills(cartes):
    boutons = ''.join(f'<button type="button" data-filtre="{k}" aria-pressed="false">{v[0]}</button>' for k, v in METIERS.items())
    return f'''
  <section class="sk-section" id="skills">
    <div class="container">
      <h2 class="section-title">Les skills, métier par métier</h2>
      <p class="section-sub">Chaque skill existe en deux versions : un fichier à installer dans Claude ou Gemini, et un texte à coller dans les autres assistants. Les exemples partent de cas inventés ; les résultats sont ceux que l'IA a vraiment rendus.</p>
      <div class="sk-filtres" role="group" aria-label="Filtrer par métier"><button type="button" data-filtre="" aria-pressed="true">Tous les métiers</button>{boutons}</div>
      <div class="sk-grille">
{cartes}
      </div>
    </div>
  </section>
'''


# Faits vérifiés sur les pages d'aide des éditeurs (voir SOURCES_INSTALL) : à revérifier avant
# chaque modification de cette section, les interfaces changent souvent.
OUTILS = [
    ('Claude', "Toutes les offres, gratuite comprise. Fichier : le .zip.", [
        "Dans Paramètres, puis Capacités, activez « Créer et modifier des fichiers ».",
        "Ouvrez Personnaliser, puis Compétences.",
        "Cliquez sur « + », puis « Créer une compétence » et « Télécharger une compétence ».",
        "Choisissez le fichier .zip, sans le décompresser.",
    ], "Ensuite, collez vos notes : Claude reconnaît la demande et applique le skill. En offre Team ou Enterprise, vous pouvez le partager avec votre équipe ; en Enterprise, c'est le propriétaire du compte qui autorise les compétences."),
    ('Gemini', "Gratuit, avec un compte Google personnel. Fichier : le SKILL.md seul.", [
        "Sur gemini.google.com ou l'application Mac, ouvrez la barre latérale, puis Personnaliser (ou Plus), puis Compétences.",
        "Cliquez sur Créer, puis Importer.",
        "Choisissez le fichier SKILL.md, puis Ouvrir et Créer.",
    ], "Il faut avoir 18 ans et laisser « Conserver l'activité » activé. Les Gems des comptes personnels deviennent des compétences le 17 décembre 2026. Avec un compte Google Workspace d'entreprise, collez la version texte dans un Gem en attendant."),
    ('ChatGPT', "Toutes les offres avec la version texte.", [
        "Créez un projet depuis la barre latérale.",
        "Ouvrez les paramètres du projet et collez la version texte dans ses instructions.",
        "Collez vos notes dans une conversation de ce projet : le skill s'applique à chaque fois.",
    ], "En offre Business ou Enterprise, le skill s'importe aussi : Plugins, Répertoire des plugins, onglet Compétences, Créer, Importer depuis votre ordinateur. Évitez les instructions personnalisées (1 500 caractères au plus en version gratuite, trop court) et les GPT personnalisés, retirés le 11 décembre 2026."),
    ('Mistral Vibe (ex-Le Chat)', "Version texte.", [
        "Ouvrez Contexte, puis Skills, et créez un nouveau skill.",
        "Donnez-lui un titre et une description, puis collez la version texte dans le champ SKILL.md.",
    ], "Le Chat s'appelle Vibe depuis août 2026. Vous pouvez aussi coller la version texte dans les instructions d'un projet."),
    ('Microsoft Copilot', "Comptes professionnels Microsoft 365 Copilot. Fichier : le SKILL.md seul.", [
        "Dans Cowork, ouvrez Personnaliser, puis l'onglet Compétences.",
        "Cliquez sur la flèche à côté de Ajouter, puis Charger une compétence.",
        "Choisissez le fichier SKILL.md.",
    ], "Sans Cowork, collez la version texte dans les instructions d'un agent (Nouvel agent, 8 000 caractères au plus)."),
]
SOURCES_INSTALL = [
    ('Claude', 'https://support.claude.com/fr/articles/12512180'),
    ('ChatGPT', 'https://help.openai.com/en/articles/20001066-skills-in-chatgpt'),
    ('ChatGPT, instructions', 'https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions'),
    ('Gemini', 'https://support.google.com/gemini/answer/17094296?hl=fr'),
    ('Gems', 'https://support.google.com/gemini/answer/18560919?hl=fr'),
    ('Mistral', 'https://docs.mistral.ai/vibe/work/skills'),
    ('Copilot', 'https://learn.microsoft.com/fr-fr/copilot/cowork/cowork-customize'),
]


def installation():
    blocs = []
    for nom, offres, etapes, note in OUTILS:
        li = ''.join(f'<li>{e}</li>' for e in etapes)
        n = f'<p class="sk-note">{note}</p>' if note else ''
        blocs.append(f'        <div class="sk-outil"><h3>{nom}</h3><p class="sk-offres">{offres}</p><ol>{li}</ol>{n}</div>')
    sources = ', '.join(f'<a href="{u}" target="_blank" rel="noopener">{l}</a>' for l, u in SOURCES_INSTALL)
    return f'''
  <section class="sk-section alt" id="installer">
    <div class="container">
      <h2 class="section-title">Comment l'installer</h2>
      <p class="section-sub">Installé dans Claude ou Gemini, le skill se déclenche tout seul quand votre demande correspond : vous n'avez plus qu'à coller vos notes. Ailleurs, la version texte fait le même travail, collée dans un projet.</p>
      <div class="sk-outils">
{chr(10).join(blocs)}
      </div>
      <p class="sk-sources">Démarches vérifiées le 9 novembre 2026 sur les pages d'aide des éditeurs : {sources}. Les menus changent souvent : si un intitulé a bougé, cherchez « skills » ou « instructions » dans les réglages.</p>
    </div>
  </section>
'''


def precautions():
    cartes = [
        ("Relisez toujours", "Le skill limite les erreurs sans les supprimer. Une fois envoyé, le document engage votre entreprise : relisez les noms, les dates et les chiffres."),
        ("Pas de données sensibles dans un outil grand public", "Ne collez ni salaires, ni arrêts maladie, ni sanctions dans la version gratuite d'un assistant. Regardez dans les réglages si vos conversations servent à améliorer les modèles, et désactivez-le si besoin."),
        ("Un fichier que vous pouvez lire", "Nos skills ne contiennent que du texte. Avant d'installer un skill trouvé ailleurs, lisez-le : un skill peut aussi contenir des scripts qui s'exécutent."),
    ]
    c = '\n'.join(f'          <div class="imm-limite"><h3>{h}</h3><p>{p}</p></div>' for h, p in cartes)
    return f'''
  <section class="imm-limites-section" id="precautions">
    <div class="container">
      <h2 class="section-title">Trois précautions</h2>
      <div class="imm-limites">
{c}
      </div>
    </div>
  </section>
'''


FAQ = [
    ("Les skills sont-ils vraiment gratuits ?",
     "Oui. Pas d'inscription, pas d'adresse email demandée. Vous pouvez les modifier pour votre entreprise et les partager librement."),
    ("Skill ou compétence, c'est la même chose ?",
     "Oui. « Skill » est le nom anglais. Claude, ChatGPT, Gemini et Copilot l'affichent « compétence » dans leur interface en français. Tous suivent le même format ouvert : un dossier avec un fichier SKILL.md."),
    ("Est-ce que ça marche avec la version gratuite de ChatGPT ?",
     "Oui, avec la version texte collée dans les instructions d'un projet, ou au début d'une conversation avec vos notes. Les instructions personnalisées de la version gratuite sont limitées à 1 500 caractères, trop court pour un skill. Le fichier s'installe gratuitement dans Claude et dans Gemini."),
    ("Quelle différence entre le fichier et la version texte ?",
     "Le contenu est le même. Installé comme skill dans Claude ou Gemini, il se déclenche tout seul quand votre demande correspond : vous n'avez qu'à coller vos notes. Collée dans un projet, la version texte s'applique à toutes les conversations de ce projet."),
    ("Pourquoi l'IA ne chiffre-t-elle pas le devis ?",
     "Les prix, les quantités et la marge dépendent de vos achats et de vos cadences, que l'IA ne connaît pas. Un prix inventé dans un devis vous engage. Le skill prépare tout le reste et vous laisse le chiffrage."),
    ("Puis-je adapter un skill à mon entreprise ?",
     "Oui. Ouvrez le fichier SKILL.md ou la version texte : c'est du français. Ajoutez vos règles, vos modèles de documents, vos mentions habituelles. C'est ce que nous faisons avec votre équipe en <a class=\"sk-lien\" href=\"/formation-ia-entreprise.html#niveau-2\">formation IA métier (niveau 2)</a>, à partir de vos propres dossiers."),
    ("D'autres métiers vont-ils arriver ?",
     "Oui, nous en préparons pour les agences immobilières, les syndics et la gestion locative, et l'assurance. Si votre métier n'y est pas, dites-nous quelle tâche vous prend le plus de temps."),
]


def faq_section():
    return f'''
  <section class="faq-section" id="faq">
    <div class="container">
      <h2 class="section-title">Vos questions sur les skills</h2>
      <div class="faq-list" style="max-width:820px;margin-top:28px">
{faq_html(FAQ)}
      </div>
    </div>
  </section>
'''


def cta():
    liens = ' et '.join(f'<a class="sk-lien" href="{u}" style="color:inherit">{n.lower() if n != "BTP" else n}</a>' for n, u in METIERS.values())
    return f'''
  <section class="cta-final">
    <div class="container">
      <h2>Des skills construits sur vos propres dossiers</h2>
      <p>Ces skills partent de cas types. En formation, on écrit avec votre équipe ceux qui collent à vos modèles, à vos clients et à vos logiciels. Voir la formation IA pour le {liens}.</p>
      <div class="imm-voie-actions" style="justify-content:center">
        <a href="/rendez-vous.html" class="btn-primary">Réserver un appel de 30 min {FLECHE}</a>
        <a href="/formation-ia-entreprise.html#niveau-2" class="imm-lien">Voir la formation IA métier</a>
      </div>
    </div>
  </section>
'''


SCRIPT = '''
  <script>
  (function () {
    var filtres = document.querySelectorAll('.sk-filtres button');
    var cartes = document.querySelectorAll('.sk-carte');
    function filtrer(m) {
      filtres.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filtre') === m)); });
      cartes.forEach(function (c) { c.hidden = !!m && (' ' + c.getAttribute('data-metiers') + ' ').indexOf(' ' + m + ' ') < 0; });
    }
    filtres.forEach(function (b) { b.addEventListener('click', function () { filtrer(b.getAttribute('data-filtre')); }); });
    function depuisAncre() { var h = (location.hash || '').slice(1); if (h === 'btp' || h === 'proprete') filtrer(h); }
    depuisAncre();
    window.addEventListener('hashchange', depuisAncre);
    function evt(nom, skill) { if (window.gtag) gtag('event', nom, { skill: skill }); }
    document.querySelectorAll('.sk-copier').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.getAttribute('data-cible')).textContent;
        var fini = function () { var l = b.textContent; b.textContent = 'Copié'; b.classList.add('ok'); setTimeout(function () { b.textContent = l; b.classList.remove('ok'); }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(fini, function () { b.closest('.sk-carte').querySelectorAll('details')[1].open = true; });
        else b.closest('.sk-carte').querySelectorAll('details')[1].open = true;
        evt('skill_copie', b.getAttribute('data-skill'));
      });
    });
    document.querySelectorAll('.sk-carte a[download]').forEach(function (a) {
      a.addEventListener('click', function () { evt('skill_telechargement', a.getAttribute('data-skill')); });
    });
  })();
  </script>
'''


def bloc_metier(metier):
    """Bloc des pages métier : les cartes du métier, avec un lien vers la page générale (pas de texte en double)."""
    # d'abord les skills propres au métier, puis ceux qu'il partage avec un autre
    choisis = sorted((s for s in SKILLS if metier in s['metiers']), key=lambda s: s['metiers'].index(metier))
    nom = METIERS[metier][0]
    c = '\n'.join(
        f'          <div class="fiche-tache"><h3>{s["titre"]}</h3><p>{s["resume"]}</p>'
        f'<p class="fiche-reste"><b>Reste à vous :</b> {s["reste"]}</p>'
        f'<a class="metier-lien" href="/{SLUG_PAGE}#{s["slug"]}">Télécharger ce skill</a></div>'
        for s in choisis)
    return f'''
  <section class="fiche-section" id="skills" style="background:#fff">
    <div class="container">
      <h2 class="section-title">Des skills gratuits pour commencer dès aujourd'hui</h2>
      <p class="section-sub">Un skill est une consigne prête à l'emploi pour Claude, ChatGPT ou un autre assistant : vous donnez vos notes, l'IA rend un document en ordre et vous dit ce qu'il reste à vérifier. Gratuits, sans inscription.</p>
      <div class="fiche-grille">
{c}
      </div>
      <p style="margin-top:22px"><a class="imm-lien" href="/{SLUG_PAGE}#{metier}">Voir tous les skills {nom.lower() if nom != "BTP" else nom} et comment les installer</a></p>
    </div>
  </section>
'''


# ---------------------------------------------------------------- page

TITRE = 'Skills IA gratuits par métier : BTP, propreté'
DESC = ("Skills gratuits pour Claude, Gemini, ChatGPT : compte rendu de chantier, devis, "
        "appel d'offres, consignes de site. Testés, sans code, sans inscription.")
IMAGE = 'formation-ia-equipes.jpg'


def jsonld(textes):
    url = f'{SITE}/{SLUG_PAGE}'
    fil = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Skills IA gratuits", "item": url}]}
    liste = {"@context": "https://schema.org", "@type": "ItemList", "name": "Skills IA gratuits par métier", "url": url,
             "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {
                 "@type": "CreativeWork", "name": texte(s['titre']), "description": texte(s['resume']),
                 "url": f"{url}#{s['slug']}", "inLanguage": "fr", "isAccessibleForFree": True,
                 "encodingFormat": "text/markdown", "audience": {"@type": "BusinessAudience",
                 "audienceType": ', '.join(METIERS[m][0] for m in s['metiers'])},
                 "publisher": {"@type": "Organization", "name": "IA-Entrepreneur", "url": SITE}}}
                 for i, s in enumerate(SKILLS)]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": texte(q), "acceptedAnswer": {"@type": "Answer", "text": texte(r)}} for q, r in FAQ]}
    return '\n'.join(f'  <script type="application/ld+json">{json.dumps(o, ensure_ascii=False, separators=(",", ":"))}</script>'
                     for o in (fil, liste, faq))


def page(cartes_html):
    t = GABARIT
    assert len(TITRE) <= 60, len(TITRE)
    assert len(DESC) <= 158, len(DESC)
    url = f'{SITE}/{SLUG_PAGE}'
    img = f'{SITE}/images/{IMAGE}'
    rempl = [
        (r'<title>.*?</title>', f'<title>{TITRE}</title>'),
        (r'<meta name="description" content="[^"]*"/>', f'<meta name="description" content="{DESC}"/>'),
        (r'<link rel="canonical" href="[^"]*"/>', f'<link rel="canonical" href="{url}"/>'),
        (r'<meta property="og:title" content="[^"]*"/>', f'<meta property="og:title" content="{TITRE}"/>'),
        (r'<meta property="og:description" content="[^"]*"/>', f'<meta property="og:description" content="{DESC}"/>'),
        (r'<meta property="og:url" content="[^"]*"/>', f'<meta property="og:url" content="{url}"/>'),
        (r'<meta property="og:image" content="[^"]*"/>', f'<meta property="og:image" content="{img}"/>'),
        (r'<meta name="twitter:title" content="[^"]*"/>', f'<meta name="twitter:title" content="{TITRE}"/>'),
        (r'<meta name="twitter:description" content="[^"]*"/>', f'<meta name="twitter:description" content="{DESC}"/>'),
        (r'<meta name="twitter:image" content="[^"]*"/>', f'<meta name="twitter:image" content="{img}"/>'),
    ]
    for motif, rep in rempl:
        t, n = re.subn(motif, lambda m: rep, t, count=1)
        assert n == 1, motif
    t = re.sub(r'\n  <script type="application/ld\+json">.*?</script>', '', t, flags=re.S)
    t = t.replace(f'<meta name="twitter:image" content="{img}"/>', f'<meta name="twitter:image" content="{img}"/>\n' + jsonld(None), 1)
    t = t.replace('</style>', CSS + '</style>', 1)
    debut = t.index('  <section class="imm-outil-hero">')
    fin = t.index('<footer>')
    corps = (hero() + principe() + section_skills(cartes_html) + installation() + precautions()
             + faq_section() + cta() + SCRIPT)
    return t[:debut] + corps.lstrip('\n') + '\n' + t[fin:]


def main():
    cartes = []
    for s in SKILLS:
        brut, entete, corps = lire_skill(s['slug'])
        ecrire_zip(s['slug'], brut)
        dossier = DOSSIER / s['slug']
        entree = (dossier / 'exemple-entree.txt').read_text().strip()
        sortie = md_html((dossier / 'exemple-sortie.md').read_text())
        cartes.append(carte(s, corps, entree, sortie))
    (RACINE / SLUG_PAGE).write_text(page('\n'.join(cartes)))
    print('écrit', SLUG_PAGE, len(TITRE), len(DESC), '+', len(SKILLS), 'zip')


if __name__ == '__main__':
    main()
