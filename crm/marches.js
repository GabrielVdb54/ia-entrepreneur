'use strict';
/*
 * Marchés publics et pièces de l'organisme, et la version du CRM de Ludovic (13/11/2026).
 * Chargé après la page et crm/equipe.js (même portée globale : D, S, IDX, api, toast, ouvrirModale…).
 *
 * Point appels d'offres du 13/11 : Ludovic (LM Conseil) propose des marchés avec une analyse courte,
 * Gabriel répond oui ou non, Anna trouve les formateurs des profils demandés. Ludovic télécharge les
 * pièces des formateurs (toutes, choix de Gabriel) et celles de l'organisme pour monter les dossiers.
 * Le serveur contrôle tout (api/_marches.js, api/_equipe.js) : la page ne fait que cacher ce qui ne sert pas.
 */

const LIB_MARCHE = {
  propose: ['À décider', 'f-verifier'], retenu: ['Retenu', 'f-cours'], ecarte: ['Écarté', 'f-refuse'], en_montage: ['En montage', 'f-cours'],
  depose: ['Déposé', 'f-cours'], gagne: ['Gagné', 'f-valide'], perdu: ['Perdu', 'f-refuse'], abandonne: ['Abandonné', 'f-inviter'],
};
const SUIVI_LUDOVIC = ['en_montage', 'depose', 'gagne', 'perdu', 'abandonne'];
const LIB_PIECE_ORG = {
  qualiopi: 'Certificat Qualiopi', kbis: 'Extrait Kbis', rc_pro: 'Attestation RC Pro', urssaf: 'Attestation de vigilance URSSAF',
  fiscale: 'Attestation de régularité fiscale', nda: "Déclaration d'activité (NDA)", references: 'Références clients', statuts: 'Statuts', rib: "RIB de l'organisme", autre: 'Autre document',
};
const PIECES_ORG_ATTENDUES = ['qualiopi', 'kbis', 'rc_pro', 'urssaf', 'fiscale', 'nda'];
const perm = (k) => Boolean(D && (D.permissions ? D.permissions[k] : (D.moi || {}).role === 'admin' || !D.moi));
const marches = () => (D && D.marches) || [];
const marcheDe = (id) => marches().find((m) => m.id === id);
function remplacerMarche(m) {
  if (!m) return;
  const i = D.marches.findIndex((x) => x.id === m.id);
  if (i >= 0) D.marches[i] = m; else D.marches.unshift(m);
}
function echeanceMarche(m) {
  if (!m.date_limite) return '';
  const e = ecartJours(m.date_limite);
  if (e < 0) return `date limite passée (${dateCourte(m.date_limite)})`;
  if (e === 0) return "remise aujourd'hui";
  return `remise le ${dateCourte(m.date_limite)}, dans ${e} jour${e > 1 ? 's' : ''}`;
}
const aDecider = () => marches().filter((m) => m.statut === 'propose');
// Anna : les marchés retenus qui attendent encore des formateurs.
const enAttenteFormateurs = () => marches().filter((m) => ['retenu', 'en_montage'].includes(m.statut) && !(m.formateurs || []).length);

/* ---------- La vue ---------- */

function carteMarche(m) {
  const [lib, cls] = LIB_MARCHE[m.statut] || [m.statut, ''];
  const fs = (m.formateurs || []).map((id) => IDX.lead.get(id)).filter(Boolean);
  const urgent = m.date_limite && ecartJours(m.date_limite) >= 0 && ecartJours(m.date_limite) <= 7 && ['propose', 'retenu', 'en_montage'].includes(m.statut);
  return `<article class="carte marche" data-marche="${m.id}">
    <div class="carte-haut"><div class="carte-titre"><h3><button type="button" class="lien-carte" data-marche-act="ouvrir">${esc(m.titre)}</button></h3>
      <p class="meta">${esc([m.acheteur, m.lieu].filter(Boolean).join(', ') || 'Acheteur non précisé')}</p></div><span class="statut ${cls}">${esc(lib)}</span></div>
    <p class="meta">${[m.montant ? esc(euros(m.montant)) + ' HT' : '', m.date_limite ? `<span class="${urgent ? 'urgent' : ''}">${esc(echeanceMarche(m))}</span>` : ''].filter(Boolean).join(', ') || 'Montant et date limite à préciser'}</p>
    ${m.synthese ? `<p class="extrait">${esc(m.synthese)}</p>` : ''}
    ${m.profils ? `<p><span class="meta">Profils demandés :</span> ${esc(m.profils.length > 160 ? `${m.profils.slice(0, 158)}…` : m.profils)}</p>` : ''}
    ${fs.length ? `<p><span class="meta">Formateurs :</span> ${fs.map((l) => esc(l.entreprise)).join(', ')}</p>` : ''}
    <div class="carte-actions">
      ${m.statut === 'propose' && perm('decider_marches') ? '<button type="button" class="btn petit primaire" data-marche-act="oui">Oui, on y va</button><button type="button" class="btn petit" data-marche-act="non">Non</button>' : ''}
      <button type="button" class="btn petit" data-marche-act="ouvrir">${perm('proposer_marches') || perm('gerer_formateurs') ? 'Ouvrir' : 'Voir'}</button>
      ${m.lien ? `<a class="btn petit lien" href="${esc(m.lien)}" target="_blank" rel="noopener noreferrer">Le marché</a>` : ''}
    </div>
  </article>`;
}

function blocPiecesOrganisme() {
  const ps = (D && D.pieces_organisme) || [];
  const t = aujourdhui();
  const manque = PIECES_ORG_ATTENDUES.filter((k) => !ps.some((p) => p.type === k));
  const deposer = perm('deposer_pieces_organisme');
  return `<section class="bloc pieces-org">
    <h3>Pièces de l'organisme ${deposer ? '<button type="button" class="btn petit" data-marche-act="piece-deposer">Déposer une pièce</button>' : ''}</h3>
    <p class="aide">Les pièces administratives d'IA-Entrepreneur (Clindit) pour les dossiers d'appels d'offres. Une nouvelle pièce du même type remplace l'ancienne.</p>
    ${ps.length ? `<ul class="pieces-f">${ps.map((p) => {
      const expiree = p.expire_le && p.expire_le < t;
      const bientot = p.expire_le && !expiree && ecartJours(p.expire_le) <= 30;
      return `<li data-piece-org="${p.id}"><div class="tete"><b>${esc(p.titre || LIB_PIECE_ORG[p.type] || p.type)}</b>${p.expire_le ? `<span class="etat ${expiree ? 'e-refus' : bientot ? 'e-verifier' : 'e-ok'}">${expiree ? 'Expirée' : `Valable jusqu'au ${esc(dateCourte(p.expire_le))}`}</span>` : ''}</div>
        <p class="meta">${esc(p.nom)}, déposée le ${esc(dateCourte(String(p.created_at).slice(0, 10)))}</p>
        <div class="actions"><button type="button" class="btn petit" data-marche-act="piece-voir">Ouvrir</button>${deposer ? '<button type="button" class="btn petit lien" data-marche-act="piece-archiver">Retirer</button>' : ''}</div></li>`;
    }).join('')}</ul>` : '<p class="vide">Aucune pièce pour l\'instant.</p>'}
    ${manque.length ? `<p class="meta">Pas encore déposées : ${esc(manque.map((k) => LIB_PIECE_ORG[k]).join(', '))}.</p>` : ''}
  </section>`;
}

function vueMarches() {
  const ms = marches();
  const groupe = (titre, liste, ouvert = true) => (liste.length ? `<details class="groupe-marches"${ouvert ? ' open' : ''}><summary><h2 class="sous-groupe">${esc(titre)} <small>${liste.length}</small></h2></summary><div class="grille">${liste.map(carteMarche).join('')}</div></details>` : '');
  const tri = (a, b) => (a.date_limite || '9999') < (b.date_limite || '9999') ? -1 : (a.date_limite || '9999') > (b.date_limite || '9999') ? 1 : 0;
  const role = (D.moi || {}).role || 'admin';
  const intro = {
    admin: 'Ludovic propose les marchés qu\'il a repérés, avec son analyse. Tu réponds oui ou non ; pour chaque oui, il dit à Anna les profils qu\'il lui faut et elle rattache les formateurs.',
    partenaire: 'Propose les marchés repérés avec ton analyse : Gabriel répond oui ou non ici. Après un oui, note les profils dont tu as besoin : Anna rattache les formateurs, et leurs pièces sont dans l\'onglet Formateurs.',
    setter: 'Pour chaque marché retenu par Gabriel, Ludovic note les profils dont il a besoin : rattache les formateurs qui conviennent (onglet Formateurs pour leurs dossiers), ou recrute-les.',
  }[role] || '';
  return `<div class="tete-vue"><div><h1 class="titre-vue">Marchés publics</h1><p class="sous-titre">${esc(intro)}</p></div>
      ${perm('proposer_marches') ? '<div class="actions"><button type="button" class="btn primaire" data-marche-act="nouveau">Proposer un marché</button></div>' : ''}</div>
    ${ms.length ? '' : '<p class="vide">Aucun marché pour l\'instant.</p>'}
    ${groupe('À décider', ms.filter((m) => m.statut === 'propose').sort(tri))}
    ${groupe('En cours', ms.filter((m) => ['retenu', 'en_montage', 'depose'].includes(m.statut)).sort(tri))}
    ${groupe('Résultats', ms.filter((m) => ['gagne', 'perdu'].includes(m.statut)))}
    ${groupe('Écartés ou abandonnés', ms.filter((m) => ['ecarte', 'abandonne'].includes(m.statut)), false)}
    ${blocPiecesOrganisme()}`;
}

/* ---------- Proposer, ouvrir, décider ---------- */

const champsDescription = (m = {}) => `
  ${champ('Intitulé', `<input type="text" name="titre" required maxlength="300" value="${esc(m.titre || '')}" placeholder="Formation à l'IA générative des agents">`)}
  <div class="deux">${champ('Acheteur', `<input type="text" name="acheteur" maxlength="300" value="${esc(m.acheteur || '')}" placeholder="Communauté d'agglomération…">`)}${champ('Référence', `<input type="text" name="reference" maxlength="120" value="${esc(m.reference || '')}">`)}</div>
  ${champ('Lien vers le marché', `<input type="url" name="lien" maxlength="1000" value="${esc(m.lien || '')}" placeholder="https://…">`)}
  <div class="deux">${champ('Montant estimé (€ HT)', `<input type="text" inputmode="decimal" name="montant" value="${esc(m.montant ?? '')}" placeholder="Pour un accord-cadre : le maximum">`)}${champ('Date limite de remise', `<input type="date" name="date_limite" value="${esc(m.date_limite || '')}">`)}</div>
  ${champ('Lieu', `<input type="text" name="lieu" maxlength="200" value="${esc(m.lieu || '')}">`)}
  ${champ('Analyse en quelques lignes', `<textarea name="synthese" maxlength="5000">${esc(m.synthese || '')}</textarea>`)}
  <div class="deux">${champ('Avantages', `<textarea name="avantages" maxlength="5000">${esc(m.avantages || '')}</textarea>`)}${champ('Inconvénients', `<textarea name="inconvenients" maxlength="5000">${esc(m.inconvenients || '')}</textarea>`)}</div>
  ${champ("Santé de l'acheteur", `<textarea name="sante_acheteur" maxlength="3000" placeholder="Délais de paiement connus, procédure en cours…">${esc(m.sante_acheteur || '')}</textarea>`, 'Gabriel écarte les acheteurs connus pour payer très en retard ou en difficulté : les formateurs sont payés avant nous.')}`;

const lireDescription = (el) => Object.fromEntries(['titre', 'acheteur', 'reference', 'lien', 'montant', 'date_limite', 'lieu', 'synthese', 'avantages', 'inconvenients', 'sante_acheteur'].map((k) => [k, el[k].value.trim()]));

function ouvrirNouveauMarche() {
  ouvrirModale(`<h2>Proposer un marché</h2>
    <p class="aide">Gabriel répond oui ou non. Retenus : 70 000 € HT au moins (tes frais de dépôt sous 1 %), les plus gros en priorité.</p>
    ${champsDescription()}
    ${champ('Profils de formateurs dont tu aurais besoin (facultatif)', '<textarea name="profils" maxlength="5000" placeholder="2 formateurs niveau 1 ou 2, dont un ancien fonctionnaire de collectivité…"></textarea>')}
    ${piedFormulaire('<button type="submit" class="btn primaire">Proposer</button>')}`, (form) => {
    brancherAnnuler(form);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      soumettre(form, async () => {
        const el = form.elements;
        if (!el.titre.value.trim()) throw new ErreurApi('Donne l\'intitulé du marché.');
        const r = await api('POST', { op: 'marche_creer', valeurs: { ...lireDescription(el), profils: el.profils.value.trim() } });
        remplacerMarche(r.marche);
        fermerModale();
        rendre();
        toast('Marché proposé : Gabriel le voit dans « À décider ».');
      });
    });
  });
}

function choixFormateurs(m) {
  const tous = formateurs().slice().sort((a, b) => a.entreprise.localeCompare(b.entreprise, 'fr'));
  const choisis = new Set(m.formateurs || []);
  if (!tous.length) return '<p class="vide">Aucun formateur dans le CRM.</p>';
  return `<fieldset class="cases choix-formateurs"><legend>Formateurs rattachés</legend>${tous.map((l) => {
    const f = dossierDe(l.id);
    const [lib] = STATUTS_F[f.statut] || [f.statut];
    const det = [(f.niveaux || []).map((x) => `N${x}`).join(' '), (f.secteurs || []).join(', '), f.zone].filter(Boolean).join(' ; ');
    return `<label class="case"><input type="checkbox" name="formateurs" value="${l.id}" ${choisis.has(l.id) ? 'checked' : ''}> <span><b>${esc(l.entreprise)}</b> <span class="meta">(${esc(lib)})</span>${det ? `<span class="aide">${esc(det)}</span>` : ''}</span></label>`;
  }).join('')}</fieldset>`;
}

function ouvrirMarche(id) {
  const m = marcheDe(id);
  if (!m) return;
  const role = (D.moi || {}).role || 'admin';
  const decrit = role === 'admin' || role === 'partenaire';
  const [lib, cls] = LIB_MARCHE[m.statut] || [m.statut, ''];
  const statuts = role === 'admin' ? Object.keys(LIB_MARCHE)
    : role === 'partenaire' ? [m.statut, ...(['propose', 'ecarte'].includes(m.statut) ? ['abandonne'] : SUIVI_LUDOVIC)].filter((x, i, t) => t.indexOf(x) === i) : [];
  const lecture = (k, titre) => (m[k] ? `<dt>${esc(titre)}</dt><dd>${esc(m[k]).replace(/\n/g, '<br>')}</dd>` : '');
  ouvrirModale(`<h2>${esc(m.titre)} <span class="statut ${cls}">${esc(lib)}</span></h2>
    <p class="meta">Proposé par ${esc(prenomDe(m.cree_par))} le ${esc(dateCourte(String(m.created_at).slice(0, 10)))}${m.decision_le ? `, ${m.statut === 'ecarte' ? 'écarté' : 'retenu'} le ${esc(dateCourte(String(m.decision_le).slice(0, 10)))}` : ''}${m.decision_note ? ` : ${esc(m.decision_note)}` : ''}.</p>
    ${m.lien ? `<p><a href="${esc(m.lien)}" target="_blank" rel="noopener noreferrer">Ouvrir le marché</a></p>` : ''}
    ${m.statut === 'propose' && role === 'admin' ? `<div class="alerte decision-marche">${champ('Ta réponse à Ludovic (facultatif)', '<input type="text" name="decision_note" maxlength="2000" placeholder="Ok, on y va ; ou : trop petit, acheteur qui paie en retard…">')}
      <div class="actions"><button type="button" class="btn primaire" data-decider="oui">Oui, on y va</button><button type="button" class="btn" data-decider="non">Non</button></div></div>` : ''}
    ${decrit ? champsDescription(m) : `<dl class="infos">${lecture('acheteur', 'Acheteur')}${m.montant ? `<dt>Montant</dt><dd>${esc(euros(m.montant))} HT</dd>` : ''}${m.date_limite ? `<dt>Date limite</dt><dd>${esc(echeanceMarche(m))}</dd>` : ''}${lecture('lieu', 'Lieu')}${lecture('synthese', 'Analyse')}${lecture('avantages', 'Avantages')}${lecture('inconvenients', 'Inconvénients')}${lecture('sante_acheteur', "Santé de l'acheteur")}</dl>`}
    ${statuts.length > 1 ? `<div class="deux">${champ('Où en est-il ?', `<select name="statut">${statuts.map((k) => `<option value="${k}" ${k === m.statut ? 'selected' : ''}>${esc(LIB_MARCHE[k][0])}</option>`).join('')}</select>`)}
      ${champ('Déposé le', `<input type="date" name="depose_le" value="${esc(m.depose_le || '')}">`)}</div>` : ''}
    ${champ('Profils de formateurs demandés', `<textarea name="profils" maxlength="5000" placeholder="2 formateurs niveau 1 ou 2, dont un ancien fonctionnaire…">${esc(m.profils || '')}</textarea>`)}
    ${choixFormateurs(m)}
    ${champ('Notes', `<textarea name="notes" maxlength="5000">${esc(m.notes || '')}</textarea>`)}
    ${piedFormulaire(`<button type="submit" class="btn primaire">Enregistrer</button>${role === 'admin' ? '<button type="button" class="btn danger" data-supprimer-marche>Supprimer</button>' : ''}`)}`, (form) => {
    brancherAnnuler(form);
    const el = form.elements;
    $$('[data-decider]', form).forEach((b) => b.addEventListener('click', () => decider(m.id, b.dataset.decider, el.decision_note ? el.decision_note.value.trim() : '')));
    const sup = $('[data-supprimer-marche]', form);
    if (sup) sup.addEventListener('click', async () => {
      if (!confirm(`Supprimer « ${m.titre} » ? Pour le garder sans le voir, passe-le plutôt en « Abandonné ».`)) return;
      try { await api('POST', { op: 'marche_supprimer', id: m.id }); D.marches = D.marches.filter((x) => x.id !== m.id); fermerModale(); rendre(); toast('Marché supprimé.'); } catch (e) { toast(e.message); }
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      soumettre(form, async () => {
        const v = { profils: el.profils.value.trim(), notes: el.notes.value.trim(), formateurs: $$('input[name="formateurs"]:checked', form).map((x) => x.value) };
        if (decrit) Object.assign(v, lireDescription(el));
        if (el.statut) { v.statut = el.statut.value; v.depose_le = el.depose_le.value || null; }
        if (decrit && !v.titre) throw new ErreurApi('Il faut l\'intitulé du marché.');
        const r = await api('POST', { op: 'marche_maj', id: m.id, valeurs: v });
        remplacerMarche(r.marche);
        fermerModale();
        rendre();
        toast('Marché enregistré.');
      });
    });
  }, { large: true });
}

async function decider(id, decision, note = '') {
  try {
    const r = await api('POST', { op: 'marche_decider', id, decision, note: note || null });
    remplacerMarche(r.marche);
    if ($('#modale').open) fermerModale();
    rendre();
    toast(decision === 'oui' ? 'Retenu : Ludovic le voit dans « En cours » et prépare les profils pour Anna.' : 'Écarté.', 4000);
  } catch (e) { toast(e.message); }
}

/* ---------- Pièces de l'organisme ---------- */

function ouvrirDepotPieceOrganisme() {
  ouvrirModale(`<h2>Déposer une pièce de l'organisme</h2>
    ${champ('Pièce', `<select name="type">${Object.entries(LIB_PIECE_ORG).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>`)}
    ${champ('Fichier', '<input type="file" name="fichier" accept="application/pdf,image/*" required>', 'PDF ou photo, 3,4 Mo au plus.')}
    ${champ('Valable jusqu\'au (facultatif)', '<input type="date" name="expire_le">', 'Attestation URSSAF : 6 mois ; Kbis : 3 mois ; certificat Qualiopi : la date du certificat.')}
    ${piedFormulaire('<button type="submit" class="btn primaire">Déposer</button>')}`, (form) => {
    brancherAnnuler(form);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      soumettre(form, async () => {
        const el = form.elements;
        const fichier = el.fichier.files[0];
        if (!fichier) throw new ErreurApi('Choisis un fichier.');
        const { donnees, nom } = await preparerFichier(fichier);
        if (donnees.size > 3.4 * 1024 * 1024) throw new ErreurApi('Fichier trop lourd : 3,4 Mo au plus.');
        const r = await api('POST', { op: 'organisme_deposer', type: el.type.value, nom, base64: await enBase64(donnees), expire_le: el.expire_le.value || null });
        D.pieces_organisme = [...(D.pieces_organisme || []).filter((p) => !(r.remplace && p.type === r.remplace)), r.piece];
        fermerModale();
        rendre();
        toast('Pièce déposée.');
      });
    });
  });
}

async function voirPieceOrganisme(id) {
  const fenetre = window.open('', '_blank');
  try {
    const r = await fetch(`${API}?piece_organisme=${encodeURIComponent(id)}`, { headers: { 'X-Cle-Crm': S.cle } });
    if (!r.ok) throw new Error();
    const url = URL.createObjectURL(await r.blob());
    if (fenetre) fenetre.location.href = url; else location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch { if (fenetre) fenetre.close(); toast("La pièce n'a pas pu s'ouvrir. Réessaie."); }
}

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-marche-act]');
  if (!b) return;
  ev.preventDefault();
  const act = b.dataset.marcheAct;
  const carte = b.closest('[data-marche]');
  const id = carte && carte.dataset.marche;
  if (act === 'nouveau') return ouvrirNouveauMarche();
  if (act === 'ouvrir') return ouvrirMarche(id);
  if (act === 'oui' || act === 'non') { b.disabled = true; return decider(id, act); }
  if (act === 'voir-marches') { S.vue = 'marches'; S.q = ''; rendre(); return window.scrollTo(0, 0); }
  if (act === 'piece-deposer') return ouvrirDepotPieceOrganisme();
  const li = b.closest('[data-piece-org]');
  if (act === 'piece-voir' && li) return voirPieceOrganisme(li.dataset.pieceOrg);
  if (act === 'piece-archiver' && li) {
    if (!confirm('Retirer cette pièce ? Elle ne sera plus proposée pour les dossiers.')) return undefined;
    try { await api('POST', { op: 'organisme_archiver', id: li.dataset.pieceOrg }); D.pieces_organisme = D.pieces_organisme.filter((p) => p.id !== li.dataset.pieceOrg); rendre(); toast('Pièce retirée.'); } catch (e) { toast(e.message); }
  }
  return undefined;
});

/* ---------- Brancher la vue, les alertes et la version de Ludovic ---------- */

const rendreAvantMarches = window.rendre;
window.rendre = function (...args) {
  if (D && S.vue === 'marches' && !S.q) {
    $$('.onglets button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.vue === 'marches')));
    $('#vue').innerHTML = vueMarches();
  } else rendreAvantMarches.apply(this, args);
  // Le compteur de l'onglet : à décider (Gabriel), en attente de formateurs (Anna).
  const compte = $('#compteur-marches');
  if (compte && D) {
    const n = perm('decider_marches') ? aDecider().length : perm('gerer_formateurs') ? enAttenteFormateurs().length : 0;
    compte.hidden = !n;
    compte.textContent = n;
  }
};

const vueJourAvantMarches = window.vueJour;
window.vueJour = function (...args) {
  const h = vueJourAvantMarches.apply(this, args);
  if (!D || !perm('marches')) return h;
  const n1 = perm('decider_marches') ? aDecider().length : 0;
  const n2 = perm('gerer_formateurs') && !perm('decider_marches') ? enAttenteFormateurs().length : 0;
  if (!n1 && !n2) return h;
  const texte = n1 ? `<b>${n1} marché${n1 > 1 ? 's' : ''} public${n1 > 1 ? 's' : ''} à décider</b> : Ludovic attend ton oui ou ton non.`
    : `<b>${n2} marché${n2 > 1 ? 's' : ''} retenu${n2 > 1 ? 's' : ''}</b> attend${n2 > 1 ? 'ent' : ''} encore ses formateurs.`;
  return `<div class="alerte barre-marches"><p>${texte}</p><div class="actions"><button type="button" class="btn primaire" data-marche-act="voir-marches">Voir les marchés</button></div></div>${h}`;
};

// La fiche d'un formateur pour Ludovic : ses coordonnées, son dossier et ses pièces, rien à modifier.
const rendreFicheAvantMarches = window.rendreFiche;
window.rendreFiche = function (...args) {
  if (!D || !D.moi || D.moi.role !== 'partenaire') return rendreFicheAvantMarches.apply(this, args);
  const f = $('#fiche');
  const l = IDX.lead.get(S.fiche);
  if (!l) { if (f.open) f.close(); return undefined; }
  const cs = contactsDe(l.id);
  const lies = marches().filter((m) => (m.formateurs || []).includes(l.id));
  f.setAttribute('aria-labelledby', 'titre-fiche');
  f.innerHTML = `<header class="fiche-tete">
      <div class="tete-ent">${avatar(l, 'l')}<div><h2 id="titre-fiche">${esc(l.entreprise)}</h2><p class="meta">Formateur${l.localisation ? `, ${esc(l.localisation)}` : ''}</p></div></div>
      <button type="button" class="fermer" data-act="fermer-fiche" aria-label="Fermer">✕</button>
    </header>
    <section class="bloc"><h3>Contact</h3>
      ${cs.map((c) => `<p><b>${esc(nomContact(c) || 'Sans nom')}</b>${c.email ? `<br>${esc(c.email)}` : ''}${c.telephone ? `<br><a href="${esc(telLien(c.telephone))}">${esc(c.telephone)}</a>` : ''}</p>`).join('') || '<p class="vide">Aucun contact.</p>'}
      <p class="aide">Pour une question ou une pièce qui manque, passe par Anna : elle suit les dossiers des formateurs.</p>
    </section>
    ${blocDossierFormateur(l)}
    ${lies.length ? `<section class="bloc"><h3>Marchés où il est rattaché</h3><ul>${lies.map((m) => `<li>${esc(m.titre)} (${esc((LIB_MARCHE[m.statut] || [m.statut])[0])})</li>`).join('')}</ul></section>` : ''}`;
  chargerLogos();
  return undefined;
};

// Après chaque chargement : la vue de départ selon ce que la personne peut voir.
const apresChargementAvantMarches = window.apresChargement;
window.apresChargement = function (...args) {
  if (typeof apresChargementAvantMarches === 'function') apresChargementAvantMarches.apply(this, args);
  if (!D) return;
  if (!D.marches) D.marches = [];
  if (!D.pieces_organisme) D.pieces_organisme = [];
  if (D.moi && D.moi.role === 'partenaire') {
    // Ludovic n'envoie rien et n'a pas de boîte reliée : ni synchro, ni envoi. Claude lui sert pour la recherche
    // des formateurs seulement (le récap d'un lead lui est refusé par le serveur : on ne le demande pas).
    D.gmail = false; D.agenda = false;
    if (typeof window.recapAuto === 'function' && !window.recapAuto.partenaire) {
      const recapAutoAvant = window.recapAuto;
      window.recapAuto = function (...a) { return D && D.moi && D.moi.role === 'partenaire' ? undefined : recapAutoAvant.apply(this, a); };
      window.recapAuto.partenaire = true;
    }
    if (!['formateurs', 'marches'].includes(S.vue)) S.vue = 'marches';
  }
};
if (typeof D !== 'undefined' && D && D.leads) { window.apresChargement(); window.rendre(); }

// Les réglages de Ludovic : il n'a ni signature, ni boîte, ni rappel du matin ; seulement qui il est et la déconnexion.
const ouvrirReglagesAvantMarches = window.ouvrirReglages;
window.ouvrirReglages = function (...args) {
  if (!D || !D.moi || D.moi.role !== 'partenaire') return ouvrirReglagesAvantMarches.apply(this, args);
  ouvrirModale(`<h2>Mon accès</h2>
    <p>${esc([D.moi.prenom, D.moi.nom].filter(Boolean).join(' '))}, partenaire appels d'offres (${esc(D.moi.email)}).</p>
    <p class="aide">Tu vois les formateurs et leurs pièces, les marchés et les pièces de l'organisme. Pour un accès en plus, demande à Gabriel.</p>
    <div class="pied"><button type="button" class="btn" data-quitter>Se déconnecter de cet appareil</button><button type="button" class="btn primaire" data-fermer>Fermer</button></div>`, (form) => {
    brancherAnnuler(form);
    $('[data-quitter]', form).addEventListener('click', () => deconnecter(''));
  });
  return undefined;
};
