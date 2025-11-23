
<template>
  <button
    class="summary-card summary-card-interactive"
    type="button"
    :class="{ 'is-disabled': !isInteractive }"
    :aria-disabled="String(!isInteractive)"
    @click="handleClick"
  >
    <div class="summary-label">ФАКТ, ₽</div>
    <div class="summary-value">{{ formattedValue }}</div>
    <div v-if="hasProgress" class="summary-progress" aria-live="polite">
      <div class="summary-progress-labels">
        <span>ИСПОЛНЕНИЕ</span>
        <strong>{{ progressLabelSafe }}</strong>
      </div>
      <div class="summary-progress-bar">
        <div class="summary-progress-fill" :class="{ overflow: isOverflow }" :style="progressStyle"></div>
      </div>
    </div>
    <span class="sr-only">Нажмите, чтобы посмотреть детализацию по факту</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  value: { type: Number, default: null },
  isInteractive: { type: Boolean, default: false },
  progress: { type: Number, default: null },
  progressLabel: { type: String, default: "–" }
});

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined || Number.isNaN(props.value)) {
    return '–';
  }
  return props.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
});

const hasProgress = computed(() => props.progress !== null && props.progress !== undefined);
const percent = computed(() => {
  if (!hasProgress.value || Number.isNaN(props.progress)) return 0;
  return Math.max(0, props.progress * 100);
});
const isOverflow = computed(() => percent.value > 100);
const progressColor = computed(() => {
  if (isOverflow.value) return '#16a34a';
  const cappedHue = Math.min(120, Math.max(0, percent.value));
  const light = percent.value >= 50 ? 43 : 47;
  return `hsl(${cappedHue}, 78%, ${light}%)`;
});
const progressStyle = computed(() => {
  const width = Math.min(115, percent.value);
  return {
    width: `${width}%`,
    '--progress-color': progressColor.value,
  };
});
const progressLabelSafe = computed(() => props.progressLabel || '–');

function handleClick() {
  if (!props.isInteractive) return;
  if (typeof window !== 'undefined' && typeof window.__openFactModal === 'function') {
    window.__openFactModal();
  }
}
</script>
