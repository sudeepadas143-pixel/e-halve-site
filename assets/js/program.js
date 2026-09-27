/* program — addresses and the live state block. */
(function () {
  "use strict";
  var EH = window.EH, f = EH.fmt, S = window.EHALVE_STATE;

  document.querySelectorAll("[data-addresses] tr[data-name]").forEach(function (tr) {
    var a = EH.ADDRESSES[tr.dataset.name];
    if (!a) return;
    var td = tr.querySelectorAll("td");
    td[1].textContent = a;
    td[1].classList.remove("none");
    td[2].classList.remove("dim");
    td[2].innerHTML = '<a href="' + EH.EXPLORER + a + '" target="_blank" rel="noopener">open ↗</a>';
  });

  if (!S) return;
  var v = {
    mass: f.sol(S.state.unticked_balance) + " SOL",
    outbound: f.n(S.outbound_usdc, 6) + " USDC",
    burned: f.n(S.totals.burned_tokens, 6),
    paid: f.n(S.totals.paid_usdc, 6) + " USDC",
    open: f.n(S.totals.open),
    void: f.n(S.totals.void),
    cursor: f.n(S.state.cursor) + " / " + f.n(S.state.roster_len),
    era: S.state.era + " · burn_bps " + S.state.burn_bps,
  };
  Object.keys(v).forEach(function (k) {
    var el = document.querySelector('[data-livestate] [data-val="' + k + '"]');
    if (el) el.textContent = v[k];
  });
})();
