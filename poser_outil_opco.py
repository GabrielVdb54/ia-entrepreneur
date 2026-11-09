#!/usr/bin/env python3
"""poser_outil_opco.py — remplace le simulateur de financement par l'outil
« Quel est mon OPCO ? » partout sur le site (09/11/2026).

Gabriel : « toutes les pages où c'est intéressant doivent proposer cet outil,
et aussi une page dédiée ; plus besoin de faire un simulateur, il faut juste
mettre le SIRET ». Ce script :
  1. renvoie tous les liens du simulateur vers /quel-est-mon-opco.html, avec
     un libellé qui dit ce qu'on obtient (menus, pieds de page, boutons,
     phrases d'articles, scripts générateurs et copies des nœuds n8n) ;
  2. pose le bloc de l'outil (outil-opco.js) à la place de l'appel au
     simulateur des pages de formation, sur les pages de formation qui n'en
     avaient pas, sur l'accueil et dans la partie « financement » des
     articles qui en parlent ;
  3. charge /outil-opco.js sur chaque page qui porte le bloc.
Les pages villes et la page dédiée sont générées : relancer ensuite
generer_pages_villes.py puis generer_page_opco.py. Idempotent.
"""
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent
ANCIEN = 'simulateur-financement-formation-ia.html'
NOUVEAU = 'quel-est-mon-opco.html'
SCRIPT = '<script defer src="/outil-opco.js"></script>'

# Libellé du lien → nouveau libellé (le texte cliquable doit dire ce qu'on obtient).
LIBELLES = {
    'Financer ma formation': 'Mon budget formation',
    'Simulateur de financement': 'Quel est mon OPCO ?',
    'Simuler mon financement OPCO': 'Trouver mon OPCO et mon budget',
    'Simuler mon financement': 'Trouver mon OPCO',
    'Estimer mon financement': 'Trouver mon OPCO et mon budget',
    'Calculer mon financement': 'Trouver mon OPCO et mon budget',
    'Tester mon financement': 'Trouver mon OPCO',
    'simulateur de financement': 'outil « Quel est mon OPCO ? »',
    'simulateur en ligne': 'outil de recherche d\'OPCO',
    'simulateur de financement de formation IA': 'outil de recherche d\'OPCO et de budget formation',
    'Estimez le financement possible de votre formation avec notre simulateur.': 'Trouvez votre OPCO et votre budget formation avec votre SIRET.',
}
# Une phrase dont l'article change avec le libellé.
PHRASES = [
    ('Vous pouvez utiliser un <a href="/quel-est-mon-opco.html">outil « Quel est mon OPCO ? »</a> pour estimer vos droits.',
     'Notre <a href="/quel-est-mon-opco.html">outil « Quel est mon OPCO ? »</a> retrouve votre OPCO à partir de votre SIRET.'),
]

LIEN = re.compile(r'(<a\b[^>]*href="(?:https://ia-entrepreneur\.fr)?/' + re.escape(ANCIEN) + r'"[^>]*>)(\s*)([^<]*?)(\s*)(</a>)')

BLOC_FORMATION = '<!-- outil-opco -->\n      <div data-outil-opco style="margin-top:26px"></div>\n'
SECTION = '''  <!-- outil-opco -->
  <section style="padding:56px 0 8px;" id="budget-formation">
    <div class="container">
      <div data-outil-opco></div>
    </div>
  </section>

'''
SECTION_ACCUEIL = '''  <!-- outil-opco -->
  <section style="background:rgba(26,60,255,0.05);border-top:1px solid rgba(10,15,44,0.08);padding:56px 0;" id="budget-formation">
    <div class="container">
      <div data-outil-opco data-niveau="h2"></div>
    </div>
  </section>
'''
# Articles dont une partie traite du financement de la formation : le bloc
# se place à la fin de cette partie, juste avant le titre suivant.
ARTICLES = {
    'blog/automatisation-no-code-ia-entreprise.html': 'Comment financer la formation',
    'blog/formation-copilot-microsoft-365-guide.html': 'Financement de la formation Copilot',
    'blog/formation-gemini-entreprise.html': 'Combien coûte une formation Gemini',
    'blog/formation-gestion-entreprise-guide-2026-tpe.html': 'Comment financer sa formation',
}
BLOC_ARTICLE = '<!-- outil-opco -->\n<div data-outil-opco style="margin:28px 0"></div>\n'


def liens(t):
    def remplace(m):
        libelle = LIBELLES.get(m.group(3), m.group(3))
        return m.group(1) + m.group(2) + libelle + m.group(4) + m.group(5)
    t = LIEN.sub(remplace, t)
    t = t.replace(ANCIEN, NOUVEAU)
    for a, b in PHRASES:
        t = t.replace(a, b)
    return t


def poser(chemin, t):
    nom = str(chemin.relative_to(RACINE))
    if '<!-- outil-opco -->' not in t:
        # 1. Pages de formation : l'appel au simulateur devient l'outil.
        t, n = re.subn(r'<!-- cta-simulateur-financement -->\n\s*<div class="cta-simulateur".*?</a>\n\s*</div>\n', BLOC_FORMATION, t, count=1, flags=re.S)
        if not n and nom in ('formation-chatgpt-entreprise.html', 'formation-claude-entreprise.html', 'formation-ia-obligatoire-ai-act.html'):
            i = t.find('  <section class="faq-section"')
            assert i > 0, nom
            t = t[:i] + SECTION + t[i:]
        if nom == 'index.html':
            debut = t.index('  <!-- ── Simulateur de financement')
            fin = t.index('</section>', debut) + len('</section>\n')
            t = t[:debut] + SECTION_ACCUEIL + t[fin:]
        if nom in ARTICLES:
            h2 = re.search(r'<h2[^>]*>\s*' + re.escape(ARTICLES[nom]), t)
            assert h2, nom
            # Fin de la partie : le titre suivant, sinon la fin de l'article.
            fins = [i for i in (t.find('<h2', h2.end()), t.find('</article>', h2.end())) if i > 0]
            assert fins, nom
            t = t[:min(fins)] + BLOC_ARTICLE + t[min(fins):]
    if 'data-outil-opco' in t and SCRIPT not in t and '</body>' in t:
        t = t.replace('</body>', SCRIPT + '\n</body>', 1)
    return t


def main():
    exclus = {'.git', 'node_modules'}
    changes = 0
    for chemin in sorted(RACINE.rglob('*')):
        if not chemin.is_file() or exclus & set(chemin.parts) or chemin.name in (ANCIEN, 'poser_outil_opco.py', 'CLAUDE.md', 'ajouter_cta_financement.py'):
            continue
        if chemin.suffix not in ('.html', '.py', '.js', '.txt', '.xml', '.md') or 'data' in chemin.relative_to(RACINE).parts[:1]:
            continue
        t0 = chemin.read_text(encoding='utf-8')
        t = liens(t0)
        if chemin.suffix == '.html':
            t = poser(chemin, t)
        if t != t0:
            chemin.write_text(t, encoding='utf-8')
            changes += 1
    print(f'{changes} fichiers modifiés')


if __name__ == '__main__':
    main()
