<template>
  <button
    class="summary-card summary-card-interactive"
    id="daily-average-card"
    type="button"
    :class="{ 'is-disabled': !isInteractive }"
    :aria-disabled="String(!isInteractive)"
    @click="handleClick"
  >
    <div class="summary-label daily-average">СР.ДНЕВ. ВЫРУЧКА, ₽</div>
    <div class="summary-value">{{ formattedValue }}</div>
    <div class="summary-sub summary-note">
      <span class="summary-note-line">Расчет без выручки</span>
      <span class="summary-note-line">за сегодня</span>
    </div>
    <span v-if="isCurrentMonth" class="summary-card-hint" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        stroke="currentColor"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></circle>
        <path
          d="M12 10v6"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        <path
          d="M12 8h.01"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
    </span>
    <span class="sr-only">Нажмите, чтобы посмотреть детализацию по дням</span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  averageValue: { type: Number, default: null },
  daysWithData: { type: Number, default: 0 },
  isCurrentMonth: { type: Boolean, default: false },
});

const formattedValue = computed(() => {
  if (
    props.averageValue === null ||
    props.averageValue === undefined ||
    Number.isNaN(props.averageValue)
  ) {
    return "–";
  }
  return props.averageValue.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
});

const isInteractive = computed(() => {
  return Number.isFinite(props.daysWithData) && props.daysWithData > 0 && props.isCurrentMonth;
});

function handleClick() {
  if (!isInteractive.value) return;
  if (typeof window !== "undefined" && typeof window.__openDailyAverageModal === "function") {
    window.__openDailyAverageModal();
  }
}
</script>
