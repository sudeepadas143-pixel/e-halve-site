/* hand — every settle call next to the order it claims to pay. */
(function () {
  "use strict";
  var EH = window.EH, f = EH.fmt;
  var O = window.ZHALVE_ORDERS || [], SET = window.ZHALVE_SETTLES || [], S = window.ZHALVE_STATE;
  var byKey = {};
  O.forEach(function (o) { byKey[o.tick_index + ":" + o.position] = o; });

  // the check the page exists for: same handle, same amount, same tick_index and position,
  // and the order was genuinely open until this call
  function check(s) {
    var o = byKey[s.tick_index + ":" + s.position];
    var r = {
      order: o,
      handle: !!o && o.handle_hash === s.handle_hash,
      amount: !!o && o.amount === s.amount,
      tick: !!o && o.tick_index === s.tick_index,
      position: !!o && o.position === s.position,
      open: !!o && o.status === "settled" && o.settled_t === s.t,
    };
    r.ok = r.handle && r.amount && r.tick && r.position && r.open;
    return r;
  }
  var checks = SET.map(check);
  var bad = checks.filter(function (c) { return !c.ok; }).length;

  var set = function (sel, v) { var el = document.querySelector(sel); if (el) el.textContent = v; };
  set("[data-hand-wallet]", EH.ADDRESSES.hand ? f.hash(EH.ADDRESSES.hand, 4, 4) : "—");
  set("[data-hand-calls]", S ? f.n(S.totals.settles) : f.n(SET.length));
  set("[data-hand-open]", S ? f.n(S.totals.open) : "—");
  var badEl = document.querySelector("[data-hand-bad]");
  if (badEl) { badEl.textContent = String(bad); badEl.className = bad ? "bad" : "ok"; }

  /* ── fig: match check for the newest settle call ── */
  var fig = document.getElementById("fig-match");
  if (fig && SET.length) {
    var s = SET[0], c = checks[0], o = c.order;
    var rows = [
      ["handle_hash", f.hash(s.handle_hash, 8, 6), f.hash(o.handle_hash, 8, 6)],
      ["amount", f.cents(s.amount), f.cents(o.amount)],
      ["tick_index", s.tick_index, o.tick_index],
      ["position", s.position, o.position],
    ];
    var box = fig.querySelector("[data-match]");
    box.innerHTML =
      "<h3>settle call · ref " + s.payment_ref + "</h3><h3></h3><h3>matched order · pda [\"order\", " + o.tick_index + ", " + o.position + "]</h3>" +
      rows.map(function (r) {
        return '<div class="row"><div class="cell"><span>' + r[0] + "</span><span>" + r[1] + '</span></div><div class="eq off">=</div><div class="cell"><span>' + r[0] + "</span><span>" + r[2] + "</span></div></div>";
      }).join("") +
      '<div class="verdict off">' + (c.ok ? "match · order was open, now settled at slot " + f.n(s.slot) : "no match") + "</div>";
    var eqs = box.querySelectorAll(".eq"), verdict = box.querySelector(".verdict");
    EH.explain(fig, {
      threshold: 0.6,
      reset: function () { eqs.forEach(function (e) { e.classList.add("off"); }); verdict.classList.add("off"); },
      final: function () { eqs.forEach(function (e) { e.classList.remove("off"); }); verdict.classList.remove("off"); },
      seq: async function (run) {
        await run.wait(500);
        for (var i = 0; i < eqs.length; i++) { eqs[i].classList.remove("off"); await run.wait(520); }
        verdict.classList.remove("off");
        await run.wait(400);
      },
    });
  }

  /* ── settle calls ── */
  var wrap = document.querySelector("[data-settles]");
  if (wrap) {
    var th = wrap.querySelector("thead"), tb = wrap.querySelector("tbody");
    var more = document.querySelector("[data-more]");
    var cnt = document.querySelector("[data-settles-count]");
    var shown = 0, PAGE = 30;
    var mark = function (b) { return b ? '<span class="ok">=</span>' : '<span class="bad">≠</span>'; };
    th.innerHTML = '<tr><th class="k">slot</th><th>payment_ref</th><th class="num">tick_index</th><th class="num">position</th><th>handle_hash</th><th class="num">amount</th><th>handle</th><th>amount</th><th>tick</th><th>pos</th><th>match</th></tr>';
    var page = function () {
      var html = "";
      SET.slice(shown, shown + PAGE).forEach(function (s, k) {
        var c = checks[shown + k];
        html += '<tr><td class="k">' + f.n(s.slot) + "</td><td>" + s.payment_ref + '</td><td class="num">' + s.tick_index + '</td><td class="num">' + s.position +
          "</td><td>" + f.hash(s.handle_hash, 8, 6) + '</td><td class="num">' + f.cents(s.amount) + "</td><td>" + mark(c.handle) + "</td><td>" + mark(c.amount) +
          "</td><td>" + mark(c.tick) + "</td><td>" + mark(c.position) + "</td><td>" + (c.ok ? '<span class="ok">matched</span>' : '<span class="bad">unmatched</span>') + "</td></tr>";
      });
      tb.insertAdjacentHTML("beforeend", html);
      shown = Math.min(SET.length, shown + PAGE);
      cnt.textContent = "showing " + shown + " of " + SET.length + " recent settle calls · newest first";
      more.hidden = shown >= SET.length;
    };
    more.addEventListener("click", page);
    page();
  }

  /* ── backlog: open orders waiting on the hand ── */
  var bw = document.querySelector("[data-backlog]");
  if (bw) {
    var open = O.filter(function (o) { return o.status === "open"; }).sort(function (a, b) { return a.tick_t - b.tick_t || a.position - b.position; });
    bw.querySelector("thead").innerHTML = '<tr><th class="k">tick_index</th><th class="num">position</th><th>handle_hash</th><th class="num">amount</th><th>status</th><th class="num">open for</th></tr>';
    var ref = S ? S.snapshot.t : Date.now();
    bw.querySelector("tbody").innerHTML = open.map(function (o) {
      return '<tr><td class="k">' + o.tick_index + '</td><td class="num">' + o.position + "</td><td>" + f.hash(o.handle_hash, 8, 6) + '</td><td class="num">' + f.cents(o.amount) +
        '</td><td><span class="st st--open">open</span></td><td class="num">' + f.ago(ref - o.tick_t).replace(" ago", "") + "</td></tr>";
    }).join("");
    var total = open.reduce(function (a, o) { return a + o.amount; }, 0);
    document.querySelector("[data-backlog-count]").textContent = open.length + " open orders · " + f.cents(total) + " · oldest first";
  }
})();
