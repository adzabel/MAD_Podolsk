import { createApp, reactive, computed, defineComponent, h } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";
import MonthSelect from "./MonthSelect.vue";
import MonthSelectShell from "./MonthSelectShell.vue";
import LastUpdatedPillShell from "./LastUpdatedPillShell.vue";
import DaySelect from "./DaySelect.vue";
import DailyReport from "./DailyReport.vue";
import LastUpdatedPill from "./LastUpdatedPill.vue";
import { useLastUpdatedStore } from "./useLastUpdatedStore";

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
  const app = createApp(MonthSelectShell, { initialMonth });
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

// Единый стор для индикаторов "Данные обновлены".
const lastUpdatedStore = useLastUpdatedStore();

if (typeof window !== "undefined") {
  window.__vueSetLastUpdatedFromDb = (label) => {
    lastUpdatedStore.setLabelFromDb(label);
  };
  window.__vueSetMonthlyLastUpdatedStatus = (status) => {
    lastUpdatedStore.setMonthlyStatus(status);
  };
  window.__vueSetDailyLastUpdatedStatus = (status) => {
    lastUpdatedStore.setDailyStatus(status);
  };
}

const MonthlyLastUpdatedShell = defineComponent({
  name: "MonthlyLastUpdatedShell",
  setup() {
  const label = computed(() => lastUpdatedStore.state.labelFromDb);
  const status = computed(() => lastUpdatedStore.state.monthlyStatus);
    return () => h(LastUpdatedPill, { label: label.value, status: status.value });
  },
});

const DailyLastUpdatedShell = defineComponent({
  name: "DailyLastUpdatedShell",
  setup() {
  const label = computed(() => lastUpdatedStore.state.labelFromDb);
  const status = computed(() => lastUpdatedStore.state.dailyStatus);
    return () => h(LastUpdatedPill, { label: label.value, status: status.value });
  },
});

export function mountLastUpdatedPillMonthly(selector = "#last-updated-pill") {
  const el = document.querySelector(selector);
  if (!el) return null;
  const app = createApp(LastUpdatedPillShell);
  const vm = app.mount(el);
  return { app, vm };
}

export function mountLastUpdatedPillDaily(selector = "#last-updated-pill-daily") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(DailyLastUpdatedShell);
  const vm = app.mount(el);
  return { app, vm };
}
