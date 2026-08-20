(function () {
  "use strict";

  const scriptUrl = document.currentScript && document.currentScript.src;
  const mediaBase = new URL("./", scriptUrl || document.baseURI);

  function mediaUrl(path) {
    return new URL(path, mediaBase).href;
  }

  function createMedia(config, title) {
    const type = config.type || "image";
    let element;

    if (type === "video") {
      element = document.createElement("video");
      element.controls = true;
      element.preload = "metadata";
      element.playsInline = true;
      if (config.poster) element.poster = mediaUrl(config.poster);
      element.setAttribute("aria-label", config.alt || title);
    } else if (type === "animation") {
      element = document.createElement("iframe");
      element.loading = "lazy";
      element.allowFullscreen = true;
      element.title = config.alt || title;
      element.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock allow-downloads");
    } else {
      element = document.createElement("img");
      element.loading = "lazy";
      element.decoding = "async";
      element.alt = config.alt || title;
    }

    element.src = mediaUrl(config.src);
    return element;
  }

  function applyOverrides(overrides) {
    document.querySelectorAll(".media-slot[data-media-id]").forEach((slot) => {
      const config = overrides[slot.dataset.mediaId];
      if (!config || !config.src) return;

      const frame = slot.querySelector(".media-slot__frame");
      if (!frame) return;
      const title = slot.dataset.mediaTitle || "TUIDG visual material";
      const replacement = createMedia(config, title);
      const current = frame.querySelector("img, video, iframe");
      if (current) current.replaceWith(replacement);
      else frame.appendChild(replacement);

      if (config.aspect) frame.style.setProperty("--media-aspect", config.aspect);
      if (config.fit) frame.style.setProperty("--media-fit", config.fit);
      slot.dataset.mediaLoaded = "true";
    });
  }

  const legacy = window.TUIDG_MEDIA || {};
  const manifestUrl = new URL("../../content/media.json", mediaBase);
  fetch(manifestUrl, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Media manifest failed: ${response.status}`);
      return response.json();
    })
    .then((items) => {
      const managed = Object.fromEntries((items || []).map((item) => [item.id, item]));
      applyOverrides({ ...legacy, ...managed });
    })
    .catch(() => applyOverrides(legacy));
})();
