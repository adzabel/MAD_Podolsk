<template>
  <div class="view-mode-switcher" role="tablist" aria-label="Режим отображения">
    <button
      id="tab-monthly"
      class="tab-button"
      role="tab"
      type="button"
      :class="{ 'is-active': viewMode === 'monthly' }"
      :aria-selected="String(viewMode === 'monthly')"
      @click="setViewMode('monthly')"
    >
      По месяцам
    </button>
    <button
      id="tab-daily"
      class="tab-button"
      role="tab"
      type="button"
      :class="{ 'is-active': viewMode === 'daily' }"
      :aria-selected="String(viewMode === 'daily')"
      @click="setViewMode('daily')"
    >
      По дням
    </button>
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
import { reactive, ref } from "vue";
import SummaryCard from "./SummaryCard.vue";
import DailyAverageCard from "./DailyAverageCard.vue";

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
