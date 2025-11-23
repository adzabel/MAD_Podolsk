import { createApp } from "vue";
import App from "./App.vue";

// Временная стратегия: используем Vue только для сводки, а
// карточка исполнения контракта продолжает рендериться старым DOM-кодом.
export function mountContractCard() {
  return null;
}

export function mountSummary(selector = "#summary-grid") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(App);
  const vm = app.mount(el);

  return { app, vm };
}
