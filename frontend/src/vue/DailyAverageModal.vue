<template>
  <div v-if="visible" class="modal-backdrop" id="daily-modal" aria-hidden="false">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="daily-modal-title">
      <div class="modal-title" id="daily-modal-title">Среднедневная выручка</div>
      <div class="modal-subtitle" id="daily-modal-subtitle">По дням за {{ selectedMonthLabel }}</div>
      <button class="modal-close" type="button" @click="$emit('close')" aria-label="Закрыть">×</button>
      <div class="modal-body" id="daily-modal-body">
        <div v-if="!summaryDailyRevenue.length" class="modal-empty" id="daily-modal-empty">Нет данных по дням</div>
        <div v-else class="modal-list" id="daily-modal-list">
          <div v-for="(item, idx) in summaryDailyRevenue" :key="idx" class="modal-list-item">
            <span>{{ formatDate(item.date) }}</span>
            <span>{{ item.amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) }} ₽</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
}
.modal-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 8px;
}
.modal-subtitle {
  font-size: 1em;
  margin-bottom: 16px;
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
}
.modal-list-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
</style>
