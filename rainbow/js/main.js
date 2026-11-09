/* Reno Vista site script. No dependencies. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };

  doc.documentElement.classList.add('js');
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- header + mobile menu ---------- */
  var hdr = $('.hdr'), burger = $('.burger'), nav = $('#nav');
  function setMenu(open) {
    hdr.classList.toggle('is-open', open);
    doc.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? burger.dataset.close : burger.dataset.open);
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!hdr.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hdr.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    var wide = window.matchMedia('(min-width: 1080px)');
    (wide.addEventListener ? wide.addEventListener.bind(wide, 'change') : wide.addListener.bind(wide))(function (e) { if (e.matches) setMenu(false); });
  }
  function onScroll() { hdr.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* highlight the nav link for the section on screen */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav__list a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id]; if (!a) return;
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        } else { a.removeAttribute('aria-current'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = doc.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- before / after sliders ---------- */
  $$('[data-ba]').forEach(function (ba) {
    var range = $('.ba__range', ba), dragging = false;
    function set(v) {
      v = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', v + '%');
      range.value = Math.round(v);
      ba.classList.toggle('is-lo', v < 18);
      ba.classList.toggle('is-hi', v > 82);
    }
    function at(e) { var r = ba.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    ba.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      dragging = true; ba.classList.add('is-drag');
      try { ba.setPointerCapture(e.pointerId); } catch (_) {}
      set(at(e));
    });
    ba.addEventListener('pointermove', function (e) { if (dragging) set(at(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) {
      ba.addEventListener(n, function () {
        if (dragging && n === 'pointerup') { try { range.focus({ preventScroll: true }); } catch (_) {} }  // arrow keys keep working after a drag
        dragging = false; ba.classList.remove('is-drag');
      });
    });
    range.addEventListener('input', function () { set(+range.value); });
    set(50);
  });

  /* ---------- photo viewer ---------- */
  var lb = $('.lb');
  if (lb && lb.showModal) {
    var lbImg = $('img', lb), lbCap = $('figcaption', lb);
    $$('.shot__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        lbImg.src = btn.dataset.full; lbImg.alt = $('img', btn).alt;
        lbCap.textContent = $('.shot__cap', btn).textContent;
        lb.showModal();
      });
    });
    $('.lb__close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  /* ---------- estimate form ---------- */
  var RV = window.RenoVista = { openMail: function (url) { window.location.href = url; } };
  var form = $('#estimate-form');
  if (form) {
    var d = form.dataset, status = $('.form__status', form), submit = $('.form__submit', form);
    var setStatus = function (msg, kind) { status.textContent = msg || ''; status.dataset.kind = kind || ''; };
    var mark = function (f, msg) {
      var wrap = f.closest('.field'), el = $('.field__err', wrap);
      if (msg) {
        if (!el) { el = doc.createElement('p'); el.className = 'field__err'; el.id = f.id + '-err'; wrap.appendChild(el); }
        el.textContent = msg; f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', el.id);
      } else {
        if (el) el.remove(); f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby');
      }
    };
    var check = function (f) {
      var v = f.value.trim(), msg = '';
      if (f.required && !v) msg = d.msgRequired;
      else if (f.name === 'phone' && v.replace(/\D/g, '').length < 7) msg = d.msgPhone;
      else if (f.type === 'email' && v && !f.checkValidity()) msg = f.validationMessage;
      mark(f, msg); return !msg;
    };
    var fields = $$('input:not([type=radio]):not([name=_gotcha]), select, textarea', form);
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value || f.hasAttribute('aria-invalid')) check(f); });
      f.addEventListener('input', function () { if (f.hasAttribute('aria-invalid')) check(f); });
    });
    var labelOf = function (f) {
      var l = $('label[for="' + f.id + '"]', form); if (!l) return f.name;
      var c = l.cloneNode(true), o = $('.opt', c); if (o) o.remove();
      return c.textContent.trim().replace(/^¿/, '').replace(/[?:]$/, '');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields.filter(function (f) { return !check(f); });
      if (bad.length) { setStatus(d.msgFix, 'err'); bad[0].focus(); return; }
      var fd = new FormData(form);
      if (fd.get('_gotcha')) return;

      if (d.endpoint) {                       // Formspree (or similar) is connected
        submit.disabled = true;
        fetch(d.endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); setStatus(d.msgSent, 'ok'); })
          .catch(function () { setStatus(d.msgError, 'err'); })
          .then(function () { submit.disabled = false; });
        return;
      }

      // default: open the visitor's own email app with the request written out
      var lines = fields.filter(function (f) { return f.value.trim(); }).map(function (f) { return labelOf(f) + ': ' + f.value.trim(); });
      $$('fieldset', form).forEach(function (fs) {
        var c = $('input:checked', fs); if (c) lines.push($('legend', fs).textContent.trim().replace(/^¿/, '').replace(/[?:]$/, '') + ': ' + c.value);
      });
      var url = 'mailto:' + d.email + '?subject=' + encodeURIComponent(d.subject + ' ' + fd.get('name').trim()) +
                '&body=' + encodeURIComponent(lines.join('\n'));
      RV.openMail(url);
      setStatus(d.msgReady, 'ok');
    });
  }

  /* ---------- language switch: land on the same section ---------- */
  var KEY = 'rv-place';
  var blocks = function () { return $$('main > section, .ftr'); };
  $$('a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      var y = window.scrollY + 90, list = blocks(), i, b;
      for (i = list.length - 1; i >= 0; i--) { b = list[i]; if (b.offsetTop <= y) break; }
      if (i < 0) return;
      try { sessionStorage.setItem(KEY, i + ':' + ((y - b.offsetTop) / b.offsetHeight).toFixed(4)); } catch (_) {}
    });
  });
  try {
    var place = sessionStorage.getItem(KEY);
    if (place !== null) {
      sessionStorage.removeItem(KEY);
      var p = place.split(':'), blk = blocks()[+p[0]];
      if (blk && !location.hash) {
        var go = function () { window.scrollTo({ top: Math.max(0, blk.offsetTop + blk.offsetHeight * +p[1] - 90), behavior: 'instant' }); };
        go(); window.addEventListener('load', go);
      }
    }
  } catch (_) {}
})();
