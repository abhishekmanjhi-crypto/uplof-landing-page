/* ============================================================================
   UPLOF — site behaviour
   Four small, independent modules. Each one no-ops if its markup is absent,
   and each one degrades to a readable static page without JS.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------- scroll reveal */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    // Staggered containers reveal their children in order: write the index
    // onto each child so CSS can derive the delay.
    items.forEach(function (el) {
      if (!el.hasAttribute("data-stagger")) return;
      Array.prototype.forEach.call(el.children, function (child, i) {
        child.style.setProperty("--i", String(i));
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------- counters
     Figures with data-count tween from 0 to their value the first time they
     scroll into view. Under reduced motion the final value is set at once. */
  function initCounters() {
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length) return;

    function render(el, value, decimals) {
      el.textContent = value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function run(el) {
      var raw = String(el.getAttribute("data-count"));
      var target = parseFloat(raw.replace(/[^0-9.]/g, ""));
      if (isNaN(target)) return;
      var decimals = (raw.split(".")[1] || "").length;
      if (reduceMotion.matches) { render(el, target, decimals); return; }

      var dur = Math.min(1400, 600 + Math.log10(target + 1) * 180);
      var start = null;
      function frame(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - p, 4);          // quart-out
        render(el, target * eased, decimals);
        if (p < 1) window.requestAnimationFrame(frame);
        else render(el, target, decimals);
      }
      window.requestAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (el) { run(el); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------ sticky nav */
  function initNavbar() {
    var nav = document.querySelector(".navbar");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* -------------------------------------------------------------- stepper
     Scroll position inside the tall .leak__track drives the active step —
     the behaviour annotated on the progress-bar component in Figma.
     When the track is not pinned (small screens / reduced motion) the steps
     advance on a timer while the section is on screen instead. */
  function initStepper() {
    var track = document.querySelector("[data-stepper]");
    if (!track) return;

    var segs = track.querySelectorAll("[data-stepper-track] .progress__seg");
    var frames = track.querySelectorAll("[data-stepper-stage] .stepview__frame");
    var captions = track.querySelectorAll("[data-stepper-caption] span");
    var label = track.querySelector("[data-stepper-label]");
    var labelsEl = document.querySelector("[data-stepper-labels]");
    var labels = [];
    try { labels = JSON.parse(labelsEl ? labelsEl.textContent : "[]"); } catch (e) { labels = []; }

    var count = Math.max(segs.length, frames.length, captions.length);
    if (!count) return;

    var current = -1;
    function show(index) {
      index = Math.max(0, Math.min(count - 1, index));
      if (index === current) return;
      current = index;

      segs.forEach(function (seg, i) {
        seg.classList.toggle("is-active", i === index);
        seg.classList.toggle("is-done", i < index);
      });
      // park every frame (index - current) stage-widths away so the strip slides
      // clamp to +/-1: distant frames park just off-stage instead of translating
      // metres away, which would extend the document's scrollable width
      frames.forEach(function (f, i) {
        var d = i - index;
        f.style.setProperty("--offset", String(Math.max(-1, Math.min(1, d))));
        f.classList.toggle("is-active", d === 0);
        f.classList.toggle("is-adjacent", Math.abs(d) === 1);
      });
      captions.forEach(function (c, i) {
        var d = i - index;
        c.style.setProperty("--offset", String(Math.max(-1, Math.min(1, d))));
        c.classList.toggle("is-active", d === 0);
      });
      if (label && labels[index]) label.textContent = labels[index];
    }
    show(0);

    // Is the track actually taller than the viewport (i.e. pinned)?
    function isPinned() {
      return !reduceMotion.matches &&
             track.offsetHeight > window.innerHeight * 1.4;
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        if (!isPinned()) return;
        var rect = track.getBoundingClientRect();
        var scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;
        var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
        show(Math.min(count - 1, Math.floor(progress * count)));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    // Timer fallback for the un-pinned layout.
    var timer = null;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var shouldRun = entry.isIntersecting && !isPinned() && !reduceMotion.matches;
          if (shouldRun && !timer) {
            timer = window.setInterval(function () { show((current + 1) % count); }, 3200);
          } else if (!shouldRun && timer) {
            window.clearInterval(timer);
            timer = null;
          }
        });
      }, { threshold: 0.35 }).observe(track);
    }
  }

  /* ------------------------------------------------------------- carousel */
  function initCarousel() {
    var root = document.querySelector("[data-carousel]");
    if (!root) return;

    var viewport = root.querySelector(".carousel__viewport");
    var trackEl = root.querySelector("[data-carousel-track]");
    var cards = trackEl ? Array.prototype.slice.call(trackEl.children) : [];
    var dotsEl = root.querySelector("[data-carousel-dots]");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    if (!cards.length) return;

    var index = 0;

    // Dots are real buttons: they carry an accessible name, take keyboard
    // focus, and meet the 24px pointer-target minimum via their padding.
    if (dotsEl) {
      dotsEl.innerHTML = "";
      cards.forEach(function (card, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        var title = card.querySelector(".jcard__title");
        dot.setAttribute("aria-label",
          "Go to stage " + (i + 1) + (title ? ": " + title.textContent.trim() : ""));
        dot.addEventListener("click", function () { index = i; render(); });
        dotsEl.appendChild(dot);
      });
    }
    var dots = dotsEl ? Array.prototype.slice.call(dotsEl.children) : [];
    var statusEl = root.querySelector("[data-carousel-status]");

    function step() {
      if (cards.length < 2) return cards[0].offsetWidth;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    }

    function maxIndex() {
      if (!viewport) return cards.length - 1;
      var perView = Math.max(1, Math.round(viewport.clientWidth / step()));
      return Math.max(0, cards.length - perView);
    }

    function render() {
      var limit = maxIndex();
      if (index > limit) index = limit;
      if (trackEl) trackEl.style.transform = "translate3d(" + (-index * step()) + "px,0,0)";

      cards.forEach(function (card, i) {
        card.classList.toggle("is-current", i === index);
        card.classList.toggle("is-before", i < index);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index >= limit;
      if (statusEl) {
        statusEl.textContent = "Stage " + (index + 1) + " of " + cards.length;
      }
    }

    function go(delta) { index += delta; render(); }

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(-1); }
      if (e.key === "ArrowRight") { go(1); }
    });

    window.addEventListener("resize", render, { passive: true });
    render();
  }

  /* -------------------------------------------------------- enquiry form
     Inline error per field, wired with aria-describedby, plus a focusable
     error summary at the top of the form. Fields validate on blur once
     touched, and re-validate on input while an error is showing. */
  function initEnquiry() {
    var form = document.querySelector("[data-enquiry]");
    if (!form) return;

    var summary = form.querySelector("[data-enquiry-summary]");
    var summaryList = form.querySelector("[data-enquiry-summary-list]");
    var controls = Array.prototype.slice.call(
      form.querySelectorAll("input, textarea"));

    // Only the fields /api/lead actually requires are enforced, so optional
    // fields can never block a submission the endpoint would have accepted.
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function labelFor(el) {
      var l = form.querySelector('label[for="' + el.id + '"]');
      return l ? l.textContent.replace(/\(optional\)/i, "").trim() : el.name;
    }

    function errorFor(el) {
      if (el.required && !el.value.trim()) {
        return el.type === "email"
          ? "Enter an email address"
          : "Enter " + labelFor(el).toLowerCase();
      }
      if (!el.value.trim()) return null;           // optional and empty — fine
      if (el.type === "email" && !EMAIL.test(el.value.trim())) {
        return "Enter an email address in the format name@example.com";
      }
      return null;
    }

    function showError(el, message) {
      var node = form.querySelector('[data-error-for="' + el.id + '"]');
      if (!node) return;
      if (message) {
        node.textContent = message;
        node.hidden = false;
        el.setAttribute("aria-invalid", "true");
      } else {
        node.textContent = "";
        node.hidden = true;
        el.removeAttribute("aria-invalid");
      }
    }

    controls.forEach(function (el) {
      el.addEventListener("blur", function () {
        if (el.dataset.touched) showError(el, errorFor(el));
      });
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid")) showError(el, errorFor(el));
      });
      el.addEventListener("focus", function () { el.dataset.touched = "1"; });
    });

    form.addEventListener("submit", function (e) {
      var failed = [];
      controls.forEach(function (el) {
        el.dataset.touched = "1";
        var msg = errorFor(el);
        showError(el, msg);
        if (msg) failed.push({ el: el, msg: msg });
      });

      if (!failed.length) {
        if (summary) summary.hidden = true;
        return;                                    // let the form post normally
      }

      e.preventDefault();
      if (summary && summaryList) {
        summaryList.innerHTML = "";
        failed.forEach(function (f) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#" + f.el.id;
          a.textContent = f.msg;
          a.addEventListener("click", function (ev) {
            ev.preventDefault();
            f.el.focus();
          });
          li.appendChild(a);
          summaryList.appendChild(li);
        });
        summary.hidden = false;
        summary.focus();
      } else {
        failed[0].el.focus();
      }
    });
  }

  /* ------------------------------------------------------------ footer year */
  function initYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function boot() {
    initReveal();
    initCounters();
    initNavbar();
    initStepper();
    initCarousel();
    initEnquiry();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
