<template>
  <span class="pill" :class="{ 'pill--loading': isLoading, 'pill--error': isError }">
    <span class="pill-dot" aria-hidden="true"></span>
    <span class="pill-info">
      <span class="pill-label">ДАННЫЕ ОБНОВЛЕНЫ</span>
      <span class="pill-value">{{ label }}</span>
    </span>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "Обновление данных…" },
  status: { type: String, default: "idle" }, // idle | loading | error
});

const isLoading = computed(() => props.status === "loading");
const isError = computed(() => props.status === "error");
</script>
