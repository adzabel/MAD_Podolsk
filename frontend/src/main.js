import "@styles/tokens.css";
import "@styles/layout.css";
import "@styles/base.css";
import "@styles/utilities.css";
import "@styles/components.css";
import "@styles/summary.css";
import "@styles/categories.css";
import "@styles/work.css";
import "@styles/modal.css";

import { initApp } from "@js/app.js";
import { mountSummary, mountContractCard } from "./vue/main.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  // Монтируем Vue-сводку в выделенный контейнер.
  mountSummary("#summary-grid");
  // Монтируем Vue-карточку исполнения контракта, если контейнер доступен.
  mountContractCard("#contract-card");
});
