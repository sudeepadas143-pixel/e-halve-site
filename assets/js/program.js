/* program — copy buttons for the derived addresses. Nothing is deployed, so there is no state to read. */
(function () {
  "use strict";
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy;
      var done = function () {
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = "copy"; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { select(btn); });
      } else select(btn);
    });
  });
  function select(btn) {
    var span = btn.parentNode.querySelector("[data-addr]");
    var r = document.createRange();
    r.selectNodeContents(span);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
})();
