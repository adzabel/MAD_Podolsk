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
import { mountContractCard, mountSummary } from "./vue/main.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  // Монтируем Vue-карточку контракта поверх существующей секции.
  mountContractCard("#contract-card");
  // Монтируем Vue-сводку в выделенный контейнер.
  mountSummary("#summary-grid");
});
