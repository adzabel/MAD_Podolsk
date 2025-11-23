<template>
  <MonthSelect
    :months="months"
    :initial-month="initialMonth"
    :loading="loading"
    :error="error"
    @monthChange="onMonthChange"
  />
</template>

<script setup>
import { ref, onMounted } from "vue";
import MonthSelect from "./MonthSelect.vue";

const props = defineProps({
  initialMonth: {
    type: String,
    default: null,
  },
});

const months = ref([]);
const loading = ref(true);
const error = ref(false);
const initialMonth = ref(props.initialMonth);

async function fetchAvailableMonths() {
  if (typeof window !== "undefined" && typeof window.__fetchAvailableMonths === "function") {
    return await window.__fetchAvailableMonths();
  }
  return [];
}

async function loadMonths() {
  loading.value = true;
  error.value = false;
  try {
    const availableMonths = await fetchAvailableMonths();
    months.value = (availableMonths || [])
      .map((iso) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        return {
          iso,
          label: date.toLocaleDateString("ru-RU", {
            month: "long",
            year: "numeric",
          }),
        };
      })
      .filter(Boolean);
  } catch (e) {
    error.value = true;
    months.value = [];
  } finally {
    loading.value = false;
  }
}

function onMonthChange(iso) {
  if (typeof window !== "undefined" && typeof window.__onMonthChange === "function") {
    window.__onMonthChange(iso);
  }
}

onMounted(() => {
  // fallback к глобальному состоянию только если initialMonth не передан
  if (!initialMonth.value && typeof window !== "undefined" && window.uiManager && window.uiManager.initialMonth) {
    initialMonth.value = window.uiManager.initialMonth;
  }
  loadMonths();
});
</script>
