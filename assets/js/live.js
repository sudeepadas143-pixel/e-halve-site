/* live — reads state, renders it literally, and re-reads on an interval.
   The readout re-renders from the same source each read; anything that
   changed between reads is marked once. */
(function () {
  "use strict";
  var EH = window.EH, f = EH.fmt, chain = EH.chain;
  var READ_EVERY = 12000;
  var SUPPLY = 1e9; // pump.fun fixed supply
  var TRIGGER = 0.15;

  var slotEl = document.querySelector("[data-slot]");
  var readEl = document.querySelector("[data-read]");
  var lastRead = Date.now();
  var prev = {};

  // one read of everything the page shows. swap the body of this for rpc calls.
  function read() {
    var S = window.EHALVE_STATE;
    return Promise.resolve({
      mass: S.state.unticked_balance,
      outbound: S.outbound_usdc,
      open: S.totals.open,
      burned: S.totals.burned_tokens,
      paid: S.totals.paid_usdc,
      cursor: S.state.cursor,
      roster_len: S.state.roster_len,
      tick_count: S.state.tick_count,
      era: S.state.era,
      era_start: S.state.era_start,
      burn_bps: S.state.burn_bps,
    });
  }

  function set(key, html) {
    var el = document.querySelector('[data-val="' + key + '"]');
    if (!el) return;
    if (prev[key] !== undefined && prev[key] !== html) {
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    }
    prev[key] = html;
    el.innerHTML = html;
  }
  function gauge(pct, cls) {
    return '<span class="gauge ' + (cls || "") + '"><i data-w="' + Math.max(0, Math.min(100, pct)).toFixed(2) + '"></i></span>';
  }

  var first = true;
  function render(v) {
    var pct = (v.mass / TRIGGER) * 100;
    set("mass", f.sol(v.mass) + "<small>SOL</small>" +
      '<span class="g">' + gauge(pct) + pct.toFixed(1) + "% of " + TRIGGER + " SOL</span>");
    set("outbound", f.n(v.outbound, 6) + "<small>USDC</small>" +
      '<span class="g">' + v.open + " open</span>");
    set("burned in total", f.n(v.burned, 6) + "<small>tokens</small>" +
      '<span class="g">' + ((v.burned / SUPPLY) * 100).toFixed(4) + "% of " + f.n(SUPPLY) + "</span>");
    set("paid in total", f.n(v.paid, 6) + "<small>USDC</small>");
    set("cursor", f.n(v.cursor) + "<small>/ " + f.n(v.roster_len) + "</small>" +
      '<span class="g">window ' + chain.window(v.roster_len) + "</span>");
    set("era", String(v.era) + '<span class="g">era_start ' + f.utc(v.era_start) + "</span>");
    set("burn share", v.burn_bps + "<small>bps</small>" +
      '<span class="g">' + gauge(v.burn_bps / 100, "burn") + (v.burn_bps / 100) + "%</span>");
    document.querySelectorAll('[data-v="tick_count"]').forEach(function (el) { el.textContent = f.n(v.tick_count); });
    document.querySelectorAll('[data-v="roster_len"]').forEach(function (el) { el.textContent = f.n(v.roster_len); });
    lastRead = Date.now();
    clock();
    fill();
  }

  // the gauges fill from zero on the first read only
  function fill() {
    var gs = document.querySelectorAll(".gauge i[data-w]");
    if (first && !EH.motion.reduce) {
      first = false;
      EH.motion.begin();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { gs.forEach(function (g) { g.style.width = "calc(" + g.dataset.w + "% - 2px)"; }); });
      });
      setTimeout(EH.motion.end, 1500);
    } else {
      gs.forEach(function (g) { g.style.transition = "none"; g.style.width = "calc(" + g.dataset.w + "% - 2px)"; });
    }
  }

  // things that move with wall time: slot, read age, time until advance
  var S = window.EHALVE_STATE;
  function clock() {
    slotEl.textContent = f.n(chain.slot());
    readEl.textContent = f.ago(Date.now() - lastRead);
    var left = chain.nextEra();
    var el = document.querySelector('[data-val="next era"]');
    if (!el) return;
    var elapsed = (chain.ERA_MS - left) / chain.ERA_MS * 100;
    var at = S.state.era_start + chain.ERA_MS;
    el.innerHTML = f.dur(left) +
      '<span class="g">' + (left > 0 ? "advance callable at " + f.utc(at) : "advance callable now") + "</span>";
  }

  read().then(render);
  setInterval(clock, 1000);
  setInterval(function () { read().then(render); }, READ_EVERY);
})();
