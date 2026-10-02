/* hero: the whole machine on one plate. An illustration, not live data.
   Plays three eras so the split visibly halves:
   era 0  fees fill the clock, the tick burns everything;
   era 1  holders register into tier trees, the tick splits burn and usdc,
          advance moves the era's usdc to the claims pool;
   era 2  claims: a proof says "some holder of this tier" and pays a fresh
          address, never a named holder; then the unclaimed rest is burned.
   Plays once and rests on its final frame; ↻ replays. The structure is drawn
   statically, so the still frame is complete before anything moves. */
(function () {
  "use strict";
  var EH = window.EH;
  var fig = document.getElementById("fig-hero");
  if (!fig || !EH) return;
  var host = fig.querySelector("[data-hero]");
  var NS = "http://www.w3.org/2000/svg";

  var TRIGGER = 0.15, SUPPLY0 = 1e9, SLICE = 8, BURNED_PER_TICK = 164000;
  var TIERS = [3, 2, 1];             // top row first
  var MEMBERS = { 1: 9, 2: 5, 3: 3 };  // dots per tier row (illustration)
  var CLAIMS = [2, 1, 3];            // tiers that claim in era 2
  var SLOTS = 4;                     // fresh addresses drawn

  var L = {
    wide: {
      w: 1000, h: 440,
      era: { x: 30, y: 40, bar: 190 }, bpsDx: 92,
      pool: { x: 30, y: 170, w: 130, h: 80 },
      clock: { x: 220, y: 110, w: 64, h: 190, trig: 0.8 }, massLab: { x: 252, y: 324, a: "middle" },
      tick: { x: 350, y: 205, r: 18 },
      burnBox: { x: 440, y: 80, w: 140, h: 44 },
      supply: { x: 612, y: 96 },
      out: { x: 440, y: 248, w: 60, h: 112 },
      claims: { x: 600, y: 280, w: 130, h: 48 },
      tiers: { x: 836, y0: 236, dy: 34, sp: 15, lab: 822 },
      addr: { x: 800, y: 392, sp: 34, lab: [990, 428, "end"] },
      phase: { x: 30, y: 428 },
      p: {
        fee: [[160, 210], [218, 210]],
        drain: [[284, 205], [330, 205]],
        burn: [[368, 205], [400, 205], [400, 102], [438, 102]],
        pay: [[368, 205], [400, 205], [400, 304], [438, 304]],
        adv: [[500, 304], [598, 304]],
        sweep: [[665, 280], [665, 160], [510, 160], [510, 126]],
      },
      proof: function (row) { var y = this.tiers.y0 + row * this.tiers.dy; return [[this.tiers.lab - 52, y], [760, y], [760, 304], [732, 304]]; },
      payout: function (i) { var x = this.addr.x + i * this.addr.sp + 9; return [[665, 328], [665, 372], [x, 372], [x, 383]]; },
      armBurn: [404, 150, "start"], armPay: [404, 276, "start"],
      outLab: [470, 240, "middle"], advLab: [549, 296, "middle"],
    },
    narrow: {
      w: 420, h: 780,
      era: { x: 16, y: 34, bar: 170 }, bpsDx: 80,
      pool: { x: 16, y: 100, w: 120, h: 66 },
      clock: { x: 182, y: 100, w: 54, h: 140, trig: 0.8 }, massLab: { x: 176, y: 236, a: "end" },
      tick: { x: 306, y: 160, r: 16 },
      burnBox: { x: 236, y: 300, w: 140, h: 40 },
      supply: { x: 236, y: 364 },
      out: { x: 123, y: 290, w: 54, h: 90 },
      claims: { x: 70, y: 430, w: 160, h: 46 },
      tiers: { x: 104, y0: 528, dy: 32, sp: 13, lab: 92 },
      addr: { x: 104, y: 660, sp: 34, lab: [104, 698, "start"] },
      phase: { x: 16, y: 738 },
      p: {
        fee: [[136, 133], [180, 133]],
        drain: [[236, 160], [288, 160]],
        burn: [[306, 176], [306, 298]],
        pay: [[306, 176], [306, 260], [150, 260], [150, 288]],
        adv: [[150, 380], [150, 428]],
        sweep: [[230, 453], [396, 453], [396, 320], [378, 320]],
      },
      proof: function (row) { var y = this.tiers.y0 + row * this.tiers.dy; var x = this.tiers.x + MEMBERS[TIERS[row]] * this.tiers.sp + 4; return [[x, y], [262, y], [262, 466], [232, 466]]; },
      payout: function (i) { var x = this.addr.x + i * this.addr.sp + 9; return [[90, 476], [90, 498], [40, 498], [40, 636], [x, 636], [x, 649]]; },
      armBurn: [312, 230, "start"], armPay: [230, 252, "middle"],
      outLab: [115, 304, "end"], advLab: [158, 408, "start"],
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
    G.svg = el("svg", { viewBox: "0 0 " + lay.w + " " + lay.h, role: "img", "aria-label": "creator fees fill the clock; a tick burns the era's share and sells the rest for USDC; advance moves the era's USDC to the claims pool; holders claim with a proof for their tier and are paid at fresh addresses; the unclaimed rest is burned; each era halves the burn share" }, host);
    host.appendChild(G.svg);
    var defs = el("defs", {});
    ["ink", "burn", "pay"].forEach(function (c) {
      var m = el("marker", { id: "hero-ar-" + c, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0,0.5 L7,4 L0,7.5", class: "hr-arrow " + c }, m);
    });

    // pipes
    var P = lay.p;
    G.pipes = {};
    [["fee", "ink"], ["drain", "ink"], ["burn", "burn"], ["pay", "pay"], ["adv", "pay"], ["sweep", "burn"]].forEach(function (d) {
      G.pipes[d[0]] = el("polyline", { points: poly(P[d[0]]), class: "hr-pipe " + d[1], "marker-end": "url(#hero-ar-" + d[1] + ")" });
    });
    G.pipes.sweep.classList.add("off");

    // era plate
    var E = lay.era;
    G.era = el("text", { x: E.x, y: E.y, class: "hr-era" }, null, "era 0");
    G.bps = el("text", { x: E.x + lay.bpsDx, y: E.y, class: "hr-sub" }, null, "burn_bps 10000");
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
    G.tradeY = po.y + po.h - 14;

    // clock vessel
    var c = lay.clock, trigY = c.y + c.h * (1 - c.trig);
    var clip = el("clipPath", { id: "hero-clip" }, defs);
    el("rect", { x: c.x, y: c.y, width: c.w, height: c.h }, clip);
    G.fill = el("rect", { x: c.x, y: c.y + c.h, width: c.w, height: 0, class: "hr-fill", "clip-path": "url(#hero-clip)" });
    el("rect", { x: c.x, y: c.y, width: c.w, height: c.h, class: "hr-vessel" });
    G.trig = el("line", { x1: c.x - 6, x2: c.x + c.w + 6, y1: trigY, y2: trigY, class: "hr-trig" });
    el("text", { x: c.x + c.w / 2, y: c.y - 10, class: "hr-lab", "text-anchor": "middle" }, null, "the clock");
    el("text", { x: c.x + c.w + 8, y: trigY - 5, class: "hr-sub burn" }, null, "0.15 SOL");
    G.mass = el("text", { x: lay.massLab.x, y: lay.massLab.y, class: "hr-num", "text-anchor": lay.massLab.a }, null, "0.000");
    G.clockGeom = { top: c.y, h: c.h, trig: c.trig };

    // tick node
    var t = lay.tick;
    G.tick = el("circle", { cx: t.x, cy: t.y, r: t.r, class: "hr-tick" });
    G.tickN = el("text", { x: t.x, y: t.y + 4, class: "hr-num", "text-anchor": "middle" }, null, "—");
    el("text", { x: t.x, y: t.y - t.r - 8, class: "hr-lab", "text-anchor": "middle" }, null, "tick");
    el("text", { x: lay.armBurn[0], y: lay.armBurn[1], class: "hr-sub burn", "text-anchor": lay.armBurn[2] }, null, "burn arm");
    el("text", { x: lay.armPay[0], y: lay.armPay[1], class: "hr-sub pay", "text-anchor": lay.armPay[2] }, null, "payout arm");

    // burn box + supply
    var b = lay.burnBox;
    G.burnBox = el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, class: "hr-box burn" });
    el("text", { x: b.x + b.w / 2, y: b.y + b.h / 2 + 4.5, class: "hr-lab burn", "text-anchor": "middle" }, null, "buy + burn");
    el("text", { x: lay.supply.x, y: lay.supply.y, class: "hr-sub" }, null, "supply");
    G.supply = el("text", { x: lay.supply.x, y: lay.supply.y + 20, class: "hr-num big" }, null, "1,000,000,000");

    // outbound vessel (usdc, this era)
    var o = lay.out;
    var clip2 = el("clipPath", { id: "hero-clip-out" }, defs);
    el("rect", { x: o.x, y: o.y, width: o.w, height: o.h }, clip2);
    G.outFill = el("rect", { x: o.x, y: o.y + o.h, width: o.w, height: 0, class: "hr-outfill", "clip-path": "url(#hero-clip-out)" });
    el("rect", { x: o.x, y: o.y, width: o.w, height: o.h, class: "hr-vessel pay" });
    el("text", { x: lay.outLab[0], y: lay.outLab[1], class: "hr-sub pay", "text-anchor": lay.outLab[2] }, null, "outbound · usdc");
    el("text", { x: lay.advLab[0], y: lay.advLab[1], class: "hr-sub", "text-anchor": lay.advLab[2] }, null, "advance");

    // claims pool
    var cl = lay.claims;
    G.claimsBox = el("rect", { x: cl.x, y: cl.y, width: cl.w, height: cl.h, class: "hr-box pay" });
    el("text", { x: cl.x + cl.w / 2, y: cl.y + 20, class: "hr-lab pay", "text-anchor": "middle" }, null, "claims pool");
    G.round = el("text", { x: cl.x + cl.w / 2, y: cl.y + 37, class: "hr-sub", "text-anchor": "middle" }, null, "no round yet");
    G.verdict = el("text", { x: cl.x + cl.w / 2, y: cl.y - 8, class: "hr-sub pay", "text-anchor": "middle" }, null, "");

    // tier trees: one row of members per tier
    var tr = lay.tiers;
    G.rows = {};
    TIERS.forEach(function (tier, row) {
      var y = tr.y0 + row * tr.dy;
      el("text", { x: tr.lab, y: y + 4, class: "hr-sub", "text-anchor": "end" }, null, "tier " + tier);
      var dots = [];
      for (var i = 0; i < MEMBERS[tier]; i++) dots.push(el("circle", { cx: tr.x + i * tr.sp, cy: y, r: 4.2, class: "hr-dot" }));
      G.rows[tier] = { dots: dots, row: row };
    });

    // fresh addresses
    var ad = lay.addr;
    G.slots = [];
    for (var s = 0; s < SLOTS; s++) G.slots.push(el("rect", { x: ad.x + s * ad.sp, y: ad.y - 9, width: 18, height: 18, rx: 2, class: "hr-addr" }));
    el("text", { x: ad.lab[0], y: ad.lab[1], class: "hr-sub", "text-anchor": ad.lab[2] }, null, "fresh addresses · no handle attached");

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
  }
  function setMass(v) {
    var g = G.clockGeom, hgt = Math.min(g.h, (v / TRIGGER) * g.h * g.trig);
    G.fill.setAttribute("y", g.top + g.h - hgt);
    G.fill.setAttribute("height", hgt);
    G.mass.textContent = v.toFixed(3);
  }
  function setOut(frac) {
    var o = lay.out, hgt = Math.max(0, Math.min(1, frac)) * o.h;
    G.outFill.setAttribute("y", o.y + o.h - hgt);
    G.outFill.setAttribute("height", hgt);
  }
  function setSupply(v) { G.supply.textContent = Math.round(v).toLocaleString("en-US"); }
  function setRegistered(on) {
    TIERS.forEach(function (t) { G.rows[t].dots.forEach(function (d) { d.classList.toggle("reg", on); }); });
  }
  function flash(node, cls, ms, run) {
    node.classList.add(cls);
    var id = setTimeout(function () { node.classList.remove(cls); }, ms);
    if (run) run.timers.push(id);
  }
  // long captions wrap onto two lines on the narrow plate
  function phase(s) {
    G.phase.textContent = "";
    var parts = [s];
    if (lay === L.narrow && s.length > 52) {
      var cut = s.lastIndexOf(" · ", Math.ceil(s.length / 2) + 8);
      if (cut < 10) cut = s.lastIndexOf(" ", 52);
      parts = [s.slice(0, cut), s.slice(cut).replace(/^ · | /, "")];
    }
    parts.forEach(function (t, i) { el("tspan", { x: lay.phase.x, dy: i ? 16 : 0 }, G.phase, t); });
  }

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
    run.timers.push(setTimeout(function () { bar.remove(); }, 700));
  }

  /* ── one tick in era e ── */
  async function tick(run, e, n) {
    var bps = EH.chain.burnBps(e), nBurn = Math.round((SLICE * bps) / 10000), nPay = SLICE - nBurn;

    phase("pool trades → creator fees → the clock");
    var mass = 0, fees = [0.021, 0.028, 0.019, 0.034, 0.026, 0.031];
    await Promise.all(fees.map(function (f, i) {
      return run.wait(i * 160).then(function () { trade(run); return travel(run, lay.p.fee, 460, "ink"); })
        .then(function () { var from = mass; mass += f; return tween(run, 200, function (k) { setMass(from + (mass - from) * k); }); });
    }));

    phase("unticked balance >= 0.15 SOL · tick fires");
    flash(G.trig, "hot", 700, run);
    G.tickN.textContent = "#" + n;
    flash(G.tick, "hot", 900, run);
    await run.wait(420);

    phase(nPay ? "era " + e + " split · burn " + bps / 100 + "% / sell " + (100 - bps / 100) + "% for usdc" : "era 0 · everything bought is burned");
    var start = mass;
    var drain = tween(run, 700, function (k) { setMass(start * (1 - k)); });
    var per = (BURNED_PER_TICK * bps) / 10000 / Math.max(1, nBurn);
    var flows = [];
    for (var i = 0; i < SLICE; i++) {
      (function (i) {
        var toBurn = i < nBurn;
        flows.push(run.wait(i * 70).then(function () { return travel(run, lay.p.drain, 300, "ink"); }).then(function () {
          if (toBurn) {
            return travel(run, lay.p.burn, 600, "burn").then(function () {
              flash(G.burnBox, "hot", 260, run);
              st.supply -= per; setSupply(st.supply); flash(G.supply, "hot", 260, run);
            });
          }
          return travel(run, lay.p.pay, 600, "pay").then(function () { st.out += 1 / SLICE; setOut(st.out); });
        }));
      })(i);
    }
    await Promise.all(flows.concat([drain]));
    setMass(0);
  }

  async function advance(run, from) {
    var bps = EH.chain.burnBps(from), W = lay.era.bar - 2;
    phase(st.out > 0 ? "4 weeks · advance · burn share halves · outbound → claims pool" : "4 weeks · advance · burn share halves · nothing in outbound yet");
    flash(G.era, "hot", 900, run);
    var halve = tween(run, 800, function (q) { G.splitBurn.setAttribute("width", (W * bps * (1 - q / 2)) / 10000); });
    var moves = [];
    if (st.out > 0) {
      var o0 = st.out;
      for (var i = 0; i < 4; i++) moves.push(run.wait(i * 110).then(function () { return travel(run, lay.p.adv, 420, "pay"); }));
      moves.push(tween(run, 700, function (k) { setOut(o0 * (1 - k)); }));
      st.out = 0;
      moves.push(run.wait(560).then(function () { flash(G.claimsBox, "hot", 500, run); G.round.textContent = "round " + from + " · open next era"; }));
    }
    await Promise.all(moves.concat([halve]));
    setEra(from + 1);
    await run.wait(300);
  }

  async function register(run, e) {
    phase("era " + e + " · holders with a commitment register into their tier's tree");
    for (var r = 0; r < TIERS.length; r++) {
      var dots = G.rows[TIERS[r]].dots;
      for (var i = 0; i < dots.length; i++) { dots[i].classList.add("reg"); await run.wait(45); }
    }
    await run.wait(250);
  }

  async function claims(run) {
    G.round.textContent = "round 1 · claims open";
    for (var k = 0; k < CLAIMS.length; k++) {
      var tier = CLAIMS[k], row = G.rows[tier];
      phase("a proof says: some holder of tier " + tier + " · not which one");
      row.dots.forEach(function (d) { flash(d, "hot", 900, run); });
      await run.wait(300);
      await travel(run, lay.proof(row.row), 620, "ink");
      G.verdict.textContent = "proof ✓ · nullifier new";
      flash(G.claimsBox, "hot", 380, run);
      await run.wait(200);
      phase("tier " + tier + " amount → a fresh address");
      await travel(run, lay.payout(k), 560, "pay");
      G.slots[k].classList.add("got");
      G.verdict.textContent = "";
      await run.wait(220);
    }
  }

  async function sweep(run) {
    phase("window ends at the next advance · the unclaimed rest is sold and burned");
    G.round.textContent = "round 1 · sweeping";
    G.pipes.sweep.classList.remove("off");
    var per = BURNED_PER_TICK * 0.25;
    for (var i = 0; i < 3; i++) {
      await travel(run, lay.p.sweep, 520, "burn");
      flash(G.burnBox, "hot", 260, run);
      st.supply -= per; setSupply(st.supply); flash(G.supply, "hot", 260, run);
    }
    G.round.textContent = "round 1 · closed";
  }

  function reset() {
    build();
    st = { supply: SUPPLY0, out: 0 };
    setEra(0); setMass(0); setOut(0); setSupply(SUPPLY0); setRegistered(false);
    phase("creator fees → the clock → tick → burn arm / payout arm → claims");
  }
  function final() {
    build();
    st = { supply: SUPPLY0 - BURNED_PER_TICK * 2.5, out: 6 / SLICE };
    setEra(2); setMass(0); setOut(st.out); setSupply(st.supply); setRegistered(true);
    G.pipes.sweep.classList.remove("off");
    for (var i = 0; i < CLAIMS.length; i++) G.slots[i].classList.add("got");
    G.round.textContent = "round 1 · closed";
    G.tickN.textContent = "#2";
    phase("each era halves the burn · a claim names a tier, not a holder · unclaimed burns");
  }

  EH.explain(fig, {
    threshold: 0.2,
    reset: reset,
    final: final,
    seq: async function (run) {
      await run.wait(500);
      await tick(run, 0, 0);
      await advance(run, 0);
      await register(run, 1);
      await tick(run, 1, 1);
      await advance(run, 1);
      await tick(run, 2, 2);
      await claims(run);
      await sweep(run);
      phase("each era halves the burn · a claim names a tier, not a holder · unclaimed burns");
    },
  });

  var mode = lay;
  window.addEventListener("resize", function () {
    var want = window.matchMedia("(max-width: 700px)").matches ? L.narrow : L.wide;
    if (want !== mode) { mode = want; final(); }
  });
})();
