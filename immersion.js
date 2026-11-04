/* Immersion (prototype v2, 03/11/2026) — voir immersion.css.
   Charge après /vendor/gsap/{gsap,ScrollTrigger,SplitText}.min.js (defer).
   Chaque bloc est isolé : une erreur dans l'un ne bloque pas les autres.
   Sans GSAP, ou avec « réduire les animations », rien n'est masqué. */
(function () {
  'use strict';
  var html = document.documentElement;
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger, SPLIT = window.SplitText;
  var anime = !calme && !!G && !!ST;
  var grand = window.matchMedia('(min-width: 1025px)').matches;
  var souris = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sur = function (nom, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[immersion] ' + nom, e); } };
  // n'animer en entrée que ce qui n'est pas encore à l'écran
  var sousLaLigne = function (el) { return el.getBoundingClientRect().top > window.innerHeight * 0.92; };
  var animes = [];
  var marquer = function (els) { (els.length === undefined ? [els] : els).forEach(function (e) { animes.push(e); }); return els; };

  if (anime) { G.registerPlugin(ST); if (SPLIT) G.registerPlugin(SPLIT); }

  /* ── 0. Préchargement au survol (Chrome) : la page suivante arrive plus vite ── */
  sur('prefetch', function () {
    if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
      var s = document.createElement('script');
      s.type = 'speculationrules';
      s.textContent = JSON.stringify({ prefetch: [{ where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/api/*' } }, { not: { href_matches: '/quiz/*' } }] }, eagerness: 'moderate' }] });
      document.head.appendChild(s);
    }
  });

  /* ── 1. Démonstration du hero ─────────────────────────────────── */
  var demo = { demarrer: function () {} };
  sur('demo', function () {
    var d = document.getElementById('immDemo');
    if (!d) return;
    var tabs = $$('[role="tab"]', d);
    var cas = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var barre = $('.imm-jours', d), pastille = $('.imm-jours-pastille', d);
    var courant = 0, tl = null, attente = null, survol = false, manuel = false, visible = true, lance = false;

    var placer = function () {
      var t = tabs[courant];
      pastille.style.width = t.offsetWidth + 'px';
      pastille.style.transform = 'translateX(' + (t.offsetLeft - 4) + 'px)';
    };
    barre.classList.add('imm-pret');
    placer();
    window.addEventListener('resize', placer, { passive: true });

    var selectionner = function (i) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      courant = i; placer();
    };

    var planifier = function () {
      if (!anime || manuel) return;
      if (attente) attente.kill();
      attente = G.delayedCall(4.8, function () {
        attente = null;
        if (survol || !visible || manuel || document.hidden) return;
        aller((courant + 1) % cas.length);
      });
    };

    var jouer = function (c) {
      if (!anime) return;
      if (tl) tl.kill();
      var txt = $('.imm-prompt-txt', c), plein = txt.getAttribute('data-texte');
      var lignes = $$('.imm-sortie > *', c), o = { n: 0 };
      txt.textContent = ''; txt.classList.add('imm-tape');
      tl = G.timeline({ onComplete: planifier });
      tl.fromTo($('.imm-source', c), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
        .set($$('.imm-sortie > *', c), { opacity: 0 })
        .add(function () { $('.imm-sortie', c).classList.add('imm-ecrit'); })
        .to(o, { n: plein.length, duration: plein.length * 0.026, ease: 'none',
          onUpdate: function () { txt.textContent = plein.slice(0, Math.round(o.n)); } }, '+=0.2')
        .add(function () { txt.classList.remove('imm-tape'); })
        .to($('.imm-prompt', c), { scale: 0.97, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' })
        .add(function () { $('.imm-sortie', c).classList.remove('imm-ecrit'); }, '+=0.35')
        .fromTo(lignes, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.42, stagger: 0.17, ease: 'power2.out' }, '<0.1')
        .fromTo($('.imm-ok', c), { scale: 0.5 }, { scale: 1, duration: 0.55, ease: 'back.out(3)' }, '-=0.3');
    };

    var aller = function (i, focus) {
      if (i === courant && lance) return;
      var ancien = cas[courant];
      selectionner(i);
      var nouveau = cas[i];
      if (focus) tabs[i].focus();
      if (!anime) { cas.forEach(function (c, k) { c.hidden = k !== i; }); return; }
      if (attente) { attente.kill(); attente = null; }
      if (ancien !== nouveau) {
        G.to(ancien, { opacity: 0, y: -12, duration: 0.3, ease: 'power2.in', onComplete: function () {
          ancien.hidden = true; G.set(ancien, { clearProps: 'opacity,transform' });
        } });
      }
      nouveau.hidden = false;
      G.fromTo(nouveau, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: ancien !== nouveau ? 0.22 : 0 });
      G.delayedCall(ancien !== nouveau ? 0.22 : 0, function () { jouer(nouveau); });
    };

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { manuel = true; lance = true; aller(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!k) return;
        e.preventDefault(); manuel = true; lance = true;
        aller((i + k + tabs.length) % tabs.length, true);
      });
    });
    d.addEventListener('pointerenter', function () { survol = true; });
    d.addEventListener('pointerleave', function () { survol = false; if (lance && !attente && !(tl && tl.isActive())) planifier(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && lance && !attente && !(tl && tl.isActive())) planifier(); });
    if (anime) {
      ST.create({ trigger: d, start: 'top bottom', end: 'bottom top', onToggle: function (self) {
        visible = self.isActive;
        if (tl) { if (visible) tl.resume(); else tl.pause(); }
        if (visible && lance && !attente && !(tl && tl.isActive())) planifier();
      } });
    }
    demo.demarrer = function () { if (lance) return; lance = true; jouer(cas[0]); };
  });

  /* ── 2. Parcours N1 → N2 → N3 (formation-ia-entreprise.html) ───── */
  sur('parcours', function () {
    var parcours = $('.imm-parcours');
    var visuel = parcours && $('.imm-parcours-visuel', parcours);
    if (!parcours || !visuel) return;
    var cartes = $$('.niveau-card', parcours), etapes = $$('.imm-pv-etape', visuel);
    var scenes = $$('.imm-pv-scene', visuel), livrables = $$('.imm-pv-livrable p', visuel);
    var rail = $('.imm-pv-rail-plein', visuel), mq = window.matchMedia('(min-width: 1025px)');
    var courant = -1, attente = false, actif = false;
    var afficher = function (i) {
      if (i === courant) return;
      courant = i;
      cartes.forEach(function (c, k) { c.classList.toggle('imm-courant', k === i); });
      etapes.forEach(function (et, k) { et.classList.toggle('courant', k === i); et.classList.toggle('fait', k < i); });
      scenes.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      livrables.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    };
    var calculer = function () {
      attente = false;
      if (!mq.matches) return;
      var repere = window.innerHeight * 0.45, i = 0;
      cartes.forEach(function (c, k) { if (c.getBoundingClientRect().top < repere) i = k; });
      afficher(i);
      var debut = cartes[0].getBoundingClientRect().top - repere;
      var fin = cartes[cartes.length - 1].getBoundingClientRect().top - repere;
      if (rail) rail.style.setProperty('--p', Math.min(1, Math.max(0, debut / (debut - fin))).toFixed(3));
    };
    var auScroll = function () { if (!attente) { attente = true; requestAnimationFrame(calculer); } };
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !actif) { actif = true; window.addEventListener('scroll', auScroll, { passive: true }); calculer(); }
      if (!vis && actif) { actif = false; window.removeEventListener('scroll', auScroll); }
    }, { rootMargin: '200px 0px' }).observe(parcours);
    window.addEventListener('resize', auScroll, { passive: true });
    afficher(0);
  });

  /* ── 2b. Sommaire collant (formation) : où suis-je dans la page ─── */
  sur('sommaire', function () {
    var nav = $('.imm-sommaire');
    if (!nav) return;
    var header = $('body > header');
    var hauteur = function () { if (header) html.style.setProperty('--imm-haut', header.offsetHeight + 'px'); };
    hauteur(); window.addEventListener('resize', hauteur, { passive: true });
    var liens = $$('a[href^="#"]', nav).filter(function (a) { return !a.classList.contains('imm-sommaire-cta'); });
    var cibles = liens.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var maj = function () {
      var repere = window.innerHeight * 0.35, actif = -1;
      cibles.forEach(function (c, i) { if (c && c.getBoundingClientRect().top < repere) actif = i; });
      liens.forEach(function (a, i) {
        if (i === actif) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      // garder le lien actif visible quand la barre défile horizontalement (mobile)
      if (actif > -1 && nav.scrollWidth > nav.clientWidth) {
        var a = liens[actif], boite = a.parentNode;
        if (a.offsetLeft < boite.scrollLeft || a.offsetLeft + a.offsetWidth > boite.scrollLeft + boite.clientWidth) boite.scrollLeft = a.offsetLeft - 12;
      }
    };
    var attente = false;
    window.addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(function () { attente = false; maj(); }); } }, { passive: true });
    maj();
  });

  /* ── 2c. Pages outil : « Ce qui est possible » ─────────────────── */
  sur('possible', function () {
    var sec = $('.imm-possible');
    if (!sec) return;
    var capas = $$('.imm-capa', sec), ecran = $('.imm-ecran', sec);
    var scenesBox = ecran && $('.imm-ecran-scenes', ecran), compte = ecran && $('.imm-ecran-compte', ecran);
    var mq = window.matchMedia('(min-width: 1025px)');
    // sur petit écran, chaque maquette s'anime quand elle arrive
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    if (!mq.matches || !scenesBox) { $$('.imm-capa-visuel .mk', sec).forEach(function (m) { io.observe(m); }); return; }
    // sur grand écran, les maquettes passent dans l'écran qui reste en place
    var scenes = capas.map(function (c) { var m = $('.imm-capa-visuel .mk', c); if (m) scenesBox.appendChild(m); return m; });
    sec.classList.add('imm-pret');
    var courant = -1, attente = false;
    var afficher = function (i) {
      if (i === courant) return;
      courant = i;
      capas.forEach(function (c, k) { c.classList.toggle('on', k === i); });
      scenes.forEach(function (m, k) { if (m) m.classList.toggle('on', k === i); });
      if (compte) compte.textContent = (i + 1) + ' / ' + capas.length;
    };
    var calculer = function () {
      attente = false;
      var repere = window.innerHeight * 0.5, i = 0;
      capas.forEach(function (c, k) { if (c.getBoundingClientRect().top < repere) i = k; });
      afficher(i);
    };
    window.addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(calculer); } }, { passive: true });
    window.addEventListener('resize', calculer, { passive: true });
    afficher(0);
  });

  /* ── 2d. Le public visé change de mot (pages outil) ─────────────── */
  sur('rotatif', function () {
    $$('.imm-rotatif[data-mots]').forEach(function (el) {
      var mots = el.getAttribute('data-mots').split('|');
      el.textContent = '';
      var spans = mots.map(function (m, i) { var s = document.createElement('span'); s.textContent = m; if (i === 0) s.className = 'on'; if (i > 0) s.setAttribute('aria-hidden', 'true'); el.appendChild(s); return s; });
      el.setAttribute('aria-label', mots.join(', '));
      if (calme || mots.length < 2) return;
      var i = 0;
      setInterval(function () {
        if (document.hidden || el.getBoundingClientRect().bottom < 0) return;
        var a = spans[i]; i = (i + 1) % spans.length; var b = spans[i];
        a.classList.remove('on'); a.classList.add('sort');
        b.classList.remove('sort'); b.classList.add('on');
        setTimeout(function () { a.classList.remove('sort'); }, 600);
      }, 2400);
    });
  });

  /* ── 2e. Les portraits ne défilent que lorsqu'on les voit ───────── */
  sur('equipe-defile', function () {
    $$('.imm-equipe-fenetre').forEach(function (f) {
      new IntersectionObserver(function (es) { f.classList.toggle('joue', es[0].isIntersecting); }, { threshold: 0.15 }).observe(f);
    });
  });

  /* ── 3. Mise en scène GSAP ────────────────────────────────────── */
  if (!anime) {
    html.classList.remove('imm-anim');
    // « réduire les animations » : les apparitions d'origine de l'accueil s'affichent directement
    if (calme) $$('.reveal').forEach(function (el) { el.classList.remove('reveal'); el.classList.add('visible'); });
    $$('.imm-etape-rond').forEach(function (r) { r.classList.add('fait'); });
    return;
  }

  // La page d'accueil avait son propre système (.reveal) : on le reprend ici.
  var anciens = $$('.reveal');
  anciens.forEach(function (el) { el.classList.remove('reveal'); el.classList.add('visible'); });

  // Pose l'état de départ tout de suite, puis anime vers l'état naturel quand
  // l'élément arrive à l'écran. Ce qui est déjà visible n'est jamais masqué.
  var entree = function (cible, de, opts) {
    var els = (typeof cible === 'string' ? $$(cible) : cible).filter(function (e) { return e && animes.indexOf(e) === -1 && sousLaLigne(e); });
    if (!els.length) return;
    marquer(els);
    G.set(els, de);
    var vers = { duration: (opts && opts.duree) || 1, ease: (opts && opts.ease) || 'expo.out', stagger: (opts && opts.stagger) || 0.12, overwrite: true };
    Object.keys(de).forEach(function (k) { vers[k] = k === 'opacity' ? 1 : k === 'clipPath' ? 'inset(0% 0% 0% 0% round 0px)' : (k === 'scale' ? 1 : (k === 'transformPerspective' || k === 'transformOrigin') ? de[k] : 0); });
    if (opts && opts.vers) Object.assign(vers, opts.vers);
    ST.batch(els, { start: (opts && opts.start) || 'top 88%', once: true, onEnter: function (lot) { G.to(lot, vers); } });
  };

  var compter = function (el, delai) {
    var brut = el.getAttribute('data-imm-compte') || el.textContent;
    var m = String(brut).replace(/ | /g, ' ').match(/^(\D*?)(\d[\d ]*)(.*)$/);
    if (!m) return;
    var pre = el.hasAttribute('data-pre') ? el.getAttribute('data-pre') : m[1];
    var suf = el.hasAttribute('data-suf') ? el.getAttribute('data-suf') : m[3];
    var cible = parseInt(m[2].replace(/ /g, ''), 10), o = { v: 0 }, final = el.textContent;
    var fmt = function (v) { return pre + Math.round(v).toLocaleString('fr-FR') + suf; };
    // un chiffre déjà à l'écran n'est jamais remis à zéro : il défile tout de suite
    if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = fmt(0);
    ST.create({ trigger: el, start: 'top bottom', once: true, onEnter: function () {
      G.to(o, { v: cible, duration: 1.6, delay: delai || 0, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v); },
        onComplete: function () { el.textContent = final; } });
    } });
  };

  /* 3a. Hero : entrée orchestrée, profondeur à la souris, recul au scroll */
  sur('hero', function () {
    var scene = document.getElementById('immScene');
    if (!scene) return;
    var dm = document.getElementById('immDemo'), photo = $('.imm-photo', scene);
    var tl = G.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
    if (grand) {
      if (photo) tl.fromTo(photo, { opacity: 0, x: 120, rotation: 16 }, { opacity: 1, x: 0, rotation: 5, duration: 1.5 });
      tl.fromTo(dm, { opacity: 0, y: 110, rotationY: -34, rotationX: 20 }, { opacity: 1, y: 0, rotationY: -8, rotationX: 4, duration: 1.7 }, photo ? '-=1.25' : 0)
        .add(function () { demo.demarrer(); }, '-=0.9');
    } else {
      G.set(photo ? [photo, dm] : [dm], { opacity: 1 });
      ST.create({ trigger: dm, start: 'top 80%', once: true, onEnter: function () { demo.demarrer(); } });
    }
    html.classList.remove('imm-anim');

    var trait = $('.imm-souligne path');
    if (trait) {
      var L = trait.getTotalLength();
      G.fromTo(trait, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.2, ease: 'power3.inOut', delay: 0.55 });
    }
    // chiffres du hero
    $$('.hero-stat strong').forEach(function (s, i) { if (/\d/.test(s.textContent)) compter(s, 0.5 + i * 0.1); });

    if (grand && souris) {
      var rx = G.quickTo(dm, 'rotationX', { duration: 0.9, ease: 'power3' });
      var ry = G.quickTo(dm, 'rotationY', { duration: 0.9, ease: 'power3' });
      var px = photo ? G.quickTo(photo, 'x', { duration: 1.2, ease: 'power3' }) : function () {};
      var py = photo ? G.quickTo(photo, 'y', { duration: 1.2, ease: 'power3' }) : function () {};
      (scene.closest('section') || document.body).addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        ry(-8 + nx * 12); rx(4 - ny * 9); px(-nx * 34); py(-ny * 24);
      });
    }
    if (grand) {
      var heroSec = scene.closest('section');
      G.to(scene, { yPercent: -10, scale: 0.96, ease: 'none', scrollTrigger: { trigger: heroSec, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      if ($('.hero-content')) G.to('.hero-content', { yPercent: -6, opacity: 0.4, ease: 'none', scrollTrigger: { trigger: heroSec, start: 'center top', end: 'bottom top', scrub: 0.6 } });
    }
  });

  /* 3b. Titres de section : les lignes montent hors d'un masque */
  sur('titres', function () {
    $$('section h2').forEach(function (h) {
      if (h.closest('#accueil') || h.getAttribute('data-imm') === 'enonce' || !sousLaLigne(h)) return;
      marquer(h);
      if (SPLIT) {
        SPLIT.create(h, { type: 'lines', mask: 'lines', linesClass: 'imm-ligne', autoSplit: true, onSplit: function (self) {
          return G.from(self.lines, { yPercent: 118, duration: 1.1, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
        } });
      } else {
        G.from(h, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
      }
    });
    entree('.section-label', { opacity: 0, x: -18 }, { duree: 0.8 });
    entree('.section-sub', { opacity: 0, y: 22 }, { duree: 0.9 });
  });

  /* 3c. Bandeau bleu : les chiffres défilent */
  sur('compteurs', function () { $$('[data-imm-compte]').forEach(function (el, i) { compter(el, i * 0.12); }); });

  var sectionDu = function (texte) {
    var h = $$('section h2, section h3').filter(function (x) { return x.textContent.indexOf(texte) !== -1; })[0];
    return h ? h.closest('section') : null;
  };

  /* 3d. Accueil, section par section */
  sur('offres', function () {
    entree($$('.imm-voie'), { opacity: 0, y: 70 }, { duree: 1.2, stagger: 0.15 });
    // les marches montent l'une après l'autre
    entree($$('.imm-marches li'), { opacity: 0, y: 26, x: -16 }, { duree: 0.9, stagger: 0.13, start: 'top 92%' });
    entree($$('.imm-installs li'), { opacity: 0, x: 18 }, { duree: 0.8, stagger: 0.09, start: 'top 94%' });
  });

  sur('goodweek', function () {
    var s = document.getElementById('goodweek');
    if (!s) return;
    entree($$('.gw-card, .container > div > div', s).slice(0, 2), { opacity: 0, y: 60 }, { duree: 1.1 });
    entree($$('li', s), { opacity: 0, x: -16 }, { duree: 0.7, stagger: 0.07, start: 'top 92%' });
  });

  sur('videos', function () {
    var s = document.getElementById('videos');
    if (!s) return;
    entree($$('.hv-frame', s), { opacity: 0, scale: 0.86, y: 40 }, { duree: 1.3 });
    entree($$('li', s), { opacity: 0, x: 20 }, { duree: 0.7, stagger: 0.08 });
  });

  sur('etapes', function () {
    var g = $('[data-imm="etapes"]');
    if (!g) return;
    var etapes = Array.prototype.slice.call(g.children).filter(function (c) { return c.querySelector('h3'); });
    var ronds = etapes.map(function (e) { return $('.imm-etape-rond', e); });
    if (!sousLaLigne(g)) { ronds.forEach(function (r) { r.classList.add('fait'); }); return; }
    marquer(etapes);
    // une seule lecture, déclenchée à l'arrivée : jamais d'étape laissée à moitié pâle
    G.set(etapes.map(function (e) { return Array.prototype.slice.call(e.children, 1); }), { opacity: 0, y: 18 });
    G.set(ronds, { scale: 0.7, opacity: 0 });
    ST.create({ trigger: g, start: 'top 75%', once: true, onEnter: function () {
      var tl = G.timeline();
      etapes.forEach(function (e, i) {
        tl.to(ronds[i], { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)',
            onStart: function () { ronds[i].classList.add('fait'); } }, i * 0.32)
          .to(Array.prototype.slice.call(e.children, 1), { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, i * 0.32 + 0.12);
      });
    } });
  });

  sur('on-enseigne', function () {
    var s = sectionDu("On enseigne ce qu'on fait");
    if (!s) return;
    var carte = $$('div', s).filter(function (d) { return /border-radius:20px;padding:28px/.test(d.getAttribute('style') || ''); })[0];
    if (!carte) return;
    entree([carte], { opacity: 0, x: 60, rotationY: -12, transformPerspective: 1200 }, { duree: 1.3 });
    var lignes = Array.prototype.slice.call(carte.querySelectorAll('div > div')).filter(function (d) { return /justify-content:space-between/.test(d.getAttribute('style') || ''); });
    entree(lignes, { opacity: 0, x: 24 }, { duree: 0.7, stagger: 0.1, start: 'top 90%' });
    lignes.forEach(function (l) { var v = l.lastElementChild; if (/^\d+$/.test(v.textContent.trim())) compter(v, 0.3); });
  });

  sur('enonce', function () {
    var h = $('[data-imm="enonce"]');
    if (!h || !SPLIT) return;
    marquer(h);
    SPLIT.create(h, { type: 'words', autoSplit: true, onSplit: function (self) {
      return G.fromTo(self.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: h, start: 'top 82%', end: 'top 38%', scrub: true } });
    } });
    var s = h.closest('section');
    var cartes = $$('div', s).filter(function (d) { return /border-radius:20px;padding:26px/.test(d.getAttribute('style') || ''); });
    entree(cartes, { opacity: 0, y: 80, rotation: 0 }, { duree: 1.2, stagger: 0.14, vers: { rotation: 0 } });
    cartes.forEach(function (c, i) { G.set(c, { rotation: (i - 1) * 2.5 }); });
  });

  sur('apropos', function () {
    var s = document.getElementById('apropos');
    if (!s) return;
    var cadre = $('.apropos-photo-wrapper', s);
    if (cadre && sousLaLigne(cadre)) {
      marquer(cadre);
      var img = $('img', cadre);
      G.set(cadre, { clipPath: 'inset(100% 0% 0% 0% round 20px)' });
      G.set(img, { scale: 1.3 });
      ST.create({ trigger: cadre, start: 'top 82%', once: true, onEnter: function () {
        G.to(cadre, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.4, ease: 'expo.inOut' });
        G.to(img, { scale: 1, duration: 1.8, ease: 'expo.out' });
      } });
    }
    $$('.apropos-mini-stat strong', s).forEach(function (el, i) { compter(el, i * 0.1); });
    entree($$('.apropos-mini-stat', s), { opacity: 0, y: 30, scale: 0.92 }, { stagger: 0.08 });
    entree($$('.equipe-band-avatar', s).length ? $$('.equipe-band-avatar', s) : $$('.equipe-band-avatar'), { opacity: 0, scale: 0.4, y: 20 }, { duree: 0.9, ease: 'back.out(2)', stagger: 0.06 });
  });

  sur('temoignages', function () {
    entree($$('.temoignage-card'), { opacity: 0, y: 70, rotationX: -10, transformPerspective: 1000 }, { duree: 1.2, stagger: 0.14 });
  });

  sur('annuaire', function () {
    var s = document.getElementById('annuaire-ia');
    if (!s) return;
    entree($$('a.btn-outline', s), { opacity: 0, y: 16, scale: 0.94 }, { duree: 0.6, stagger: 0.05 });
    // le champ montre des exemples de recherche, tapés un par un
    var champ = document.getElementById('annuaire-q');
    if (!champ) return;
    var exemples = ['compte rendu de réunion', 'prospection LinkedIn', 'relance de factures', 'transcription d\'appels', 'veille concurrentielle'];
    var k = 0, o = { n: 0 }, tl = null;
    var boucle = function () {
      var mot = exemples[k++ % exemples.length];
      tl = G.timeline({ onComplete: boucle })
        .to(o, { n: mot.length, duration: mot.length * 0.06, ease: 'none', onUpdate: function () { champ.placeholder = 'Ex. : ' + mot.slice(0, Math.round(o.n)); } })
        .to({}, { duration: 1.6 })
        .to(o, { n: 0, duration: mot.length * 0.02, ease: 'none', onUpdate: function () { champ.placeholder = 'Ex. : ' + mot.slice(0, Math.round(o.n)); } });
    };
    ST.create({ trigger: champ, start: 'top bottom', end: 'bottom top', onToggle: function (self) {
      if (self.isActive && !tl) boucle(); else if (tl) { tl.paused(!self.isActive); }
    } });
    champ.addEventListener('focus', function () { if (tl) tl.pause(); champ.placeholder = 'Ex. : compte rendu de réunion, prospection, facture…'; });
  });

  sur('blog', function () {
    var cartes = $$('.blog-card');
    entree(cartes, { opacity: 0, y: 70 }, { duree: 1.1, stagger: 0.14 });
    if (grand) cartes.forEach(function (c) {
      var img = $('img', c);
      if (img) G.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  sur('faq', function () {
    entree($$('#faq details, .faq-list details'), { opacity: 0, y: 24 }, { duree: 0.8, stagger: 0.07 });
    // ouverture : la réponse se déplie au lieu d'apparaître d'un coup
    $$('details').forEach(function (det) {
      var resume = $('summary', det), corps = det.querySelector('.faq-answer') || det.lastElementChild;
      if (!resume || !corps || corps === resume) return;
      resume.addEventListener('click', function (e) {
        if (det.open) return;
        e.preventDefault(); det.open = true;
        G.fromTo(corps, { height: 0, opacity: 0, overflow: 'hidden' }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'height,overflow' });
      });
    });
  });

  sur('contact', function () {
    entree($$('.contact-item, .contact-items > *'), { opacity: 0, x: -24 }, { duree: 0.8, stagger: 0.08 });
    entree($$('.contact-form'), { opacity: 0, y: 60 }, { duree: 1.2 });
  });

  /* 3e. Page formation : cartes et blocs */
  sur('formation', function () {
    entree($$('.resultat-card, .financement-card, .etape-card'), { opacity: 0, y: 60 }, { duree: 1.1, stagger: 0.12 });
    entree($$('.matrix-wrap, .devis-form, .cta-inner, .outils-band-inner, .formateurs-band-inner'), { opacity: 0, y: 50 }, { duree: 1.1 });
    if (!grand) entree($$('.niveau-card'), { opacity: 0, y: 60 }, { duree: 1.1 });
    entree($$('.outil-chip'), { opacity: 0, y: 14, scale: 0.94 }, { duree: 0.6, stagger: 0.04 });
  });

  /* 3g. Les visages : hero, équipe, formateurs, avis */
  sur('visages', function () {
    var v = $$('.imm-preuve-visages img');
    if (v.length) G.from(v, { scale: 0.4, opacity: 0, duration: 0.7, ease: 'back.out(2.4)', stagger: 0.07, delay: 0.9 });
    var eq = $$('.imm-equipe-fenetre');
    eq.forEach(function (f) {
      if (!sousLaLigne(f)) return;
      var cartes = $$('.imm-portrait', f).slice(0, 8);
      marquer(cartes);
      // les portraits ont un décalage vertical en CSS : on part de ce décalage + 60 px,
      // puis on rend la main au CSS pour que le survol continue de fonctionner
      G.set(cartes, { opacity: 0 });
      ST.create({ trigger: f, start: 'top 85%', once: true, onEnter: function () {
        G.to(cartes, { opacity: 1, duration: 0.9, ease: 'power2.out', stagger: 0.07 });
        G.from(cartes, { y: '+=60', duration: 1.1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' });
      } });
    });
    entree($$('.imm-formateur'), { opacity: 0, y: 30 }, { duree: 0.9, stagger: 0.08 });
    entree($$('#grid .card'), { opacity: 0, y: 50 }, { duree: 1, stagger: 0.06, start: 'top 94%' });
    // les étoiles des avis se remplissent une à une
    $$('#temoignages .stars').forEach(function (st) {
      var e = $$('.star', st);
      if (!e.length || !sousLaLigne(st)) return;
      G.set(e, { opacity: 0.15, scale: 0.6 });
      ST.create({ trigger: st, start: 'top 90%', once: true, onEnter: function () {
        G.to(e, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(3)', stagger: 0.09, delay: 0.3 });
      } });
    });
  });

  /* 3h. Photos de formation et photo des pages outil : profondeur au scroll */
  sur('terrain', function () {
    var figs = $$('.imm-terrain figure, .imm-outil-photo');
    figs.forEach(function (f, i) {
      var img = $('img', f);
      if (img) G.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    var a = figs.filter(sousLaLigne);
    if (!a.length) return;
    marquer(a);
    G.set(a, { clipPath: 'inset(14% 10% 14% 10% round 28px)', opacity: 0.4 });
    ST.batch(a, { start: 'top 88%', once: true, onEnter: function (lot) {
      G.to(lot, { clipPath: 'inset(0% 0% 0% 0% round 18px)', opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.12 });
    } });
  });

  /* 3f. Tout ce que l'ancien système faisait apparaître et qui n'a pas de scène propre */
  sur('reste', function () {
    var reste = anciens.filter(function (el) {
      return animes.indexOf(el) === -1 && !animes.some(function (a) { return el.contains(a) || a.contains(el); });
    });
    entree(reste, { opacity: 0, y: 40 }, { duree: 1 });
  });

  // les polices et les images peuvent déplacer les déclencheurs
  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
