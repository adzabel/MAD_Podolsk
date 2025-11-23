import { createApp, reactive } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";

const contractState = reactive({
  contractMetrics: null,
});

if (typeof window !== "undefined") {
  window.__vueSetContractMetrics = (payload) => {
    contractState.contractMetrics = payload || null;
  };
}

export function mountContractCard(selector = "#contract-card") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(ContractCard, {
    contractMetrics: contractState.contractMetrics,
  });

  app.provide("contractState", contractState);

  const vm = app.mount(el);
  return { app, vm };
}

export function mountSummary(selector = "#summary-grid") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(App);
  const vm = app.mount(el);

  return { app, vm };
}
