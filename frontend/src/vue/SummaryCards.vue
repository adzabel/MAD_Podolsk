


<template>
  <div class="summary-cards">
    <PlanCard :value="plan" :isInteractive="isInteractive" />
    <FactCard :value="fact" :isInteractive="isInteractive" :progress="factProgress" :progressLabel="factProgressLabel" />
    <DeviationCard :value="deviation" :isInteractive="isInteractive" />
    <DailyAverageCard
      :averageValue="dailyAverage"
      :daysWithData="daysWithData"
      :isCurrentMonth="isCurrentMonth"
      @open-modal="openDailyModal"
    />
    <DailyAverageModal
      :visible="isDailyModalOpen"
      :summaryDailyRevenue="summaryDailyRevenue"
      :selectedMonthLabel="selectedMonthLabel"
      @close="isDailyModalOpen = false"
    />
  </div>
</template>

<script setup>
import PlanCard from './PlanCard.vue';
import FactCard from './FactCard.vue';
import DeviationCard from './DeviationCard.vue';
import DailyAverageCard from './DailyAverageCard.vue';
import DailyAverageModal from './DailyAverageModal.vue';

    const props = defineProps({
      summary: { type: Object, required: true },
      isInteractive: { type: Boolean, default: false },
      isCurrentMonth: { type: Boolean, default: false },
      factProgress: { type: Number, default: null },
      factProgressLabel: { type: String, default: "–" },
      summaryDailyRevenue: { type: Array, default: () => [] },
      selectedMonthLabel: { type: String, default: '' }
    });

    const plan = computed(() => props.summary?.plan_total ?? 0);
    const fact = computed(() => props.summary?.fact_total ?? 0);
    const deviation = computed(() => props.summary?.deviation ?? 0);
    const dailyAverage = computed(() => props.summary?.average_daily ?? 0);
    const daysWithData = computed(() => props.summary?.days_with_data ?? 0);

import { ref } from 'vue';
const isDailyModalOpen = ref(false);

function openDailyModal() {
  isDailyModalOpen.value = true;
}
</script>
