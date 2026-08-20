(function () {
  "use strict";
  const button = document.createElement("a");
  button.className = "site-edit-button";
  button.href = "https://app.pagescms.org/";
  button.target = "_blank";
  button.rel = "noreferrer";
  button.setAttribute("aria-label", "Open the authenticated visual editor");
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.69 3.06a2.36 2.36 0 0 1 3.34 3.34L8.62 19.81 3 21l1.19-5.62L17.6 1.97l1.09 1.09ZM5.9 16.44l-.47 2.13 2.13-.47L18.9 6.76l-1.66-1.66L5.9 16.44Z"/></svg><span>Edit this page</span>`;
  document.body.appendChild(button);
})();
