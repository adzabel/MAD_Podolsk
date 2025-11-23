import { createApp } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";

export function mountContractCard(selector = "#contract-card") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(ContractCard, { contractMetrics: null });
  const vm = app.mount(el);

  if (typeof window !== "undefined") {
    window.__contractCardApp = app;
    window.__contractCardVm = vm;
  }

  return { app, vm };
}

export function mountSummary(selector = "#summary-grid") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(App);
  const vm = app.mount(el);

  return { app, vm };
}
