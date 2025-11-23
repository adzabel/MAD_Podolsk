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
import { mountSummary, mountContractCard, mountMonthSelect, mountDaySelect, mountDailyReport, mountLastUpdatedPillMonthly, mountLastUpdatedPillDaily, mountWorkBreakdownList } from "./vue/main.js";

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
      // Монтируем селектор дня в шапке, передавая выбранный день (если есть).
      const initialDay = uiManager && uiManager.uiStore ? uiManager.uiStore.getSelectedDay() : null;
      mountDaySelect("#day-select-vue-root", initialDay);
      // Монтируем Vue-блок расшифровки дневных данных.
      mountDailyReport("#daily-panel");
      // Монтируем Vue-блок расшифровки работ по смете.
      mountWorkBreakdownList("#work-breakdown-list-vue-root");
      // Монтируем Vue-индикаторы "Данные обновлены".
      mountLastUpdatedPillMonthly("#last-updated-pill");
      mountLastUpdatedPillDaily("#last-updated-pill-daily");

      // Тестовая инициализация данных для модального окна среднедневной выручки
      setTimeout(() => {
        if (typeof window.__vueSetDailyAverage === "function") {
          window.__vueSetDailyAverage({
            averageValue: 12345,
            daysWithData: 20,
            isCurrentMonth: true,
            summaryDailyRevenue: [
              { date: "2025-11-01", amount: 1000 },
              { date: "2025-11-02", amount: 1200 },
              { date: "2025-11-03", amount: 1100 },
              { date: "2025-11-04", amount: 1300 },
              { date: "2025-11-05", amount: 900 },
            ],
            selectedMonthLabel: "Ноябрь 2025"
          });
        }
      }, 1000);
    };
  }

  initApp();
});
