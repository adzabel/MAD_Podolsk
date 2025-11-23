// Прокси-слой для дневных данных. Логика отображения
// постепенно переносится во Vue-компонент DailyReport.

export function applyDailyData({ data }) {
  if (typeof window !== "undefined" && typeof window.__vueSetDailyReport === "function") {
    const items = Array.isArray(data?.items) ? data.items : [];
    const hasData = Boolean(data?.has_data);

    window.__vueSetDailyReport({
      isLoading: false,
      hasData,
      selectedDateIso: data?.date || null,
      items,
    });
  }
}

export function renderDailyTable(args) {
  // Таблица теперь рендерится Vue, функция оставлена для совместимости.
  return null;
}
