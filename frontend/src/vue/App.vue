<template>
  <ContractCard
    :contract-metrics="contractMetrics"
    :view-mode="viewMode"
  />

  <section class="summary-grid layout-grid monthly-only" id="summary-grid">
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
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import SummaryCard from "./SummaryCard.vue";
import DailyAverageCard from "./DailyAverageCard.vue";
import ContractCard from "./ContractCard.vue";

const contractMetrics = ref(null);
const viewMode = ref("monthly");

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

if (typeof window !== "undefined") {
  window.__vueSetContractMetrics = (metrics) => {
    contractMetrics.value = metrics;
  };

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
</script>
