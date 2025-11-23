<template>
  <SummaryCards
    :plan="summaryState.planned"
    :fact="summaryState.fact"
    :deviation="summaryState.delta"
    :isInteractive="true"
    :dailyAverage="dailyAverageState.averageValue"
    :daysWithData="dailyAverageState.daysWithData"
    :isCurrentMonth="dailyAverageState.isCurrentMonth"
    :factProgress="summaryState.completion"
    :factProgressLabel="summaryState.completionLabel"
    :summaryDailyRevenue="dailyAverageState.summaryDailyRevenue"
    :selectedMonthLabel="dailyAverageState.selectedMonthLabel"
  />
  <SmetaCategories
    v-if="viewMode === 'monthly'"
    :categories="groupedCategories"
    :activeCategoryKey="activeCategoryKey"
    @select="onCategorySelect"
  />
  <WorkBreakdownList v-if="viewMode === 'monthly'" :activeCategoryKey="activeCategoryKey" />
  <WorkBreakdownModal
    :visible="isWorkModalOpen"
    :workName="workModalData.workName"
    :workBreakdown="workModalData.workBreakdown"
    :selectedMonthLabel="workModalData.selectedMonthLabel"
    @close="isWorkModalOpen = false"
  />
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import SummaryCards from "./SummaryCards.vue";
import MonthSelect from "./MonthSelect.vue";
import WorkBreakdownModal from "./WorkBreakdownModal.vue";
import WorkBreakdownList from "./WorkBreakdownList.vue";
import SmetaCategories from "./SmetaCategories.vue";
const groupedCategories = ref([]);
const activeCategoryKey = ref('');
function onCategorySelect(key) {
  activeCategoryKey.value = key;
}
// Пример загрузки категорий (группировка по сметам)
function groupCategories(items) {
  // Группируем по category/smeta, аналогично старой логике
  const groups = {};
  items.forEach(item => {
    const key = item.category || item.smeta || 'Без категории';
    if (!groups[key]) {
      groups[key] = {
        key,
        title: key,
        planned: 0,
        fact: 0,
        delta: 0,
        works: []
      };
    }
    groups[key].works.push(item);
    groups[key].planned += item.planned_amount || 0;
    groups[key].fact += item.fact_amount || 0;
    groups[key].delta += item.delta_amount || ((item.fact_amount || 0) - (item.planned_amount || 0));
  });
  return Object.values(groups);
}
// Пример загрузки данных для категорий при инициализации
onMounted(() => {
  // ...existing code...
  // После загрузки данных дашборда
  // Здесь предполагается, что window.__vueSetDashboardItems вызывается с items
  if (typeof window !== "undefined") {
    window.__vueSetDashboardItems = (items) => {
      groupedCategories.value = groupCategories(items);
      // По умолчанию активная категория — первая
      if (groupedCategories.value.length) {
        activeCategoryKey.value = groupedCategories.value[0].key;
      }
    };
  }
});

const months = ref([]);
const loading = ref(true);
const error = ref(false);
const initialMonth = ref(null);

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

function onMonthChange(iso) {
  // Здесь можно вызвать загрузку данных для выбранного месяца
  if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
    window.__onMonthChange(iso);
  }
}

onMounted(() => {
  // Можно получить initialMonth из window или другого источника
  if (typeof window !== "undefined" && window.uiManager && window.uiManager.initialMonth) {
    initialMonth.value = window.uiManager.initialMonth;
  }
  loadMonths();
});
const summaryState = reactive({
  planned: null,
  fact: null,
  delta: null,
  completion: null,
  completionLabel: "–",
});

const dailyAverageState = reactive({
  averageValue: null,
  daysWithData: 0,
  isCurrentMonth: false,
  summaryDailyRevenue: [],
  selectedMonthLabel: '',
});


const workModalData = reactive({
  workName: '',
  workBreakdown: [],
  selectedMonthLabel: ''
});

const isWorkModalOpen = ref(false);

const viewMode = ref("monthly");

if (typeof window !== "undefined") {
  window.__vueSetSummaryMetrics = (payload) => {
    summaryState.planned = payload?.planned ?? null;
    summaryState.fact = payload?.fact ?? null;
    summaryState.delta = payload?.delta ?? null;
    summaryState.completion =
      payload?.completion !== undefined ? payload.completion : null;
    summaryState.completionLabel = payload?.completionLabel || "–";
  };

  window.__vueSetDailyAverage = (payload) => {
    dailyAverageState.averageValue = payload?.averageValue ?? null;
    dailyAverageState.daysWithData = payload?.daysWithData ?? 0;
    dailyAverageState.isCurrentMonth = Boolean(payload?.isCurrentMonth);
    dailyAverageState.summaryDailyRevenue = payload?.summaryDailyRevenue ?? [];
    dailyAverageState.selectedMonthLabel = payload?.selectedMonthLabel ?? '';
  };

  window.__vueSetViewMode = (mode) => {
    if (mode === "monthly" || mode === "daily") {
      viewMode.value = mode;
    }
  };

  window.__openWorkBreakdownModal = (payload) => {
    if (!payload || (!payload.workName && !payload.description)) return;
    workModalData.workName = typeof payload.workName === 'string' ? payload.workName : (payload.description || 'Без названия');
    workModalData.selectedMonthLabel = typeof payload.selectedMonthLabel === 'string' ? payload.selectedMonthLabel : '';
    workModalData.workBreakdown = Array.isArray(payload.breakdown) ? payload.breakdown : [];
    isWorkModalOpen.value = true;
  };
}

function setViewMode(mode) {
  if (mode !== "monthly" && mode !== "daily") return;
  viewMode.value = mode;
  if (typeof window !== "undefined" && typeof window.__setViewMode === "function") {
    window.__setViewMode(mode);
  }
}
</script>
