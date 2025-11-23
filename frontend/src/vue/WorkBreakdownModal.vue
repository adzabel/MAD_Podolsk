<template>
  <div v-if="visible && workNameSafe" :class="['modal-backdrop', { visible: visible }]" id="work-modal" :aria-hidden="!visible">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="work-modal-title">
      <div class="modal-title" id="work-modal-title">Расшифровка: {{ workNameSafe }}</div>
      <div class="modal-subtitle" id="work-modal-subtitle">{{ selectedMonthLabel }}</div>
      <button class="modal-close" type="button" @click="$emit('close')" aria-label="Закрыть">×</button>
      <div class="modal-body" id="work-modal-body">
        <div v-if="!safeWorkBreakdown.length" class="modal-empty" id="work-modal-empty">Нет данных для выбранной работы</div>
        <div v-else class="modal-list" id="work-modal-list">
          <div class="modal-row modal-row-header">
            <div class="modal-row-date">Дата</div>
            <div class="modal-row-volume">Объём ({{ safeWorkBreakdown[0]?.unit || '—' }})</div>
            <div class="modal-row-value">Сумма</div>
          </div>
          <div v-for="(item, idx) in safeWorkBreakdown" :key="idx" class="modal-row">
            <div class="modal-row-date">{{ formatDate(item.date) }}</div>
            <div class="modal-row-volume">
              <span class="modal-value-number">{{ item.volume?.toLocaleString('ru-RU', { maximumFractionDigits: 3 }) ?? '—' }}</span>
              <span class="modal-value-unit">{{ item.unit ? `(${item.unit})` : '' }}</span>
            </div>
            <div class="modal-row-value">
              <span class="modal-value-number">{{ item.amount?.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) ?? '—' }}</span>
              <span class="modal-value-unit">₽</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  visible: Boolean,
  workName: { type: [String, null, undefined], default: '' },
  workBreakdown: { type: Array, default: () => [] },
  selectedMonthLabel: { type: String, default: '' },
});
const workNameSafe = computed(() => typeof props.workName === 'string' ? props.workName : (props.workName ?? '').toString());
const safeWorkBreakdown = computed(() => Array.isArray(props.workBreakdown) ? props.workBreakdown : []);
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
</script>
