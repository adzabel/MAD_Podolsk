<template>
  <section class="panel work-list-panel">
    <div class="panel-header work-list-header">
      <div class="panel-title panel-title-desktop">{{ headerTitle }}</div>
    </div>
    <div class="work-list-surface">
      <div v-if="isMobile" class="work-list-mobile-header">
        <div class="work-list-mobile-title">
          <span class="work-list-mobile-title-label">Работы по смете</span>
          <span class="work-list-mobile-title-value">{{ mobileCategoryTitle }}</span>
        </div>
        <WorkSortMobile :model-value="sortKey" @update:model-value="changeSort" />
      </div>
      <div v-if="isLoading" class="work-list-skeleton">
        <div class="work-row-skeleton" v-for="n in 4" :key="n">
          <div class="skeleton skeleton-line" v-for="i in 5" :key="i"></div>
        </div>
      </div>
      <div v-else-if="error" class="work-list-error">Ошибка загрузки данных</div>
      <div v-else>
        <div v-if="!sortedWorks.length" class="work-list-empty">Нет работ по смете</div>
        <div class="work-list-table" v-else>
          <div class="work-row work-row-header">
            <div>Работа</div>
            <div>
              <button
                class="work-sort-button"
                :class="{ active: sortKey === 'plan' }"
                type="button"
                @click="changeSort('plan')"
              >
                <span>План, ₽</span>
                <span class="sort-indicator" :class="{ desc: sortDirection === 'desc' && sortKey === 'plan' }"></span>
              </button>
            </div>
            <div>
              <button
                class="work-sort-button"
                :class="{ active: sortKey === 'fact' }"
                type="button"
                @click="changeSort('fact')"
              >
                <span>Факт, ₽</span>
                <span class="sort-indicator" :class="{ desc: sortDirection === 'desc' && sortKey === 'fact' }"></span>
              </button>
            </div>
            <div>
              <button
                class="work-sort-button"
                :class="{ active: sortKey === 'delta' }"
                type="button"
                @click="changeSort('delta')"
              >
                <span>Отклонение</span>
                <span class="sort-indicator" :class="{ desc: sortDirection === 'desc' && sortKey === 'delta' }"></span>
              </button>
            </div>
          </div>
          <div
            v-for="(item, index) in sortedWorks"
            :key="getItemKey(item, index)"
            class="work-row"
            :class="{ 'work-row-last': index === sortedWorks.length - 1 }"
          >
            <div
              class="work-row-name"
              :class="nameClasses(getItemKey(item, index))"
              :data-expanded="expandedRows[getItemKey(item, index)] ? 'true' : 'false'"
              :ref="(el) => setNameRef(el, getItemKey(item, index))"
            >
              <span class="work-row-name-text work-row-name-link" @click="openWorkModal(item)">{{ item.work_name || 'Без названия' }}</span>
              <button
                v-if="collapsibleRows[getItemKey(item, index)]"
                class="work-row-name-toggle"
                type="button"
                :aria-expanded="expandedRows[getItemKey(item, index)] ? 'true' : 'false'"
                @click.stop="toggleRowName(getItemKey(item, index))"
              >
                <span class="work-row-name-toggle-icon"></span>
              </button>
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
import { ref, reactive, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import WorkBreakdownModal from './WorkBreakdownModal.vue';
import WorkSortMobile from './WorkSortMobile.vue';
import '@/styles/work.css';

const props = defineProps({
  activeCategoryKey: {
    type: String,
    default: ''
  },
  activeCategoryTitle: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  selectedMonth: {
    type: String,
    default: ''
  }
});

const headerTitle = computed(() => {
  const title = props.activeCategoryTitle?.trim();
  return title ? `Расшифровка работ по смете ${title}` : 'Расшифровка работ по смете';
});

const mobileCategoryTitle = computed(() => props.activeCategoryTitle?.trim() || '—');

const isMobile = ref(false);
const isLoading = computed(() => props.loading);
const error = computed(() => props.error);
const works = computed(() => (Array.isArray(props.items) ? props.items : []));
const selectedMonth = computed(() => props.selectedMonth || null);
const sortKey = ref('plan');
const sortDirection = ref('desc');
const expandedRows = reactive({});
const collapsibleRows = reactive({});
const nameRefs = ref(new Map());
let mobileMediaQuery = null;

const updateIsMobile = (event) => {
  if (typeof window === 'undefined') return;
  const matches = event?.matches ?? mobileMediaQuery?.matches;
  isMobile.value = Boolean(matches);
};

const VNR_CODES = ['внерегл_ч_1', 'внерегл_ч_2'];

// Фильтрация работ по выбранной смете
const filteredWorks = computed(() => {
  const worksList = works.value.filter((item) => Boolean(item.work_name));
  if (!props.activeCategoryKey) return worksList;
  const key = props.activeCategoryKey.toLowerCase();

  const subset = worksList.filter((item) => {
    const smetaKey = (item.smeta || '').toString().trim().toLowerCase();
    if (key === 'внерегламент') {
      return VNR_CODES.includes(smetaKey);
    }
    return smetaKey === key;
  });

  if (key === 'внерегламент') {
    return subset.map((item) => ({
      ...item,
      planned_amount: 0,
    }));
  }

  return subset;
});

const sortedWorks = computed(() => {
  const list = filteredWorks.value || [];
  const key = sortKey.value;
  const direction = sortDirection.value === 'asc' ? 1 : -1;

  const getValue = (item) => {
    const planned = Number(item.planned_amount) || 0;
    const fact = Number(item.fact_amount) || 0;
    if (key === 'fact') return fact;
    if (key === 'delta') return fact - planned;
    return planned;
  };

  return [...list].sort((a, b) => {
    const aValue = getValue(a);
    const bValue = getValue(b);
    if (aValue === bValue) return 0;
    return aValue > bValue ? direction : -direction;
  });
});

const toggleRowName = (key) => {
  if (!key || !collapsibleRows[key]) return;
  expandedRows[key] = !expandedRows[key];
};

const setNameRef = (el, key) => {
  if (!key) return;
  if (el) {
    nameRefs.value.set(key, el);
  } else {
    nameRefs.value.delete(key);
  }
};

const nameClasses = (key) => ({
  'work-row-name--collapsed': collapsibleRows[key] && !expandedRows[key],
  'work-row-name--collapsible': collapsibleRows[key]
});

const resetNameStates = () => {
  Object.keys(expandedRows).forEach((key) => delete expandedRows[key]);
  Object.keys(collapsibleRows).forEach((key) => delete collapsibleRows[key]);
  nameRefs.value.clear();
};

const evaluateCollapsibleRows = () => {
  nextTick(() => {
    const currentCollapsible = {};

    nameRefs.value.forEach((container, key) => {
      const textEl = container?.querySelector('.work-row-name-text');
      if (!textEl) return;

      const lineHeight = parseFloat(getComputedStyle(textEl).lineHeight) || 0;
      if (!lineHeight) return;

      const maxHeight = lineHeight * 2 + 1;
      const isOverflow = textEl.scrollHeight > maxHeight;

      if (isOverflow) {
        currentCollapsible[key] = true;
        if (!(key in expandedRows)) {
          expandedRows[key] = false;
        }
      }
    });

    Object.keys(collapsibleRows).forEach((key) => {
      if (!currentCollapsible[key]) delete collapsibleRows[key];
    });

    Object.assign(collapsibleRows, currentCollapsible);
  });
};

const getItemKey = (item, index) => item?.id ?? `row-${index}`;

const isWorkModalOpen = ref(false);
const workModalData = reactive({
  workName: '',
  workBreakdown: [],
  selectedMonthLabel: ''
});

function changeSort(key) {
  sortKey.value = key;
  sortDirection.value = 'desc';
}

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '–';
}
function deltaClass(item) {
  const delta = item.fact_amount - item.planned_amount;
  return delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : '';
}

watch(sortedWorks, () => {
  resetNameStates();
  evaluateCollapsibleRows();
});
async function openWorkModal(item) {
  if (!item || !item.work_name) return;
  workModalData.workName = typeof item.work_name === 'string' ? item.work_name : 'Без названия';
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

onMounted(evaluateCollapsibleRows);
onMounted(() => {
  if (typeof window === 'undefined') return;
  mobileMediaQuery = window.matchMedia('(max-width: 767px)');
  updateIsMobile({ matches: mobileMediaQuery.matches });
  mobileMediaQuery.addEventListener('change', updateIsMobile);
});

onBeforeUnmount(() => {
  if (mobileMediaQuery) {
    mobileMediaQuery.removeEventListener('change', updateIsMobile);
  }
});
</script>

<style scoped>
@import '@/styles/work.css';
</style>
