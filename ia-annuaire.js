/* ia-annuaire.js — genere par generate_ia_pages.py, ne pas editer a la main */
(function () {
  var CLE = 'ia-entrepreneur-favoris';

  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) { return []; }
  }
  function ecrire(liste) {
    try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch (e) { /* navigation privee */ }
  }
  function est(slug) { return lire().indexOf(slug) >= 0; }
  function basculer(slug) {
    var l = lire(), i = l.indexOf(slug);
    if (i >= 0) l.splice(i, 1); else l.push(slug);
    ecrire(l);
    return i < 0;
  }

  var minuteur;
  function toast(message) {
    var el = document.querySelector('.ia-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ia-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  function rafraichir() {
    var favoris = lire();
    Array.prototype.forEach.call(document.querySelectorAll('[data-fav]'), function (b) {
      var on = favoris.indexOf(b.dataset.fav) >= 0;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (b.classList.contains('ia-fav-long')) {
        b.textContent = on ? '★ Dans vos favoris' : '☆ Ajouter à mes favoris';
      } else {
        b.textContent = on ? '★' : '☆';
        b.title = on ? 'Retirer de mes favoris' : 'Ajouter à mes favoris';
      }
    });
    document.dispatchEvent(new CustomEvent('ia-favoris-maj', { detail: favoris }));
  }

  document.addEventListener('click', function (ev) {
    var bouton = ev.target.closest('[data-fav]');
    if (bouton) {
      ev.preventDefault();
      ev.stopPropagation();
      var ajoute = basculer(bouton.dataset.fav);
      rafraichir();
      toast(ajoute ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
      return;
    }
    var partage = ev.target.closest('[data-partager]');
    if (partage) {
      ev.preventDefault();
      var donnees = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(donnees).catch(function () { /* partage annule */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () { toast('Lien copié'); });
      } else {
        toast(location.href);
      }
    }
  });

  window.IAFavoris = { lire: lire, est: est, toast: toast };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rafraichir);
  } else {
    rafraichir();
  }
})();
