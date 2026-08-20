(function () {
  "use strict";
  const one = (selector) => document.querySelector(selector);
  const text = (selector, value) => {
    const node = one(selector);
    if (node && typeof value === "string") node.textContent = value;
  };
  const markup = (selector, value) => {
    const node = one(selector);
    if (node && typeof value === "string") node.innerHTML = value;
  };

  fetch("content/home.json", { cache: "no-cache" })
    .then((response) => response.json())
    .then((data) => {
      text(".hero .eyebrow", data.hero_eyebrow);
      markup(".hero-copy h1", `${data.hero_title}<span></span>`);
      text(".hero-lead", data.hero_lead);
      markup(".hero-builder-info h2", data.builder_title);
      markup(".hero-builder-info .builder-description", data.builder_body);
      markup(".statement h2", data.premise_title);
      markup(".statement .cms-body", data.premise_body);
      text(".principles .section-heading h2", data.foundation_title);
      text(".principles .section-heading > p:last-child", data.foundation_lead);
      document.querySelectorAll(".principle-grid article").forEach((card, index) => {
        const item = (data.principles || [])[index];
        if (!item) return;
        card.querySelector("h3").textContent = item.title;
        card.querySelector("p").textContent = item.body;
      });
      text(".pathway .section-heading h2", data.path_title);
      text(".pathway .section-heading > p:last-child", data.path_lead);
      document.querySelectorAll(".chapter-grid a").forEach((card, index) => {
        const item = (data.chapters || [])[index];
        if (!item) return;
        card.querySelector("h3").textContent = item.title;
        card.querySelector("p").textContent = item.body;
      });
      text(".author h2", data.author_title);
      markup(".author .cms-author-body", data.author_body);
      text("footer > p", data.copyright);
    })
    .catch((error) => console.warn("TUIDG kept its embedded home content.", error));
})();
