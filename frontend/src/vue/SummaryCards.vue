


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
  plan: { type: Number, default: null },
  fact: { type: Number, default: null },
  deviation: { type: Number, default: null },
  isInteractive: { type: Boolean, default: false },
  dailyAverage: { type: Number, default: null },
  daysWithData: { type: Number, default: 0 },
  isCurrentMonth: { type: Boolean, default: false },
  factProgress: { type: Number, default: null },
  factProgressLabel: { type: String, default: "–" },
  summaryDailyRevenue: { type: Array, default: () => [] },
  selectedMonthLabel: { type: String, default: '' }
});

import { ref } from 'vue';
const isDailyModalOpen = ref(false);

function openDailyModal() {
  console.log('[DEBUG] openDailyModal called');
  isDailyModalOpen.value = true;
  console.log('[DEBUG] isDailyModalOpen:', isDailyModalOpen.value);
  console.log('[DEBUG] summaryDailyRevenue:', props.summaryDailyRevenue);
  console.log('[DEBUG] selectedMonthLabel:', props.selectedMonthLabel);
}
</script>
