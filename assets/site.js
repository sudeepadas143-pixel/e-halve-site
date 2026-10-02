/* z/halve — shared behaviour: motion coordinator, scroll reveal, wallet, formatting. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── motion coordinator ─────────────────────────────────────────────
     Explanatory animations register while they run. Decorative motion
     (scroll reveal) checks in first and renders instantly while anything
     explanatory is playing, so the two never run side by side. */
  var busy = 0;
  var motion = {
    reduce: reduce,
    begin: function () { busy++; },
    end: function () { busy = Math.max(0, busy - 1); },
    busy: function () { return busy > 0; },
  };

  function sleep(ms, run) {
    return new Promise(function (res, rej) {
      var id = setTimeout(function () { run && run.dead ? rej("cancel") : res(); }, ms);
      if (run) run.timers.push(id);
    });
  }

  /* Plays an explanatory sequence once when `el` scrolls into view.
     `seq(run)` is async and receives a run token with `.wait(ms)`.
     A replay control inside the figure restarts it. */
  function explain(el, opts) {
    var btn = el.querySelector("[data-replay]");
    var current = null;
    function start() {
      if (current) { current.dead = true; current.timers.forEach(clearTimeout); motion.end(); }
      var run = { dead: false, timers: [] };
      run.wait = function (ms) { return sleep(ms, run); };
      current = run;
      opts.reset && opts.reset();
      if (btn) btn.hidden = true;
      if (reduce) { opts.final && opts.final(); if (btn) btn.hidden = false; current = null; return; }
      motion.begin();
      Promise.resolve(opts.seq(run)).then(done, function () {});
      function done() {
        if (run.dead) return;
        current = null;
        motion.end();
        if (btn) btn.hidden = false;
      }
    }
    if (btn) btn.addEventListener("click", start);
    if (reduce) { opts.final && opts.final(); if (btn) btn.hidden = true; return { start: start }; }
    opts.reset && opts.reset();
    whenSeen(el, start, opts.threshold || 0.45);
    return { start: start };
  }

  function whenSeen(el, cb, threshold) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); cb(); }
      });
    }, { threshold: threshold || 0.3 });
    io.observe(el);
  }

  /* ── scroll reveal (decorative) ───────────────────────────────────── */
  function reveals() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduce) {
      els.forEach(function (el) { el.classList.add("in", "now"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (motion.busy()) e.target.classList.add("now");
        e.target.classList.add("in");
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) el.classList.add("in", "now");
      else io.observe(el);
    });
  }

  /* ── wallet (phantom detection, visual only) ──────────────────────── */
  function wallet() {
    var btn = document.querySelector("[data-wallet]");
    if (!btn) return;
    var provider = null;
    function find() {
      var p = (window.phantom && window.phantom.solana) || window.solana;
      return p && p.isPhantom ? p : null;
    }
    function show(key) {
      if (key) {
        var s = key.toString();
        btn.textContent = "[" + s.slice(0, 4) + "…" + s.slice(-4) + "]";
        btn.title = s + " — click to disconnect";
        btn.dataset.state = "connected";
      } else {
        btn.textContent = "[connect wallet]";
        btn.dataset.state = provider ? "ready" : "none";
        btn.title = provider ? "phantom detected" : "phantom not detected — opens phantom.app";
      }
    }
    function init() {
      provider = find();
      show(provider && provider.publicKey);
      if (provider) {
        provider.on && provider.on("accountChanged", function (k) { show(k); });
        provider.on && provider.on("disconnect", function () { show(null); });
        provider.connect({ onlyIfTrusted: true }).then(function (r) { show(r.publicKey); }, function () {});
      }
    }
    btn.addEventListener("click", function () {
      provider = provider || find();
      if (!provider) { window.open("https://phantom.app/", "_blank", "noopener"); return; }
      if (btn.dataset.state === "connected") { provider.disconnect(); show(null); return; }
      provider.connect().then(function (r) { show(r.publicKey); }, function () { show(null); });
    });
    if (document.readyState === "complete") init();
    else window.addEventListener("load", init);
  }

  /* ── formatting: numbers stay literal ─────────────────────────────── */
  var fmt = {
    n: function (v, d) {
      return Number(v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    },
    sol: function (v, d) { return fmt.n(v, d == null ? 9 : d); },
    usd: function (v) { return "$" + fmt.n(v, 2); },
    cents: function (c) { return fmt.n(c) + "¢"; },
    hash: function (h, a, b) { return h ? h.slice(0, a || 4) + "…" + h.slice(-(b || 4)) : "—"; },
    dur: function (ms) {
      ms = Math.max(0, ms);
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
      return d + "d " + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
    },
    ago: function (ms) {
      var s = Math.max(0, Math.round(ms / 1000));
      if (s < 60) return s + "s ago";
      var m = Math.round(s / 60);
      if (m < 60) return m + "m ago";
      var h = Math.floor(m / 60);
      if (h < 48) return h + "h " + (m % 60) + "m ago";
      return Math.floor(h / 24) + "d ago";
    },
    utc: function (t) { return new Date(t).toISOString().replace("T", " ").slice(0, 16) + "Z"; },
  };

  /* ── state helpers (read the same fields the program reads) ───────── */
  var S = window.ZHALVE_STATE;
  var ERA_MS = 4 * 7 * 86400e3;
  var chain = {
    burnBps: function (era) { return Math.max(100, Math.floor(10000 / Math.pow(2, era))); },
    // the snapshot's slot, advanced at ~400ms per slot so readouts stay honest about time passing
    slot: function () { return S ? S.snapshot.slot + Math.floor((Date.now() - S.snapshot.t) / 400) : 0; },
    nextEra: function () { return S ? Math.max(0, S.state.era_start + ERA_MS - Date.now()) : 0; },
    window: function (len) { return Math.min(64, Math.max(4, Math.ceil(len / 64))); },
    ERA_MS: ERA_MS,
  };

  // program accounts. fill in after deploy; empty values render as "—".
  var ADDRESSES = {
    program: "",
    "clock vault": "",
    "outbound vault": "",
    hand: "",
    attestor: "",
    coin: "",
    pool: "",
  };
  var EXPLORER = "https://solscan.io/account/";

  /* ── ascii diagrams: every character becomes an addressable cell ─────
     The diagram text is left exactly as written; cells only change
     visibility and colour, so the finished figure is the plain ascii. */
  function ascii(pre) {
    var text = pre.textContent.replace(/\n+$/, "");
    var lines = text.split("\n");
    var width = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var cells = [];
    pre.textContent = "";
    lines.forEach(function (line, r) {
      cells[r] = [];
      var row = document.createElement("span");
      row.className = "ln";
      for (var c = 0; c < width; c++) {
        var ch = line[c] || " ";
        if (ch === " ") { row.appendChild(document.createTextNode(" ")); continue; }
        var s = document.createElement("span");
        s.className = "c";
        s.textContent = ch;
        cells[r][c] = s;
        row.appendChild(s);
      }
      pre.appendChild(row);
      if (r < lines.length - 1) pre.appendChild(document.createTextNode("\n"));
    });
    var api = {
      lines: lines,
      cells: cells,
      all: function () { var out = []; cells.forEach(function (row) { row.forEach(function (s) { if (s) out.push(s); }); }); return out; },
      // the cells of a label, left to right
      label: function (txt, from) {
        for (var r = from || 0; r < lines.length; r++) {
          var c = lines[r].indexOf(txt);
          if (c >= 0) { var out = []; for (var i = c; i < c + txt.length; i++) if (cells[r][i]) out.push(cells[r][i]); return out; }
        }
        return [];
      },
      // a vertical run in one column, top to bottom
      col: function (c, r0, r1) { var out = []; for (var r = r0; r <= r1; r++) if (cells[r][c]) out.push(cells[r][c]); return out; },
      // a horizontal run on one row, left to right
      row: function (r, c0, c1) { var out = []; for (var c = c0; c <= c1; c++) if (cells[r][c]) out.push(cells[r][c]); return out; },
      // pad a line out and hang an annotation span off its end (or at a column)
      anno: function (r, c, cls, width) {
        var row = pre.querySelectorAll(".ln")[r];
        var span = document.createElement("span");
        span.className = "anno " + (cls || "");
        if (c != null) {
          // take over `width` blank columns starting at column c, so the rest of the row keeps its alignment
          var col = 0, node = row.firstChild;
          while (node && col < c) { col += node.textContent.length; node = node.nextSibling; }
          for (var k = 0; k < width && node && node.nodeType === 3; k++) { var nx = node.nextSibling; row.removeChild(node); node = nx; }
          row.insertBefore(span, node);
          span.textContent = " ".repeat(width);
        } else row.appendChild(span);
        return span;
      },
      set: function (list, add, remove) {
        list.forEach(function (s) {
          if (remove) remove.split(" ").forEach(function (k) { k && s.classList.remove(k); });
          if (add) add.split(" ").forEach(function (k) { k && s.classList.add(k); });
        });
      },
      // reveal cells one after another — the line-draw
      draw: function (list, cls, ms, run) {
        var i = 0;
        return new Promise(function (res) {
          (function next() {
            if (run && run.dead) return;
            if (i >= list.length) return res();
            list[i].classList.remove("off");
            if (cls) cls.split(" ").forEach(function (k) { list[i].classList.add(k); });
            i++;
            if (ms) { var id = setTimeout(next, ms); if (run) run.timers.push(id); } else next();
          })();
        });
      },
    };
    return api;
  }

  /* highlight the rows of a rule table that belong to step n */
  function rows(table, n) {
    var hit = [];
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      var on = n != null && tr.dataset.step === String(n);
      tr.classList.toggle("is-on", on);
      if (on) hit.push(tr);
    });
    return hit;
  }
  function caption(el, trs) {
    el.innerHTML = trs.map(function (tr) {
      var td = tr.querySelectorAll("td");
      var cls = tr.classList.contains("burn") ? "burn" : tr.classList.contains("pay") ? "pay" : "";
      return '<p class="' + cls + '"><b>' + td[0].innerHTML + "</b> &nbsp;" + td[1].innerHTML + "</p>";
    }).join("");
  }

  window.EH = { motion: motion, explain: explain, whenSeen: whenSeen, fmt: fmt, chain: chain, sleep: sleep, ascii: ascii, rows: rows, caption: caption, ADDRESSES: ADDRESSES, EXPLORER: EXPLORER };

  document.addEventListener("DOMContentLoaded", function () {
    reveals();
    wallet();
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
