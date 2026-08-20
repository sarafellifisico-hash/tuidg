(function () {
  "use strict";

  const catalog = window.TUIDG_MEDIA_CATALOG || [];
  const select = document.querySelector("#slot-id");
  const type = document.querySelector("#media-type");
  const path = document.querySelector("#media-path");
  const alt = document.querySelector("#media-alt");
  const aspect = document.querySelector("#media-aspect");
  const fit = document.querySelector("#media-fit");
  const output = document.querySelector("#manifest-entry");
  const list = document.querySelector("#media-catalog-list");

  catalog.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.id} — ${item.title}`;
    select.appendChild(option);

    const row = document.createElement("tr");
    row.innerHTML = `<td><code>${item.id}</code></td><td>${item.kind}</td><td>${item.title}</td><td><a href="theory/${item.page}.html#${item.id}">Open slot ↗</a></td>`;
    list.appendChild(row);
  });

  function selectedItem() {
    return catalog.find((item) => item.id === select.value);
  }

  function update() {
    const item = selectedItem();
    if (item && !alt.value) alt.placeholder = item.title;
    const config = {
      type: type.value,
      src: path.value || "library/your-file.ext",
      alt: alt.value || (item && item.title) || "TUIDG visual material",
      aspect: aspect.value,
    };
    if (type.value === "image") config.fit = fit.value;
    output.value = `  ${JSON.stringify(select.value || "slot-id")}: ${JSON.stringify(config, null, 2).replace(/\n/g, "\n  ")},`;
  }

  [select, type, path, alt, aspect, fit].forEach((field) =>
    field.addEventListener("input", update),
  );

  document.querySelector("#copy-entry").addEventListener("click", async () => {
    await navigator.clipboard.writeText(output.value);
    document.querySelector("#copy-entry").textContent = "Copied";
    setTimeout(() => (document.querySelector("#copy-entry").textContent = "Copy entry"), 1600);
  });

  const query = new URLSearchParams(location.search);
  if (query.get("slot")) select.value = query.get("slot");
  if (query.get("type")) type.value = query.get("type");
  update();
})();
