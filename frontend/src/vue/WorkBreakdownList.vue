<template>
  <section class="panel work-list-panel">
    <div class="panel-header work-list-header">
      <div class="panel-title">Расшифровка работ по смете</div>
    </div>
    <div class="work-list-surface">
      <div v-if="isLoading" class="work-list-skeleton">
        <div class="work-row-skeleton" v-for="n in 4" :key="n">
          <div class="skeleton skeleton-line" v-for="i in 5" :key="i"></div>
        </div>
      </div>
      <div v-else-if="error" class="work-list-error">Ошибка загрузки данных</div>
      <div v-else>
        <div v-if="!filteredWorks.length" class="work-list-empty">Нет работ по смете</div>
        <div class="work-list-table" v-else>
          <div class="work-row work-row-header">
            <div>Работа</div>
            <div>План, ₽</div>
            <div>Факт, ₽</div>
            <div>Отклонение</div>
          </div>
          <div
            v-for="(item, index) in filteredWorks"
            :key="item.id || index"
            class="work-row"
            :class="{ 'work-row-last': index === filteredWorks.length - 1 }"
          >
            <div class="work-row-name work-row-name--collapsed" data-expanded="false">
              <span class="work-row-name-text work-row-name-link" @click="openWorkModal(item)">{{ item.work_name || item.description || 'Без названия' }}</span>
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
import { ref, reactive, onMounted, computed } from 'vue';
import WorkBreakdownModal from './WorkBreakdownModal.vue';
import '@/styles/work.css';

const props = defineProps({
  activeCategoryKey: {
    type: String,
    default: ''
  }
});

const isLoading = ref(true);
const error = ref(false);
const works = ref([]);
const selectedMonth = ref(null);

// Фильтрация работ по выбранной смете/категории
const filteredWorks = computed(() => {
  if (!props.activeCategoryKey) return works.value;
  return works.value.filter(item => {
    const key = item.category || item.smeta || 'Без категории';
    return key === props.activeCategoryKey;
  });
});

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
async function openWorkModal(item) {
  if (!item || (!item.work_name && !item.description)) return;
  workModalData.workName = typeof item.work_name === 'string' ? item.work_name : (item.description || 'Без названия');
  workModalData.selectedMonthLabel = selectedMonth.value || '';
  // Загружаем детализацию работы через API
  try {
    let apiBase = '/api/dashboard';
    if (typeof document !== 'undefined') {
      const metaApiUrl = document.querySelector('meta[name="mad-api-url"]');
      if (metaApiUrl && metaApiUrl.content) {
        apiBase = metaApiUrl.content;
      }
    }
    const response = await fetch(`${apiBase}/work-breakdown?month=${selectedMonth.value}&work=${encodeURIComponent(workModalData.workName)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const breakdown = await response.json();
    workModalData.workBreakdown = Array.isArray(breakdown) ? breakdown : [];
  } catch (e) {
    workModalData.workBreakdown = [];
  }
  isWorkModalOpen.value = true;
}

async function fetchWorks() {
  isLoading.value = true;
  error.value = false;
  try {
    // Получаем месяц из props или текущий
    let monthIso = selectedMonth.value;
    if (!monthIso) {
      // fallback: текущий месяц
      const now = new Date();
      monthIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    }
    selectedMonth.value = monthIso;
    let apiBase = '/api/dashboard';
    if (typeof document !== 'undefined') {
      const metaApiUrl = document.querySelector('meta[name="mad-api-url"]');
      if (metaApiUrl && metaApiUrl.content) {
        apiBase = metaApiUrl.content;
      }
    }
    const response = await fetch(`${apiBase}?month=${monthIso}`, { cache: 'no-store' });
    if (response.status === 404) {
      error.value = true;
      works.value = [];
      return;
    }
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
