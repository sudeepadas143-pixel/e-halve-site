/* ticks — the full tick log, newest first, and the newest tick as a receipt. */
(function () {
  "use strict";
  var EH = window.EH, f = EH.fmt;
  var T = window.ZHALVE_TICKS;
  if (!T) return;
  var ix = {}; T.cols.forEach(function (c, i) { ix[c] = i; });
  var get = function (r, c) { return r[ix[c]]; };

  /* ── table ── */
  var COLS = [
    ["tick index", "i", function (v) { return "#" + v; }, "k"],
    ["slot", "slot", function (v) { return f.n(v); }],
    ["era", "era", String],
    ["reserve_before", "reserve_before", function (v) { return f.n(v, 6); }],
    ["reserve_after", "reserve_after", function (v) { return f.n(v, 6); }],
    ["delta", "delta", function (v) { return f.n(v, 6); }],
    ["mass_before", "mass_before", function (v) { return f.n(v, 6); }],
    ["mass_after", "mass_after", function (v) { return f.n(v, 6); }],
    ["buy_sol", "buy_sol", function (v) { return f.n(v, 6); }],
    ["burned_tokens", "burned_tokens", function (v) { return f.n(v, 2); }],
    ["sol_usd", "sol_usd", function (v) { return f.n(v, 4); }],
    ["spill_sol", "spill_sol", function (v) { return f.n(v, 6); }],
    ["spill_usd", "spill_usd", function (v) { return f.n(v, 2); }],
    ["spill_bps", "spill_bps", String],
    ["window", "window", String],
    ["cursor_before", "cursor_before", function (v) { return f.n(v); }],
    ["cursor_after", "cursor_after", function (v) { return f.n(v); }],
    ["roster_len", "roster_len", function (v) { return f.n(v); }],
    ["roster_root", "roster_root", function (v) { return f.hash(v, 6, 4); }, "l"],
  ];
  var wrap = document.querySelector("[data-ticks]");
  var thead = wrap.querySelector("thead"), tbody = wrap.querySelector("tbody");
  var more = document.querySelector("[data-more]");
  var count = document.querySelector("[data-ticks-count]");
  var shown = 0, PAGE = 25;

  thead.innerHTML = "<tr>" + COLS.map(function (c) {
    return '<th class="' + (c[3] === "k" ? "k" : c[3] === "l" ? "" : "num") + '">' + c[0] + "</th>";
  }).join("") + "</tr>";

  function page() {
    var html = "";
    T.rows.slice(shown, shown + PAGE).forEach(function (r) {
      html += "<tr>" + COLS.map(function (c) {
        var v = get(r, c[1]);
        var zero = v === 0 && c[1] !== "era" && c[1] !== "cursor_before" && c[1] !== "cursor_after";
        var cls = c[3] === "k" ? "k" : c[3] === "l" ? "" : "num";
        return '<td class="' + cls + (zero ? " dim" : "") + '">' + c[2](v) + "</td>";
      }).join("") + "</tr>";
    });
    tbody.insertAdjacentHTML("beforeend", html);
    shown = Math.min(T.rows.length, shown + PAGE);
    count.textContent = "showing " + f.n(shown) + " of " + f.n(T.rows.length) + " ticks · newest first";
    more.hidden = shown >= T.rows.length;
  }
  more.addEventListener("click", page);
  page();

  /* ── receipt: the newest tick, in the order the instruction writes it ── */
  var fig = document.getElementById("fig-receipt");
  if (!fig) return;
  var box = fig.querySelector("[data-receipt]");
  var r = T.rows[0];
  var g = function (c) { return get(r, c); };
  var lines = [
    ["tick", "<b>#" + g("i") + "</b> · era " + g("era") + " · slot " + f.n(g("slot"))],
    ["trigger", "reserve_before " + f.sol(g("reserve_before")) + " → reserve_after " + f.sol(g("reserve_after")) +
      ' · delta <b>' + f.sol(g("delta")) + '</b> <span class="ok">&gt;= 0.15</span>'],
    ["mass_before", f.sol(g("mass_before")) + " SOL"],
    ['<span class="burn">burn arm</span>', '<span class="burn">buy_sol ' + f.sol(g("buy_sol")) + " → burned_tokens <b>" + f.n(g("burned_tokens"), 6) + "</b></span>"],
    ["sol_usd", f.n(g("sol_usd"), 6) + " · pyth, this instruction"],
    ['<span class="pay">payout arm</span>', '<span class="pay">spill_sol ' + f.sol(g("spill_sol")) + " → spill_usd <b>" + f.n(g("spill_usd"), 2) + "</b> · spill_bps " + g("spill_bps") + "</span>"],
    ["window", g("window") + " · cursor_before " + f.n(g("cursor_before")) + " → cursor_after " + f.n(g("cursor_after"))],
    ["roster", "roster_len " + f.n(g("roster_len")) + " · roster_root " + f.hash(g("roster_root"), 8, 8)],
    ["mass_after", f.sol(g("mass_after")) + " SOL"],
  ];
  box.innerHTML = lines.map(function (l) { return '<div class="ln"><span>' + l[0] + "</span><span>" + l[1] + "</span></div>"; }).join("");
  var lns = box.querySelectorAll(".ln");

  EH.explain(fig, {
    threshold: 0.5,
    reset: function () { lns.forEach(function (l) { l.classList.add("off"); }); },
    final: function () { lns.forEach(function (l) { l.classList.remove("off"); }); },
    seq: async function (run) {
      await run.wait(300);
      for (var i = 0; i < lns.length; i++) { lns[i].classList.remove("off"); await run.wait(i === 1 || i === 3 || i === 5 ? 650 : 380); }
    },
  });
})();
