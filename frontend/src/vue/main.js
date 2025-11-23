import { createApp, reactive } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";
import MonthSelect from "./MonthSelect.vue";
import DaySelect from "./DaySelect.vue";
import DailyReport from "./DailyReport.vue";

// Единое реактивное состояние для карточки контракта, чтобы сеттер из
// старого JS-кода и Vue-компонент делили одни и те же данные.
export const contractState = reactive({
  contractMetrics: null,
});

if (typeof window !== "undefined") {
  // Глобальный setter, который вызывает старый JS: updateContractCardView.
  window.__vueSetContractMetrics = (payload) => {
    contractState.contractMetrics = payload || null;
  };
}

export function mountContractCard(selector = "#contract-card") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(ContractCard, {
    contractState,
  });

  const vm = app.mount(el);
  return { app, vm };
}

export function mountSummary(selector = "#summary-grid") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(App);
  const vm = app.mount(el);

  return { app, vm };
}

export function mountMonthSelect(selector = "#month-select-vue-root", initialMonth = null) {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(MonthSelect, { initialMonth });
  const vm = app.mount(el);

  return { app, vm };
}

export function mountDaySelect(selector = "#day-select-vue-root", initialDay = null) {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(DaySelect, { initialDay });
  const vm = app.mount(el);

  return { app, vm };
}

export function mountDailyReport(selector = "#daily-panel") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(DailyReport);
  const vm = app.mount(el);

  return { app, vm };
}
