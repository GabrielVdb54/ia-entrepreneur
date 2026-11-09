/*
 * outil-opco.js : l'outil « Quel est mon OPCO ? » à poser sur n'importe quelle page.
 *
 *   <div data-outil-opco></div>
 *   <script defer src="/outil-opco.js"></script>
 *
 * Attributs facultatifs du bloc :
 *   data-titre="…"       remplace le titre (texte seul) ; data-titre="" le retire
 *   data-sous="…"        idem pour la phrase d'introduction
 *   data-niveau="h2"     titre en h2 (h3 par défaut)
 *   data-auto            lance la recherche si l'adresse contient ?siret=
 *
 * Le visiteur tape son SIRET (ou son SIREN) ; /api/opco renvoie son
 * entreprise, son effectif, son OPCO et sa convention collective. Le barème
 * de son OPCO lui est envoyé par email : c'est ce qui crée le lead (CRM de
 * Gabriel, à traiter le jour même). Même logique que l'outil fait pour Cathy
 * dans Ella. Aucun texte reçu n'est inséré tel quel dans la page.
 */
(function () {
  'use strict';
  if (window.__outilOpco) return;
  window.__outilOpco = true;

  var CSS = [
    '.oo{--oo-p:var(--primary,#1A3CFF);--oo-t:var(--text,#0A0F2C);--oo-m:var(--muted,#5B6185);--oo-b:rgba(10,15,44,.12);font-family:inherit;color:var(--oo-t);background:#fff;border:1px solid var(--oo-b);border-radius:20px;padding:26px 24px;box-shadow:0 10px 34px rgba(10,15,44,.07);text-align:left;max-width:760px;margin:0 auto}',
    '.oo *{box-sizing:border-box}',
    '.oo p{margin:0}',
    '.oo .oo-titre{font-size:1.3rem;line-height:1.3;font-weight:800;margin:0 0 6px;padding:0;color:var(--oo-t);border:0}',
    '.oo .oo-sous{font-size:.95rem;line-height:1.6;color:var(--oo-m);margin:0 0 16px}',
    '.oo .oo-ligne{display:flex;gap:10px;flex-wrap:wrap}',
    '.oo .oo-champ{flex:1 1 230px;min-width:0;font:inherit;font-size:1.05rem;padding:14px 16px;border:1.5px solid var(--oo-b);border-radius:12px;background:#fff;color:var(--oo-t);letter-spacing:.02em}',
    '.oo .oo-champ:focus{outline:none;border-color:var(--oo-p);box-shadow:0 0 0 3px rgba(26,60,255,.15)}',
    '.oo .oo-btn{flex:0 0 auto;font:inherit;font-weight:700;font-size:.98rem;padding:14px 24px;border:0;border-radius:50px;background:var(--oo-p);color:#fff;cursor:pointer;box-shadow:0 4px 18px rgba(26,60,255,.28)}',
    '.oo .oo-btn:hover{filter:brightness(1.07)}',
    '.oo .oo-btn[disabled]{opacity:.6;cursor:wait}',
    '.oo .oo-btn.vert{background:#10B981;box-shadow:0 4px 18px rgba(16,185,129,.28)}',
    '.oo .oo-aide{font-size:.84rem;color:var(--oo-m);margin:10px 0 0;line-height:1.55}',
    '.oo .oo-aide a,.oo .oo-lien{color:var(--oo-p);font-weight:600;text-decoration:underline;text-underline-offset:2px}',
    '.oo .oo-msg{margin:14px 0 0;padding:12px 14px;border-radius:12px;font-size:.92rem;line-height:1.55;background:#FFF5E5;color:#6B4E00}',
    '.oo .oo-msg.info{background:#F2F5FF;color:var(--oo-t)}',
    '.oo .oo-res{margin-top:20px;border-top:1px solid var(--oo-b);padding-top:20px}',
    '.oo .oo-ent{font-weight:800;font-size:1.05rem;margin:0}',
    '.oo .oo-ent span{display:block;font-weight:400;font-size:.88rem;color:var(--oo-m);margin-top:2px}',
    '.oo .oo-opco{margin:16px 0 0;padding:18px 18px;border-radius:14px;background:#F2F5FF}',
    '.oo .oo-opco small{display:block;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--oo-m)}',
    '.oo .oo-opco strong{display:block;font-size:1.6rem;line-height:1.2;color:var(--oo-p);margin-top:4px}',
    '.oo .oo-opco p{margin:8px 0 0;font-size:.88rem;line-height:1.55;color:var(--oo-m)}',
    '.oo .oo-faits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 0;padding:0;list-style:none}',
    '.oo .oo-faits li{padding:12px 14px;border:1px solid var(--oo-b);border-radius:12px;font-size:.9rem;line-height:1.45;min-width:0;overflow-wrap:anywhere}',
    '.oo .oo-faits b{display:block;font-size:.75rem;letter-spacing:.05em;text-transform:uppercase;color:var(--oo-m);margin-bottom:3px}',
    '.oo .oo-elig{margin:12px 0 0;font-size:.92rem;line-height:1.6}',
    '.oo .oo-elig.ok{color:#0B7A55}',
    '.oo .oo-gate{margin-top:18px;padding:20px 18px;border-radius:14px;background:#F0FBF6;border:1px solid rgba(16,185,129,.25)}',
    '.oo .oo-gate h3{margin:0 0 6px;font-size:1.12rem;line-height:1.35;color:var(--oo-t)}',
    '.oo .oo-gate p{margin:0 0 14px;font-size:.92rem;line-height:1.6;color:var(--oo-m)}',
    '.oo .oo-rgpd{font-size:.76rem!important;margin:10px 0 0!important;line-height:1.5!important}',
    '.oo .oo-piege{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}',
    '.oo .oo-liens{margin:10px 0 0;padding:0 0 0 18px;font-size:.9rem;line-height:1.7}',
    '.oo .oo-ok h3{color:#0B7A55}',
    '@media (max-width:560px){.oo{padding:20px 16px;border-radius:16px}.oo .oo-btn{width:100%}.oo .oo-faits{grid-template-columns:1fr}.oo .oo-opco strong{font-size:1.35rem}.oo .oo-titre{font-size:1.15rem}}',
  ].join('');

  var API = '/api/opco';
  var ANNUAIRE = 'https://annuaire-entreprises.data.gouv.fr/';

  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'texte') n.textContent = attrs[k];
        else if (k === 'classe') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (enfants || []).forEach(function (e) {
      if (e === null || e === undefined || e === false) return;
      n.appendChild(typeof e === 'string' ? document.createTextNode(e) : e);
    });
    return n;
  }

  function evenement(nom, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', nom, params || {}); } catch (e) { /* rien */ }
  }

  function chiffres(v) { return String(v || '').replace(/\D/g, ''); }

  function formater(v) {
    var c = chiffres(v).slice(0, 14);
    if (c.length <= 9) return c.replace(/(\d{3})(?=\d)/g, '$1 ');
    return c.slice(0, 9).replace(/(\d{3})(?=\d)/g, '$1 ') + ' ' + c.slice(9);
  }

  function dateFr(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function de(nom) { return /^[aeiouyhàâéèêîôû]/i.test(nom) ? 'd’' + nom : 'de ' + nom; }

  function lienExterne(url, texte) {
    return el('a', { href: url, target: '_blank', rel: 'noopener', classe: 'oo-lien', texte: texte });
  }

  function monter(bloc) {
    var titre = bloc.hasAttribute('data-titre') ? bloc.getAttribute('data-titre') : 'Quel budget formation pour vos salariés ?';
    var racine = el('div', { classe: 'oo' });
    if (titre) racine.appendChild(el(bloc.getAttribute('data-niveau') === 'h2' ? 'h2' : 'h3', { classe: 'oo-titre', texte: titre }));
    var sous = bloc.hasAttribute('data-sous') ? bloc.getAttribute('data-sous') : 'Entrez votre SIRET : vous voyez tout de suite votre OPCO et votre convention collective, puis nous vous envoyons le budget formation auquel votre entreprise a droit.';
    if (sous) racine.appendChild(el('p', { classe: 'oo-sous', texte: sous }));

    var id = 'oo-siret-' + Math.random().toString(36).slice(2, 8);
    var champ = el('input', { classe: 'oo-champ', id: id, type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'SIRET (14 chiffres) ou SIREN (9)', 'aria-label': 'Numéro SIRET ou SIREN de votre entreprise', maxlength: '20' });
    var bouton = el('button', { classe: 'oo-btn', type: 'submit', texte: 'Trouver mon OPCO' });
    var form = el('form', { novalidate: '' }, [el('div', { classe: 'oo-ligne' }, [champ, bouton])]);
    racine.appendChild(form);
    var aide = el('p', { classe: 'oo-aide' }, ['Il figure sur vos factures et votre extrait Kbis. Pas sous la main ? ', lienExterne(ANNUAIRE, 'Retrouvez-le par le nom de votre entreprise'), '.']);
    racine.appendChild(aide);
    var zone = el('div', { 'aria-live': 'polite' });
    racine.appendChild(zone);
    bloc.innerHTML = '';
    bloc.appendChild(racine);

    var page = location.pathname;
    var dernier = null;

    champ.addEventListener('input', function () {
      var pos = champ.value.length;
      champ.value = formater(champ.value);
      if (pos === champ.value.length) champ.setSelectionRange(pos, pos);
    });

    function message(texte, info) {
      zone.innerHTML = '';
      zone.appendChild(el('p', { classe: 'oo-msg' + (info ? ' info' : ''), texte: texte }));
    }

    function chercher() {
      var n = chiffres(champ.value);
      if (n.length !== 9 && n.length !== 14) {
        message('Un SIRET compte 14 chiffres, un SIREN 9. Vérifiez le numéro saisi.');
        champ.focus();
        return;
      }
      bouton.disabled = true;
      bouton.textContent = 'Recherche…';
      message('Recherche dans les registres publics (Insee, France compétences)…', true);
      evenement('outil_opco_recherche', { page: page });
      fetch(API + '?siret=' + n, { headers: { accept: 'application/json' } })
        .then(function (r) {
          if (r.status === 429) return { etat: 'trop' };
          return r.json();
        })
        .then(function (d) { afficher(d); })
        .catch(function () { message('Les registres publics ne répondent pas pour le moment. Réessayez dans un instant.'); })
        .then(function () { bouton.disabled = false; bouton.textContent = 'Trouver mon OPCO'; });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); chercher(); });

    function afficher(d) {
      var erreurs = {
        format: 'Un SIRET compte 14 chiffres, un SIREN 9. Vérifiez le numéro saisi.',
        invalide: 'Ce numéro contient une erreur de frappe : un chiffre est sans doute inversé ou manquant.',
        introuvable: 'Aucune entreprise ne correspond à ce numéro dans le répertoire Sirene.',
        indisponible: 'Les registres publics ne répondent pas pour le moment. Réessayez dans un instant.',
        trop: 'Beaucoup de recherches en peu de temps : patientez quelques minutes avant de réessayer.',
      };
      if (!d || d.etat !== 'trouve') {
        message(erreurs[(d && d.etat) || 'indisponible'] || erreurs.indisponible);
        return;
      }
      dernier = d;
      zone.innerHTML = '';
      var res = el('div', { classe: 'oo-res' });
      var e = d.entreprise || {};
      var lieu = [e.code_postal, e.commune].filter(Boolean).join(' ');
      res.appendChild(el('p', { classe: 'oo-ent' }, [e.enseigne || e.nom || ('SIRET ' + formater(d.siret || d.numero)), el('span', { texte: [e.enseigne ? e.nom : '', lieu, 'SIRET ' + formater(d.siret || d.numero) + (d.numero.length === 9 ? ' (siège)' : '')].filter(Boolean).join(', ') })]));
      if (e.ferme) res.appendChild(el('p', { classe: 'oo-msg', texte: 'Cet établissement est fermé dans le répertoire Sirene. Si votre entreprise a déménagé, saisissez le SIRET de l’établissement actuel.' }));

      var o = d.opco;
      var boite = el('div', { classe: 'oo-opco' });
      if (o) {
        boite.appendChild(el('small', { texte: 'Votre OPCO' }));
        boite.appendChild(el('strong', { texte: o.ambigu ? o.candidats.join(' ou ') : o.nom }));
        var src = d.methode === 'siret'
          ? 'Source officielle : table SIRET-OPCO de France compétences, données du ' + dateFr(d.donnee_maj) + '.'
          : 'Déduit de votre convention collective, rattachée à cet OPCO dans la table de France compétences.';
        boite.appendChild(el('p', { texte: src }));
        if (o.gestion) boite.appendChild(el('p', { texte: 'Votre dossier est géré par ' + o.gestion + ', qui reçoit les demandes de prise en charge.' }));
        if (o.ambigu) boite.appendChild(el('p', { texte: 'Votre convention est partagée entre plusieurs OPCO : nous vérifions le vôtre avec vous avant tout dépôt.' }));
      } else {
        boite.appendChild(el('small', { texte: 'Votre OPCO' }));
        boite.appendChild(el('strong', { texte: 'À vérifier' }));
        boite.appendChild(el('p', { texte: 'Votre établissement n’apparaît pas dans la table de France compétences, qui ne recense que les employeurs déclarant des salariés. C’est le cas courant d’une entreprise sans salarié ou créée récemment. La formation du dirigeant non salarié relève alors d’un fonds d’assurance formation (AGEFICE, FIF-PL, FAFCEA, VIVEA ou FAF-PM).' }));
      }
      res.appendChild(boite);

      var faits = [];
      if (d.convention) faits.push(el('li', null, [el('b', { texte: 'Convention collective' }), (d.convention.titre ? d.convention.titre + ' ' : '') + '(IDCC ' + d.convention.idcc + ')']));
      if (d.effectif && d.effectif.libelle) faits.push(el('li', null, [el('b', { texte: 'Effectif' }), d.effectif.libelle + (d.effectif.annee ? ' (Insee, ' + d.effectif.annee + ')' : '')]));
      if (faits.length) res.appendChild(el('ul', { classe: 'oo-faits' }, faits));

      var eff = d.effectif || {};
      if (o && eff.moins_de_50 === true && eff.tranche !== 'NN' && eff.tranche !== '00') {
        res.appendChild(el('p', { classe: 'oo-elig ok', texte: 'Moins de 50 salariés : la formation de vos salariés peut être prise en charge sur les fonds mutualisés ' + de(o.gestion || o.nom) + '.' }));
      } else if (o && eff.moins_de_50 === false) {
        res.appendChild(el('p', { classe: 'oo-elig', texte: 'À partir de 50 salariés, les fonds mutualisés de l’OPCO ne s’appliquent plus : la formation se finance sur votre budget ou par un versement volontaire à ' + (o.gestion || o.nom) + '.' }));
      }

      res.appendChild(d.envoi ? porte(d) : liensDirects(d.liens, d.fonds_non_salaries));
      zone.appendChild(res);
      evenement('outil_opco_resultat', { page: page, opco: o ? o.nom : 'aucun', methode: d.methode || 'aucune' });
      try { res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (x) { /* rien */ }
    }

    function porte(d) {
      var o = d.opco;
      var nomOpco = o ? (o.gestion || (o.ambigu ? 'votre OPCO' : o.nom)) : null;
      var gate = el('div', { classe: 'oo-gate' });
      gate.appendChild(el('h3', { texte: d.bareme ? 'Votre budget formation 2026 est prêt' : nomOpco ? 'Combien ' + nomOpco + ' peut financer ?' : 'Quels financements pour votre entreprise ?' }));
      gate.appendChild(el('p', { texte: d.bareme
        ? 'Nous avons le barème 2026 de votre branche chez ' + nomOpco + '. Recevez par email le montant auquel votre entreprise a droit, avec le lien officiel.'
        : nomOpco
        ? 'Recevez par email le lien direct vers la page ' + de(nomOpco) + ' qui donne le montant pour votre branche.'
        : 'Recevez par email les financeurs possibles pour votre entreprise et les liens vers leurs critères de prise en charge. Si vous avez des salariés, nous vérifions votre OPCO avec vous.' }));
      var email = el('input', { classe: 'oo-champ', type: 'email', autocomplete: 'email', placeholder: 'vous@entreprise.fr', 'aria-label': 'Votre adresse email', required: '' });
      var piege = el('input', { classe: 'oo-piege', type: 'text', name: 'site_web', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
      var envoyer = el('button', { classe: 'oo-btn vert', type: 'submit', texte: 'Recevoir mon budget' });
      var f = el('form', { novalidate: '' }, [el('div', { classe: 'oo-ligne' }, [email, envoyer]), piege]);
      gate.appendChild(f);
      gate.appendChild(el('p', { classe: 'oo-rgpd' }, ['Votre adresse sert à vous envoyer ce résultat et à vous recontacter au sujet de votre projet de formation. Vous pouvez vous y opposer à tout moment. ', el('a', { href: '/politique-confidentialite.html', classe: 'oo-lien', texte: 'Politique de confidentialité' }), '.']));
      var retour = el('div', { 'aria-live': 'polite' });
      gate.appendChild(retour);

      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var adresse = email.value.trim();
        if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(adresse)) {
          retour.innerHTML = '';
          retour.appendChild(el('p', { classe: 'oo-msg', texte: 'Cette adresse email semble incomplète.' }));
          email.focus();
          return;
        }
        envoyer.disabled = true;
        envoyer.textContent = 'Envoi…';
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ siret: d.siret || d.numero, email: adresse, page: page, piege: piege.value }),
        })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { statut: r.status, j: j }; }); })
          .then(function (x) {
            if (x.statut === 200 && x.j.ok) {
              evenement('outil_opco_email', { page: page, opco: o ? o.nom : 'aucun' });
              evenement('generate_lead', { lead_source: 'outil_opco' });
              gate.innerHTML = '';
              gate.classList.add('oo-ok');
              gate.appendChild(el('h3', { texte: 'C’est envoyé à ' + adresse }));
              gate.appendChild(el('p', { texte: 'Votre budget arrive dans quelques minutes. Pensez à regarder dans vos courriers indésirables. Pour aller plus vite, prenons 30 minutes ensemble : nous montons votre dossier de financement et vous connaissez votre reste à charge avant de signer.' }));
              gate.appendChild(el('a', { href: '/rendez-vous.html', classe: 'oo-btn vert', style: 'display:inline-block;text-decoration:none', texte: 'Prendre rendez-vous' }));
              return;
            }
            if (x.j && x.j.erreur === 'email_invalide') {
              retour.innerHTML = '';
              retour.appendChild(el('p', { classe: 'oo-msg', texte: 'Cette adresse email semble incomplète.' }));
              return;
            }
            if (x.statut === 429) {
              retour.innerHTML = '';
              retour.appendChild(el('p', { classe: 'oo-msg', texte: 'Beaucoup de demandes en peu de temps : patientez quelques minutes avant de réessayer.' }));
              return;
            }
            // L'email n'a pas pu partir : le visiteur repart quand même avec les liens.
            var remplacant = liensDirects(x.j && x.j.liens, null);
            remplacant.insertBefore(el('p', { classe: 'oo-msg', style: 'margin:0 0 12px', texte: 'L’email n’a pas pu partir. Voici directement les liens, et nous vous recontactons.' }), remplacant.firstChild);
            gate.parentNode.replaceChild(remplacant, gate);
          })
          .catch(function () {
            retour.innerHTML = '';
            retour.appendChild(el('p', { classe: 'oo-msg', texte: 'L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez.' }));
          })
          .then(function () { envoyer.disabled = false; envoyer.textContent = 'Recevoir mon budget'; });
      });
      return gate;
    }

    function liensDirects(liens, fonds) {
      var b = el('div', { classe: 'oo-gate' });
      var o = dernier && dernier.opco;
      var nomOpco = o ? (o.gestion || o.nom) : null;
      b.appendChild(el('h3', { texte: nomOpco ? 'Combien ' + nomOpco + ' peut financer ?' : 'Les financeurs possibles' }));
      var items = [];
      if (liens && liens.criteres) {
        var l = (liens.gestion && liens.gestion.criteres) || liens.criteres;
        items.push(el('li', null, [lienExterne(l, 'Le barème ' + de(nomOpco)), ' : choisissez votre branche' + (dernier && dernier.convention && dernier.convention.titre ? ' (« ' + dernier.convention.titre + ' »)' : '') + ', le plafond dépend de votre effectif.']));
        var esp = (liens.gestion && liens.gestion.espace) || liens.espace;
        if (esp) items.push(el('li', null, [lienExterne(esp, 'Votre espace ' + nomOpco), ' : pour déposer la demande, avant le début de la formation.']));
      }
      (fonds || []).forEach(function (f) { items.push(el('li', null, [lienExterne(f.criteres, f.nom), ' : ' + f.pour])); });
      if (items.length) b.appendChild(el('ul', { classe: 'oo-liens' }, items));
      b.appendChild(el('p', { style: 'margin:12px 0 0' }, ['Nous montons votre dossier de financement avec vous. ', el('a', { href: '/rendez-vous.html', classe: 'oo-lien', texte: 'Prendre rendez-vous (30 minutes)' })]));
      return b;
    }

    if (bloc.hasAttribute('data-auto')) {
      var p = new URLSearchParams(location.search).get('siret');
      if (p && /^[\d\s]{9,20}$/.test(p)) {
        champ.value = formater(p);
        chercher();
      }
    }
  }

  function demarrer() {
    var blocs = document.querySelectorAll('[data-outil-opco]');
    if (!blocs.length) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    Array.prototype.forEach.call(blocs, monter);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
