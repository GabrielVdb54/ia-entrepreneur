#!/usr/bin/env python3
"""Remplace les 6 réalisations par 3 blocs compétences"""

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Lines 1660-1715 (0-indexed: 1659-1714)
new_block = """        <!-- Colonne droite : compétences liées aux formations -->
        <div class="apropos-realisations reveal reveal-delay-2">

          <!-- Bloc 1: Création d'entreprise -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--primary);margin-bottom:10px;">→ Création d'entreprise</div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">📋</div>
              <div class="realisation-text">1 500+ porteurs de projet accompagnés<span>En cabinet comptable &amp; en formation</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">🏢</div>
              <div class="realisation-text">2 entreprises créées &amp; dirigées<span>Clindit &amp; Gains Analyses B2B</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">💰</div>
              <div class="realisation-text">10 000€ économisés/an pour un client<span>Optimisation de statut juridique</span></div>
            </div>
          </div>

          <!-- Bloc 2: Vente, négociation & prospection -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;">→ Vente, négociation &amp; prospection</div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">🎯</div>
              <div class="realisation-text">+100 RDV qualifiés/mois<span>Système de prospection automatisé créé par mes soins</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">🤝</div>
              <div class="realisation-text">Partenariats grands comptes négociés<span>Dont Derichebourg — closing terrain</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">🎓</div>
              <div class="realisation-text">Modules négociation &amp; prospection<span>Enseignés en entreprise &amp; à ECM Nancy</span></div>
            </div>
          </div>

          <!-- Bloc 3: Prise de parole, management & IA -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#7a9fff;margin-bottom:10px;">→ Prise de parole, management &amp; IA</div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">🎤</div>
              <div class="realisation-text">3 conférences publiques<span>Go Entrepreneur, France Travail, ECM Nancy</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">👥</div>
              <div class="realisation-text">+10 personnes managées<span>En cabinet et dans mes entreprises</span></div>
            </div>
            <div class="realisation-item" style="border:none;padding:6px 0;">
              <div class="realisation-icon">⚡</div>
              <div class="realisation-text">5h gagnées/semaine grâce à l'IA<span>Automatisation appliquée sur mes propres entreprises</span></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>

"""

# Replace lines 1660-1715 (1-indexed) = 1659-1714 (0-indexed)
result = lines[:1659] + [new_block] + lines[1715:]

with open("index.html", "w", encoding="utf-8") as f:
    f.writelines(result)

print("✅ Réalisations remplacées par 3 blocs compétences")
print("   👉 git add . && git commit -m 'Réalisations → 3 blocs compétences' && git push")
