#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_annuaire_callouts.py — Insère un encadré vers l'annuaire « Les meilleures IA »
dans les articles de blog dont le sujet s'y prête.

L'encadré est placé juste avant le deuxième <h2> de l'article (donc après
l'introduction), avec un texte et une destination choisis article par article :
pas d'insertion automatique par mots-clés. Le script est idempotent.

Usage : python3 add_annuaire_callouts.py
"""

import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

# article : (texte de l'encadré, libellé du lien, destination)
ARTICLES = {
    'agents-ia-autonomes-fonctionnement-usages.html': (
        "Vous cherchez sur quel outil construire votre premier agent ?",
        "Voir les 20 plateformes d'automatisation et d'agents IA comparées",
        "/ia/meilleures-ia-automatisation.html"),
    'automatiser-emails-ia-gains-de-temps-reels.html': (
        "Quel outil pour automatiser concrètement vos e-mails ?",
        "Comparer les outils d'automatisation, dont ceux hébergés en Europe",
        "/ia/meilleures-ia-automatisation.html"),
    'chatbot-automatise-ce-quil-faut-savoir.html': (
        "Quel chatbot installer sur votre site, et à quel prix ?",
        "Voir les solutions de relation client et de chatbot comparées",
        "/ia/meilleures-ia-relation-client.html"),
    'assistant-reunion-ia-automatisation-comptes-rendus-2026.html': (
        "Quel assistant de réunion choisir, et lequel héberge vos données en France ?",
        "Comparer les outils de compte rendu automatique",
        "/ia/meilleures-ia-reunions-notes.html"),
    'copilot-assistant-ia-microsoft-entreprise.html': (
        "Copilot vaut-il ses 30 € par mois et par salarié dans votre cas ?",
        "Voir la fiche Microsoft 365 Copilot : prix, points forts et limites",
        "/ia/microsoft-copilot.html"),
    'formation-copilot-microsoft-365-guide.html': (
        "Avant de former vos équipes, vérifiez que Copilot est le bon choix.",
        "Voir la fiche Microsoft 365 Copilot et ses alternatives",
        "/ia/microsoft-copilot.html"),
    'prompting-chatgpt-avance-aller-plus-loin.html': (
        "ChatGPT n'est pas toujours l'outil le plus adapté à la tâche.",
        "Voir la fiche ChatGPT et les 129 outils de l'annuaire",
        "/ia/chatgpt.html"),
    'conformite-ai-act-ce-que-ca-implique.html': (
        "Quelles IA pouvez-vous utiliser sans exposer vos données ?",
        "Voir les outils juridiques, de conformité et d'hébergement européen",
        "/ia/meilleures-ia-juridique-conformite.html"),
    'cahier-des-charges-ia-structurer-projet.html': (
        "Avant d'écrire le cahier des charges, cadrez les outils envisageables.",
        "Explorer l'annuaire des 129 outils IA, classés par usage",
        "/meilleures-ia.html"),
    'consultant-ia-audit-accompagnement-sur-mesure.html': (
        "Vous préférez commencer par regarder ce qui existe ?",
        "Explorer l'annuaire des 129 outils IA, classés par usage",
        "/meilleures-ia.html"),
    'roi-formation-ia-mesurer-gains-reels.html': (
        "Le temps gagné dépend d'abord du bon outil.",
        "Voir ce que chaque outil fait réellement gagner",
        "/meilleures-ia.html"),
}

MARQUEUR = '<!-- encadre-annuaire-ia -->'

GABARIT = """
<!-- encadre-annuaire-ia -->
<div style="margin:28px 0;padding:20px 22px;border-radius:14px;background:rgba(26,60,255,0.05);border-left:4px solid var(--primary);">
  <strong style="display:block;font-size:0.98rem;margin-bottom:6px;">{titre}</strong>
  <a href="{url}" style="font-weight:700;">{libelle} →</a>
</div>
"""

def main():
    touches = 0
    for fichier, (titre, libelle, url) in ARTICLES.items():
        chemin = os.path.join(ROOT, 'blog', fichier)
        if not os.path.exists(chemin):
            print(f'  (absent) {fichier}')
            continue
        src = open(chemin, encoding='utf-8').read()
        if MARQUEUR in src:
            continue  # déjà posé
        titres = [m.start() for m in re.finditer(r'<h2[ >]', src)]
        if len(titres) < 2:
            print(f'  (pas assez de h2) {fichier}')
            continue
        pos = titres[1]
        bloc = GABARIT.format(titre=titre, libelle=libelle, url=url)
        open(chemin, 'w', encoding='utf-8').write(src[:pos] + bloc + src[pos:])
        touches += 1
    print(f'{touches} articles enrichis')

if __name__ == '__main__':
    main()
