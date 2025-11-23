// Фасад дневного модального UI для постепенной миграции в Vue-компонент.

import { formatDate } from "@shared/utils.js";
import { openWorkBreakdownModal } from "@js/ui/dailyModalView.js";


export function openWorkModalView({
	elements,
	item,
	selectedMonthIso,
	dataManager,
	visitorTracker,
	setDailyModalState,
}) {
	if (!item || !elements.dailyModal) {
		return Promise.resolve();
	}
	const workName = (item.work_name || item.description || "").toString();
	const monthIso = selectedMonthIso;
	const apiBase = (dataManager && dataManager.apiUrl)
		? dataManager.apiUrl.replace(/\/$/, "")
		: "/api/dashboard";

	const url = new URL(`${apiBase}/work-breakdown`, window.location.origin);
	url.searchParams.set("month", monthIso);
	url.searchParams.set("work", workName);

	return (async () => {
		openWorkBreakdownModal({
			elements,
			workName,
		});

		const response = await fetch(url.toString(), {
			headers: visitorTracker ? visitorTracker.buildHeaders() : {},
		});
		if (!response.ok) throw new Error("HTTP " + response.status);
		const payload = await response.json();
		const items = Array.isArray(payload) ? payload : (payload?.daily || []);

		const dailyRevenue = (items || []).map((it) => {
			const date = it.date || it.work_date || it.day;
			const raw = it.amount ?? it.total_volume ?? it.value;
			const amount = raw === null || raw === undefined ? null : Number(raw);
			const unit = it.unit || "";
			const total_amount = it.total_amount ?? null;
			if (!date || amount === null || !Number.isFinite(amount)) return null;
			return { date, amount, unit, total_amount };
		}).filter(Boolean);

		setDailyModalState({ mode: "work", dailyRevenue });
		return dailyRevenue;
	})();
}



export function formatDailyDateLabel(dayIso) {
	return formatDate(dayIso, { day: "2-digit", month: "long" });
}
