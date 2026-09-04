#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ajouter_cta_financement.py — Place le simulateur de financement là où la
question se pose : dans la section « Financement » des pages de formation.

Le bouton « Financer ma formation » a été retiré de la barre du haut le
04/09/2026 (voir simplifier_nav.py). Il n'a pas disparu : il est désormais au
milieu de la page où le lecteur se demande justement ce qu'il aura à payer,
ce qui convertit mieux qu'une entrée de menu permanente.

Idempotent.

Usage : python3 ajouter_cta_financement.py
"""

import glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
MARQUEUR = '<!-- cta-simulateur-financement -->'

BLOC = MARQUEUR + """
      <div class="cta-simulateur" style="margin-top:26px;padding:22px 24px;border-radius:16px;background:rgba(26,60,255,0.05);border:1px solid rgba(26,60,255,0.15);display:flex;flex-wrap:wrap;align-items:center;gap:16px;justify-content:space-between;">
        <div style="flex:1 1 300px;min-width:0;">
          <strong style="display:block;font-size:1rem;margin-bottom:4px;">Combien restera-t-il à votre charge ?</strong>
          <span style="font-size:0.88rem;color:var(--muted);line-height:1.5;">Le simulateur calcule votre reste à charge selon votre statut et votre organisme de financement. Deux minutes, sans inscription.</span>
        </div>
        <a href="/simulateur-financement-formation-ia.html" style="flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:50px;background:var(--primary);color:#fff;font-weight:700;font-size:0.86rem;text-decoration:none;box-shadow:0 4px 18px rgba(26,60,255,0.28);">💶 Simuler mon financement →</a>
      </div>
"""


# formations-entreprises.html ouvre sur l'onglet « Entreprise », qui parle 31
# fois de financement et d'OPCO sans jamais offrir le simulateur : la section
# « Financement » ne vit que dans l'onglet « Inter-entreprises », masqué par
# defaut. On y place donc le meme appel, juste avant la FAQ.
def onglet_entreprise(src):
    depart = src.find('id="tab-entreprise"')
    if depart < 0 or MARQUEUR in src[depart:]:
        return src, 0
    faq = src.find('<section class="faq-section"', depart)
    if faq < 0:
        return src, 0
    bloc = f'  <section style="padding:0 0 10px;">\n    <div class="container">\n{BLOC}    </div>\n  </section>\n\n'
    return src[:faq] + bloc + src[faq:], 1


def main():
    poses = 0
    for f in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        src = open(f, encoding='utf-8').read()
        # Chaque emplacement porte sa propre garde : une page peut avoir recu
        # l'appel dans sa section Financement sans l'avoir dans son onglet
        # Entreprise, et inversement.
        out, n = src, 0
        if 'class="financement-section"' in src:
            out, n = re.subn(
                r'(<section class="financement-section">(?:(?!' + re.escape(MARQUEUR) + r').)*?)(\s*</div>\s*</section>)',
                lambda m: m.group(1) + '\n' + BLOC + m.group(2), src, flags=re.S)
        out, n2 = onglet_entreprise(out)
        if n + n2:
            open(f, 'w', encoding='utf-8').write(out)
            poses += n + n2
            print(f'  {os.path.basename(f)} : {n + n2} bloc(s)')
    print(f'{poses} appel(s) au simulateur placé(s)')


if __name__ == '__main__':
    main()
