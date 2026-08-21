(function () {
  "use strict";

  if (window.__TUIDG_VISUAL_EDITOR__) return;
  window.__TUIDG_VISUAL_EDITOR__ = true;

  const CONFIG = {
    owner: "sarafellifisico-hash",
    repo: "tuidg",
    branch: "main",
    siteBase: "/tuidg/",
    api: "https://api.github.com",
  };

  const state = {
    selected: null,
    dragged: null,
    dirty: false,
    preview: false,
    history: [],
    historyIndex: -1,
    historyTimer: 0,
    pendingMedia: new Map(),
    contentSource: null,
    contentPath: null,
    pagePath: getPagePath(),
    verifiedToken: null,
    authResolver: null,
    toastTimer: 0,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function getPagePath() {
    let path = decodeURIComponent(location.pathname);
    const baseIndex = path.indexOf(CONFIG.siteBase);
    if (baseIndex >= 0) path = path.slice(baseIndex + CONFIG.siteBase.length);
    else path = path.replace(/^\/+/, "");
    if (!path || path.endsWith("/")) path += "index.html";
    return path;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createUi() {
    document.documentElement.classList.add("tuidg-editor-active");

    document.body.insertAdjacentHTML("beforeend", `
      <div class="tuidg-editor-topbar" data-tuidg-editor-ui="true">
        <div class="tuidg-editor-brand">
          <span class="tuidg-editor-brand-mark">T</span>
          <span><strong>TUIDG — Editor visual</strong><small>${escapeHtml(state.pagePath)}</small></span>
        </div>
        <div class="tuidg-editor-topbar-group">
          <button type="button" data-action="undo" title="Desfazer (Ctrl+Z)"><span class="tuidg-editor-icon">↶</span></button>
          <button type="button" data-action="redo" title="Refazer (Ctrl+Shift+Z)"><span class="tuidg-editor-icon">↷</span></button>
        </div>
        <div class="tuidg-editor-topbar-group">
          <button type="button" class="tuidg-editor-panel-toggle" data-action="panel" title="Abrir ferramentas"><span class="tuidg-editor-icon">☰</span></button>
          <button type="button" data-action="preview" title="Visualizar como o público"><span class="tuidg-editor-icon">▣</span><span class="optional-label">Visualizar</span></button>
          <button type="button" data-action="save-draft" title="Guardar uma cópia neste computador"><span class="tuidg-editor-icon">▱</span><span class="optional-label">Rascunho</span></button>
        </div>
        <div class="tuidg-editor-topbar-spacer"></div>
        <button type="button" class="tuidg-editor-exit" data-action="exit"><span class="tuidg-editor-icon">×</span><span class="optional-label">Sair</span></button>
        <button type="button" class="tuidg-editor-publish" data-action="publish"><span class="tuidg-editor-icon">✓</span>Publicar</button>
      </div>

      <aside class="tuidg-editor-panel is-open" data-tuidg-editor-ui="true">
        <div class="tuidg-editor-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" data-tab="insert">Inserir</button>
          <button type="button" role="tab" aria-selected="false" data-tab="style">Formatar</button>
        </div>

        <div class="tuidg-editor-pane is-active" data-pane="insert">
          <h3>Blocos de conteúdo</h3>
          <div class="tuidg-editor-insert-grid">
            <button type="button" data-insert="text"><span class="tuidg-editor-icon">T</span>Caixa de texto</button>
            <button type="button" data-insert="heading"><span class="tuidg-editor-icon">H</span>Título</button>
            <button type="button" data-insert="image"><span class="tuidg-editor-icon">▧</span>Imagem</button>
            <button type="button" data-insert="video"><span class="tuidg-editor-icon">▶</span>Vídeo</button>
            <button type="button" data-insert="section"><span class="tuidg-editor-icon">▤</span>Seção</button>
            <button type="button" data-insert="button"><span class="tuidg-editor-icon">▭</span>Botão</button>
            <button type="button" data-insert="divider"><span class="tuidg-editor-icon">—</span>Divisor</button>
            <button type="button" data-insert="spacer"><span class="tuidg-editor-icon">↕</span>Espaçador</button>
          </div>
          <div class="tuidg-editor-help">
            <strong>Como editar</strong><br>
            Clique em qualquer item para selecioná-lo. Dê dois cliques em um texto para escrever. Arraste o item selecionado para mudar sua ordem e use a bolinha azul para redimensionar.
          </div>
          <input type="file" hidden accept="image/*,.gif" data-image-picker>
        </div>

        <div class="tuidg-editor-pane" data-pane="style">
          <div class="tuidg-editor-selected-name" data-selected-name>Nenhum item selecionado.</div>

          <div class="tuidg-editor-field">
            <label>Alinhamento</label>
            <div class="tuidg-editor-segmented">
              <button type="button" data-align="left" title="Esquerda">≡</button>
              <button type="button" data-align="center" title="Centro">≣</button>
              <button type="button" data-align="right" title="Direita">≡</button>
              <button type="button" data-align="justify" title="Justificar">☰</button>
            </div>
          </div>

          <div class="tuidg-editor-field">
            <label><span>Tamanho do texto</span><span data-font-value>—</span></label>
            <input type="range" min="9" max="96" step="1" value="16" data-style="fontSize">
          </div>

          <div class="tuidg-editor-field">
            <label><span>Largura do item</span><span data-width-value>—</span></label>
            <input type="range" min="15" max="100" step="1" value="100" data-style="width">
          </div>

          <div class="tuidg-editor-field">
            <label>Cor do texto</label>
            <div class="tuidg-editor-color-row">
              <input type="color" value="#202124" data-color="color">
              <input type="text" value="#202124" data-color-text="color">
              <button type="button" data-clear-style="color" title="Voltar à cor original">×</button>
            </div>
          </div>

          <div class="tuidg-editor-field">
            <label>Cor de fundo</label>
            <div class="tuidg-editor-color-row">
              <input type="color" value="#ffffff" data-color="backgroundColor">
              <input type="text" value="#ffffff" data-color-text="backgroundColor">
              <button type="button" data-clear-style="backgroundColor" title="Remover o fundo">×</button>
            </div>
          </div>

          <div class="tuidg-editor-field" data-link-field hidden>
            <label>Endereço do link</label>
            <input type="url" placeholder="https://..." data-style="href">
          </div>

          <button type="button" class="tuidg-editor-danger" data-action="delete">Excluir item selecionado</button>
        </div>
      </aside>

      <div class="tuidg-editor-float" data-tuidg-editor-ui="true">
        <button type="button" data-action="edit-text" title="Editar texto">✎</button>
        <button type="button" data-action="bold" title="Negrito"><b>B</b></button>
        <button type="button" data-action="italic" title="Itálico"><i>I</i></button>
        <button type="button" class="tuidg-editor-drag-handle" data-action="drag-help" title="Arrastar para mudar de lugar">↕</button>
        <button type="button" data-action="move-up" title="Mover para cima">↑</button>
        <button type="button" data-action="move-down" title="Mover para baixo">↓</button>
        <button type="button" data-action="duplicate" title="Duplicar">▣</button>
        <button type="button" data-action="delete" title="Excluir">⌫</button>
      </div>
      <div class="tuidg-editor-selection-label" data-tuidg-editor-ui="true"></div>
      <div class="tuidg-editor-resize-handle" data-tuidg-editor-ui="true" title="Arraste para redimensionar"></div>

      <div class="tuidg-editor-modal" data-tuidg-editor-ui="true">
        <div class="tuidg-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="tuidg-auth-title">
          <h2 id="tuidg-auth-title">Conectar ao seu GitHub</h2>
          <p>Esta conexão garante que somente você consiga publicar. O código de acesso pode ser limitado exclusivamente ao repositório TUIDG.</p>
          <ol>
            <li>Clique em <strong>Criar acesso</strong> e escolha somente o repositório <strong>tuidg</strong>.</li>
            <li>Em <strong>Contents</strong>, selecione <strong>Read and write</strong> e gere o código.</li>
            <li>Cole o código abaixo. Você só precisa fazer isso uma vez neste computador.</li>
          </ol>
          <p><a href="https://github.com/settings/personal-access-tokens/new?name=TUIDG%20Visual%20Editor&description=Publicar%20altera%C3%A7%C3%B5es%20visuais%20no%20site%20TUIDG&target_name=sarafellifisico-hash&expires_in=365&contents=write" target="_blank" rel="noreferrer">Criar acesso seguro no GitHub ↗</a></p>
          <div class="tuidg-editor-field">
            <label>Código de acesso</label>
            <input type="password" autocomplete="off" placeholder="github_pat_..." data-auth-token>
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#5f6368">
            <input type="checkbox" checked data-auth-remember> Lembrar somente neste computador
          </label>
          <div class="tuidg-editor-auth-status" data-auth-status></div>
          <div class="tuidg-editor-dialog-actions">
            <button type="button" class="secondary" data-auth-cancel>Cancelar</button>
            <button type="button" class="primary" data-auth-connect>Conectar e publicar</button>
          </div>
        </div>
      </div>

      <div class="tuidg-editor-welcome" data-tuidg-editor-ui="true">
        <div class="tuidg-editor-dialog">
          <h2>Agora você edita a própria página</h2>
          <p>Este modo foi criado para funcionar de maneira parecida com o Google Sites, sem abrir HTML.</p>
          <div class="tuidg-editor-welcome-grid">
            <div class="tuidg-editor-welcome-card"><b>1</b><strong>Clique</strong><p>Selecione texto, imagem, vídeo, seção ou botão diretamente na página.</p></div>
            <div class="tuidg-editor-welcome-card"><b>2</b><strong>Modifique</strong><p>Escreva, arraste, redimensione e altere cores pelo painel lateral.</p></div>
            <div class="tuidg-editor-welcome-card"><b>3</b><strong>Publique</strong><p>O GitHub registra cada versão e o site público é atualizado.</p></div>
          </div>
          <div class="tuidg-editor-dialog-actions">
            <button type="button" class="primary" data-welcome-close>Começar a editar</button>
          </div>
        </div>
      </div>

      <div class="tuidg-editor-toast" data-tuidg-editor-ui="true" role="status"></div>
    `);
  }

  function bindUi() {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDoubleClick, true);
    document.addEventListener("input", handleDocumentInput, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("dragend", handleDragEnd, true);
    document.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("scroll", updateSelectionUi, { passive: true });
    window.addEventListener("resize", updateSelectionUi);
    window.addEventListener("beforeunload", handleBeforeUnload);

    $$('[data-tab]').forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
    $$('[data-insert]').forEach((button) => button.addEventListener("click", () => insertContent(button.dataset.insert)));
    $$('[data-align]').forEach((button) => button.addEventListener("click", () => applyStyle("textAlign", button.dataset.align)));
    $$('[data-style="fontSize"]').forEach((input) => input.addEventListener("input", () => applyStyle("fontSize", `${input.value}px`, false)));
    $$('[data-style="width"]').forEach((input) => input.addEventListener("input", () => applyWidth(Number(input.value), false)));
    $$('[data-color]').forEach((input) => input.addEventListener("input", () => {
      const property = input.dataset.color;
      const textInput = $(`[data-color-text="${property}"]`);
      if (textInput) textInput.value = input.value;
      applyStyle(property, input.value, false);
    }));
    $$('[data-color-text]').forEach((input) => input.addEventListener("change", () => applyStyle(input.dataset.colorText, input.value)));
    $$('[data-clear-style]').forEach((button) => button.addEventListener("click", () => applyStyle(button.dataset.clearStyle, "")));
    const hrefInput = $('[data-style="href"]');
    if (hrefInput) hrefInput.addEventListener("change", () => {
      if (state.selected && state.selected.matches("a")) {
        state.selected.setAttribute("href", hrefInput.value || "#");
        markDirty();
        pushHistory();
      }
    });

    const imagePicker = $("[data-image-picker]");
    if (imagePicker) imagePicker.addEventListener("change", handleImageFile);

    const resizeHandle = $(".tuidg-editor-resize-handle");
    if (resizeHandle) resizeHandle.addEventListener("pointerdown", beginResize);

    $("[data-auth-cancel]").addEventListener("click", cancelAuth);
    $("[data-auth-connect]").addEventListener("click", connectFromModal);
    $("[data-welcome-close]").addEventListener("click", closeWelcome);
  }

  function handleClick(event) {
    const ui = event.target.closest("[data-tuidg-editor-ui]");
    if (ui) {
      const action = event.target.closest("[data-action]");
      if (action) {
        event.preventDefault();
        runAction(action.dataset.action);
      }
      return;
    }

    if (state.preview) return;
    const target = event.target.closest(".tuidg-editable");
    if (!target) return;
    if (target.matches("a") || target.closest("a")) event.preventDefault();
    event.stopPropagation();
    selectElement(target);
  }

  function handleDoubleClick(event) {
    if (state.preview || event.target.closest("[data-tuidg-editor-ui]")) return;
    const target = event.target.closest(".tuidg-editable");
    if (target && isTextElement(target)) {
      event.preventDefault();
      event.stopPropagation();
      selectElement(target);
      startTextEditing(target);
    }
  }

  function handleDocumentInput(event) {
    if (event.target.closest("[data-tuidg-editor-ui]")) return;
    if (event.target.isContentEditable) {
      markDirty();
      window.clearTimeout(state.historyTimer);
      state.historyTimer = window.setTimeout(pushHistory, 650);
    }
  }

  function handleKeydown(event) {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      publish();
      return;
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if (event.key === "Escape") {
      if (state.preview) togglePreview();
      else finishTextEditing();
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && state.selected && !event.target.isContentEditable && !event.target.closest("[data-tuidg-editor-ui]")) {
      event.preventDefault();
      deleteSelected();
    }
  }

  function handleBeforeUnload(event) {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function markEditable() {
    $$(".tuidg-editable").forEach((element) => {
      element.classList.remove("tuidg-editable", "tuidg-selected", "tuidg-text-editing");
      element.removeAttribute("data-tuidg-editable");
      element.removeAttribute("draggable");
      element.removeAttribute("contenteditable");
    });

    const selectors = [
      "main > section",
      "main > header",
      "main > footer",
      ".reader-article > h1",
      ".reader-article > .article-deck",
      ".reader-article > .concise-section",
      ".full-text-content > .prose-section",
      ".reader-article h2",
      ".reader-article h3",
      ".reader-article p",
      ".reader-article blockquote",
      ".chapter-grid > a",
      ".chapter-grid > a h3",
      ".chapter-grid > a p",
      ".axiom-list > article",
      ".axiom-list > article h3",
      ".axiom-list > article p",
      ".hero-copy > *:not(.hero-actions):not(.hero-meta)",
      ".hero-actions a",
      ".hero-builder-info h2",
      ".hero-builder-info .builder-description",
      ".statement h2",
      ".statement .cms-body",
      ".principles .section-heading > *",
      ".author h2",
      ".author .cms-author-body",
      ".author a",
      ".site-header a",
      "main figure",
      "main img",
      "main video",
      "main iframe",
      "main hr",
      "main .tuidg-user-block",
      "main .tuidg-user-block h1",
      "main .tuidg-user-block h2",
      "main .tuidg-user-block h3",
      "main .tuidg-user-block p",
      "main .tuidg-user-block figcaption",
      "footer > p",
      "footer a",
    ];

    $$(selectors.join(",")).forEach((element) => {
      if (element.closest("[data-tuidg-editor-ui]")) return;
      element.classList.add("tuidg-editable");
      element.dataset.tuidgEditable = "true";
    });
  }

  function isTextElement(element) {
    if (!element) return false;
    if (element.matches("h1,h2,h3,h4,h5,h6,p,blockquote,figcaption,li,dt,dd,a")) return true;
    return element.matches(".cms-body,.cms-author-body,.builder-description,.article-deck");
  }

  function friendlyName(element) {
    if (!element) return "Nenhum item selecionado.";
    if (element.matches("h1,h2,h3,h4,h5,h6")) return "Título";
    if (element.matches("p,.cms-body,.cms-author-body,.builder-description,.article-deck")) return "Texto";
    if (element.matches("img,figure,.tuidg-user-image")) return "Imagem";
    if (element.matches("video,iframe,.tuidg-user-video")) return "Vídeo ou incorporação";
    if (element.matches("section,.tuidg-user-section")) return "Seção";
    if (element.matches("a,.button,.tuidg-user-button")) return "Link ou botão";
    if (element.matches("hr,.tuidg-user-divider")) return "Divisor";
    return element.tagName.toLowerCase();
  }

  function selectElement(element) {
    if (!element || element.closest("[data-tuidg-editor-ui]")) return;
    finishTextEditing();
    if (state.selected) {
      state.selected.classList.remove("tuidg-selected");
      state.selected.removeAttribute("draggable");
    }
    state.selected = element;
    element.classList.add("tuidg-selected");
    element.setAttribute("draggable", "true");
    syncStylePanel();
    updateSelectionUi();
  }

  function startTextEditing(element = state.selected) {
    if (!element || !isTextElement(element)) {
      toast("Selecione um texto para escrever.");
      return;
    }
    element.removeAttribute("draggable");
    element.setAttribute("contenteditable", "true");
    element.classList.add("tuidg-text-editing");
    element.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    toast("Escreva diretamente. Pressione Esc quando terminar.");
  }

  function finishTextEditing() {
    $$(".tuidg-text-editing").forEach((element) => {
      element.classList.remove("tuidg-text-editing");
      element.removeAttribute("contenteditable");
      if (element === state.selected) element.setAttribute("draggable", "true");
    });
  }

  function updateSelectionUi() {
    const float = $(".tuidg-editor-float");
    const label = $(".tuidg-editor-selection-label");
    const resize = $(".tuidg-editor-resize-handle");
    if (!state.selected || !state.selected.isConnected || state.preview) {
      float.classList.remove("is-visible");
      label.classList.remove("is-visible");
      resize.classList.remove("is-visible");
      return;
    }

    const rect = state.selected.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    float.style.top = `${Math.max(window.scrollY + 68, top - 44)}px`;
    float.style.left = `${Math.max(8, Math.min(left, document.documentElement.clientWidth - 330))}px`;
    float.classList.add("is-visible");

    label.textContent = friendlyName(state.selected);
    label.style.top = `${Math.max(window.scrollY + 65, top - 22)}px`;
    label.style.left = `${Math.max(0, left)}px`;
    label.classList.add("is-visible");

    resize.style.top = `${top + rect.height - 7}px`;
    resize.style.left = `${left + rect.width - 7}px`;
    resize.classList.add("is-visible");
  }

  function syncStylePanel() {
    const name = $("[data-selected-name]");
    if (name) name.textContent = state.selected
      ? `${friendlyName(state.selected)} selecionado. Use os controles abaixo para formatar.`
      : "Nenhum item selecionado.";
    const deleteButton = $(".tuidg-editor-danger");
    if (deleteButton) deleteButton.disabled = !state.selected;
    if (!state.selected) return;

    const computed = getComputedStyle(state.selected);
    const fontSize = Math.round(parseFloat(computed.fontSize) || 16);
    const fontRange = $('[data-style="fontSize"]');
    fontRange.value = Math.max(9, Math.min(96, fontSize));
    $("[data-font-value]").textContent = `${fontSize}px`;

    const parentWidth = state.selected.parentElement
      ? state.selected.parentElement.getBoundingClientRect().width
      : state.selected.getBoundingClientRect().width;
    const width = Math.round((state.selected.getBoundingClientRect().width / Math.max(1, parentWidth)) * 100);
    $('[data-style="width"]').value = Math.max(15, Math.min(100, width));
    $("[data-width-value]").textContent = `${Math.min(100, width)}%`;

    syncColor("color", computed.color);
    syncColor("backgroundColor", computed.backgroundColor);
    const linkField = $("[data-link-field]");
    linkField.hidden = !state.selected.matches("a");
    if (!linkField.hidden) $('[data-style="href"]').value = state.selected.getAttribute("href") || "";
  }

  function rgbToHex(value, fallback) {
    if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") return fallback;
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return fallback;
    return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
  }

  function syncColor(property, value) {
    const fallback = property === "backgroundColor" ? "#ffffff" : "#202124";
    const hex = rgbToHex(value, fallback);
    const picker = $(`[data-color="${property}"]`);
    const input = $(`[data-color-text="${property}"]`);
    if (picker) picker.value = hex;
    if (input) input.value = hex;
  }

  function applyStyle(property, value, push = true) {
    if (!state.selected) {
      toast("Primeiro, clique no item que deseja formatar.");
      return;
    }
    state.selected.style[property] = value;
    markDirty();
    syncStylePanel();
    updateSelectionUi();
    if (push) pushHistory();
    else scheduleHistory();
  }

  function applyWidth(percent, push = true) {
    if (!state.selected) {
      toast("Primeiro, clique no item que deseja redimensionar.");
      return;
    }
    state.selected.style.width = `${Math.max(15, Math.min(100, percent))}%`;
    state.selected.style.maxWidth = "100%";
    markDirty();
    $("[data-width-value]").textContent = `${Math.round(percent)}%`;
    updateSelectionUi();
    if (push) pushHistory();
    else scheduleHistory();
  }

  function beginResize(event) {
    if (!state.selected) return;
    event.preventDefault();
    const element = state.selected;
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const startRect = element.getBoundingClientRect();
    const startX = event.clientX;

    function move(moveEvent) {
      const nextWidth = Math.max(70, Math.min(parentRect.width, startRect.width + moveEvent.clientX - startX));
      const percent = (nextWidth / Math.max(1, parentRect.width)) * 100;
      element.style.width = `${percent.toFixed(1)}%`;
      element.style.maxWidth = "100%";
      $("[data-style=\"width\"]").value = Math.round(percent);
      $("[data-width-value]").textContent = `${Math.round(percent)}%`;
      markDirty();
      updateSelectionUi();
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      pushHistory();
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  }

  function handleDragStart(event) {
    const target = event.target.closest(".tuidg-selected");
    if (!target || state.preview || target.isContentEditable) {
      event.preventDefault();
      return;
    }
    state.dragged = target;
    target.classList.add("tuidg-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "tuidg-block");
  }

  function handleDragOver(event) {
    if (!state.dragged) return;
    const target = event.target.closest(".tuidg-editable");
    if (!target || target === state.dragged || target.parentElement !== state.dragged.parentElement) return;
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    $$(".tuidg-drop-before,.tuidg-drop-after").forEach((item) => item.classList.remove("tuidg-drop-before", "tuidg-drop-after"));
    target.classList.add(after ? "tuidg-drop-after" : "tuidg-drop-before");
    target.parentElement.insertBefore(state.dragged, after ? target.nextSibling : target);
  }

  function handleDragEnd() {
    if (!state.dragged) return;
    state.dragged.classList.remove("tuidg-dragging");
    state.dragged = null;
    $$(".tuidg-drop-before,.tuidg-drop-after").forEach((item) => item.classList.remove("tuidg-drop-before", "tuidg-drop-after"));
    markDirty();
    pushHistory();
    updateSelectionUi();
  }

  function runAction(action) {
    const actions = {
      undo,
      redo,
      panel: togglePanel,
      preview: togglePreview,
      "save-draft": saveDraft,
      exit: exitEditor,
      publish,
      "edit-text": () => startTextEditing(),
      bold: () => formatText("bold"),
      italic: () => formatText("italic"),
      "drag-help": () => toast("Arraste o próprio item selecionado para cima ou para baixo."),
      "move-up": () => moveSelected(-1),
      "move-down": () => moveSelected(1),
      duplicate: duplicateSelected,
      delete: deleteSelected,
    };
    if (actions[action]) actions[action]();
  }

  function formatText(command) {
    if (!state.selected || !isTextElement(state.selected)) {
      toast("Selecione um texto primeiro.");
      return;
    }
    if (!state.selected.isContentEditable) startTextEditing(state.selected);
    document.execCommand(command, false, null);
    markDirty();
    scheduleHistory();
  }

  function moveSelected(direction) {
    if (!state.selected || !state.selected.parentElement) return;
    const sibling = direction < 0 ? state.selected.previousElementSibling : state.selected.nextElementSibling;
    if (!sibling) {
      toast(direction < 0 ? "Este item já é o primeiro deste bloco." : "Este item já é o último deste bloco.");
      return;
    }
    if (direction < 0) state.selected.parentElement.insertBefore(state.selected, sibling);
    else state.selected.parentElement.insertBefore(sibling, state.selected);
    markDirty();
    pushHistory();
    updateSelectionUi();
  }

  function duplicateSelected() {
    if (!state.selected) return;
    const copy = state.selected.cloneNode(true);
    cleanupEditorAttributes(copy);
    state.selected.insertAdjacentElement("afterend", copy);
    markEditable();
    selectElement(copy);
    markDirty();
    pushHistory();
  }

  function deleteSelected() {
    if (!state.selected) return;
    const parent = state.selected.parentElement;
    const next = state.selected.nextElementSibling || state.selected.previousElementSibling || parent;
    state.selected.remove();
    state.selected = null;
    markEditable();
    if (next && next.matches && next.matches(".tuidg-editable")) selectElement(next);
    else updateSelectionUi();
    markDirty();
    pushHistory();
  }

  function insertContent(type) {
    if (type === "image") {
      $("[data-image-picker]").click();
      return;
    }
    if (type === "video") {
      insertVideo();
      return;
    }

    let node;
    if (type === "text") {
      node = htmlNode('<div class="tuidg-user-block"><p>Clique duas vezes para escrever seu texto.</p></div>');
    } else if (type === "heading") {
      node = htmlNode('<h2 class="tuidg-user-block">Digite o novo título</h2>');
    } else if (type === "section") {
      node = htmlNode('<section class="tuidg-user-section tuidg-user-block"><h2>Nova seção</h2><p>Clique duas vezes neste texto para editar.</p></section>');
    } else if (type === "button") {
      node = htmlNode('<a class="tuidg-user-button tuidg-user-block" href="#">Novo botão</a>');
    } else if (type === "divider") {
      node = htmlNode('<hr class="tuidg-user-divider tuidg-user-block">');
    } else if (type === "spacer") {
      node = htmlNode('<div class="tuidg-user-spacer tuidg-user-block" aria-hidden="true"></div>');
    }
    if (node) insertNode(node);
  }

  function htmlNode(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function insertNode(node) {
    if (state.selected && state.selected.isConnected && !state.selected.matches("header,footer")) {
      state.selected.insertAdjacentElement("afterend", node);
    } else {
      const root = $(".reader-article") || $("main");
      root.appendChild(node);
    }
    markEditable();
    selectElement(node.matches(".tuidg-editable") ? node : node.querySelector(".tuidg-editable") || node);
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    markDirty();
    pushHistory();
  }

  function handleImageFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const objectUrl = URL.createObjectURL(file);
    state.pendingMedia.set(id, { file, objectUrl, repoPath: null, publicPath: null });
    const figure = htmlNode(`<figure class="tuidg-user-image tuidg-user-block"><img src="${escapeHtml(objectUrl)}" alt="Descrição da imagem" data-tuidg-pending-media="${id}"><figcaption>Dê dois cliques para editar esta legenda.</figcaption></figure>`);
    insertNode(figure);
    toast("Imagem adicionada. Ela será enviada ao clicar em Publicar.");
  }

  function insertVideo() {
    const url = window.prompt("Cole o endereço do vídeo (YouTube, Vimeo ou arquivo MP4):", "");
    if (!url) return;
    const youtube = parseYouTube(url);
    let node;
    if (youtube) {
      node = htmlNode(`<div class="tuidg-user-video tuidg-user-block"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(youtube)}" title="Vídeo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`);
    } else {
      node = htmlNode(`<div class="tuidg-user-video tuidg-user-block"><video src="${escapeHtml(url)}" controls preload="metadata"></video></div>`);
    }
    insertNode(node);
  }

  function parseYouTube(value) {
    try {
      const url = new URL(value);
      if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
      if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop();
    } catch (_) {
      return null;
    }
    return null;
  }

  function switchTab(tab) {
    $$('[data-tab]').forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
    $$('[data-pane]').forEach((pane) => pane.classList.toggle("is-active", pane.dataset.pane === tab));
  }

  function togglePreview() {
    state.preview = !state.preview;
    document.documentElement.classList.toggle("tuidg-editor-preview", state.preview);
    const button = $('[data-action="preview"]');
    if (button) button.innerHTML = state.preview
      ? '<span class="tuidg-editor-icon">✎</span><span class="optional-label">Voltar à edição</span>'
      : '<span class="tuidg-editor-icon">▣</span><span class="optional-label">Visualizar</span>';
    updateSelectionUi();
  }

  function togglePanel() {
    $(".tuidg-editor-panel").classList.toggle("is-open");
  }

  function markDirty() {
    state.dirty = true;
    const publishButton = $(".tuidg-editor-publish");
    if (publishButton && !publishButton.dataset.busy) publishButton.innerHTML = '<span class="tuidg-editor-icon">●</span>Publicar';
  }

  function currentSnapshot() {
    const main = $("main");
    return main ? main.outerHTML : "";
  }

  function pushHistory() {
    window.clearTimeout(state.historyTimer);
    const snapshot = currentSnapshot();
    if (!snapshot || snapshot === state.history[state.historyIndex]) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 25) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
  }

  function scheduleHistory() {
    window.clearTimeout(state.historyTimer);
    state.historyTimer = window.setTimeout(pushHistory, 350);
  }

  function restoreSnapshot(snapshot) {
    const template = document.createElement("template");
    template.innerHTML = snapshot.trim();
    const next = template.content.firstElementChild;
    const current = $("main");
    if (!next || !current) return;
    current.replaceWith(next);
    state.selected = null;
    markEditable();
    updateSelectionUi();
    syncStylePanel();
    markDirty();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex -= 1;
    restoreSnapshot(state.history[state.historyIndex]);
    updateHistoryButtons();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex += 1;
    restoreSnapshot(state.history[state.historyIndex]);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const undoButton = $('[data-action="undo"]');
    const redoButton = $('[data-action="redo"]');
    if (undoButton) undoButton.disabled = state.historyIndex <= 0;
    if (redoButton) redoButton.disabled = state.historyIndex >= state.history.length - 1;
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey(), JSON.stringify({ savedAt: new Date().toISOString(), main: currentSnapshot() }));
      toast("Rascunho guardado neste computador.");
    } catch (error) {
      toast(`Não foi possível guardar o rascunho: ${error.message}`, true);
    }
  }

  function draftKey() {
    return `tuidg-visual-draft:${state.pagePath}`;
  }

  function restoreDraftIfAvailable() {
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey()) || "null");
    } catch (_) {
      draft = null;
    }
    if (!draft || !draft.main) return;
    const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString("pt-BR") : "anterior";
    if (window.confirm(`Existe um rascunho desta página salvo em ${when}. Deseja recuperá-lo?`)) {
      restoreSnapshot(draft.main);
      pushHistory();
      toast("Rascunho recuperado.");
    }
  }

  function exitEditor() {
    if (state.dirty && !window.confirm("Há alterações ainda não publicadas. Deseja sair mesmo assim?")) return;
    const url = new URL(location.href);
    url.searchParams.delete("edit");
    location.href = url.href;
  }

  async function loadContentSource() {
    let url;
    if (state.pagePath === "index.html") {
      state.contentPath = "content/home.json";
      url = new URL("content/home.json", document.baseURI);
    } else if (state.pagePath.startsWith("theory/") && state.pagePath.endsWith(".html")) {
      const slug = state.pagePath.split("/").pop().replace(/\.html$/, "");
      state.contentPath = `content/theory/${slug}.json`;
      url = new URL(`../content/theory/${slug}.json`, document.baseURI);
    } else {
      return;
    }
    try {
      const response = await fetch(url.href, { cache: "no-store" });
      if (response.ok) state.contentSource = await response.json();
    } catch (error) {
      console.warn("TUIDG visual editor could not load the JSON source.", error);
    }
  }

  function extractContentJson() {
    if (!state.contentPath || !state.contentSource) return null;
    if (state.pagePath === "index.html") return extractHomeJson();
    if (state.pagePath.startsWith("theory/")) return extractTheoryJson();
    return null;
  }

  function textOf(selector) {
    const node = $(selector);
    return node ? node.textContent.trim() : "";
  }

  function htmlOf(selector) {
    const node = $(selector);
    return node ? cleanFragment(node) : "";
  }

  function extractHomeJson() {
    const data = JSON.parse(JSON.stringify(state.contentSource));
    data.hero_eyebrow = textOf(".hero .eyebrow");
    const heroTitle = $(".hero-copy h1");
    if (heroTitle) {
      const clone = heroTitle.cloneNode(true);
      $$(':scope > span', clone).forEach((item) => item.remove());
      data.hero_title = clone.textContent.trim();
    }
    data.hero_lead = textOf(".hero-lead");
    data.builder_title = htmlOf(".hero-builder-info h2");
    data.builder_body = htmlOf(".hero-builder-info .builder-description");
    data.premise_title = htmlOf(".statement h2");
    data.premise_body = htmlOf(".statement .cms-body");
    data.foundation_title = textOf(".principles .section-heading h2");
    data.foundation_lead = textOf(".principles .section-heading > p:last-child");
    data.principles = $$(".axiom-list article").map((card) => ({
      title: textOfWithin(card, "h3"),
      body: textOfWithin(card, "p"),
    }));
    data.path_title = textOf(".pathway .section-heading h2");
    data.path_lead = textOf(".pathway .section-heading > p:last-child");
    data.chapters = $$(".chapter-grid a").map((card) => ({
      title: textOfWithin(card, "h3"),
      body: textOfWithin(card, "p"),
    }));
    data.author_title = textOf(".author h2");
    data.author_body = htmlOf(".author .cms-author-body");
    data.copyright = textOf("footer > p");
    return data;
  }

  function extractTheoryJson() {
    const data = JSON.parse(JSON.stringify(state.contentSource));
    const article = $(".reader-article");
    if (!article) return data;
    data.title = textOfWithin(article, ":scope > h1");
    const deck = $(":scope > .article-deck", article);
    if (deck) data.deck = cleanFragment(deck);
    data.concise = $$(":scope > .concise-section", article).map((section) => ({ body: cleanFragment(section, ".chapter-media-slots") }));
    data.full = $$(".full-text-content > .prose-section", article).map((section) => ({ body: cleanFragment(section) }));
    return data;
  }

  function textOfWithin(root, selector) {
    const node = $(selector, root);
    return node ? node.textContent.trim() : "";
  }

  function cleanFragment(node, removeSelector) {
    const clone = node.cloneNode(true);
    if (removeSelector) $$(removeSelector, clone).forEach((item) => item.remove());
    cleanupEditorAttributes(clone);
    return clone.innerHTML.trim();
  }

  function cleanupEditorAttributes(root) {
    const nodes = [root, ...$$("*", root)];
    nodes.forEach((element) => {
      element.classList.remove(
        "tuidg-editable",
        "tuidg-selected",
        "tuidg-text-editing",
        "tuidg-dragging",
        "tuidg-drop-before",
        "tuidg-drop-after",
      );
      if (!element.className) element.removeAttribute("class");
      element.removeAttribute("data-tuidg-editable");
      element.removeAttribute("contenteditable");
      element.removeAttribute("draggable");
      element.removeAttribute("tabindex");
    });
  }

  function serializePage() {
    finishTextEditing();
    const clone = document.documentElement.cloneNode(true);
    $$('[data-tuidg-editor-ui]', clone).forEach((element) => element.remove());
    clone.classList.remove("tuidg-editor-active", "tuidg-editor-preview");
    const body = $("body", clone);
    if (body) body.classList.remove("tuidg-editor-active", "tuidg-editor-preview");
    cleanupEditorAttributes(clone);
    return `<!doctype html>\n${clone.outerHTML}\n`;
  }

  function tokenFromStorage() {
    return sessionStorage.getItem("tuidg-github-token") || localStorage.getItem("tuidg-github-token") || "";
  }

  async function ensureToken() {
    const stored = tokenFromStorage();
    if (stored) {
      try {
        await verifyToken(stored);
        return stored;
      } catch (_) {
        sessionStorage.removeItem("tuidg-github-token");
        localStorage.removeItem("tuidg-github-token");
      }
    }
    return openAuthModal();
  }

  function openAuthModal() {
    $(".tuidg-editor-modal").classList.add("is-open");
    $("[data-auth-token]").value = "";
    $("[data-auth-status]").textContent = "";
    setTimeout(() => $("[data-auth-token]").focus(), 50);
    return new Promise((resolve, reject) => {
      state.authResolver = { resolve, reject };
    });
  }

  function cancelAuth() {
    $(".tuidg-editor-modal").classList.remove("is-open");
    if (state.authResolver) state.authResolver.reject(new Error("Publicação cancelada."));
    state.authResolver = null;
  }

  async function connectFromModal() {
    const token = $("[data-auth-token]").value.trim();
    const status = $("[data-auth-status]");
    const button = $("[data-auth-connect]");
    if (!token) {
      status.textContent = "Cole o código de acesso gerado pelo GitHub.";
      status.className = "tuidg-editor-auth-status is-error";
      return;
    }
    button.disabled = true;
    status.textContent = "Conferindo a conexão...";
    status.className = "tuidg-editor-auth-status";
    try {
      const user = await verifyToken(token);
      if ($("[data-auth-remember]").checked) localStorage.setItem("tuidg-github-token", token);
      else sessionStorage.setItem("tuidg-github-token", token);
      status.textContent = `Conectado como ${user.login}.`;
      status.className = "tuidg-editor-auth-status is-ok";
      $(".tuidg-editor-modal").classList.remove("is-open");
      if (state.authResolver) state.authResolver.resolve(token);
      state.authResolver = null;
    } catch (error) {
      status.textContent = error.message;
      status.className = "tuidg-editor-auth-status is-error";
    } finally {
      button.disabled = false;
    }
  }

  async function verifyToken(token) {
    if (state.verifiedToken === token) return apiRequest("/user", {}, token);
    const [user, repo] = await Promise.all([
      apiRequest("/user", {}, token),
      apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}`, {}, token),
    ]);
    const permission = repo.permissions || {};
    if (!(permission.admin || permission.maintain || permission.push)) {
      throw new Error("Este código não tem permissão para publicar no repositório tuidg.");
    }
    state.verifiedToken = token;
    return user;
  }

  async function apiRequest(path, options = {}, token) {
    const response = await fetch(`${CONFIG.api}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) {
      const message = data && data.message ? data.message : `Erro ${response.status} ao falar com o GitHub.`;
      throw new Error(message);
    }
    return data;
  }

  async function publish() {
    const button = $(".tuidg-editor-publish");
    if (button && button.dataset.busy) return;
    if (button) {
      button.dataset.busy = "true";
      button.disabled = true;
      button.textContent = "Preparando...";
    }
    try {
      const token = await ensureToken();
      if (button) button.textContent = "Enviando...";
      await publishAtomic(token);
      state.dirty = false;
      localStorage.removeItem(draftKey());
      if (button) button.innerHTML = '<span class="tuidg-editor-icon">✓</span>Publicado';
      toast("Publicado com sucesso. O site público será atualizado em instantes.");
      setTimeout(() => {
        const url = new URL(location.href);
        url.searchParams.delete("edit");
        url.searchParams.set("v", Date.now().toString());
        location.href = url.href;
      }, 1800);
    } catch (error) {
      if (error.message !== "Publicação cancelada.") toast(`Não foi possível publicar: ${error.message}`, true);
      if (button) button.innerHTML = '<span class="tuidg-editor-icon">●</span>Publicar';
    } finally {
      if (button) {
        delete button.dataset.busy;
        button.disabled = false;
      }
    }
  }

  async function publishAtomic(token) {
    const ref = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/ref/heads/${CONFIG.branch}`, {}, token);
    const headSha = ref.object.sha;
    const headCommit = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/commits/${headSha}`, {}, token);
    const entries = [];

    await preparePendingMedia(token, entries);
    const contentJson = extractContentJson();
    const pageHtml = serializePage();
    entries.push(await createTextEntry(state.pagePath, pageHtml, token));
    if (contentJson && state.contentPath) {
      entries.push(await createTextEntry(state.contentPath, `${JSON.stringify(contentJson, null, 2)}\n`, token));
    }

    const tree = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: entries }),
    }, token);
    const commit = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: `Edit ${state.pagePath} in the TUIDG visual editor`,
        tree: tree.sha,
        parents: [headSha],
      }),
    }, token);
    await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/refs/heads/${CONFIG.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    }, token);
  }

  async function preparePendingMedia(token, entries) {
    for (const [id, item] of state.pendingMedia.entries()) {
      if (!item.repoPath) {
        const safe = sanitizeFilename(item.file.name || "imagem");
        const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
        item.repoPath = `assets/media/library/${stamp}-${safe}`;
        item.publicPath = `${CONFIG.siteBase}${item.repoPath}`;
      }
      const base64 = await fileToBase64(item.file);
      const blob = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: base64, encoding: "base64" }),
      }, token);
      entries.push({ path: item.repoPath, mode: "100644", type: "blob", sha: blob.sha });
      $$(`[data-tuidg-pending-media="${id}"]`).forEach((element) => {
        element.setAttribute("src", item.publicPath);
        element.removeAttribute("data-tuidg-pending-media");
      });
    }
  }

  function sanitizeFilename(name) {
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return safe || "imagem.jpg";
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",").pop());
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler a imagem."));
      reader.readAsDataURL(file);
    });
  }

  async function createTextEntry(path, content, token) {
    const blob = await apiRequest(`/repos/${CONFIG.owner}/${CONFIG.repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content, encoding: "utf-8" }),
    }, token);
    return { path, mode: "100644", type: "blob", sha: blob.sha };
  }

  function toast(message, error = false) {
    const element = $(".tuidg-editor-toast");
    if (!element) return;
    window.clearTimeout(state.toastTimer);
    element.textContent = message;
    element.classList.toggle("is-error", error);
    element.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => element.classList.remove("is-visible"), error ? 5200 : 3200);
  }

  function openWelcome() {
    if (localStorage.getItem("tuidg-visual-editor-welcome") === "seen") return;
    $(".tuidg-editor-welcome").classList.add("is-open");
  }

  function closeWelcome() {
    localStorage.setItem("tuidg-visual-editor-welcome", "seen");
    $(".tuidg-editor-welcome").classList.remove("is-open");
    toast("Clique em qualquer elemento da página para começar.");
  }

  async function init() {
    createUi();
    bindUi();
    await Promise.race([
      new Promise((resolve) => document.addEventListener("tuidg:content-ready", resolve, { once: true })),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
    await loadContentSource();
    markEditable();
    pushHistory();
    updateHistoryButtons();
    restoreDraftIfAvailable();
    openWelcome();
  }

  init().catch((error) => {
    console.error("TUIDG visual editor failed to start.", error);
    alert(`Não foi possível iniciar o editor visual: ${error.message}`);
  });
})();
