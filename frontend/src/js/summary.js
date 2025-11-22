import {
  renderSummaryView,
  updateSummaryProgressView,
  updateDailyAverageView,
  updateContractCardView,
  updateContractProgressView,
} from "@js/ui/summaryView.js";

// Прокси-экспорты для обратной совместимости.
// В остальном коде можно постепенно переходить на новые имена из ui/summaryView.

export function renderSummary(args) {
  return renderSummaryView(args);
}

export function updateSummaryProgress(args) {
  return updateSummaryProgressView(args);
}

export function updateDailyAverage(args) {
  return updateDailyAverageView(args);
}

export function updateContractCard(args) {
  return updateContractCardView(args);
}

export function updateContractProgress(args) {
  return updateContractProgressView(args);
}
