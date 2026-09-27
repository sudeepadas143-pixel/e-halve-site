/* hero — the whole machine on one plate, visible on arrival.
   Plays three ticks, one per era (0, 1, 2), so the split visibly halves:
   fees fill the clock, the tick fires, the slice splits between the burn arm
   and the payout arm, the hand pays and settles, then advance halves burn_bps.
   Plays once and rests on its final frame; ↻ replays. The structure is drawn
   statically, so the still frame is complete before anything moves. */
(function () {
  "use strict";
  var EH = window.EH;
  var fig = document.getElementById("fig-hero");
  if (!fig) return;
  var host = fig.querySelector("[data-hero]");
  var NS = "http://www.w3.org/2000/svg";

  var TRIGGER = 0.15, N = 24, WIN = 4, CURSOR0 = 20, SUPPLY0 = 1e9, SLICE = 8;
  var ERAS = [0, 1, 2];
  var BURNED_PER_TICK = 164000; // tokens a full-burn tick buys in this illustration

  var L = {
    wide: {
      w: 1000, h: 404,
      era: { x: 30, y: 40, bar: 190 },
      pool: { x: 30, y: 160, w: 140, h: 90 },
      clock: { x: 250, y: 104, w: 72, h: 200, trig: 0.8 },
      tick: { x: 410, y: 205, r: 18 },
      burnBox: { x: 540, y: 84, w: 150, h: 44 },
      supply: { x: 736, y: 100 },
      ring: { x: 600, y: 300, r: 46 },
      orders: { x: 560, y: 378, a: "start" },
      ringLab: { x: 600, y: 240, a: "middle" }, curLab: { x: 656, y: 336, a: "start" },
      massLab: { x: 286, y: 322, a: "middle" },
      hand: { x: 736, y: 282, w: 110, h: 36 },
      settle: { x: 880, y: 282, w: 90, h: 36 },
      phase: { x: 30, y: 394 },
      p: {
        fee: [[170, 205], [250, 205]],
        drain: [[322, 205], [392, 205]],
        burn: [[428, 205], [470, 205], [470, 106], [540, 106]],
        pay: [[428, 205], [470, 205], [470, 300], [554, 300]],
        burnOut: [[690, 106], [730, 106]],
        hand: [[646, 300], [736, 300]],
        settle: [[846, 300], [880, 300]],
      },
      armBurn: [482, 158, "start"], armPay: [482, 262, "start"],
    },
    narrow: {
      w: 360, h: 566,
      era: { x: 16, y: 30, bar: 150 },
      pool: { x: 16, y: 116, w: 124, h: 70 },
      clock: { x: 214, y: 96, w: 64, h: 120, trig: 0.8 },
      tick: { x: 246, y: 256, r: 16 },
      burnBox: { x: 16, y: 318, w: 150, h: 40 },
      supply: { x: 16, y: 392 },
      ring: { x: 262, y: 360, r: 40 },
      orders: { x: 196, y: 404, a: "end" },
      ringLab: { x: 202, y: 346, a: "end" }, curLab: { x: 202, y: 362, a: "end" },
      massLab: { x: 206, y: 212, a: "end" },
      hand: { x: 202, y: 440, w: 120, h: 32 },
      settle: { x: 202, y: 494, w: 120, h: 32 },
      phase: { x: 16, y: 556 },
      p: {
        fee: [[140, 151], [214, 151]],
        drain: [[246, 216], [246, 240]],
        burn: [[230, 256], [91, 256], [91, 318]],
        pay: [[262, 256], [262, 272], [262, 320]],
        burnOut: [[91, 358], [91, 374]],
        hand: [[262, 400], [262, 408], [262, 440]],
        settle: [[262, 472], [262, 494]],
      },
      armBurn: [150, 248, "middle"], armPay: [268, 292, "start"],
    },
  };

  var G, lay, st;

  function el(name, attrs, parent, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    (parent || G.svg).appendChild(e);
    return e;
  }
  function poly(pts) { return pts.map(function (p) { return p[0] + "," + p[1]; }).join(" "); }

  function build() {
    lay = window.matchMedia("(max-width: 700px)").matches ? L.narrow : L.wide;
    host.innerHTML = "";
    G = {};
    G.svg = el("svg", { viewBox: "0 0 " + lay.w + " " + lay.h, role: "img", "aria-label": "creator fees fill the clock; a tick splits the slice between burning the coin and paying followers; each era halves the burn share" }, host);
    host.appendChild(G.svg);
    var defs = el("defs", {});
    ["ink", "burn", "pay"].forEach(function (c) {
      var m = el("marker", { id: "hero-ar-" + c, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0,0.5 L7,4 L0,7.5", class: "hr-arrow " + c }, m);
    });

    // pipes
    var P = lay.p;
    G.pipes = {};
    [["fee", "ink"], ["drain", "ink"], ["burn", "burn"], ["pay", "pay"], ["burnOut", "burn"], ["hand", "pay"], ["settle", "pay"]].forEach(function (d) {
      G.pipes[d[0]] = el("polyline", { points: poly(P[d[0]]), class: "hr-pipe " + d[1], "marker-end": "url(#hero-ar-" + d[1] + ")" });
    });

    // era plate
    var E = lay.era;
    G.era = el("text", { x: E.x, y: E.y, class: "hr-era" }, null, "era 0");
    G.bps = el("text", { x: E.x + (lay === L.wide ? 92 : 80), y: E.y, class: "hr-sub" }, null, "burn_bps 10000");
    el("rect", { x: E.x, y: E.y + 12, width: E.bar, height: 9, class: "hr-barbox" });
    G.splitPay = el("rect", { x: E.x + 1, y: E.y + 13, width: E.bar - 2, height: 7, class: "hr-barpay" });
    G.splitBurn = el("rect", { x: E.x + 1, y: E.y + 13, width: E.bar - 2, height: 7, class: "hr-barburn" });
    G.split = el("text", { x: E.x + E.bar + 10, y: E.y + 20, class: "hr-sub" }, null, "burn 100% · payout 0%");

    // pool
    var po = lay.pool;
    el("rect", { x: po.x, y: po.y, width: po.w, height: po.h, class: "hr-box" });
    el("text", { x: po.x + 12, y: po.y + 24, class: "hr-lab" }, null, "pool");
    el("text", { x: po.x + 12, y: po.y + 42, class: "hr-sub" }, null, "creator fees");
    G.trades = el("g", {});
    G.tradeY = po.y + po.h - 16;

    // clock vessel
    var c = lay.clock, trigY = c.y + c.h * (1 - c.trig);
    el("clipPath", { id: "hero-clip" }, defs);
    el("rect", { x: c.x, y: c.y, width: c.w, height: c.h }, defs.lastChild);
    G.fill = el("rect", { x: c.x, y: c.y + c.h, width: c.w, height: 0, class: "hr-fill", "clip-path": "url(#hero-clip)" });
    el("rect", { x: c.x, y: c.y, width: c.w, height: c.h, class: "hr-vessel" });
    G.trig = el("line", { x1: c.x - 6, x2: c.x + c.w + 6, y1: trigY, y2: trigY, class: "hr-trig" });
    el("text", { x: c.x + c.w / 2, y: c.y - 10, class: "hr-lab", "text-anchor": "middle" }, null, "the clock");
    el("text", { x: c.x + c.w + 10, y: trigY - 5, class: "hr-sub burn" }, null, "0.15 SOL");
    G.mass = el("text", { x: lay.massLab.x, y: lay.massLab.y, class: "hr-num", "text-anchor": lay.massLab.a }, null, "0.000");
    G.clockGeom = { top: c.y, h: c.h, trig: c.trig };

    // tick node
    var t = lay.tick;
    G.tick = el("circle", { cx: t.x, cy: t.y, r: t.r, class: "hr-tick" });
    G.tickN = el("text", { x: t.x, y: t.y + 4, class: "hr-num", "text-anchor": "middle" }, null, "—");
    el("text", { x: t.x, y: t.y + t.r + 16, class: "hr-lab", "text-anchor": "middle" }, null, "tick");

    // arms
    el("text", { x: lay.armBurn[0], y: lay.armBurn[1], class: "hr-sub burn", "text-anchor": lay.armBurn[2] }, null, "burn arm");
    el("text", { x: lay.armPay[0], y: lay.armPay[1], class: "hr-sub pay", "text-anchor": lay.armPay[2] }, null, "payout arm");

    // burn box + supply
    var b = lay.burnBox;
    G.burnBox = el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, class: "hr-box burn" });
    el("text", { x: b.x + b.w / 2, y: b.y + b.h / 2 + 4.5, class: "hr-lab burn", "text-anchor": "middle" }, null, "buy + burn");
    el("text", { x: lay.supply.x, y: lay.supply.y, class: "hr-sub" }, null, "supply");
    G.supply = el("text", { x: lay.supply.x, y: lay.supply.y + 20, class: "hr-num big" }, null, "1,000,000,000");

    // roster ring
    var r = lay.ring;
    el("circle", { cx: r.x, cy: r.y, r: r.r, class: "hr-ringline" });
    G.dots = [];
    for (var i = 0; i < N; i++) {
      var a = (i / N) * Math.PI * 2 - Math.PI / 2;
      G.dots.push(el("circle", { cx: r.x + r.r * Math.cos(a), cy: r.y + r.r * Math.sin(a), r: 3.6, class: "hr-dot" }));
    }
    G.hand = el("line", { x1: r.x, y1: r.y, x2: r.x, y2: r.y - r.r + 10, class: "hr-cursor" });
    el("text", { x: lay.ringLab.x, y: lay.ringLab.y, class: "hr-sub", "text-anchor": lay.ringLab.a }, null, "roster");
    G.cur = el("text", { x: lay.curLab.x, y: lay.curLab.y, class: "hr-sub", "text-anchor": lay.curLab.a }, null, "cursor " + CURSOR0);
    G.orders = el("text", { x: lay.orders.x, y: lay.orders.y, class: "hr-orders", "text-anchor": lay.orders.a }, null, "");

    // hand, settle
    var h = lay.hand, s = lay.settle;
    G.handBox = el("rect", { x: h.x, y: h.y, width: h.w, height: h.h, class: "hr-box pay" });
    el("text", { x: h.x + h.w / 2, y: h.y + h.h / 2 + 4.5, class: "hr-lab pay", "text-anchor": "middle" }, null, "hand pays");
    G.settleBox = el("rect", { x: s.x, y: s.y, width: s.w, height: s.h, class: "hr-box pay" });
    el("text", { x: s.x + s.w / 2, y: s.y + s.h / 2 + 4.5, class: "hr-lab pay", "text-anchor": "middle" }, null, "settle");

    G.phase = el("text", { x: lay.phase.x, y: lay.phase.y, class: "hr-phase" }, null, "");
    G.parts = el("g", {});
  }

  /* ── state renderers ── */
  function setEra(e) {
    var bps = EH.chain.burnBps(e), W = lay.era.bar - 2;
    G.era.textContent = "era " + e;
    G.bps.textContent = "burn_bps " + bps;
    G.splitBurn.setAttribute("width", (W * bps) / 10000);
    G.split.textContent = "burn " + bps / 100 + "% · payout " + (100 - bps / 100) + "%";
    G.pipes.pay.classList.toggle("off", e === 0);
    G.pipes.hand.classList.toggle("off", e === 0);
    G.pipes.settle.classList.toggle("off", e === 0);
  }
  function setMass(v) {
    var g = G.clockGeom, hgt = Math.min(g.h, (v / TRIGGER) * g.h * g.trig);
    G.fill.setAttribute("y", g.top + g.h - hgt);
    G.fill.setAttribute("height", hgt);
    G.mass.textContent = v.toFixed(3);
  }
  function setSupply(v) { G.supply.textContent = Math.round(v).toLocaleString("en-US"); }
  function setCursor(p) {
    var r = lay.ring, a = (p / N) * Math.PI * 2 - Math.PI / 2;
    G.hand.setAttribute("x2", r.x + (r.r - 10) * Math.cos(a));
    G.hand.setAttribute("y2", r.y + (r.r - 10) * Math.sin(a));
    G.cur.textContent = "cursor " + Math.round(p) % N;
  }
  function flash(node, cls, ms, run) {
    node.classList.add(cls);
    var id = setTimeout(function () { node.classList.remove(cls); }, ms);
    if (run) run.timers.push(id);
  }
  function phase(s) { G.phase.textContent = s; }

  /* ── particles: a dot moving along a polyline ── */
  function travel(run, pts, ms, cls) {
    var segs = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], d = Math.hypot(dx, dy);
      segs.push([pts[i - 1], dx, dy, d]); total += d;
    }
    var dot = el("circle", { r: 3.4, class: "hr-p " + (cls || ""), cx: pts[0][0], cy: pts[0][1] }, G.parts);
    var t0 = performance.now();
    return new Promise(function (res) {
      (function f(now) {
        if (run.dead) { dot.remove(); return; }
        var k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var d = e * total;
        for (var j = 0; j < segs.length; j++) {
          if (d <= segs[j][3] || j === segs.length - 1) {
            var q = segs[j][3] ? Math.min(1, d / segs[j][3]) : 1;
            dot.setAttribute("cx", segs[j][0][0] + segs[j][1] * q);
            dot.setAttribute("cy", segs[j][0][1] + segs[j][2] * q);
            break;
          }
          d -= segs[j][3];
        }
        if (k < 1) requestAnimationFrame(f); else { dot.remove(); res(); }
      })(t0);
    });
  }
  function tween(run, ms, fn) {
    var t0 = performance.now();
    return new Promise(function (res) {
      (function f(now) {
        if (run.dead) return;
        var k = Math.min(1, (now - t0) / ms);
        fn(1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(f); else res();
      })(t0);
    });
  }
  function trade(run) {
    var po = lay.pool, x = po.x + 12 + Math.random() * (po.w - 30);
    var bar = el("line", { x1: x, x2: x + 10, y1: G.tradeY, y2: G.tradeY, class: "hr-trade" }, G.trades);
    var id = setTimeout(function () { bar.remove(); }, 700);
    run.timers.push(id);
  }

  /* ── one tick in era e ── */
  async function tick(run, e, n) {
    setEra(e);
    var bps = EH.chain.burnBps(e), nBurn = Math.round((SLICE * bps) / 10000), nPay = SLICE - nBurn;

    // 1 · trades pay the creator fee into the clock
    phase("pool trades → creator fees → the clock");
    var mass = 0, fees = [0.021, 0.028, 0.019, 0.034, 0.026, 0.031];
    var arrivals = fees.map(function (f, i) {
      return run.wait(i * 170).then(function () {
        trade(run);
        return travel(run, lay.p.fee, 480, "ink");
      }).then(function () {
        var from = mass; mass += f;
        return tween(run, 220, function (k) { setMass(from + (mass - from) * k); });
      });
    });
    await Promise.all(arrivals);

    // 2 · the clock clears the trigger: the tick fires
    phase("unticked_balance >= 0.15 SOL · tick fires");
    flash(G.trig, "hot", 700, run);
    G.tickN.textContent = "#" + n;
    flash(G.tick, "hot", 900, run);
    await run.wait(450);

    // 3 · drain and split by the era
    phase("era " + e + " split · burn " + bps / 100 + "% / payout " + (100 - bps / 100) + "%");
    var start = mass;
    var drain = tween(run, 700, function (k) { setMass(start * (1 - k)); });
    var supply = st.supply, per = (BURNED_PER_TICK * bps) / 10000 / Math.max(1, nBurn);
    var landedPay = 0;
    var flows = [];
    for (var i = 0; i < SLICE; i++) {
      (function (i) {
        var toBurn = i < nBurn;
        flows.push(run.wait(i * 70).then(function () { return travel(run, lay.p.drain, 320, "ink"); }).then(function () {
          if (toBurn) {
            return travel(run, lay.p.burn, 620, "burn").then(function () {
              flash(G.burnBox, "hot", 260, run);
              return travel(run, lay.p.burnOut, 220, "burn");
            }).then(function () { st.supply -= per; setSupply(st.supply); flash(G.supply, "hot", 260, run); });
          }
          return travel(run, lay.p.pay, 620, "pay").then(function () {
            landedPay++;
            if (landedPay === 1) for (var w = 0; w < WIN; w++) G.dots[(st.cursor + w) % N].classList.add("win");
            var shown = Math.min(WIN, Math.ceil((landedPay / nPay) * WIN));
            G.orders.textContent = "○ ".repeat(shown).trim();
          });
        }));
      })(i);
    }
    await Promise.all(flows.concat([drain]));
    mass = 0; setMass(0);

    // 4 · the hand pays each order and proves it
    if (nPay > 0) {
      phase("write orders → hand pays → settle");
      await run.wait(250);
      for (var j = 0; j < WIN; j++) {
        await travel(run, lay.p.hand, 380, "pay");
        flash(G.handBox, "hot", 240, run);
        G.orders.textContent = ("● ".repeat(j + 1) + "○ ".repeat(WIN - j - 1)).trim();
        travel(run, lay.p.settle, 260, "pay").then(function () { flash(G.settleBox, "hot", 260, run); });
      }
      await run.wait(420);
      for (var w = 0; w < WIN; w++) { var dp = G.dots[(st.cursor + w) % N]; dp.classList.remove("win"); dp.classList.add("paid"); }
      var from = st.cursor, to = st.cursor + WIN;
      await tween(run, 520, function (k) { setCursor(from + (to - from) * k); });
      st.cursor = to % N; setCursor(st.cursor);
      G.orders.textContent = "";
    }
  }

  function reset() {
    build();
    st = { supply: SUPPLY0, cursor: CURSOR0 };
    setEra(0); setMass(0); setSupply(SUPPLY0); setCursor(CURSOR0);
    phase("creator fees → the clock → tick → burn arm / payout arm");
  }
  function final() {
    build();
    st = { supply: SUPPLY0 - BURNED_PER_TICK * 1.75, cursor: (CURSOR0 + 2 * WIN) % N };
    setEra(2); setMass(0); setSupply(st.supply); setCursor(st.cursor);
    for (var i = 0; i < 2 * WIN; i++) G.dots[(CURSOR0 + i) % N].classList.add("paid");
    G.tickN.textContent = "#2";
    phase("era 0 → 1 → 2 · each advance halves burn_bps");
  }

  var player = EH.explain(fig, {
    threshold: 0.2,
    reset: reset,
    final: final,
    seq: async function (run) {
      await run.wait(500);
      for (var k = 0; k < ERAS.length; k++) {
        await tick(run, ERAS[k], k);
        if (k < ERAS.length - 1) {
          phase("4 weeks pass · advance · burn_bps halves");
          var bps = EH.chain.burnBps(ERAS[k]), W = lay.era.bar - 2;
          flash(G.era, "hot", 900, run);
          await tween(run, 800, function (q) { G.splitBurn.setAttribute("width", (W * bps * (1 - q / 2)) / 10000); });
          await run.wait(350);
        }
      }
      phase("era 0 → 1 → 2 · each advance halves burn_bps");
    },
  });

  // swap layouts across the breakpoint; show the finished frame rather than restart mid-way
  var mode = lay;
  window.addEventListener("resize", function () {
    var want = window.matchMedia("(max-width: 700px)").matches ? L.narrow : L.wide;
    if (want !== mode) { mode = want; final(); }
  });
  mode = lay;
})();
