/* roster — reconcile before a tick: new follower to the back, unfollow removed,
   refollow comes back as a new entry at the back, then a new root. */
(function () {
  "use strict";
  var EH = window.EH;
  var fig = document.getElementById("fig-queue");
  if (!fig) return;
  var row = fig.querySelector("[data-queue]");
  var rootEl = fig.querySelector("[data-root]");
  var stepEl = fig.querySelector("[data-step]");
  var table = document.querySelector("table.rules");

  var START = ["a1f3", "77c0", "9e21", "c4d8", "0b5e"];
  var ROOTS = ["4f0e…91ac", "b27d…0e53", "6a19…c7f2", "d3c8…2b60"];

  function entry(h, cls) {
    var e = document.createElement("span");
    e.className = "qe " + (cls || "");
    e.dataset.h = h;
    e.textContent = h;
    return e;
  }
  function numberRow() {}
  function reset() {
    row.innerHTML = "";
    START.forEach(function (h) { row.appendChild(entry(h)); });
    numberRow();
    rootEl.textContent = ROOTS[0];
    rootEl.classList.remove("hot");
    stepEl.innerHTML = "";
    if (table) EH.rows(table, null);
  }
  function step(n) { if (table) EH.caption(stepEl, EH.rows(table, n)); }

  EH.explain(fig, {
    threshold: 0.6,
    reset: reset,
    final: function () {
      row.innerHTML = "";
      ["a1f3", "9e21", "c4d8", "0b5e", "f2a9", "77c0"].forEach(function (h) { row.appendChild(entry(h)); });
      numberRow();
      rootEl.textContent = ROOTS[3];
      if (table) EH.rows(table, null);
    },
    seq: async function (run) {
      await run.wait(700);

      // new follower: appended at the back
      step(1);
      var n = entry("f2a9", "new enter");
      row.appendChild(n); numberRow();
      await run.wait(40);
      n.classList.remove("enter");
      await run.wait(1500);

      // unfollow: entry removed
      step(2);
      var gone = row.querySelector('[data-h="77c0"]');
      gone.classList.add("leaving");
      await run.wait(900);
      gone.classList.add("gone");
      await run.wait(500);
      gone.remove(); numberRow();
      n.classList.remove("new");
      await run.wait(1100);

      // refollow: a new entry at the back, not its old place
      step(3);
      var back = entry("77c0", "new enter");
      row.appendChild(back); numberRow();
      await run.wait(40);
      back.classList.remove("enter");
      await run.wait(1600);

      // the root over the roster as it now stands
      step(4);
      for (var i = 1; i < ROOTS.length; i++) {
        rootEl.textContent = ROOTS[i];
        rootEl.classList.add("hot");
        await run.wait(260);
      }
      await run.wait(500);
      rootEl.classList.remove("hot");
      back.classList.remove("new");
      await run.wait(1200);
      EH.rows(table, null);
    },
  });
})();
