import { createApp, reactive } from "vue";
import App from "./App.vue";
import ContractCard from "./ContractCard.vue";

// Глобальное (для фронтенда) реактивное состояние Vue для дашборда.
// На него могут ссылаться как Vue-компоненты, так и мост из legacy-кода.
export const dashboardState = reactive({
  contractMetrics: null,
});

export function mountContractCard(selector = "#contract-card") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(ContractCard, { dashboardState });
  const vm = app.mount(el);

  if (typeof window !== "undefined") {
    window.__dashboardState = dashboardState;
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
