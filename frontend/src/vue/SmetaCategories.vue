<template>
  <section class="panel monthly-only">
    <div class="panel-header">
      <div>
        <div class="panel-title">Работы в разрезе Смет</div>
      </div>
    </div>
    <div class="category-grid layout-grid layout-grid--auto-fit">
      <button
        v-for="(category, idx) in categories"
        :key="category.key"
        type="button"
        class="card card--interactive category-card"
        :class="{ active: category.key === activeCategoryKey }"
        :aria-pressed="category.key === activeCategoryKey ? 'true' : 'false'"
        @click="selectCategory(category.key)"
        :style="categoryStyle(idx)"
      >
        <div class="category-title">
          <span>{{ category.title }}</span>
          <span v-if="isOffPlan(category)"><span class="category-offplan-note"><span>30% от</span><span>общего плана</span></span></span>
          <span v-else class="category-pill">{{ category.works.length }} работ</span>
        </div>
        <div class="category-values">
          <span><span class="label">План</span><strong>{{ formatMoney(category.planned) }}</strong></span>
          <span><span class="label">Факт</span><strong>{{ formatMoney(category.fact) }}</strong></span>
          <span><span class="label">Отклонение</span><strong :class="['category-delta', deltaClass(category)]">{{ formatMoney(category.delta) }}</strong></span>
        </div>
        <div class="category-progress">
          <div class="category-progress-labels">
            <span>Исполнение</span>
            <strong>{{ completionLabel(category) }}</strong>
          </div>
          <div class="category-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="120" :aria-valuenow="progressPercent(category)">
            <div class="category-progress-fill" :class="{ overflow: progressPercent(category) > 100 }" :style="progressStyle(category)"></div>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import { formatMoney, formatPercent } from '@/shared/utils.js';

const props = defineProps({
  categories: { type: Array, required: true },
  activeCategoryKey: { type: String, default: '' },
  colors: { type: Array, default: () => [
    { accent: '#2f6fed', soft: 'rgba(47,111,237,0.12)' },
    { accent: '#16a34a', soft: 'rgba(34,197,94,0.12)' },
    { accent: '#f59e42', soft: 'rgba(245,158,66,0.12)' }
  ] }
});

const emit = defineEmits(['select']);

function selectCategory(key) {
  emit('select', key);
}

function isOffPlan(category) {
  return typeof category.key === 'string' && category.key.toLowerCase() === 'внерегламент';
}
function deltaClass(category) {
  return category.delta > 0 ? 'delta-positive' : category.delta < 0 ? 'delta-negative' : '';
}
function completionLabel(category) {
  const completion = category.planned ? (category.fact ?? 0) / category.planned : null;
  return completion !== null && !Number.isNaN(completion) && Number.isFinite(completion)
    ? formatPercent(completion)
    : '–';
}
function progressPercent(category) {
  const completion = category.planned ? (category.fact ?? 0) / category.planned : null;
  return completion !== null && !Number.isNaN(completion) && Number.isFinite(completion)
    ? Math.max(0, completion * 100)
    : 0;
}
function progressStyle(category) {
  const PROGRESS_MAX_WIDTH = 115;
  const PROGRESS_OVERFLOW_COLOR = '#16a34a';
  const PROGRESS_SATURATION = 78;
  const PROGRESS_LIGHT_HIGH = 43;
  const PROGRESS_LIGHT_LOW = 47;
  const progressPercentVal = progressPercent(category);
  const progressWidth = Math.min(PROGRESS_MAX_WIDTH, progressPercentVal);
  const cappedHue = Math.min(120, Math.max(0, progressPercentVal));
  const progressColor =
    progressPercentVal > 100
      ? PROGRESS_OVERFLOW_COLOR
      : `hsl(${cappedHue}, ${PROGRESS_SATURATION}%, ${progressPercentVal >= 50 ? PROGRESS_LIGHT_HIGH : PROGRESS_LIGHT_LOW}%)`;
  return `width: ${progressWidth}%; --progress-color: ${progressColor};`;
}
function categoryStyle(idx) {
  const palette = props.colors[idx % props.colors.length];
  return {
    '--accent': palette.accent,
    '--accent-soft': palette.soft
  };
}
</script>

<style scoped>
@import '@/styles/categories.css';
@import '@/styles/components.css';
</style>
