<template>
  <div class="month-select">
    <label for="month-select-vue">Месяц</label>
    <div class="month-select-control">
      <select
        id="month-select-vue"
        :disabled="isDisabled"
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
import { ref, computed, watch, onMounted } from "vue";

const props = defineProps({
  months: {
    type: Array,
    default: () => [], // [{ iso: 'YYYY-MM-DD', label: 'Месяц ГГГГ' }]
  },
  initialMonth: {
    type: String,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["monthChange"]);

const selected = ref("");

const isDisabled = computed(() => props.loading);

function getCurrentMonthIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeMonth(iso) {
  if (!iso) return null;
  const m = /^\d{4}-\d{2}/.exec(iso);
  return m ? m[0] : null;
}

onMounted(() => {
  let initialIso = "";
  if (props.months.length) {
    const initialNorm = normalizeMonth(props.initialMonth);
    const initialFromList =
      initialNorm && props.months.find((m) => normalizeMonth(m.iso) === initialNorm)?.iso;
    initialIso = initialFromList || props.months[0].iso;
  } else {
    initialIso = props.initialMonth || getCurrentMonthIso() + "-01";
  }
  selected.value = initialIso;
  emit("monthChange", initialIso);
});

watch(selected, (val) => {
  emit("monthChange", val);
});

function handleChange() {
  // emit уже срабатывает через watch
}
</script>
