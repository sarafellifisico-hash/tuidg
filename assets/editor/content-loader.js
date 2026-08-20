(function () {
  "use strict";

  const article = document.querySelector(".reader-article");
  if (!article) return;

  const slug = location.pathname.split("/").pop().replace(/\.html$/, "");

  function replaceSection(section, html, preserveMedia) {
    const media = preserveMedia
      ? section.querySelector(":scope > .chapter-media-slots")
      : null;
    const template = document.createElement("template");
    template.innerHTML = html;
    Array.from(section.children).forEach((child) => {
      if (child !== media) child.remove();
    });
    section.insertBefore(template.content, media);
  }

  fetch(`../content/theory/${slug}.json`, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
      return response.json();
    })
    .then((content) => {
      const title = article.querySelector(":scope > h1");
      const deck = article.querySelector(":scope > .article-deck");
      if (title && content.title) title.textContent = content.title;
      if (deck && typeof content.deck === "string") deck.innerHTML = content.deck;

      const concise = article.querySelectorAll(":scope > .concise-section");
      (content.concise || []).forEach((item, index) => {
        if (concise[index]) replaceSection(concise[index], item.body, true);
      });

      const full = article.querySelectorAll(
        ".full-text-content > .prose-section",
      );
      (content.full || []).forEach((item, index) => {
        if (full[index]) replaceSection(full[index], item.body, false);
      });

      document.dispatchEvent(new CustomEvent("tuidg:content-ready"));
    })
    .catch((error) => {
      console.warn("TUIDG kept its embedded fallback content.", error);
    });
})();
