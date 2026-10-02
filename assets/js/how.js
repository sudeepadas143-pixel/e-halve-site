/* how — three explanatory figures:
   fig 1  the flow diagram draws itself in the order a tick runs
   fig 2  the halving stair, scrubbed by scroll
   fig 3  the cursor walking the roster ring, wrapping at the end */
(function () {
  "use strict";
  var EH = window.EH;

  /* ═════════════ fig 1 — flow ═════════════ */
  (function flow() {
    var fig = document.getElementById("fig-flow");
    if (!fig) return;
    var pre = fig.querySelector("[data-flow]");
    var table = fig.querySelector("table");
    var stepEl = fig.querySelector("[data-step]");
    var A = EH.ascii(pre);
    var L = A.lines;

    var trunk = L[1].indexOf("|");
    var right = L[4].lastIndexOf("|");
    var dashStart = L[3].indexOf("-");
    var rClock = 3;

    var parts = {
      fees: A.label("creator fees"),
      feesDown: A.col(trunk, 1, 2),
      clock: A.label("the clock"),
      dash: A.row(rClock, dashStart, right),
      leftDown: A.col(trunk, 4, 5),
      rightDown: A.col(right, 4, 5),
      burnArm: A.label("burn arm"),
      payArm: A.label("payout arm"),
      leftDown2: A.col(trunk, 7, 8),
      rightDown2: A.col(right, 7, 8),
      buyBurn: A.label("buy + burn"),
      write: A.label("write orders"),
      down3: A.col(right, 10, 11),
      hand: A.label("hand pays"),
      down4: A.col(right, 13, 14),
      settle: A.label("settle"),
    };
    var labels = ["fees", "clock", "burnArm", "payArm", "buyBurn", "write", "hand", "settle"];
    labels.forEach(function (k) { A.set(parts[k], "lab"); });

    // annotations live in blank space only; the ascii itself is never edited
    var rBuy = L.findIndex(function (l) { return l.indexOf("buy + burn") >= 0; });
    var burnCol = L[rBuy].indexOf("buy + burn");
    var supply = A.anno(rBuy + 1, burnCol, "burn", 16);
    var ordersAnno = A.anno(rBuy, null, "pay");
    var N = 4;

    function setOrders(filled, shown) {
      var s = "  ";
      for (var i = 0; i < shown; i++) s += (i < filled ? "●" : "○") + " ";
      ordersAnno.textContent = s;
    }

    function reset() {
      A.set(A.all(), "off", "burn pay dim hot");
      supply.textContent = supply.textContent.replace(/./g, " ");
      ordersAnno.textContent = "";
      EH.rows(table, null);
      stepEl.innerHTML = "";
    }
    function final() {
      A.set(A.all(), "", "off");
      paint();
      supply.textContent = "−13,402".padEnd(16);
      setOrders(N, N);
      EH.rows(table, null);
    }
    function paint() {
      A.set([].concat(parts.leftDown, parts.burnArm, parts.leftDown2, parts.buyBurn), "burn");
      A.set([].concat(parts.rightDown, parts.payArm, parts.rightDown2, parts.write, parts.down3, parts.hand, parts.down4, parts.settle), "pay");
    }
    function step(n) { EH.caption(stepEl, EH.rows(table, n)); }

    function count(run, el, to, ms, fmt) {
      var t0 = performance.now();
      return new Promise(function (res) {
        (function f(now) {
          if (run.dead) return;
          var k = Math.min(1, (now - t0) / ms);
          el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(f); else res();
        })(t0);
      });
    }

    EH.explain(fig, {
      threshold: 0.35,
      reset: reset,
      final: final,
      seq: async function (run) {
        // 1 · a pool trade pays the creator fee
        step(1);
        await A.draw(parts.fees, "", 28, run);
        await run.wait(900);

        // 2 · fees land in the clock until it clears the trigger
        step(2);
        await A.draw(parts.feesDown, "", 160, run);
        await A.draw(parts.clock, "", 30, run);
        stepEl.insertAdjacentHTML("beforeend", '<p>clock<span class="meter"><i></i></span><span data-m>0.000</span> / 0.15 SOL</p>');
        var bar = stepEl.querySelector(".meter i"), m = stepEl.querySelector("[data-m]");
        var t0 = performance.now();
        await new Promise(function (res) {
          (function f(now) {
            if (run.dead) return;
            var k = Math.min(1, (now - t0) / 1500);
            var v = 0.15 * k;
            bar.style.width = "calc(" + (k * 100) + "% - 2px)";
            m.textContent = v.toFixed(3);
            if (k < 1) requestAnimationFrame(f); else res();
          })(t0);
        });
        A.set(parts.clock, "hot");
        await run.wait(700);
        A.set(parts.clock, "", "hot");

        // 3 · the tick fires and splits
        step(3);
        A.draw(parts.leftDown, "burn", 160, run);
        await A.draw(parts.dash, "", 16, run);
        await A.draw(parts.rightDown, "pay", 160, run);
        A.draw(parts.burnArm, "burn", 30, run);
        await A.draw(parts.payArm, "pay", 30, run);
        await run.wait(900);

        // 4 · both arms at once: one burns, the other writes orders
        step(4);
        A.draw(parts.leftDown2, "burn", 160, run);
        await A.draw(parts.rightDown2, "pay", 160, run);
        A.draw(parts.buyBurn, "burn", 30, run);
        await A.draw(parts.write, "pay", 30, run);
        var burning = count(run, supply, 13402, 1800, function (v) { return ("−" + Math.round(v).toLocaleString("en-US")).padEnd(16); });
        for (var i = 1; i <= N; i++) { setOrders(0, i); await run.wait(380); }
        await burning;
        await run.wait(900);

        // 5 · the hand pays each order
        step(5);
        await A.draw(parts.down3, "pay", 160, run);
        await A.draw(parts.hand, "pay", 30, run);
        for (var j = 1; j <= N; j++) { setOrders(j, N); await run.wait(420); }
        await run.wait(500);

        // 6 · and proves it
        step(6);
        await A.draw(parts.down4, "pay", 160, run);
        await A.draw(parts.settle, "pay", 40, run);
        await run.wait(1400);
        EH.rows(table, null);
      },
    });
  })();

  /* ═════════════ fig 2 — era stair, scroll-scrubbed ═════════════ */
  (function stair() {
    var fig = document.getElementById("fig-era");
    if (!fig) return;
    var host = fig.querySelector("[data-stair]");
    var read = fig.querySelector("[data-stair-read]");
    var rows = fig.querySelectorAll("tbody tr");
    var bars = fig.querySelectorAll(".bars .b");
    var ERAS = 9, W = 640, H = 210, padL = 52, padR = 14, padT = 12, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;
    var bps = []; for (var e = 0; e < ERAS; e++) bps.push(EH.chain.burnBps(e));
    var x = function (era) { return padL + (era / ERAS) * iw; };
    var y = function (b) { return padT + (Math.log2(10000 / b) / Math.log2(100)) * ih; };

    var d = "M" + x(0) + "," + y(bps[0]);
    for (var i = 0; i < ERAS; i++) {
      d += " H" + x(i + 1);
      if (i + 1 < ERAS) d += " V" + y(bps[i + 1]);
    }
    var svg = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="burn_bps halves every four weeks until it floors at 100">'];
    [10000, 5000, 2500, 1250, 625, 312, 156, 100].forEach(function (b) {
      svg.push('<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(b) + '" y2="' + y(b) + '"/>');
      svg.push('<text x="' + (padL - 8) + '" y="' + (y(b) + 3.5) + '" text-anchor="end">' + b + "</text>");
    });
    for (var k = 0; k <= ERAS; k++) {
      svg.push('<line class="ax" x1="' + x(k) + '" x2="' + x(k) + '" y1="' + (H - padB) + '" y2="' + (H - padB + 4) + '"/>');
      svg.push('<text x="' + x(k) + '" y="' + (H - 6) + '" text-anchor="middle">' + (k === 0 ? "wk 0" : k * 4) + "</text>");
    }
    svg.push('<line class="ax" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '"/>');
    svg.push('<line class="floor" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(100) + '" y2="' + y(100) + '"/>');
    svg.push('<text x="' + (x(7) + 6) + '" y="' + (y(100) - 6) + '" style="fill:var(--burn)">floor 100 bps</text>');
    svg.push('<path class="ghost" d="' + d + '"/>');
    svg.push('<path class="line" d="' + d + '"/>');
    // "now", from the program's own era_start
    var S = window.ZHALVE_STATE;
    if (S) {
      var wk = (Date.now() - S.program.era_starts[0]) / (7 * 86400e3);
      var nx = padL + Math.min(1, wk / (ERAS * 4)) * iw;
      svg.push('<line x1="' + nx + '" x2="' + nx + '" y1="' + padT + '" y2="' + (H - padB) + '" style="stroke:var(--ink);stroke-width:1;stroke-dasharray:1 3"/>');
      svg.push('<text x="' + (nx + 5) + '" y="' + (padT + 8) + '" style="fill:var(--ink)">now · era ' + S.state.era + "</text>");
    }
    svg.push('<circle class="tip" r="4" cx="' + x(0) + '" cy="' + y(10000) + '"/>');
    svg.push("</svg>");
    host.innerHTML = svg.join("");

    var line = host.querySelector(".line"), tip = host.querySelector(".tip");
    var len = line.getTotalLength();
    line.style.strokeDasharray = len;
    // length along the path at the end of each era's flat segment
    var marks = [];
    (function () {
      var acc = 0;
      for (var e = 0; e < ERAS; e++) {
        acc += iw / ERAS;
        marks.push(acc);
        if (e + 1 < ERAS) acc += Math.abs(y(bps[e + 1]) - y(bps[e]));
      }
    })();
    var widths = [100, 50, 25, 12.5, 6.25, 1];

    function render(p) {
      var drawn = len * p;
      line.style.strokeDashoffset = len - drawn;
      var pt = line.getPointAtLength(Math.max(0.01, drawn));
      tip.setAttribute("cx", pt.x); tip.setAttribute("cy", pt.y);
      var era = Math.min(ERAS - 1, Math.floor(((pt.x - padL) / iw) * ERAS + 1e-6));
      read.textContent = "era " + era + " · burn_bps " + bps[era];
      var rowIx = era <= 4 ? era : era >= 7 ? 5 : -1;
      rows.forEach(function (tr, ix) {
        tr.classList.toggle("is-on", ix === rowIx);
        tr.classList.toggle("burn", ix === rowIx);
        var reached = ix <= 4 ? era >= ix : era >= 7;
        var prev = ix === 0 ? 100 : widths[ix - 1];
        bars[ix].style.width = (reached ? widths[ix] : prev) + "%";
        bars[ix].parentNode.style.opacity = reached ? 1 : 0.3;
      });
    }

    if (EH.motion.reduce) { render(1); rows.forEach(function (tr) { tr.classList.remove("is-on", "burn"); }); return; }
    var active = false, queued = false;
    function onScroll() {
      queued = false;
      var r = fig.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (vh * 0.55)));
      var live = p > 0 && p < 1 && r.bottom > 0;
      if (live && !active) { active = true; EH.motion.begin(); }
      if (!live && active) { active = false; EH.motion.end(); }
      render(p);
      if (p >= 1) rows.forEach(function (tr) { tr.classList.remove("is-on", "burn"); });
    }
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  })();

  /* ═════════════ fig 3 — roster ring ═════════════ */
  (function ring() {
    var fig = document.getElementById("fig-ring");
    if (!fig) return;
    var host = fig.querySelector("[data-ring]");
    var out = fig.querySelector("[data-ring-read]");
    var N = 42, WIN = EH.chain.window(N), START = 28, TICKS = 6;
    var weight = function (p) { return p === 0 ? 3 : p === 41 || p === 33 ? 2 : 1; };
    var C = 160, R = 118, RL = 140;
    var ang = function (p) { return (p / N) * Math.PI * 2 - Math.PI / 2; };
    var pt = function (p, r) { return [C + r * Math.cos(ang(p)), C + r * Math.sin(ang(p))]; };

    var s = ['<svg viewBox="0 0 320 320" role="img" aria-label="42 roster positions in a ring; the cursor advances by the window each tick">'];
    s.push('<circle cx="160" cy="160" r="' + R + '" fill="none" stroke="var(--rule)" stroke-width="1"/>');
    s.push('<path class="arc" d="" />');
    for (var p = 0; p < N; p++) {
      var a = pt(p, R), l = pt(p, RL);
      s.push('<circle class="pos w' + weight(p) + '" data-p="' + p + '" cx="' + a[0].toFixed(2) + '" cy="' + a[1].toFixed(2) + '" r="5"/>');
      s.push('<text class="lbl" data-l="' + p + '" x="' + l[0].toFixed(2) + '" y="' + l[1].toFixed(2) + '">' + p + "</text>");
    }
    s.push('<line class="hand" x1="160" y1="160" x2="160" y2="60"/>');
    s.push('<circle cx="160" cy="160" r="2.5" fill="var(--ink)"/>');
    s.push('<text class="hub" x="160" y="186">cursor <tspan data-hub>' + START + "</tspan></text>");
    s.push('<text class="hub s" x="160" y="201">roster_len ' + N + "</text>");
    s.push("</svg>");
    host.innerHTML = s.join("");
    var svg = host.querySelector("svg");
    var dots = svg.querySelectorAll(".pos"), lbls = svg.querySelectorAll(".lbl");
    var hand = svg.querySelector(".hand"), hub = svg.querySelector("[data-hub]"), arc = svg.querySelector(".arc");
    var cur = START;

    function setHand(pos) {
      var e = pt(pos, 100);
      hand.setAttribute("x2", e[0]); hand.setAttribute("y2", e[1]);
    }
    function arcFor(from, n) {
      var r = 104, a0 = ang(from - 0.45), a1 = ang(from + n - 0.55);
      var large = a1 - a0 > Math.PI ? 1 : 0;
      return "M" + (C + r * Math.cos(a0)) + "," + (C + r * Math.sin(a0)) + " A" + r + "," + r + " 0 " + large + " 1 " + (C + r * Math.cos(a1)) + "," + (C + r * Math.sin(a1));
    }
    function readout(t, before, after, ps) {
      var ws = ps.map(weight), W = ws.reduce(function (a, b) { return a + b; }, 0);
      var rowsHtml = [
        ["tick", t == null ? "—" : String(t)],
        ["cursor", before + (after == null ? "" : " → " + after + (after < before ? "  (wrapped)" : ""))],
        ["window", String(WIN)],
        ["positions", ps.length ? ps.join(" ") : "—"],
        ["weight", ps.length ? ws.join(" ") + "   / " + W : "—"],
        ["split", ps.length ? ws.map(function (w) { return ((w / W) * 100).toFixed(1) + "%"; }).join(" ") : "—"],
      ];
      out.innerHTML = rowsHtml.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
    }
    function turn(run, from, to, ms) {
      var dist = (to - from + N) % N; // always clockwise
      var t0 = performance.now();
      return new Promise(function (res) {
        (function f(now) {
          if (run.dead) return;
          var k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          setHand((from + dist * e) % N);
          if (k < 1) requestAnimationFrame(f); else res();
        })(t0);
      });
    }
    function reset() {
      cur = START;
      dots.forEach(function (d) { d.classList.remove("win", "paid"); });
      lbls.forEach(function (l) { l.classList.remove("on"); });
      arc.setAttribute("d", ""); setHand(START); hub.textContent = START;
      readout(null, START, null, []);
    }
    EH.explain(fig, {
      threshold: 0.5,
      reset: reset,
      final: function () {
        var c = START;
        for (var t = 0; t < TICKS; t++) for (var i = 0; i < WIN; i++) dots[(c + t * WIN + i) % N].classList.add("paid");
        cur = (START + TICKS * WIN) % N; setHand(cur); hub.textContent = cur;
        readout(TICKS, (cur - WIN + N) % N, cur, []);
      },
      seq: async function (run) {
        await run.wait(400);
        for (var t = 1; t <= TICKS; t++) {
          var ps = []; for (var i = 0; i < WIN; i++) ps.push((cur + i) % N);
          ps.forEach(function (p) { dots[p].classList.add("win"); lbls[p].classList.add("on"); });
          arc.setAttribute("d", arcFor(cur, WIN));
          var next = (cur + WIN) % N;
          readout(t, cur, next, ps);
          await run.wait(900);
          ps.forEach(function (p) { dots[p].classList.remove("win"); dots[p].classList.add("paid"); lbls[p].classList.remove("on"); });
          arc.setAttribute("d", "");
          await turn(run, cur, next, 520);
          cur = next; hub.textContent = cur;
          await run.wait(260);
        }
      },
    });
  })();
})();
