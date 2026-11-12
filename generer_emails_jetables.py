#!/usr/bin/env python3
"""Écrit api/_emails-jetables.js, la liste des domaines d'adresses jetables (12/11/2026).

Source : github.com/disposable-email-domains/disposable-email-domains (CC0 1.0, domaine
public), la liste la plus suivie. Utilisée par api/_anti-robot.js pour refuser une
réservation de RDV faite avec une adresse jetable (yopmail et les autres) : un vrai
prospect n'en prend jamais, et l'invitation Google n'y servirait à rien.

    python3 generer_emails_jetables.py

À relancer de temps en temps (la liste grossit chaque mois). Ne jamais modifier le .js
à la main.
"""
import datetime
import re
import urllib.request

SOURCE = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf'
SORTIE = 'api/_emails-jetables.js'
# Jamais bloqués, même si la liste les contenait un jour : les messageries courantes des prospects.
JAMAIS = {'gmail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.fr', 'yahoo.com', 'yahoo.fr',
          'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'icloud.com', 'me.com', 'gmx.fr', 'proton.me', 'protonmail.com'}


def main():
    with urllib.request.urlopen(SOURCE, timeout=30) as r:
        texte = r.read().decode('utf-8')
    domaines = sorted({l.strip().lower() for l in texte.splitlines()
                       if l.strip() and not l.startswith('#') and re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', l.strip().lower())} - JAMAIS)
    if len(domaines) < 1000:
        raise SystemExit(f'liste trop courte ({len(domaines)}), rien écrit')
    jour = datetime.date.today().isoformat()
    with open(SORTIE, 'w', encoding='utf-8') as f:
        f.write(f'// Généré par generer_emails_jetables.py le {jour}, ne pas modifier à la main.\n')
        f.write('// Source : github.com/disposable-email-domains/disposable-email-domains (CC0 1.0).\n')
        f.write(f"const LISTE = '{' '.join(domaines)}';\n")
        f.write("export const JETABLES = new Set(LISTE.split(' '));\n")
    print(f'{SORTIE} : {len(domaines)} domaines')


if __name__ == '__main__':
    main()
