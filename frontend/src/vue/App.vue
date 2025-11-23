<template>
  <ContractCard :contract-metrics="contractMetrics" />
</template>

<script setup>
import { ref } from "vue";
import ContractCard from "./ContractCard.vue";

const contractMetrics = ref(null);

// Глобальный хук для интеграции со старым JS.
// UIManager сможет вызывать window.__vueSetContractMetrics(data).
if (typeof window !== "undefined") {
  window.__vueSetContractMetrics = (metrics) => {
    contractMetrics.value = metrics;
  };
}
</script>
