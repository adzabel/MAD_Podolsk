<template>
  <MonthSelect
    :months="months"
    :initialMonth="initialMonth"
    :loading="monthLoading"
    :error="monthError"
    @monthChange="onMonthChange"
  />
  <SummaryCards
    :summary="summaryState"
    :isInteractive="true"
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
  <WorkBreakdownList
    v-if="viewMode === 'monthly'"
    :activeCategoryKey="activeCategoryKey"
    :activeCategoryTitle="activeCategoryTitle"
    :items="dashboardItems"
    :loading="isDashboardLoading"
    :error="dashboardError"
    :selectedMonth="selectedMonth"
  />
  <WorkBreakdownModal
    :visible="isWorkModalOpen"
    :workName="workModalData.workName"
    :workBreakdown="workModalData.workBreakdown"
    :selectedMonthLabel="workModalData.selectedMonthLabel"
    @close="isWorkModalOpen = false"
  />
</template>

<script setup>
import { reactive, ref, onMounted, computed } from "vue";
import SummaryCards from "./SummaryCards.vue";
import MonthSelect from "./MonthSelect.vue";
import WorkBreakdownModal from "./WorkBreakdownModal.vue";
import WorkBreakdownList from "./WorkBreakdownList.vue";
import SmetaCategories from "./SmetaCategories.vue";
const groupedCategories = ref([]);
const activeCategoryKey = ref('');
const VNR_CODES = ['внерегл_ч_1', 'внерегл_ч_2'];
const CATEGORY_KEYS = ['лето', 'зима', 'внерегламент'];
const SEASONAL_KEYS = ['лето', 'зима'];
const VNR_PLAN_SHARE = 0.43;
const dashboardItems = ref([]);
const isDashboardLoading = ref(true);
const dashboardError = ref(false);
const selectedMonth = ref('');

const activeCategoryTitle = computed(() => {
  const activeCategory = groupedCategories.value.find((category) => category.key === activeCategoryKey.value);
  return activeCategory ? activeCategory.title || '' : '';
});

function onCategorySelect(key) {
  activeCategoryKey.value = key;
}

function normalizeSmeta(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function groupCategories(items) {
  const groups = {};
  CATEGORY_KEYS.forEach((key) => {
    groups[key] = {
      key,
      title: key,
      planned: 0,
      fact: 0,
      delta: 0,
      works: [],
    };
  });

  let basePlanTotal = 0;
  let vnrFactTotal = 0;

  items.forEach((item) => {
    const smetaKey = normalizeSmeta(item.smeta);
    const isVnr = VNR_CODES.includes(smetaKey);
    const isKnownCategory = CATEGORY_KEYS.includes(smetaKey) || isVnr;
    if (!isKnownCategory) return;

    const categoryKey = isVnr ? 'внерегламент' : smetaKey;
    const planned = isVnr ? 0 : Number(item.planned_amount) || 0;
    const fact = Number(item.fact_amount) || 0;

    groups[categoryKey].works.push({
      ...item,
      planned_amount: planned,
      fact_amount: fact,
    });
    groups[categoryKey].planned += planned;
    groups[categoryKey].fact += fact;

    if (SEASONAL_KEYS.includes(smetaKey)) {
      basePlanTotal += planned;
    }

    if (isVnr) {
      vnrFactTotal += fact;
    }
  });

  const virtualPlan = basePlanTotal * VNR_PLAN_SHARE;
  if (groups['внерегламент']) {
    groups['внерегламент'].planned = virtualPlan;
    groups['внерегламент'].fact = vnrFactTotal;
  }

  return Object.values(groups)
    .filter((group) => group.planned || group.fact || group.works.length)
    .map((group) => ({
      ...group,
      delta: (group.fact || 0) - (group.planned || 0),
    }));
}
// Прямая загрузка данных дашборда при монтировании
async function loadDashboardItems() {
  let apiBase = '/api/dashboard';
  if (typeof document !== 'undefined') {
    const metaApiUrl = document.querySelector('meta[name="mad-api-url"]');
    if (metaApiUrl && metaApiUrl.content) {
      apiBase = metaApiUrl.content;
    }
  }
  // Получаем месяц из initialMonth или текущий
  let monthIso = selectedMonth.value || initialMonth.value;
  if (!monthIso) {
    const now = new Date();
    monthIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  }
  selectedMonth.value = monthIso;
  isDashboardLoading.value = true;
  dashboardError.value = false;
  try {
    const response = await fetch(`${apiBase}?month=${monthIso}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    dashboardItems.value = items;
    groupedCategories.value = groupCategories(items);
    if (groupedCategories.value.length) {
      activeCategoryKey.value = groupedCategories.value[0].key;
    } else {
      activeCategoryKey.value = '';
    }
  } catch (e) {
    dashboardItems.value = [];
    groupedCategories.value = [];
    activeCategoryKey.value = '';
    dashboardError.value = true;
  } finally {
    isDashboardLoading.value = false;
  }
}

const months = ref([]);
const monthLoading = ref(true);
const monthError = ref(false);
const initialMonth = ref(null);

async function fetchAvailableMonths() {
  if (typeof window !== "undefined" && typeof window.__fetchAvailableMonths === "function") {
    return await window.__fetchAvailableMonths();
  }
  return [];
}

async function loadMonths() {
  monthLoading.value = true;
  monthError.value = false;
  try {
    const availableMonths = await fetchAvailableMonths();
    const monthList = Array.isArray(availableMonths)
      ? availableMonths
      : Array.isArray(availableMonths?.months)
      ? availableMonths.months
      : [];
    months.value = (monthList || [])
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
    monthError.value = true;
    months.value = [];
  } finally {
    monthLoading.value = false;
  }
}

function onMonthChange(iso) {
  selectedMonth.value = iso;
  loadDashboardItems();
  if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
    window.__onMonthChange(iso);
  }
}

onMounted(() => {
  // Получаем список месяцев и выбираем последний доступный
  loadMonths().then(() => {
    if (months.value.length) {
      initialMonth.value = months.value[months.value.length - 1].iso;
    } else {
      // fallback: текущий месяц
      const now = new Date();
      initialMonth.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    }
    selectedMonth.value = initialMonth.value;
    loadDashboardItems();
  });
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
    console.log('[window.__vueSetSummaryMetrics] payload:', payload);
    summaryState.planned = payload?.planned ?? null;
    summaryState.fact = payload?.fact ?? null;
    summaryState.delta = payload?.delta ?? null;
    summaryState.completion =
      payload?.completion !== undefined ? payload.completion : null;
    summaryState.completionLabel = payload?.completionLabel || "–";
    console.log('[window.__vueSetSummaryMetrics] summaryState:', JSON.parse(JSON.stringify(summaryState)));
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
