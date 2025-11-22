// Обёртка над summary-логикой UI, чтобы постепенно
// выносить её из UIManager в отдельные view-компоненты.

export {
	renderSummary,
	updateSummaryProgress,
	updateDailyAverage,
	updateContractCard,
	updateContractProgress,
} from "@js/summary.js";
