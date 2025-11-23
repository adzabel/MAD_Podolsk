import { createApp } from "vue";
import App from "./App.vue";

export function mountContractCard(selector = "#contract-card") {
  const el = document.querySelector(selector);
  if (!el) return null;

  const app = createApp(App);
  const vm = app.mount(el);

  if (typeof window !== "undefined") {
    window.__vueContractCardApp = app;
    window.__vueContractCardVm = vm;
  }

  return { app, vm };
}
