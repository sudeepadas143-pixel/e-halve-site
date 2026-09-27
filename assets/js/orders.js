/* orders — the two ways out of open, drawn in turn; then the order table. */
(function () {
  "use strict";
  var EH = window.EH, f = EH.fmt;

  /* ── fig 1: state paths ── */
  var fig = document.getElementById("fig-states");
  if (fig) {
    var pre = fig.querySelector("[data-machine]");
    pre.textContent = [
      "    tick",
      "      |",
      "      v",
      "    open ----------------------------> settled",
      "      |          hand · settle          payment_post_id",
      "      |",
      "      +----------------------------> void",
      "                 handle unfollows        |",
      "                                         v",
      "                                       clock",
    ].join("\n");
    var A = EH.ascii(pre), L = A.lines;
    var table = document.querySelector("table.rules");
    var stepEl = fig.querySelector("[data-step]");
    var P = {
      tick: A.label("tick"),
      down: A.col(6, 1, 2),
      open: A.label("open"),
      toSettled: A.row(3, L[3].indexOf("-"), L[3].indexOf(">")),
      settled: A.label("settled"),
      hand: A.label("hand · settle"),
      post: A.label("payment_post_id"),
      down2: A.col(6, 4, 6),
      toVoid: A.row(6, 7, L[6].indexOf(">")),
      void: A.label("void"),
      unf: A.label("handle unfollows"),
      down3: A.col(L[8].indexOf("v"), 7, 8),
      clock: A.label("clock"),
    };
    ["tick", "open", "settled", "void", "clock"].forEach(function (k) { A.set(P[k], "lab"); });
    var step = function (n) { if (table) EH.caption(stepEl, EH.rows(table, n)); };
    EH.explain(fig, {
      threshold: 0.5,
      reset: function () { A.set(A.all(), "off", "pay burn dim"); stepEl.innerHTML = ""; if (table) EH.rows(table, null); },
      final: function () {
        A.set(A.all(), "", "off");
        A.set([].concat(P.toSettled, P.settled, P.hand, P.post), "pay");
        A.set([].concat(P.down2, P.toVoid, P.void, P.unf, P.down3, P.clock), "burn");
      },
      seq: async function (run) {
        step(1);
        await A.draw(P.tick, "", 30, run);
        await A.draw(P.down, "", 170, run);
        await A.draw(P.open, "", 40, run);
        // the path both branches share is drawn dim until one is taken
        A.set([].concat(P.down2), "off dim");
        await run.wait(1100);

        step(2);
        await A.draw(P.toSettled, "pay", 22, run);
        await A.draw(P.settled, "pay", 40, run);
        A.draw(P.hand, "pay", 25, run);
        await A.draw(P.post, "pay", 22, run);
        await run.wait(1500);

        step(3);
        await A.draw(P.down2, "burn", 170, run);
        A.set(P.down2, "", "dim");
        await A.draw(P.toVoid, "burn", 22, run);
        await A.draw(P.void, "burn", 40, run);
        await A.draw(P.unf, "burn", 20, run);
        await A.draw(P.down3, "burn", 170, run);
        await A.draw(P.clock, "burn", 40, run);
        await run.wait(1500);
        if (table) EH.rows(table, null);
      },
    });
  }

  /* ── table ── */
  var O = window.EHALVE_ORDERS || [];
  var wrap = document.querySelector("[data-orders]");
  if (!wrap) return;
  var thead = wrap.querySelector("thead"), tbody = wrap.querySelector("tbody");
  var more = document.querySelector("[data-more]");
  var count = document.querySelector("[data-orders-count]");
  var filter = "all", shown = 0, PAGE = 30;
  thead.innerHTML = '<tr><th class="k">tick_index</th><th class="num">position</th><th>handle_hash</th><th class="num">amount</th><th>status</th><th>payment_post_id</th></tr>';

  function list() { return filter === "all" ? O : O.filter(function (o) { return o.status === filter; }); }
  function render(reset) {
    var L = list();
    if (reset) { tbody.innerHTML = ""; shown = 0; }
    var html = "";
    L.slice(shown, shown + PAGE).forEach(function (o) {
      html += '<tr><td class="k">' + o.tick_index + '</td><td class="num">' + o.position + "</td><td>" + f.hash(o.handle_hash, 8, 6) +
        '</td><td class="num">' + f.cents(o.amount) + '</td><td><span class="st st--' + o.status + '">' + o.status + "</span></td>" +
        "<td" + (o.payment_post_id ? "" : ' class="dim"') + ">" + (o.payment_post_id || "—") + "</td></tr>";
    });
    tbody.insertAdjacentHTML("beforeend", html);
    shown = Math.min(L.length, shown + PAGE);
    var S = window.EHALVE_STATE;
    count.textContent = "showing " + shown + " of " + L.length + " orders from the last " +
      new Set(O.map(function (o) { return o.tick_index; })).size + " payout ticks" +
      (S ? " · " + f.n(S.totals.orders) + " written since genesis" : "");
    more.hidden = shown >= L.length;
  }
  document.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      render(true);
    });
  });
  more.addEventListener("click", function () { render(false); });
  render(true);
})();
