<template>
  <div class="month-select-block">
    <MonthSelect
      :months="months"
      :initial-month="initialMonth"
      :loading="loading"
      :error="error"
      @monthChange="onMonthChange"
    />
  </div>
  <SummaryCard
    label="План, ₽"
    sub="Сметная стоимость"
    :value="summaryState.planned"
  />
  <SummaryCard
    label="Факт, ₽"
    sub="Сумма принятых работ"
    :value="summaryState.fact"
    :progress="summaryState.completion"
    :progress-label="summaryState.completionLabel"
  />
  <SummaryCard
    label="Отклонение, ₽"
    sub="Факт − План"
    :value="summaryState.delta"
    :delta="true"
  />
  <DailyAverageCard
    :average-value="dailyAverageState.averageValue"
    :days-with-data="dailyAverageState.daysWithData"
    :is-current-month="dailyAverageState.isCurrentMonth"
  />
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import SummaryCard from "./SummaryCard.vue";
import DailyAverageCard from "./DailyAverageCard.vue";
import MonthSelect from "./MonthSelect.vue";

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
});

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
  };

  window.__vueSetViewMode = (mode) => {
    if (mode === "monthly" || mode === "daily") {
      viewMode.value = mode;
    }
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
