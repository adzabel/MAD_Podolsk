<template>
  <section class="work-list-panel">
    <div class="work-list-header">
      <h2>Расшифровка работ по смете</h2>
    </div>
    <div v-if="isLoading" class="work-list-skeleton">
      <div class="work-row-skeleton" v-for="n in 4" :key="n">
        <div class="skeleton skeleton-line" v-for="i in 5" :key="i"></div>
      </div>
    </div>
    <div v-else-if="error" class="work-list-error">Ошибка загрузки данных</div>
    <div v-else>
      <div v-if="!works.length" class="work-list-empty">Нет работ по смете</div>
      <div class="work-list-table" v-else>
        <div class="work-row work-row-header">
          <div>Работа</div>
          <div>План, ₽</div>
          <div>Факт, ₽</div>
          <div>Отклонение</div>
        </div>
        <div
          v-for="(item, index) in works"
          :key="item.id || index"
          class="work-row"
          :class="{ 'work-row-last': index === works.length - 1 }"
        >
          <div class="work-row-name work-row-name--collapsed" data-expanded="false">
            <span class="work-row-name-text" @click="openWorkModal(item)" style="cursor:pointer; color:#0077cc; text-decoration:underline;">{{ item.work_name || item.description || 'Без названия' }}</span>
          </div>
          <div class="work-row-money work-row-plan">
            <span class="work-row-label">План</span>
            <span>{{ formatMoney(item.planned_amount) }}</span>
          </div>
          <div class="work-row-money work-row-fact">
            <span class="work-row-label">Факт</span>
            <span>{{ formatMoney(item.fact_amount) }}</span>
          </div>
          <div class="work-row-delta" :class="deltaClass(item)">
            <span class="work-row-label">Отклонение</span>
            <span class="work-row-delta-value">{{ formatMoney(item.fact_amount - item.planned_amount) }}</span>
          </div>
        </div>
      </div>
    </div>
    <WorkBreakdownModal
      :visible="isWorkModalOpen"
      :workName="workModalData.workName"
      :workBreakdown="workModalData.workBreakdown"
      :selectedMonthLabel="workModalData.selectedMonthLabel"
      @close="isWorkModalOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import WorkBreakdownModal from './WorkBreakdownModal.vue';
import '@/styles/work.css';

const isLoading = ref(true);
const error = ref(false);
const works = ref([]);

const isWorkModalOpen = ref(false);
const workModalData = reactive({
  workName: '',
  workBreakdown: [],
  selectedMonthLabel: ''
});

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '–';
}
function deltaClass(item) {
  const delta = item.fact_amount - item.planned_amount;
  return delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : '';
}
function openWorkModal(item) {
  if (!item.work_name && !item.description) return;
  workModalData.workName = item.work_name || item.description || 'Без названия';
  workModalData.selectedMonthLabel = item.selectedMonthLabel || '';
  workModalData.workBreakdown = Array.isArray(item.breakdown) ? item.breakdown : [];
  isWorkModalOpen.value = true;
}

async function fetchWorks() {
  isLoading.value = true;
  error.value = false;
  try {
    // Прямое подключение к backend
    const response = await fetch('/api/works-breakdown', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    works.value = Array.isArray(data?.items) ? data.items : [];
  } catch (e) {
    error.value = true;
    works.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchWorks);
</script>

<style scoped>
@import '@/styles/work.css';
</style>
