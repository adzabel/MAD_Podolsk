
<template>
  <button
    class="summary-card summary-card-interactive"
    type="button"
    :class="{ 'is-disabled': !isInteractive }"
    :aria-disabled="String(!isInteractive)"
    @click="handleClick"
  >
    <div class="summary-label">ОТКЛОНЕНИЕ, ₽</div>
    <div class="summary-value" :class="valueClass">{{ formattedValue }}</div>
    <span class="sr-only">Нажмите, чтобы посмотреть детализацию по отклонению</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  value: { type: Number, default: null },
  isInteractive: { type: Boolean, default: false }
});

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined || Number.isNaN(props.value)) {
    return '–';
  }
  return props.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
});

const valueClass = computed(() => {
  if (props.value === null || props.value === undefined || Number.isNaN(props.value)) {
    return null;
  }
  if (props.value > 0) return 'positive';
  if (props.value < 0) return 'negative';
  return null;
});

function handleClick() {
  if (!props.isInteractive) return;
  if (typeof window !== 'undefined' && typeof window.__openDeviationModal === 'function') {
    window.__openDeviationModal();
  }
}
</script>
