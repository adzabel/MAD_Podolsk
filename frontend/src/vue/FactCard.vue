
<template>
  <button
    class="summary-card fact-card"
    type="button"
    :class="{ 'is-disabled': !isInteractive }"
    :aria-disabled="String(!isInteractive)"
    @click="handleClick"
  >
    <div class="summary-label">ФАКТ, ₽</div>
    <div class="summary-value">{{ formattedValue }}</div>
    <span class="sr-only">Нажмите, чтобы посмотреть детализацию по факту</span>
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
  if (typeof window !== 'undefined' && typeof window.__openFactModal === 'function') {
    window.__openFactModal();
  }
}
</script>

<style scoped>
.fact-card {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
</style>
