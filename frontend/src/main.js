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
import { mountSummary, mountContractCard, mountMonthSelect } from "./vue/main.js";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof window !== "undefined") {
    window.__onUiReady = (uiManager) => {
      // Монтируем Vue-сводку в выделенный контейнер.
      mountSummary("#summary-grid");
      // Монтируем Vue-карточку исполнения контракта, если контейнер доступен.
      mountContractCard("#contract-card");
      // Монтируем селектор месяца в шапке, передавая начальный месяц.
      const initialMonth = uiManager && uiManager.initialMonth ? uiManager.initialMonth : null;
      mountMonthSelect("#month-select-vue-root", initialMonth);
    };
  }

  initApp();
});
