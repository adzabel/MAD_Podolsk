<template>
  <div class="work-mobile-sort">
    <label class="work-mobile-sort-label" for="work-mobile-sort-select">Сортировка</label>
    <div class="work-mobile-sort-control">
      <select id="work-mobile-sort-select" v-model="currentValue">
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <span class="work-mobile-sort-arrow" aria-hidden="true"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'plan'
  }
});

const emit = defineEmits(['update:modelValue']);

const options = [
  { value: 'plan', label: 'План' },
  { value: 'fact', label: 'Факт' },
  { value: 'delta', label: 'Отклонение' }
];

const currentValue = computed({
  get: () => props.modelValue || 'plan',
  set: (value) => emit('update:modelValue', value)
});
</script>
