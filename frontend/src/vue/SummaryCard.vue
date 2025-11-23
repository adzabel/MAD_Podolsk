<template>
  <div
    class="summary-card card card--stacked"
  >
    <div class="summary-label">{{ label }}</div>
    <div
      class="summary-value"
      :class="deltaClass"
    >
      {{ formattedValue }}
    </div>
    <div class="summary-sub">{{ sub }}</div>
    <div
      v-if="hasProgress"
      class="summary-progress"
      aria-live="polite"
    >
      <div class="summary-progress-labels">
        <span>ИСПОЛНЕНИЕ ПЛАНА</span>
        <strong>{{ progressLabelSafe }}</strong>
      </div>
      <div class="summary-progress-bar">
        <div
          class="summary-progress-fill"
          :class="{ overflow: isOverflow }"
          :style="progressStyle"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  sub: { type: String, required: true },
  value: { type: Number, default: null },
  delta: { type: Boolean, default: false },
  progress: { type: Number, default: null }, // 0..1
  progressLabel: { type: String, default: "–" },
});

const PROGRESS_MAX_WIDTH = 115;
const PROGRESS_MAX_ARIA = 120;
const PROGRESS_OVERFLOW_COLOR = "#16a34a";
const PROGRESS_SATURATION = 78;
const PROGRESS_LIGHT_HIGH = 43;
const PROGRESS_LIGHT_LOW = 47;

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined || Number.isNaN(props.value)) {
    return "–";
  }
  return props.value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
});

const deltaClass = computed(() => {
  if (!props.delta) return null;
  if (props.value === null || props.value === undefined || Number.isNaN(props.value)) {
    return null;
  }
  if (props.value > 0) return "positive";
  if (props.value < 0) return "negative";
  return null;
});

const hasProgress = computed(() => props.progress !== null && props.progress !== undefined);

const percent = computed(() => {
  if (!hasProgress.value || Number.isNaN(props.progress)) return 0;
  return Math.max(0, props.progress * 100);
});

const isOverflow = computed(() => percent.value > 100);

const progressColor = computed(() => {
  if (isOverflow.value) return PROGRESS_OVERFLOW_COLOR;
  const cappedHue = Math.min(PROGRESS_MAX_ARIA, Math.max(0, percent.value));
  const light = percent.value >= 50 ? PROGRESS_LIGHT_HIGH : PROGRESS_LIGHT_LOW;
  return `hsl(${cappedHue}, ${PROGRESS_SATURATION}%, ${light}%)`;
});

const progressStyle = computed(() => {
  const width = Math.min(PROGRESS_MAX_WIDTH, percent.value);
  return {
    width: `${width}%`,
    "--progress-color": progressColor.value,
  };
});

const progressLabelSafe = computed(() => props.progressLabel || "–");
</script>
