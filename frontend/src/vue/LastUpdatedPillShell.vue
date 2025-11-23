<template>
  <LastUpdatedPill :label="label" :status="status" />
</template>

<script setup>
import { computed } from "vue";
import LastUpdatedPill from "./LastUpdatedPill.vue";
import { useLastUpdatedStore } from "./useLastUpdatedStore";

const lastUpdatedStore = useLastUpdatedStore();
const label = computed(() => lastUpdatedStore.state.labelFromDb);
const status = computed(() => lastUpdatedStore.state.monthlyStatus);
</script>
