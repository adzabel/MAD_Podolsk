<template>
  <div class="day-select">
    <label for="day-select-vue">День</label>
    <div class="day-select-control">
      <input
        id="day-select-vue"
        type="date"
        name="day"
        :min="min"
        :max="max"
        :value="selected"
        :disabled="isDisabled"
        @change="onInputChange"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, computed, toRefs } from "vue";

const props = defineProps({
  initialDay: { type: String, default: null },
});

const state = reactive({
  isLoading: false,
  loadError: false,
  min: "",
  max: "",
  selected: "",
});

const { isLoading, loadError, min, max, selected } = toRefs(state);

const isDisabled = computed(() => isLoading.value);

async function fetchAvailableDays() {
  if (typeof window === "undefined" || typeof window.__fetchAvailableDays !== "function") {
    return [];
  }
  return window.__fetchAvailableDays();
}

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pickClosestToToday(days) {
  if (!days.length) return null;
  const todayTime = new Date(getTodayIso()).getTime();
  return days.reduce((best, iso) => {
    const bestTime = new Date(best).getTime();
    const curTime = new Date(iso).getTime();
    const diffBest = Math.abs(bestTime - todayTime);
    const diffCur = Math.abs(curTime - todayTime);
    return diffCur < diffBest ? iso : best;
  }, days[0]);
}

async function loadInitial() {
  state.isLoading = true;
  state.loadError = false;

  try {
    const availableDays = await fetchAvailableDays();
    const normalized = (availableDays || [])
      .map((iso) => {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean)
      .sort((a, b) => (a < b ? 1 : -1));

    if (!normalized.length) {
      // Нет доступных дней из БД — оставляем инпут пустым и не дергаем загрузку.
      state.selected = "";
      return;
    }

    // min/max для инпута
    const minDayIso = normalized.reduce((minVal, iso) => (!minVal || iso < minVal ? iso : minVal), null);
    const maxDayIso = normalized.reduce((maxVal, iso) => (!maxVal || iso > maxVal ? iso : maxVal), null);
    state.min = minDayIso || "";
    state.max = maxDayIso || "";

    // Выбираем initialDay:
    // 1) если передан initialDay и он в списке — берём его;
    // 2) иначе ближайший к сегодняшней дате из доступных дней;
    // 3) на всякий случай, если что-то пойдёт не так — первый доступный день.
    const initialFromProps = props.initialDay && normalized.includes(props.initialDay)
      ? props.initialDay
      : null;
    const closestToToday = pickClosestToToday(normalized);
    const initialIso = initialFromProps || closestToToday || normalized[0];

    state.selected = initialIso;
    if (initialIso && typeof window !== "undefined" && typeof window.__onDayChange === "function") {
      window.__onDayChange(initialIso);
    }
  } catch (e) {
    console.error("DaySelect: failed to load days", e);
    state.loadError = true;
  } finally {
    state.isLoading = false;
  }
}

function onInputChange(event) {
  const iso = event.target.value;
  state.selected = iso;
  if (!iso) return;
  if (typeof window !== "undefined" && typeof window.__onDayChange === "function") {
    window.__onDayChange(iso);
  }
}

onMounted(() => {
  loadInitial();
});
</script>
