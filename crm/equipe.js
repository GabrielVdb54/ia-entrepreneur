'use strict';
/*
 * Le CRM à plusieurs (10/11/2026) : ce que la page change selon la personne connectée.
 * Chargé après le script de la page (même portée globale : D, S, COMPTE, api, toast…).
 *
 * - Un membre (closer, setter) : ses leads seulement (le serveur filtre), pas de
 *   formateurs, satisfaction, paiements ni programmes ; un bouton pour connecter sa
 *   boîte Google ; sa signature et sa photo. LinkedIn seulement quand son robot est
 *   installé sur son ordinateur (robot_cle_le, 10/11/2026) : sa propre file.
 * - Gabriel : un filtre « Mes leads / Toute l'équipe / par personne » (ses leads par
 *   défaut, pour que ses relances du jour restent les siennes), « Suivi par » sur la
 *   fiche, et la gestion des accès dans Réglages.
 */

const ADMIN_EQUIPE = 'gabriel@ia-entrepreneur.fr';
const CLE_FILTRE_EQUIPE = 'crm_vue_equipe';
const estEquipe = () => Boolean(typeof D !== 'undefined' && D && D.moi && D.moi.role !== 'admin');
const slugEquipe = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const photoDe = (m) => (!m || m.email === ADMIN_EQUIPE ? '/images/signature/gabriel-vanderbecken.png' : `/images/signature/${slugEquipe(`${m.prenom} ${m.nom || ''}`)}.png`);
const prenomDe = (email) => {
  if (!email) return '';
  if (email === ADMIN_EQUIPE) return 'Gabriel';
  const m = ((D && D.equipe) || []).find((x) => x.email === email) || ((D && D.closers) || []).find((x) => x.email === email);
  return m ? m.prenom : email.split('@')[0];
};
const LIB_ROLE = { closer: 'Closer', setter: 'Setter' };
function lireFiltreEquipe() { try { return localStorage.getItem(CLE_FILTRE_EQUIPE) || 'moi'; } catch { return 'moi'; } }
function ecrireFiltreEquipe(v) { try { localStorage.setItem(CLE_FILTRE_EQUIPE, v); } catch { /* navigation privée */ } }

Object.assign(ERREURS, {
  reserve_admin: 'Réservé à Gabriel.',
  lead_inaccessible: "Ce lead n'est pas dans ta liste.",
  google_a_connecter: "Connecte d'abord ta boîte Google (bouton « Connecter ma boîte Google »).",
  google_a_reconnecter: 'Ta boîte Google est déconnectée : reconnecte-la (Réglages).',
  gmail_mauvaise_boite: "La boîte reliée n'est pas la tienne : rien n'est parti.",
  email_invalide: 'Une adresse @ia-entrepreneur.fr, sauf la tienne.',
  role_invalide: 'Choisis Closer ou Setter.',
});

const MESSAGES_GOOGLE = {
  ok: 'Ta boîte Google est connectée : tes emails partent de ton adresse, et tes réponses arrivent sur les fiches.',
  annule: 'Connexion à Google annulée.',
  compte: "Ce n'est pas le bon compte Google : connecte-toi avec ton adresse @ia-entrepreneur.fr.",
  portees: 'Google n\'a pas donné tous les accès : recommence et coche toutes les cases.',
  lien: 'Le lien a expiré : recommence depuis le CRM.',
  jeton: 'Google n\'a pas renvoyé l\'accès hors ligne : recommence.',
  refus: 'Google a refusé la connexion : recommence.',
  erreur: 'La connexion à Google a échoué : recommence dans un instant.',
};

/* ---------- Après chaque chargement des données ---------- */

function apresChargement() {
  if (!D) return;
  const m = D.moi || { role: 'admin', email: ADMIN_EQUIPE, prenom: 'Gabriel' };
  const equipe = m.role !== 'admin';
  document.body.classList.toggle('equipe', equipe);
  document.body.dataset.role = m.role;
  COMPTE = m.email;
  if (equipe) SIGNATURE_DEFAUT = `${[m.prenom, m.nom].filter(Boolean).join(' ')}\nIA-Entrepreneur\nhttps://ia-entrepreneur.fr`;
  const img = document.querySelector('#btn-reglages img.photo');
  if (img) { img.src = photoDe(m); img.onerror = () => { img.onerror = null; img.src = '/images/logo-ia-entrepreneur-compact.png'; }; }
  // Gabriel : ses leads par défaut, ou toute l'équipe, ou une personne.
  const autres = (D.equipe || []).length > 0;
  if (!equipe && autres) {
    const f = lireFiltreEquipe();
    if (f !== 'tous') {
      const cible = f === 'moi' ? ADMIN_EQUIPE : f;
      D.leads = D.leads.filter((l) => (l.proprietaire || ADMIN_EQUIPE) === cible || l.setter === cible);
      indexer();
    }
  }
  poserFiltreEquipe(!equipe && autres);
}

function poserFiltreEquipe(visible) {
  let sel = document.getElementById('filtre-equipe');
  if (!visible) { if (sel) sel.remove(); return; }
  const valeur = lireFiltreEquipe();
  const opts = [['moi', 'Mes leads'], ['tous', "Toute l'équipe"], ...(D.equipe || []).map((x) => [x.email, `${x.prenom}${x.actif ? '' : ' (accès coupé)'}`])];
  const html = opts.map(([k, v]) => `<option value="${esc(k)}"${k === valeur ? ' selected' : ''}>${esc(v)}</option>`).join('');
  if (!sel) {
    sel = document.createElement('select');
    sel.id = 'filtre-equipe';
    sel.className = 'filtre-equipe';
    sel.setAttribute('aria-label', 'Leads affichés');
    const ref = document.getElementById('btn-nouveau');
    ref.parentNode.insertBefore(sel, ref);
    sel.addEventListener('change', async () => {
      ecrireFiltreEquipe(sel.value);
      await charger();
      rendre();
    });
  }
  sel.innerHTML = html;
}

/* ---------- Ce qu'un membre ne voit pas ---------- */

for (const nom of ['blocPaiements', 'blocProgramme', 'blocApresFormation', 'blocEvaluations']) {
  const original = window[nom];
  if (typeof original === 'function') window[nom] = function (...args) { return estEquipe() ? '' : original.apply(this, args); };
}

/* ---------- LinkedIn d'un membre : son robot, sur son ordinateur (10/11/2026) ---------- */

const robotInstalle = () => !estEquipe() || Boolean(D.moi && D.moi.robot_cle_le);
const barreLinkedinEquipe = window.barreLinkedin;
if (typeof barreLinkedinEquipe === 'function') window.barreLinkedin = function (...args) { return robotInstalle() ? barreLinkedinEquipe.apply(this, args) : ''; };
const ouvrirLinkedinEquipe = window.ouvrirLinkedin;
if (typeof ouvrirLinkedinEquipe === 'function') window.ouvrirLinkedin = function (...args) {
  if (!robotInstalle()) { toast("Ton LinkedIn n'est pas encore relié au CRM : Gabriel installe d'abord le robot sur ton ordinateur."); return undefined; }
  return ouvrirLinkedinEquipe.apply(this, args);
};
// Les textes de la page parlent du Mac de Gabriel ; chez un membre, c'est son ordinateur.
const MOTS_MAC = [[/\bmon Mac\b/g, 'mon ordinateur'], [/\bton Mac\b/g, 'ton ordinateur'], [/\bTon Mac\b/g, 'Ton ordinateur'], [/\ble Mac\b/g, "l'ordinateur"]];
function sansMac(racine) {
  if (!estEquipe() || !racine) return;
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!/Mac\b/.test(n.nodeValue)) continue;
    let t = n.nodeValue;
    for (const [re, mot] of MOTS_MAC) t = t.replace(re, mot);
    if (t !== n.nodeValue) n.nodeValue = t;
  }
}
new MutationObserver((liste) => { if (estEquipe()) for (const m of liste) for (const x of m.addedNodes) if (x.nodeType === 1) sansMac(x); })
  .observe(document.body, { childList: true, subtree: true });

// Aujourd'hui : un membre sans boîte connectée voit d'abord le bouton.
const vueJourEquipe = window.vueJour;
window.vueJour = function (...args) {
  const h = vueJourEquipe.apply(this, args);
  if (!estEquipe() || D.moi.google || !D.google_equipe) return h;
  return `<div class="alerte connecter-google"><p><b>Connecte ta boîte Google.</b> Tes emails partiront de ${esc(D.moi.email)}, les réponses de tes prospects arriveront sur leur fiche et tes rendez-vous seront lus dans ton agenda.</p><div class="actions"><button type="button" class="btn primaire" data-google-connecter>Connecter ma boîte Google</button></div></div>${h}`;
};

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-google-connecter]');
  if (!b) return;
  ev.preventDefault();
  b.disabled = true;
  try {
    const r = await api('POST', { op: 'google_connexion' });
    location.href = r.url;
  } catch (e) {
    toast(e.message);
    b.disabled = false;
  }
});

/* ---------- La fiche : qui suit ce lead ---------- */

const rendreFicheEquipe = window.rendreFiche;
window.rendreFiche = function (...args) {
  rendreFicheEquipe.apply(this, args);
  const f = document.getElementById('fiche');
  const l = typeof IDX !== 'undefined' && IDX.lead.get(S.fiche);
  if (!f || !l || !D.moi || ((D.equipe || []).length === 0 && !estEquipe())) return;
  const role = D.moi.role;
  const peutConfier = role === 'admin' || role === 'setter';
  const proprio = l.proprietaire || ADMIN_EQUIPE;
  const liste = (D.closers || []).slice();
  if (role === 'setter' && !liste.some((c) => c.email === D.moi.email)) liste.push({ email: D.moi.email, prenom: D.moi.prenom });
  if (!liste.some((c) => c.email === proprio)) liste.push({ email: proprio, prenom: prenomDe(proprio) });
  const bloc = document.createElement('p');
  bloc.className = 'meta suivi-par';
  bloc.innerHTML = peutConfier
    ? `<label>Suivi par <select data-proprio aria-label="Suivi par">${liste.map((c) => `<option value="${esc(c.email)}"${c.email === proprio ? ' selected' : ''}>${esc(c.prenom)}</option>`).join('')}</select></label>${l.setter ? ` · RDV posé par ${esc(prenomDe(l.setter))}` : ''}`
    : `Suivi par ${esc(prenomDe(proprio))}${l.setter ? ` · RDV posé par ${esc(prenomDe(l.setter))}` : ''}`;
  const tete = f.querySelector('.fiche-tete');
  if (tete) tete.insertAdjacentElement('afterend', bloc);
  const sel = bloc.querySelector('[data-proprio]');
  if (sel) sel.addEventListener('change', async () => {
    sel.disabled = true;
    try {
      const r = await api('POST', { op: 'maj', table: 'leads', id: l.id, valeurs: { proprietaire: sel.value } });
      remplacerLead(r.ligne);
      indexer();
      toast(`Lead confié à ${prenomDe(sel.value)}.`);
      rendreFiche();
      rendre();
    } catch (e) {
      toast(e.message);
      sel.disabled = false;
    }
  });
};

/* ---------- Réglages : sa boîte Google (membre), l'équipe (Gabriel) ---------- */

const ouvrirReglagesEquipe = window.ouvrirReglages;
window.ouvrirReglages = function (...args) {
  ouvrirReglagesEquipe.apply(this, args);
  const form = document.querySelector('dialog[open] form');
  if (!form || !D.moi) return;
  if (estEquipe()) {
    // Le lien d'avis Google est celui de Gabriel.
    const lien = form.querySelector('[name="lien_google"]');
    if (lien) { lien.closest('label').remove(); const b = form.querySelector('[data-lien-google]'); if (b) b.closest('div').remove(); }
    const fs = document.createElement('fieldset');
    fs.innerHTML = `<legend>Ma boîte Google</legend>${D.moi.google
      ? `<p class="aide">Connectée : tes emails partent de ${esc(D.moi.email)}.</p><div class="actions"><button type="button" class="btn" data-google-connecter>Reconnecter</button></div>`
      : `<p class="aide">Pas encore connectée. Sans elle, tu ne peux pas envoyer d'email depuis le CRM.</p><div class="actions"><button type="button" class="btn primaire" data-google-connecter>Connecter ma boîte Google</button></div>`}`;
    form.querySelector('h2').insertAdjacentElement('afterend', fs);
    return;
  }
  const fs = document.createElement('fieldset');
  fs.className = 'equipe-reglages';
  form.querySelector('h2').insertAdjacentElement('afterend', fs);
  dessinerEquipe(fs);
};

function dessinerEquipe(fs, cleMontree = null) {
  const liste = D.equipe || [];
  fs.innerHTML = `<legend>Équipe</legend>
    <p class="aide">Chacun entre avec sa clé, ne voit que ses leads (et ceux qu'il a posés, pour un setter) et envoie depuis sa propre boîte. Toi, tu vois tout.</p>
    ${cleMontree ? `<div class="alerte"><p><b>${cleMontree.robot ? 'Clé du robot LinkedIn' : 'Clé'} de ${esc(cleMontree.prenom)} :</b> <code data-cle>${esc(cleMontree.cle)}</code></p><p class="aide">${cleMontree.robot ? "Elle ne s'affichera plus. Elle se colle dans la configuration du robot, sur son ordinateur, pendant l'installation (avec Claude) : ne l'envoie pas par email." : "Elle ne s'affichera plus. Donne-la-lui par SMS ou de vive voix, avec le lien https://ia-entrepreneur.fr/crm/."}</p><div class="actions"><button type="button" class="btn petit" data-copier-cle>Copier la clé</button></div></div>` : ''}
    ${liste.length ? `<ul class="liste-equipe">${liste.map((m) => `<li data-membre="${esc(m.email)}">
      <span><b>${esc(m.prenom)} ${esc(m.nom || '')}</b> · ${esc(LIB_ROLE[m.role] || m.role)} · ${esc(m.email)}<br><span class="meta">${m.actif ? 'Accès actif' : 'Accès coupé'}${m.google ? ', boîte Google connectée' : ', boîte Google pas connectée'}${m.cle_le ? `, clé du ${esc(instantLisible(m.cle_le))}` : ''}${m.robot_cle_le ? `, robot LinkedIn relié le ${esc(instantLisible(m.robot_cle_le))}` : ', pas de robot LinkedIn'}</span></span>
      <span class="actions"><button type="button" class="btn petit" data-equipe="cle">Nouvelle clé</button><button type="button" class="btn petit" data-equipe="robot">${m.robot_cle_le ? 'Nouvelle clé de robot LinkedIn' : 'Clé de robot LinkedIn'}</button><button type="button" class="btn petit" data-equipe="actif">${m.actif ? "Couper l'accès" : "Rétablir l'accès"}</button></span>
    </li>`).join('')}</ul>` : '<p class="meta">Personne pour l\'instant.</p>'}
    <details${liste.length ? '' : ' open'}><summary>Ajouter quelqu'un</summary>
      <div class="ligne-champs">
        ${champ('Adresse', '<input type="email" data-n="email" placeholder="prenom@ia-entrepreneur.fr" autocomplete="off">')}
        ${champ('Prénom', '<input type="text" data-n="prenom" autocomplete="off">')}
        ${champ('Nom', '<input type="text" data-n="nom" autocomplete="off">')}
        ${champ('Rôle', '<select data-n="role"><option value="closer">Closer</option><option value="setter">Setter</option></select>')}
      </div>
      <div class="actions"><button type="button" class="btn primaire" data-equipe="creer">Créer son accès</button></div>
    </details>`;
  fs.querySelectorAll('[data-equipe]').forEach((b) => b.addEventListener('click', async () => {
    const li = b.closest('[data-membre]');
    const email = li ? li.dataset.membre : null;
    const membre = email ? liste.find((x) => x.email === email) : null;
    b.disabled = true;
    try {
      let r;
      if (b.dataset.equipe === 'creer') {
        const v = (n) => fs.querySelector(`[data-n="${n}"]`).value.trim();
        r = await api('POST', { op: 'equipe_creer', email: v('email'), prenom: v('prenom'), nom: v('nom'), role: v('role') });
      } else if (b.dataset.equipe === 'cle') {
        if (!confirm(`Nouvelle clé pour ${membre.prenom} ? L'ancienne ne marchera plus.`)) { b.disabled = false; return; }
        r = await api('POST', { op: 'equipe_cle', email });
      } else if (b.dataset.equipe === 'robot') {
        if (membre.robot_cle_le && !confirm(`Nouvelle clé de robot pour ${membre.prenom} ? Son robot actuel s'arrêtera jusqu'à ce qu'on colle la nouvelle.`)) { b.disabled = false; return; }
        r = await api('POST', { op: 'equipe_robot_cle', email });
        r.robot = true;
      } else {
        r = await api('POST', { op: 'equipe_maj', email, actif: !membre.actif });
      }
      const u = r.utilisateur;
      const i = (D.equipe || []).findIndex((x) => x.email === u.email);
      if (i >= 0) D.equipe[i] = u; else D.equipe = [...(D.equipe || []), u];
      dessinerEquipe(fs, r.cle ? { prenom: u.prenom, cle: r.cle, robot: Boolean(r.robot) } : null);
      poserFiltreEquipe(true);
      if (!r.cle) toast(u.actif ? `Accès de ${u.prenom} actif.` : `Accès de ${u.prenom} coupé.`);
    } catch (e) {
      toast(e.message);
      b.disabled = false;
    }
  }));
  const copier = fs.querySelector('[data-copier-cle]');
  if (copier) copier.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(fs.querySelector('[data-cle]').textContent); toast('Clé copiée.'); } catch { toast('Sélectionne la clé et copie-la.'); }
  });
}

/* ---------- Retour de Google, et premier chargement ---------- */

(function retourDeGoogle() {
  const p = new URLSearchParams(location.search);
  const issue = p.get('google');
  if (!issue) return;
  history.replaceState(null, '', location.pathname + location.hash);
  setTimeout(() => toast(MESSAGES_GOOGLE[issue] || MESSAGES_GOOGLE.erreur, 7000), 900);
})();

// Si les données sont arrivées avant ce fichier, on rattrape.
if (typeof D !== 'undefined' && D && D.leads) { apresChargement(); rendre(); }
