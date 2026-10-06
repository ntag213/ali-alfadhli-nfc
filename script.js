/* =====================================================
   script.js — Ali Al-Fadhli · NFC profile
   1) Tab bar navigation   2) Copy / posts / avatar
   3) 3D products: scroll-driven exploded view (Three.js)
      Three.js is loaded from cdnjs -> jsDelivr -> unpkg; if all fail
      (or WebGL is unavailable) a pure CSS-3D fallback is used.
   ===================================================== */
/* ===== 1) Tab bar navigation ===== */
try {
  (function () {
    var screen = document.getElementById('screen'), nav = document.getElementById('tabbar');
    if (!screen || !nav) return;
    var tabs = [].slice.call(nav.querySelectorAll('.tab')),
        ids = tabs.map(function (t) { return t.getAttribute('data-target'); });
    function setActive(id) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-target') === id;
        t.classList.toggle('active', on);
        if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
    }
    function targetTop(id) {
      var el = document.getElementById(id);
      if (!el || id === 'home') return 0;
      return el.getBoundingClientRect().top - screen.getBoundingClientRect().top + screen.scrollTop - 12;
    }
    function go(id) {
      var y = targetTop(id); setActive(id);
      try { screen.scrollTo({ top: y, behavior: 'smooth' }); } catch (e) { screen.scrollTop = y; }
    }
    nav.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.tab') : null;
      if (!t) return;
      e.preventDefault();
      go(t.getAttribute('data-target'));
    });
    var ticking = false;
    screen.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var base = screen.getBoundingClientRect().top, current = ids[0];
        ids.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top - base <= screen.clientHeight * 0.35) current = id;
        });
        if (screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 6) current = ids[ids.length - 1];
        setActive(current); ticking = false;
      });
    }, { passive: true });
  })();
  
} catch (err) { if (window.console) console.error('1) Tab bar navigation', err); }

/* ===== 2) Page interactions ===== */
try {
(function () {
  var screen = document.getElementById('screen');
  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toastText');
  var toastTimer;

  /* ---------- Toast ---------- */
  function showToast(msg, isError) {
    toastText.textContent = msg;
    toast.className = 'toast show' + (isError ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.className = 'toast' + (isError ? ' err' : ''); }, isError ? 3500 : 2200);
  }

  /* ---------- Copy: navigator.clipboard + execCommand fallback ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    var ok = false;
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);   // iOS Safari
      ok = document.execCommand('copy');
    } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () { resolve(true); },
          function () { resolve(fallbackCopy(text)); }
        );
      } else {
        resolve(fallbackCopy(text));
      }
    });
  }
  function selectNode(node) {
    try {
      var r = document.createRange(); r.selectNodeContents(node);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
  }
  function handleCopy(item) {
    var num = item.getAttribute('data-num');
    var btn = item.querySelector('.copy');
    var label = btn.querySelector('em');
    copyText(num).then(function (ok) {
      if (ok) {
        showToast('تم نسخ الرقم بنجاح!');
        btn.classList.add('done');
        label.textContent = 'تم النسخ';
        setTimeout(function () { btn.classList.remove('done'); label.textContent = 'نسخ'; }, 2000);
      } else {
        selectNode(item.querySelector('.numtxt'));
        showToast('تعذّر النسخ تلقائياً، اضغط مطولاً على الرقم ثم اختر نسخ', true);
      }
    });
  }
  document.querySelectorAll('.payitem').forEach(function (item) {
    item.addEventListener('click', function () { handleCopy(item); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopy(item); }
    });
  });

  /* ---------- WhatsApp prefilled messages ---------- */
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/9647707235990?text=' + encodeURIComponent(a.getAttribute('data-wa'));
  });

  /* ---------- Avatar: show photo only if it loads ---------- */
  var avatar = document.getElementById('avatar');
  if (avatar.getAttribute('src')) { avatar.onload = function () { avatar.style.display = 'block'; }; }

  /* ---------- Facebook post thumbnails: image if it loads, gradient otherwise ---------- */
  document.querySelectorAll('.post').forEach(function (post) {
    var url = post.getAttribute('data-img');
    if (!url) return;
    var thumb = post.querySelector('.thumb');
    var probe = new Image();
    probe.onload = function () {
      thumb.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      thumb.classList.add('has-img');
    };
    probe.onerror = function () { /* keep gradient fallback */ };
    probe.src = url;
  });


  document.getElementById('year').textContent = new Date().getFullYear();
})();
} catch (err) { if (window.console) console.error('2) Page interactions', err); }

/* ===== 3) 3D products ===== */
try {
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var stage = $('#pstage');
  if (!stage) return;
  var wrap = $('#pwrap'), canvas = $('#pcanvas'), labelsEl = $('#plabels'), capBox = $('#pcap'),
      capT = $('#pcapT'), capS = $('#pcapS'), bar = $('#pbar'),
      hint = $('#phint'), rst = $('#prst'), scr = $('#screen');
  var tabEls = stage.querySelectorAll('.ptab');

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Content (names/descriptions come from the product photos) ---------- */
  var META = {
    rx: {
      note: 'رسم توضيحي للتركيب الداخلي',
      caps: [
        { at: 0,    t: 'AZ1000 Combo', s: 'رسيفر iSTAR-media بإنهاء ذهبي أنيق. مرّر للأسفل ليتفكك.' },
        { at: 0.22, t: 'الغطاء يرتفع.', s: 'تحته مكوّنات الجهاز وفتحات التهوية.' },
        { at: 0.5,  t: 'قلب الجهاز.', s: 'المُوالِفات واللوحة الأم تستقبل الإشارة وتعالج H.265 بدقة Full HD.' },
        { at: 0.8,  t: 'كل قطعة بمكانها.', s: 'منافذ HDMI وUSB وRF وطاقة DC على اللوحة الخلفية.' }
      ],
      parts: [
        ['cover', 'الغطاء العلوي', 'غطاء أسود بطباعة ذهبية وشعار الرابعة.'],
        ['tuner', 'مُوالِفات الإشارة', 'تستقبل الإشارة من الأريل عبر مدخلي RF.'],
        ['pcb', 'اللوحة الأم', 'معالجة الفيديو بصيغة H.265 وبدقة 1080p.'],
        ['ports', 'اللوحة الخلفية', 'HDMI، USB، AV، IR، مدخلا RF، وطاقة DC 12V.'],
        ['shell', 'الهيكل السفلي', 'قاعدة بفتحات تهوية لتبريد الجهاز.'],
        ['feet', 'الأقدام المطاطية', 'أربعة أقدام تثبّت الجهاز وتمنع الانزلاق.']
      ]
    },
    box: {
      note: '',
      caps: [
        { at: 0,    t: 'الصندوق الأصلي.', s: 'علبة سوداء مغلقة بطباعة ذهبية، مرّر لفتحها.' },
        { at: 0.2,  t: 'الغطاء يُفتح.', s: 'وتبدأ المحتويات بالخروج من الحاضنة الداخلية.' },
        { at: 0.5,  t: 'كل ما تحتاجه.', s: 'رسيفر، ريموت، محول، كابلات وبطاريات.' },
        { at: 0.82, t: 'جاهز للتشغيل.', s: 'كل المرفقات داخل العلبة لتبدأ فوراً.' }
      ],
      parts: [
        ['lid', 'الصندوق الأصلي', 'علبة سوداء بطباعة ذهبية وشعار الرابعة.'],
        ['rx', 'الرسيفر AZ1000 Combo', 'Full HD 1080p، H.265، مع WiFi وYouTube.'],
        ['remote', 'جهاز التحكم Qamar', 'ريموت بأزرار ملونة ومفاتيح مباشرة.'],
        ['adapter', 'محول الطاقة', '12V / 1A بقابس أوروبي ثنائي.'],
        ['ir', 'مستقبل IR', 'يوصل بمنفذ IR لاستقبال أفضل للريموت.'],
        ['hdmi', 'كابل HDMI', 'لتوصيل الرسيفر بالشاشة بجودة عالية.'],
        ['batt', 'بطاريتا AAA', 'مرفقتان لتشغيل الريموت مباشرة.'],
        ['manual', 'دليل المستخدم', 'كتيّب تشغيل مختصر داخل العلبة.'],
        ['tray', 'الحاضنة الداخلية', 'قاعدة بيضاء تحفظ المكوّنات أثناء النقل.']
      ]
    },
    ant: {
      note: '',
      caps: [
        { at: 0,    t: 'الأريل والكابل.', s: 'أريل iSTAR الخارجي وكابل ismart بطول 25 متراً.' },
        { at: 0.22, t: 'يتفكك الأريل.', s: 'الذراع والعناصر المعدنية وحامل التثبيت.' },
        { at: 0.55, t: 'بطاقة المواصفات.', s: 'Class A+ للاستعمال الخارجي، 75Ω ويدعم 4K.' },
        { at: 0.8,  t: 'طبقات الكابل.', s: 'موصل، عازل، ضفيرة ألمنيوم وغلاف PVC.' }
      ],
      parts: [
        ['boom', 'ذراع الأريل', 'هيكل ألمنيوم يحمل العناصر ويوصل بكابل الإشارة.'],
        ['rods', 'العناصر المعدنية', 'قضبان بأطوال متدرجة لالتقاط البث الأرضي.'],
        ['mount', 'حامل التثبيت', 'قوس U-bolt بصواميل لتثبيت الأريل على الصاري.'],
        ['coil', 'كابل ismart 25م', 'كابل رقمي Class A+ للخارج، 75Ω ويدعم 4K.'],
        ['tag', 'بطاقة المواصفات', 'CCS ø1.02mm، ضفيرة AL، غلاف PVC ø7.0mm.'],
        ['cond', 'الموصل المركزي', 'موصل CCS بقطر 1.02 مم.'],
        ['diel', 'العازل الداخلي', 'يحافظ على معاوقة الكابل 75Ω.'],
        ['braid', 'ضفيرة الألمنيوم', '96 سلكاً بقطر 0.12 مم لحجب التشويش.'],
        ['jacket', 'الغلاف الخارجي', 'PVC بقطر 7.0 مم مقاوم لأشعة UV.']
      ]
    }
  };
  var current = 'rx';

  /* ---------- shared helpers (used by both the WebGL and the CSS-3D modes) ---------- */
  var capIdx = -1, onTab = function (k) { current = k; };
  function markTab(k) {
    Array.prototype.forEach.call(tabEls, function (t) { t.classList.toggle('active', t.getAttribute('data-m') === k); });
  }
  Array.prototype.forEach.call(tabEls, function (t) {
    t.addEventListener('click', function () { var k = t.getAttribute('data-m'); markTab(k); onTab(k); });
  });
  function getP() {
    var r = wrap.getBoundingClientRect(), ov = scr ? getComputedStyle(scr).overflowY : 'visible';
    var top0 = (ov === 'auto' || ov === 'scroll') ? scr.getBoundingClientRect().top : 0;
    var topOff = parseFloat(getComputedStyle(stage).top) || 12;
    var total = wrap.offsetHeight - stage.offsetHeight;
    return total > 0 ? clamp((top0 + topOff - r.top) / total, 0, 1) : 0;
  }
  function chrome(p, pe, dragging) {
    var caps = META[current].caps, ci = 0, i;
    for (i = 0; i < caps.length; i++) if (pe >= caps[i].at) ci = i;
    if (ci !== capIdx) {
      capIdx = ci; capT.textContent = caps[ci].t; capS.textContent = caps[ci].s;
      capBox.classList.remove('sw'); void capBox.offsetWidth; capBox.classList.add('sw');
    }
    bar.style.width = (pe * 100).toFixed(1) + '%';
    if (p > 0.04 || dragging) hint.classList.add('off'); else hint.classList.remove('off');
  }

  /* ---------- Fallback: pure CSS 3D (no libraries, no WebGL) ---------- */
  var fbOn = false;
  function fallback(reason) {
    if (fbOn) return; fbOn = true;
    if (window.console) console.warn('3D fallback:', reason);
    canvas.style.display = 'none'; labelsEl.style.display = 'none';
    var s = document.createElement('div'), w = document.createElement('div'), n = document.createElement('div');
    s.className = 'f3s'; w.className = 'f3w'; n.className = 'f3n';
    n.textContent = 'عرض 3D مبسّط — ' + reason;
    s.appendChild(w); stage.insertBefore(s, labelsEl); stage.appendChild(n);
    var plates = [], yaw = 0, pitch = -12, vel = 0, drag = null, fp = getP();
    function build(k) {
      w.innerHTML = ''; plates = [];
      META[k].parts.forEach(function (p) {
        var e = document.createElement('div'); e.className = 'f3p';
        e.innerHTML = '<b>' + p[1] + '</b><span>' + p[2] + '</span>';
        w.appendChild(e); plates.push(e);
      });
    }
    build(current); markTab(current); capIdx = -1;
    onTab = function (k) { current = k; capIdx = -1; build(k); yaw = 0; };
    s.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType }; vel = 0;
      try { s.setPointerCapture(e.pointerId); } catch (_) {}
    });
    s.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      yaw += dx * 0.6; vel = dx * 0.6; if (drag.type === 'mouse') pitch = clamp(pitch - dy * 0.4, -60, 40);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { s.addEventListener(ev, function () { drag = null; }); });
    rst.addEventListener('click', function () { yaw = 0; pitch = -12; vel = 0; });
    (function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      var p = getP(); fp += (p - fp) * 0.15;
      var pe = clamp((fp - 0.05) / 0.9, 0, 1), ce = ease(pe), cnt = plates.length;
      var gap = Math.min(66, (stage.clientHeight * 0.6) / Math.max(1, cnt));
      if (!drag) { yaw += vel; vel *= 0.92; }
      var sway = reduce ? 0 : Math.sin((now || 0) / 2400) * 10;
      w.style.transform = 'rotateX(' + pitch.toFixed(1) + 'deg) rotateY(' + (yaw + sway - ce * 18).toFixed(1) + 'deg)';
      var act = pe > 0.45 ? Math.floor(clamp((pe - 0.45) / 0.5, 0, 0.999) * cnt) : -1;
      plates.forEach(function (e, i) {
        var y = (i - (cnt - 1) / 2) * gap * ce, z = (i % 2 ? 1 : -1) * 50 * ce;
        e.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)';
        e.classList.toggle('on', i === act);
      });
      chrome(fp, pe, !!drag);
    })(0);
  }

  /* ---------- Three.js loader: cdnjs -> jsDelivr -> unpkg (each with a timeout) ---------- */
  function loadThree(ok, fail) {
    if (window.THREE) { ok(); return; }
    var urls = [
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
      'https://unpkg.com/three@0.128.0/build/three.min.js'
    ];
    (function next(i) {
      if (i >= urls.length) { fail('تعذّر تحميل مكتبة Three.js (تحقّق من الإنترنت أو من حجب الروابط)'); return; }
      var s = document.createElement('script'), done = false, to;
      function adv() { if (done) return; done = true; clearTimeout(to); next(i + 1); }
      s.onload = function () { if (done) return; done = true; clearTimeout(to); if (window.THREE) ok(); else next(i + 1); };
      s.onerror = adv; to = setTimeout(adv, 9000);
      s.async = true; s.src = urls[i]; document.head.appendChild(s);
    })(0);
  }
  capT.textContent = 'جارٍ تحميل المجسّم…'; capS.textContent = '';
  loadThree(function () {
    try { start(); }
    catch (e) { if (window.console) console.error(e); fallback('تعذّر تشغيل WebGL: ' + ((e && e.message) || e)); }
  }, fallback);

  function start() {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    var root = new THREE.Group();
    scene.add(root);

    /* ----- lights + procedural environment (for metal reflections) ----- */
    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x1a1030, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 6); scene.add(key);
    var rim = new THREE.DirectionalLight(0x67e8f9, 1.1); rim.position.set(-6, 2, -5); scene.add(rim);
    var fill = new THREE.PointLight(0xc4b5fd, 0.7, 30); fill.position.set(-4, -3, 6); scene.add(fill);
    try { (function () {
      var pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0b1226, side: THREE.BackSide })));
      var panel = function (w, h, x, y, z, c, k) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
      };
      panel(10, 4, 0, 8, 4, 0xffffff, 3); panel(4, 10, -9, 2, 3, 0x67e8f9, 2);
      panel(4, 10, 9, 0, -2, 0xc4b5fd, 2); panel(8, 3, 0, -6, 6, 0xffffff, 0.8);
      scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
    })(); } catch (envErr) { if (window.console) console.warn('env map skipped', envErr); }

    /* ----- helpers ----- */
    function mat(c, r, m, extra) {
      var o = { color: c, roughness: r == null ? 0.6 : r, metalness: m || 0 };
      if (extra) for (var k in extra) o[k] = extra[k];
      return new THREE.MeshStandardMaterial(o);
    }
    function bx(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
    function cy(rt, rb, h, m, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m); }
    function add(p, o, x, y, z) { o.position.set(x || 0, y || 0, z || 0); p.add(o); return o; }
    function tube(pts, r, m) {
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); })), 64, r, 8, false), m);
    }
    function tex(w, h, fn) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      fn(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
    }
    function rr(g, x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    var M = {
      black: mat(0x141416, 0.5, 0.1), dark: mat(0x26262b, 0.5, 0.1), gold: mat(0xd9b25f, 0.3, 0.9),
      steel: mat(0xc9ced6, 0.3, 0.95), alu: mat(0xb8bfc9, 0.4, 0.9), white: mat(0xf2f2f0, 0.65, 0),
      foam: mat(0xf5f1e6, 0.9, 0, { side: THREE.DoubleSide }), pcb: mat(0x0d6b45, 0.55, 0.1), chip: mat(0x0a0a0a, 0.4, 0.3),
      copper: mat(0xc9793a, 0.3, 0.95), pvc: mat(0xeeeeec, 0.5, 0), yel: mat(0xf5c400, 0.5, 0.1),
      rubber: mat(0x090909, 0.9, 0), red: mat(0xd63a2f, 0.5, 0.1), grn: mat(0x2fb36d, 0.5, 0.1), blu: mat(0x3b82f6, 0.4, 0.2)
    };

    /* ----- textures ----- */
    function topTex() {
      return tex(1024, 720, function (g, w, h) {
        g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, w, h);
        var gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.05)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        var gold = '#e0bd6a'; g.textAlign = 'left';
        g.fillStyle = '#e8453c'; g.font = '700 40px Arial'; g.fillText('iSTAR', 44, 82);
        g.fillStyle = gold; g.font = 'italic 600 32px Georgia,serif'; g.fillText('-media', 160, 82);
        g.font = '600 36px Arial'; g.fillText('AZ1000 Combo', 44, 128);
        rr(g, w - 250, 40, 206, 64, 10); g.strokeStyle = gold; g.lineWidth = 3; g.stroke();
        g.textAlign = 'center'; g.font = '700 28px Arial'; g.fillText('FULL HD  1080', w - 147, 82);
        g.fillStyle = '#ecdca6'; g.font = '900 150px Tahoma,Arial'; g.fillText('الرابعة', w / 2, 330);
        g.fillStyle = gold; g.font = 'italic 700 64px Georgia,serif'; g.fillText('Qamar', w / 2, 470);
        g.font = 'italic 400 34px Georgia,serif'; g.fillText('ALnawaras', w / 2 + 30, 518);
        var chips = ['WiFi', '3D', 'YouTube', 'H.265', 'WiFi', 'DVB T2'];
        g.font = '700 26px Arial'; g.lineWidth = 2;
        chips.forEach(function (c, i) { rr(g, 44 + i * 156, h - 112, 142, 56, 8); g.stroke(); g.fillText(c, 44 + i * 156 + 71, h - 74); });
      });
    }
    function cardTex(draw, w, h) { return new THREE.MeshStandardMaterial({ map: tex(w, h, draw), roughness: 0.7, metalness: 0 }); }
    function boxMats(topM) { return [M.black, M.black, topM, M.black, M.black, M.black]; }

    /* ----- Receiver (separate parts in assembled position) ----- */
    function receiverParts(topT) {
      var W = 3.0, D = 1.9, P = {}, g, i, x;
      g = new THREE.Group();
      add(g, bx(W, 0.1, D, boxMats(new THREE.MeshStandardMaterial({ map: topT, roughness: 0.4, metalness: 0.15 }))), 0, 0.28, 0);
      P.cover = g;

      g = new THREE.Group();
      [-1.1, -0.55].forEach(function (cx) {
        add(g, bx(0.5, 0.2, 0.55, M.steel), cx, -0.05, 0.6);
        add(g, bx(0.38, 0.02, 0.4, M.gold), cx, 0.06, 0.6);
        add(g, cy(0.06, 0.06, 0.22, M.steel, 6), cx, -0.05, 0.95).rotation.x = Math.PI / 2;
      });
      P.tuner = g;

      g = new THREE.Group();
      add(g, bx(2.7, 0.04, 1.55, M.pcb), 0, -0.16, 0);
      add(g, bx(0.4, 0.05, 0.4, M.chip), 0.2, -0.115, 0);
      add(g, bx(0.5, 0.05, 0.5, M.alu), 0.2, -0.065, 0);
      for (i = 0; i < 6; i++) add(g, bx(0.18 + (i % 3) * 0.06, 0.04, 0.14, M.chip), -0.7 + i * 0.32, -0.12, -0.5 + (i % 2) * 0.3);
      for (i = 0; i < 4; i++) add(g, cy(0.05, 0.05, 0.1, M.gold, 12), 0.95 + (i % 2) * 0.2, -0.09, -0.4 + Math.floor(i / 2) * 0.3);
      add(g, bx(0.9, 0.05, 0.08, M.gold), 0.4, -0.12, -0.7);
      P.pcb = g;

      g = new THREE.Group();
      add(g, bx(W, 0.5, 0.06, M.black), 0, 0, D / 2 - 0.03);
      var z = D / 2 + 0.005;
      [-1.15, -0.7].forEach(function (px) { add(g, cy(0.085, 0.085, 0.22, M.steel, 6), px, 0, z + 0.1).rotation.x = Math.PI / 2; });
      add(g, bx(0.46, 0.16, 0.02, M.steel), -0.1, 0, z); add(g, bx(0.4, 0.1, 0.03, M.chip), -0.1, 0, z + 0.01);
      add(g, bx(0.28, 0.13, 0.03, M.steel), 0.5, 0, z + 0.01); add(g, bx(0.2, 0.04, 0.035, M.black), 0.5, 0, z + 0.02);
      add(g, cy(0.05, 0.05, 0.04, M.chip, 16), 0.85, 0, z + 0.02).rotation.x = Math.PI / 2;
      add(g, bx(0.16, 0.06, 0.03, M.steel), 1.05, 0, z + 0.01);
      add(g, cy(0.09, 0.09, 0.05, M.chip, 20), 1.3, 0, z + 0.02).rotation.x = Math.PI / 2;
      add(g, cy(0.03, 0.03, 0.06, M.steel, 10), 1.3, 0, z + 0.03).rotation.x = Math.PI / 2;
      add(g, bx(0.5, 0.2, 0.012, mat(0xf4f4f4, 0.8, 0)), 0.1, 0.1, z + 0.14);
      P.ports = g;

      g = new THREE.Group();
      add(g, bx(W, 0.06, D, M.black), 0, -0.25, 0);
      add(g, bx(0.06, 0.5, D, M.black), -W / 2 + 0.03, 0, 0);
      add(g, bx(0.06, 0.5, D, M.black), W / 2 - 0.03, 0, 0);
      add(g, bx(W, 0.5, 0.06, M.black), 0, 0, -D / 2 + 0.03);
      for (i = 0; i < 6; i++) add(g, bx(1.7, 0.012, 0.05, M.chip), 0, -0.216, -0.55 + i * 0.22);
      P.shell = g;

      g = new THREE.Group();
      [[-1.25, -0.75], [1.25, -0.75], [-1.25, 0.75], [1.25, 0.75]].forEach(function (p) { add(g, cy(0.09, 0.1, 0.06, M.rubber, 20), p[0], -0.31, p[1]); });
      P.feet = g;
      return P;
    }

    /* ----- model registry helpers ----- */
    function newModel(cam) { return { group: new THREE.Group(), parts: [], cam: cam }; }
    function reg(m, id, g, fp, fr, fs, tp, tr, ts, hide0) {
      var b = new THREE.Box3().setFromObject(g), c = new THREE.Vector3(); b.getCenter(c);
      m.group.add(g);
      m.parts.push({ id: id, g: g, anchor: c, f: { p: fp, r: fr, s: fs }, to: { p: tp, r: tr, s: ts }, dur: 0.42, hide0: !!hide0, t: 0, d: 0, el: null });
    }
    function stagger(m) {
      var n = m.parts.length;
      m.parts.forEach(function (p, i) { p.d = 0.5 * i / Math.max(1, n - 1); });
    }

    /* ----- Model A: receiver anatomy ----- */
    function buildRx() {
      var m = newModel({ cy0: 0, cy1: 0.45, ex: 3.8, ey: 7.2, ax: 3.6, ay: 1.6 });
      var P = receiverParts(topTex());
      var Z = [0, 0, 0], R0 = [0, 0, 0];
      reg(m, 'cover', P.cover, Z, R0, 1, [0, 3.0, 0], [-0.1, 0, 0], 1);
      reg(m, 'tuner', P.tuner, Z, R0, 1, [0, 1.9, 0], [0, 0, 0], 1);
      reg(m, 'pcb', P.pcb, Z, R0, 1, [0, 0.75, 0], [0, 0, 0], 1);
      reg(m, 'ports', P.ports, Z, R0, 1, [0, -0.5, 1.5], [0.15, 0.1, 0], 1);
      reg(m, 'shell', P.shell, Z, R0, 1, [0, -0.95, 0], [0, 0, 0], 1);
      reg(m, 'feet', P.feet, Z, R0, 1, [0, -2.3, 0], [0, 0, 0], 1);
      stagger(m); return m;
    }

    /* ----- Model B: box contents ----- */
    function plug(len, h, w) {
      var g = new THREE.Group();
      add(g, bx(len * 0.55, h, w, M.black), -len * 0.225, 0, 0);
      add(g, bx(len * 0.5, h * 0.62, w * 0.82, M.steel), len * 0.28, 0, 0);
      return g;
    }
    function loopCable(r, tr, mat_, pa, pb) {
      var g = new THREE.Group(), pts = [], i, a;
      for (i = 0; i <= 40; i++) { a = (25 + 310 * i / 40) * Math.PI / 180; pts.push([Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 3) * 0.02]); }
      g.add(tube(pts, tr, mat_));
      var ea = 25 * Math.PI / 180;
      add(g, pa, Math.cos(ea) * r + 0.25, Math.sin(ea) * r, 0);
      add(g, pb, Math.cos(ea) * r + 0.25, -Math.sin(ea) * r, 0);
      return g;
    }
    function buildBox() {
      var m = newModel({ cy0: 0.2, cy1: 0.2, ex: 4.6, ey: 8.6, ax: 3.8, ay: 1.4 });
      var topT = topTex(), g, i, j;
      // lid + tray
      g = new THREE.Group();
      add(g, bx(3.4, 0.42, 2.5, boxMats(new THREE.MeshStandardMaterial({ map: topT, roughness: 0.35, metalness: 0.15 }))), 0, 0, 0);
      reg(m, 'lid', g, [0, 0.44, 0], [0, 0, 0], 1, [0, 3.7, -0.3], [0.85, 0, 0], 1);
      // receiver (whole)
      g = new THREE.Group();
      var P = receiverParts(topT), k;
      for (k in P) g.add(P[k]);
      g.scale.set(0.8, 0.8, 0.8);
      var wrapR = new THREE.Group(); wrapR.add(g);
      reg(m, 'rx', wrapR, [0, 0.1, 0], [0, 0, 0], 0.5, [0, 1.65, 0.3], [0.45, 0.35, 0], 1, true);
      // remote
      g = new THREE.Group();
      add(g, bx(0.7, 3.0, 0.2, M.black), 0, 0, 0);
      add(g, bx(0.12, 0.12, 0.03, M.red), -0.2, 1.3, 0.11);
      var pal = [M.red, M.grn, M.yel, M.blu];
      for (i = 0; i < 4; i++) add(g, bx(0.12, 0.07, 0.03, pal[i]), -0.2 + i * 0.13, 0.9, 0.11);
      add(g, cy(0.24, 0.24, 0.04, M.dark, 24), 0, 0.4, 0.11).rotation.x = Math.PI / 2;
      add(g, cy(0.1, 0.1, 0.05, M.black, 20), 0, 0.4, 0.12).rotation.x = Math.PI / 2;
      for (i = 0; i < 5; i++) for (j = 0; j < 3; j++) add(g, bx(0.15, 0.1, 0.03, M.dark), (j - 1) * 0.2, -0.05 - i * 0.2, 0.11);
      add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.2), cardTex(function (c, w, h) {
        c.fillStyle = '#0c0c0e'; c.fillRect(0, 0, w, h); c.fillStyle = '#e0bd6a'; c.textAlign = 'center';
        c.font = 'italic 700 78px Georgia,serif'; c.fillText('Qamar', w / 2, h * 0.7);
      }, 256, 92)), 0, -1.3, 0.103);
      reg(m, 'remote', g, [0, 0, 0], [0, 0, 0], 0.4, [-1.5, 0.1, 0.5], [0, 0.4, 0.08], 1, true);
      // adapter
      g = new THREE.Group();
      add(g, bx(0.85, 0.5, 1.15, M.black), 0, 0, 0);
      add(g, bx(0.5, 0.3, 0.12, M.dark), 0, 0, 0.62);
      [-0.17, 0.17].forEach(function (x) { add(g, cy(0.035, 0.035, 0.35, M.steel, 10), x, 0, 0.8).rotation.x = Math.PI / 2; });
      g.add(tube([[0, 0, -0.58], [0.15, 0.05, -1], [0.55, -0.1, -1.25], [0.5, -0.45, -0.9], [0.1, -0.5, -0.7]], 0.026, M.black));
      add(g, cy(0.06, 0.06, 0.22, M.black, 14), 0.1, -0.5, -0.6);
      reg(m, 'adapter', g, [0, 0, 0], [0, 0, 0], 0.4, [1.45, 0.45, 0.4], [0.2, -0.9, 0], 1, true);
      // IR receiver
      var irA = new THREE.Group(); add(irA, bx(0.5, 0.2, 0.3, M.black), 0, 0, 0); add(irA, cy(0.035, 0.035, 0.03, M.red, 10), 0.26, 0, 0).rotation.z = Math.PI / 2;
      g = loopCable(0.34, 0.02, M.black, irA, plug(0.3, 0.08, 0.12));
      reg(m, 'ir', g, [0, 0, 0], [0, 0, 0], 0.4, [0, 0.25, 0.7], [0.2, 0.3, 0], 1, true);
      // HDMI
      g = loopCable(0.5, 0.03, M.black, plug(0.46, 0.13, 0.25), plug(0.3, 0.07, 0.16));
      reg(m, 'hdmi', g, [0, 0, 0], [0, 0, 0], 0.4, [1.3, -1.45, 0.5], [0.2, -0.3, 0], 1, true);
      // batteries
      g = new THREE.Group();
      [-0.11, 0.11].forEach(function (x) {
        add(g, cy(0.085, 0.085, 0.7, M.black, 20), x, 0, 0);
        add(g, cy(0.088, 0.088, 0.26, M.yel, 20), x, 0, 0);
        add(g, cy(0.035, 0.035, 0.04, M.steel, 10), x, 0.36, 0);
      });
      reg(m, 'batt', g, [0, 0, 0], [0, 0, 0], 0.4, [0, -1.05, 0.8], [0.3, 0, 1.1], 1, true);
      // manual
      var man = cardTex(function (c, w, h) {
        c.fillStyle = '#f7f7f5'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#111';
        c.font = '700 34px Arial'; c.fillText('iSTAR-media  AZ1000 Combo', w / 2, 150);
        c.font = '900 120px Tahoma,Arial'; c.fillText('الرابعة', w / 2, 330);
        c.font = '600 40px Arial'; c.fillText('4G   H.265   Full HD 1080p', w / 2, 80);
        c.font = '600 46px Arial'; c.fillText("USER'S MANUAL", w / 2, 450);
      }, 512, 512);
      g = new THREE.Group();
      add(g, bx(1.4, 1.4, 0.02, [M.white, M.white, M.white, M.white, man, M.white]), 0, 0, 0);
      reg(m, 'manual', g, [0, 0, 0], [0, 0, 0], 0.4, [0, -2.3, 0.2], [-0.2, 0.1, 0], 1, true);
      // tray
      g = new THREE.Group();
      add(g, bx(3.4, 0.46, 2.5, M.black), 0, 0, 0);
      add(g, bx(3.2, 0.02, 2.3, M.white), 0, 0.235, 0);
      add(g, bx(2.4, 0.022, 1.6, mat(0xdcdcda, 0.8, 0)), 0, 0.24, 0);
      reg(m, 'tray', g, [0, 0, 0], [0, 0, 0], 1, [0, -3.45, 0], [0.35, 0, 0], 1);
      // order: lid, rx, remote, adapter, ir, hdmi, batt, manual, tray -> lid first
      stagger(m); return m;
    }

    /* ----- Model C: antenna + cable ----- */
    function buildAnt() {
      var m = newModel({ cy0: 0, cy1: 0, ex: 4.8, ey: 7.6, ax: 4.4, ay: 4.0 });
      var g, i, Z = [0, 0, 0];
      // boom
      g = new THREE.Group();
      add(g, bx(3.8, 0.09, 0.09, M.alu), 0, 0, 0);
      add(g, bx(0.35, 0.2, 0.22, M.black), -1.95, 0, 0);
      add(g, cy(0.07, 0.07, 0.25, M.steel, 6), -1.95, 0, 0.22).rotation.x = Math.PI / 2;
      reg(m, 'boom', g, [0, 0.9, 0], Z, 1, [0, 2.4, -1.4], [0.12, 0.25, 0], 1);
      // rods
      g = new THREE.Group();
      for (i = 0; i < 9; i++) add(g, cy(0.017, 0.017, 1.9 - i * 0.11, M.steel, 8), -1.5 + i * 0.42, 0, 0);
      reg(m, 'rods', g, [0, 0.9, 0], Z, 1, [0, 2.4, 0.5], [0.12, 0.25, 0], 1);
      // mount
      g = new THREE.Group();
      add(g, new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24, Math.PI), M.steel), 0, 0, 0);
      [-0.22, 0.22].forEach(function (x) {
        add(g, cy(0.03, 0.03, 0.3, M.steel, 8), x, -0.15, 0);
        add(g, cy(0.055, 0.055, 0.05, M.steel, 6), x, -0.36, 0);
      });
      add(g, bx(0.6, 0.05, 0.34, M.steel), 0, -0.3, 0);
      reg(m, 'mount', g, [0.35, 0.9, 0], Z, 1, [1.4, 1.0, 1.7], [0.2, -0.3, 0], 1.1);
      // cable coil
      g = new THREE.Group();
      for (i = 0; i < 5; i++) add(g, new THREE.Mesh(new THREE.TorusGeometry(0.78 + i * 0.04, 0.075, 12, 56), M.pvc), 0, 0, (i - 2) * 0.15);
      var pa = plug(0.4, 0.13, 0.13); add(pa, cy(0.075, 0.075, 0.06, M.blu, 14), -0.08, 0, 0).rotation.z = Math.PI / 2;
      add(g, pa, 0.95, 0.25, 0.35);
      var pb = plug(0.4, 0.13, 0.13); pb.rotation.y = Math.PI; add(g, pb, -0.95, 0.1, -0.35);
      reg(m, 'coil', g, [0, -0.95, 0.4], Z, 1, [-0.9, -0.6, 0.3], [0.1, 0.3, 0], 1);
      // spec tag
      var tag = cardTex(function (c, w, h) {
        c.fillStyle = '#0b1230'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ff5a36'; c.fillRect(0, 150, w, 62);
        c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '900 84px Arial'; c.fillText('ismart', w / 2, 110);
        c.font = '700 26px Arial'; c.fillText('HIGH PERFORMANCE DIGITAL CABLE', w / 2, 192);
        c.fillStyle = '#ff5a36'; c.font = '900 250px Arial'; c.fillText('25', w / 2 - 20, 470);
        c.font = '900 70px Arial'; c.fillText('m', w - 70, 400);
        c.fillStyle = '#d7dbe6'; c.font = '700 30px Arial'; c.fillText('CLASS A+  OUTDOOR  ·  4K  ·  75Ω', w / 2, 560);
        c.font = '500 24px Arial'; c.fillText('CCS 1.02mm   AL 96×0.12mm   PVC 7.0mm', w / 2, 610);
      }, 512, 700);
      g = new THREE.Group();
      add(g, bx(1.0, 1.37, 0.03, [M.white, M.white, M.white, M.white, tag, M.white]), 0, 0, 0);
      reg(m, 'tag', g, [0, -0.9, 0.9], Z, 0.4, [1.35, -0.45, 0.8], [0, -0.3, 0], 1, true);
      // cable layers (concentric tubes sliding apart along x)
      var braid = new THREE.MeshStandardMaterial({
        map: tex(64, 64, function (c, w, h) {
          c.clearRect(0, 0, w, h); c.strokeStyle = '#d9dde6'; c.lineWidth = 4;
          for (var k = -h; k < w + h; k += 12) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); }
        }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.8, roughness: 0.4
      });
      braid.map.wrapS = braid.map.wrapT = THREE.RepeatWrapping; braid.map.repeat.set(6, 2);
      var pvc2 = mat(0xeeeeec, 0.5, 0, { side: THREE.DoubleSide });
      var L = 1.0, defs = [
        ['cond', cy(0.045, 0.045, L, M.copper, 16), -1.65],
        ['diel', cy(0.16, 0.16, L, M.foam, 28), -0.55],
        ['braid', cy(0.2, 0.2, L, braid, 28), 0.55],
        ['jacket', cy(0.26, 0.26, L, pvc2, 32), 1.65]
      ];
      defs.forEach(function (d) {
        var mesh = d[1];
        if (d[0] !== 'cond') mesh.geometry = new THREE.CylinderGeometry(mesh.geometry.parameters.radiusTop, mesh.geometry.parameters.radiusTop, L, 32, 1, true);
        mesh.rotation.z = Math.PI / 2;
        var gg = new THREE.Group(); gg.add(mesh);
        reg(m, d[0], gg, [0, -0.95, 0.4], [0, 0, 0], 0.4, [d[2], -3.0, 0.2], [0, 0.7, 0], 1, true);
      });
      stagger(m); return m;
    }

    /* ----- scene state ----- */
    var models = {}, cur = null, activeIdx = -1, manual = -1, manualP = 0;
    var yaw = 0, pitch = 0, velYaw = 0, drag = null, W = 300, H = 400, aspect = 0.75;
    var TH = Math.tan(16 * Math.PI / 180);
    function fit(ex, ey) { return Math.max(ey / 2 * 1.12 / TH, ex / 2 * 1.12 / (TH * aspect)); }

    function setModel(key) {
      current = key;
      if (cur) root.remove(cur.group);
      if (!models[key]) models[key] = key === 'rx' ? buildRx() : key === 'box' ? buildBox() : buildAnt();
      cur = models[key]; root.add(cur.group);
      labelsEl.innerHTML = '';
      var info = {}; META[key].parts.forEach(function (p) { info[p[0]] = p; });
      cur.parts.forEach(function (pt) {
        var p = info[pt.id], el = document.createElement('div');
        el.className = 'pl'; el.innerHTML = '<i></i><div class="tx"><b>' + p[1] + '</b><span>' + p[2] + '</span></div>';
        el.addEventListener('click', function () { manual = cur.parts.indexOf(pt); manualP = progress; });
        pt.el = el; labelsEl.appendChild(el);
      });
      Array.prototype.forEach.call(tabEls, function (t) { t.classList.toggle('active', t.getAttribute('data-m') === key); });
      yaw = pitch = velYaw = 0; manual = -1; activeIdx = -1; capIdx = -1;
      kick();
    }
    onTab = setModel;
    rst.addEventListener('click', function () { yaw = 0; pitch = 0; velYaw = 0; });

    /* ----- interaction: drag to rotate 360° ----- */
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType }; velYaw = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      yaw += dx * 0.012; velYaw = dx * 0.012;
      if (drag.type === 'mouse') pitch = clamp(pitch + dy * 0.008, -0.7, 0.7);
      hint.classList.add('off');
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { canvas.addEventListener(n, function () { drag = null; }); });

    var progress = 0;

    /* ----- per-frame update ----- */
    var v = new THREE.Vector3();
    function update(p, now) {
      var m = cur; if (!m) return;
      var pe = clamp((p - 0.05) / 0.9, 0, 1), ce = ease(pe), i;
      m.parts.forEach(function (pt) {
        var t = ease(clamp((pe - pt.d) / pt.dur, 0, 1)), g = pt.g;
        pt.t = t; g.visible = !(pt.hide0 && t < 0.003);
        g.position.set(lerp(pt.f.p[0], pt.to.p[0], t), lerp(pt.f.p[1], pt.to.p[1], t), lerp(pt.f.p[2], pt.to.p[2], t));
        g.rotation.set(lerp(pt.f.r[0], pt.to.r[0], t), lerp(pt.f.r[1], pt.to.r[1], t), lerp(pt.f.r[2], pt.to.r[2], t));
        g.scale.setScalar(lerp(pt.f.s, pt.to.s, t));
      });
      // camera
      var c = m.cam, dEx = fit(c.ex, c.ey), dAs = Math.max(fit(c.ax, c.ay), dEx * 0.55), dist = lerp(dAs, dEx, ce), cy_ = lerp(c.cy0, c.cy1, ce);
      camera.position.set(0, cy_ + dist * 0.1, dist); camera.lookAt(0, cy_, 0);
      // rotation (drag + inertia + gentle scroll-coupled sway)
      if (!drag) { yaw += velYaw; velYaw *= 0.92; }
      var auto = reduce ? 0 : Math.sin(now / 2400) * 0.28 - ce * 0.45;
      root.rotation.y = yaw + auto; root.rotation.x = 0.16 + pitch;
      root.updateMatrixWorld(true); camera.updateMatrixWorld();
      // active part + labels
      var n = m.parts.length, auto_i = pe > 0.45 ? Math.floor(clamp((pe - 0.45) / 0.5, 0, 0.999) * n) : -1;
      if (manual >= 0 && Math.abs(p - manualP) > 0.06) manual = -1;
      var act = manual >= 0 ? manual : auto_i;
      m.parts.forEach(function (pt, k) {
        v.copy(pt.anchor); pt.g.localToWorld(v); v.project(camera);
        var x = clamp((v.x * 0.5 + 0.5) * W, 18, W - 18), y = clamp((-v.y * 0.5 + 0.5) * H, 70, H - 120);
        var o = ease(clamp((pt.t - 0.55) / 0.4, 0, 1));
        pt.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        pt.el.style.opacity = o.toFixed(2); pt.el.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
        pt.el.classList.toggle('l', x > W * 0.52);
        if (k === act) { if (!pt.el.classList.contains('on')) pt.el.classList.add('on'); }
        else if (pt.el.classList.contains('on')) pt.el.classList.remove('on');
      });
      chrome(p, pe, !!drag);
    }

    /* ----- sizing + loop ----- */
    function resize() {
      var r = stage.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(260, r.height); aspect = W / H;
      renderer.setSize(W, H, false); camera.aspect = aspect; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
    resize();

    var visible = true, raf = 0, last = 0;
    var dead = false;
    function frame(now) {
      raf = 0; if (dead || !visible || document.hidden) return;
      try {
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        progress += (getP() - progress) * (1 - Math.exp(-dt * 7));
        update(progress, now);
        renderer.render(scene, camera);
      } catch (err) {
        dead = true; if (window.console) console.error(err);
        fallback('خطأ أثناء الرسم: ' + ((err && err.message) || err)); return;
      }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '150px' }).observe(wrap);
    }
    document.addEventListener('visibilitychange', kick);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); dead = true; fallback('فُقد سياق WebGL'); });

    progress = getP();
    setModel('rx');
  }
})();
} catch (err) { if (window.console) console.error('3) 3D products', err); }
