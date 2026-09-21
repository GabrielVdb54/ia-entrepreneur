/*
 * tel-reveal.js — Le numéro de téléphone n'est jamais écrit en clair dans le HTML.
 *
 * Décision de Gabriel (21/09/2026) : le 06 affiché sur les 310 pages était
 * aspiré par les robots de collecte (démarchage, SMS frauduleux). Chaque lien
 * « tel: » est donc remplacé par un bouton « Afficher le numéro » qui porte le
 * numéro encodé (base64 de la chaîne inversée) dans data-tel. Le numéro n'est
 * reconstruit qu'au clic d'un humain : un aspirateur de pages ne voit ni chiffres
 * ni href="tel:".
 *
 * Marquage attendu (généré par masquer_telephone.py) :
 *   <a class="tel-reveal" role="button" tabindex="0" data-tel="..."
 *      aria-label="Afficher le numéro de téléphone">…<span class="tel-value">Afficher le numéro</span></a>
 *
 * Après révélation l'élément redevient un vrai lien tel: — un second clic
 * lance l'appel sur mobile.
 */
(function () {
  'use strict';

  function decode(encoded) {
    try {
      return atob(encoded).split('').reverse().join('');
    } catch (e) {
      return '';
    }
  }

  function reveal(el) {
    var numero = decode(el.getAttribute('data-tel') || '');
    if (!numero) return;

    var chiffres = numero.replace(/\D/g, '');
    var label = el.querySelector('.tel-value');
    if (label) label.textContent = numero;

    el.setAttribute('href', 'tel:+33' + chiffres.slice(1));
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    el.removeAttribute('aria-label');
    el.removeAttribute('data-tel');
    el.classList.remove('tel-reveal');
    el.style.cursor = '';

    // Le menu mobile se referme au clic sur n'importe quel lien : on le
    // rouvre, sinon le numéro apparaîtrait dans un menu déjà refermé.
    var menu = el.closest ? el.closest('.mobile-menu') : null;
    if (menu) {
      menu.classList.add('open');
      var burger = document.getElementById('hamburger');
      if (burger) burger.classList.add('open');
    }
  }

  function init() {
    var boutons = document.querySelectorAll('a.tel-reveal[data-tel]');
    for (var i = 0; i < boutons.length; i++) {
      (function (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function (e) {
          // Une fois le numéro révélé l'élément est un vrai lien tel: :
          // on laisse le second clic lancer l'appel.
          if (!el.hasAttribute('data-tel')) return;
          e.preventDefault();
          reveal(el);
        });
        el.addEventListener('keydown', function (e) {
          if (!el.hasAttribute('data-tel')) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            reveal(el);
          }
        });
      })(boutons[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
