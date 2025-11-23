


<template>
  <div class="summary-cards">
    <PlanCard :value="plan" :isInteractive="isInteractive" />
    <FactCard :value="fact" :isInteractive="isInteractive" :progress="factProgress" :progressLabel="factProgressLabel" />
    <DeviationCard :value="deviation" :isInteractive="isInteractive" />
    <DailyAverageCard :averageValue="dailyAverage" :daysWithData="daysWithData" :isCurrentMonth="isCurrentMonth" />
  </div>
</template>

<script setup>
import PlanCard from './PlanCard.vue';
import FactCard from './FactCard.vue';
import DeviationCard from './DeviationCard.vue';
import DailyAverageCard from './DailyAverageCard.vue';

const props = defineProps({
  plan: { type: Number, default: null },
  fact: { type: Number, default: null },
  deviation: { type: Number, default: null },
  isInteractive: { type: Boolean, default: false },
  dailyAverage: { type: Number, default: null },
  daysWithData: { type: Number, default: 0 },
  isCurrentMonth: { type: Boolean, default: false },
  factProgress: { type: Number, default: null },
  factProgressLabel: { type: String, default: "–" }
});
</script>
