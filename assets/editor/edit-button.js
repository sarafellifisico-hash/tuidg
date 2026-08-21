(function () {
  "use strict";

  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL("assets/editor/edit-button.js", location.href);
  const editorBase = new URL("./", scriptUrl);
  const query = new URLSearchParams(location.search);

  if (query.get("edit") === "1") {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("visual-editor.css", editorBase).href;
    stylesheet.dataset.tuidgEditorUi = "true";
    document.head.appendChild(stylesheet);

    const editor = document.createElement("script");
    editor.src = new URL("visual-editor.js", editorBase).href;
    editor.defer = true;
    editor.dataset.tuidgEditorUi = "true";
    document.body.appendChild(editor);
    return;
  }

  const editUrl = new URL(location.href);
  editUrl.searchParams.set("edit", "1");

  const button = document.createElement("a");
  button.className = "site-edit-button";
  button.href = editUrl.href;
  button.setAttribute("aria-label", "Editar esta página visualmente");
  button.setAttribute("title", "Editar esta página");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.69 3.06a2.36 2.36 0 0 1 3.34 3.34L8.62 19.81 3 21l1.19-5.62L17.6 1.97l1.09 1.09ZM5.9 16.44l-.47 2.13 2.13-.47L18.9 6.76l-1.66-1.66L5.9 16.44Z"/>
    </svg>
    <span>Editar esta página</span>`;
  document.body.appendChild(button);
})();
