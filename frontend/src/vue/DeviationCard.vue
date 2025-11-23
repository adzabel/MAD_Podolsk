
<template>
  <button
    class="summary-card summary-card-interactive"
    type="button"
    :class="{ 'is-disabled': !isInteractive }"
    :aria-disabled="String(!isInteractive)"
    @click="handleClick"
  >
    <div class="summary-label">ОТКЛОНЕНИЕ, ₽</div>
    <div class="summary-value">{{ formattedValue }}</div>
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

function handleClick() {
  if (!props.isInteractive) return;
  if (typeof window !== 'undefined' && typeof window.__openDeviationModal === 'function') {
    window.__openDeviationModal();
  }
}
</script>
