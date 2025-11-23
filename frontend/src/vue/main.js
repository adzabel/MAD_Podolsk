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
  const months = ref([]);
  const loading = ref(true);
  const error = ref(false);

  async function fetchAvailableMonths() {
    if (typeof window !== "undefined" && typeof window.__fetchAvailableMonths === "function") {
      return await window.__fetchAvailableMonths();
    }
    return [];
  }

  async function loadMonths() {
    loading.value = true;
    error.value = false;
    try {
      const availableMonths = await fetchAvailableMonths();
      months.value = (availableMonths || [])
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
      error.value = true;
      months.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Для передачи выбранного месяца в старый JS
  function onMonthChange(iso) {
    if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
      window.__onMonthChange(iso);
    }
  }

  loadMonths();

  const app = createApp(MonthSelect, {
    initialMonth,
    months: months.value,
    loading: loading.value,
    error: error.value,
    onMonthChange,
  });
  const vm = app.mount(el);

  // Обновлять пропсы при изменении
  if (vm && vm.$props) {
    Object.defineProperty(vm.$props, 'months', {
      get: () => months.value,
    });
    Object.defineProperty(vm.$props, 'loading', {
      get: () => loading.value,
    });
    Object.defineProperty(vm.$props, 'error', {
      get: () => error.value,
    });
  }

  return { app, vm, months, loading, error };
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
