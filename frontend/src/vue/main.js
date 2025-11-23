import { createApp, reactive, computed, defineComponent, h } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";
import MonthSelect from "./MonthSelect.vue";
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

  // Реактивные данные для месяцев
  const state = reactive({
    months: [],
    loading: true,
    error: false,
  });

  // Функция загрузки месяцев (пример: через window или fetch)
  async function fetchAvailableMonths() {
    // Можно заменить на реальный API
    if (typeof window !== "undefined" && typeof window.__fetchAvailableMonths === "function") {
      return window.__fetchAvailableMonths();
    }
    // Пример заглушки
    return [];
  }

  async function loadMonths() {
    state.loading = true;
    state.error = false;
    try {
      const availableMonths = await fetchAvailableMonths();
      state.months = (availableMonths || [])
        .map((iso) => {
          if (!iso) return null;
          const date = new Date(iso);
          if (Number.isNaN(date.getTime())) return null;
          return {
            iso,
            label: date.toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            }),
          };
        })
        .filter(Boolean);
    } catch (e) {
      state.error = true;
      state.months = [];
    } finally {
      state.loading = false;
    }
  }

  loadMonths();

  const app = createApp(MonthSelect, {
    initialMonth,
    months: state.months,
    loading: computed(() => state.loading),
    error: computed(() => state.error),
  });
  const vm = app.mount(el);

  return { app, vm, state };
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

  const app = createApp(MonthlyLastUpdatedShell);
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
