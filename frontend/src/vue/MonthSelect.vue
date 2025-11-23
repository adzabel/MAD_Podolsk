<template>
  <div class="month-select">
    <label for="month-select-vue">Месяц</label>
    <div class="month-select-control">
      <select
        id="month-select-vue"
        :disabled="isDisabled || !options.length"
        v-model="selected"
        @change="handleChange"
      >
        <option v-if="isLoading" disabled value="">Загрузка…</option>
        <option v-else-if="loadError" disabled value="">Ошибка загрузки</option>
        <option v-else-if="!options.length" disabled value="">Нет данных</option>
        <option
          v-for="option in options"
          :key="option.iso"
          :value="option.iso"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from "vue";

const props = defineProps({
  initialMonth: { type: String, default: null },
});

const state = reactive({
  options: [],
  isLoading: false,
  loadError: false,
});

const selected = ref("");

const isDisabled = computed(() => state.isLoading || state.loadError);

function getCurrentMonthIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function fetchAvailableMonths() {
  if (typeof window === "undefined" || typeof window.__fetchAvailableMonths !== "function") {
    return [];
  }
  return window.__fetchAvailableMonths();
}

async function loadInitial() {
  state.isLoading = true;
  state.loadError = false;
  state.options = [];

  try {
    const availableMonths = await fetchAvailableMonths();
    const months = (availableMonths || [])
      .map((iso) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        return {
          iso,
          label: date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
        };
      })
      .filter(Boolean);

    state.options = months;

    if (!months.length) {
      const fallback = props.initialMonth || getCurrentMonthIso();
      if (fallback && typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
        window.__onMonthChange(fallback);
      }
      return;
    }

    const hasInitial = props.initialMonth && months.some((m) => m.iso === props.initialMonth);
    const initialIso = hasInitial ? props.initialMonth : months[0].iso;
    selected.value = initialIso;
    if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
      window.__onMonthChange(initialIso);
    }
  } catch (e) {
    console.error("MonthSelect: failed to load months", e);
    state.loadError = true;
  } finally {
    state.isLoading = false;
  }
}

function handleChange() {
  const iso = selected.value;
  if (!iso) return;
  if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
    window.__onMonthChange(iso);
  }
}

onMounted(() => {
  loadInitial();
});

const { options, isLoading, loadError } = state;
</script>
