<template>
  <div
    v-if="visible"
    :class="['modal-backdrop', { visible: visible }]"
    id="daily-modal"
    :aria-hidden="!visible"
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="daily-modal-title">
      <div class="modal-title" id="daily-modal-title">Среднедневная выручка</div>
      <div class="modal-subtitle" id="daily-modal-subtitle">По дням за {{ selectedMonthLabel }}</div>
      <button class="modal-close" type="button" @click="$emit('close')" aria-label="Закрыть">×</button>
      <div class="modal-body" id="daily-modal-body">
        <div v-if="!summaryDailyRevenue.length" class="modal-empty" id="daily-modal-empty">Нет данных по дням</div>
        <div v-else class="modal-list" id="daily-modal-list">
          <div class="modal-row modal-row-header">
            <div class="modal-row-date">Дата</div>
            <div class="modal-row-value">Сумма</div>
          </div>
          <div v-for="(item, idx) in summaryDailyRevenue" :key="idx" class="modal-row">
            <div class="modal-row-date">{{ formatDate(item.date) }}</div>
            <div class="modal-row-value">
              <span class="modal-value-number">{{ item.amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) }}</span>
              <span class="modal-value-unit">₽</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
const props = defineProps({
  visible: Boolean,
  summaryDailyRevenue: { type: Array, default: () => [] },
  selectedMonthLabel: { type: String, default: '' },
});
watch(() => props.visible, (val) => {
  console.log('[DEBUG] DailyAverageModal visible:', val);
});
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
</script>
