// Обёртка над дневным UI, чтобы постепенно
// выносить дневную логику из UIManager в отдельный view-компонент.

export function showDailyLoadingState({ elements, setLastUpdated }) {
	if (!elements.dailySkeleton || !elements.dailyTable || !elements.dailyEmptyState) {
		return;
	}
	elements.dailySkeleton.style.display = "block";
	elements.dailyTable.style.display = "none";
	elements.dailyEmptyState.style.display = "none";
	setLastUpdated({ label: "Загрузка данных…", dateLabel: "" });
}

export function showDailyEmptyState({ elements, message }) {
	if (!elements.dailyEmptyState || !elements.dailyTable) return;
	elements.dailyEmptyState.textContent = message;
	elements.dailyEmptyState.style.display = "block";
	elements.dailyTable.style.display = "none";
}

export function handleDailyLoadError({ elements, message = "Ошибка загрузки данных", setLastUpdated, updateLastUpdatedPills }) {
	if (elements.dailySkeleton) elements.dailySkeleton.style.display = "none";
	showDailyEmptyState({ elements, message });
	setLastUpdated({ label: message, dateLabel: "" });
	updateLastUpdatedPills();
}

export function applyDailyDataView({ data, elements, formatDateTime, formatDate, updateLastUpdatedPills, updateDailyNameCollapsers }) {
	const apply = ({ applyFn }) => {
		try {
			applyFn({
				data,
				elements,
				onAfterRender: () => {
					const hasData = data?.has_data;
					const lastUpdatedLabel = hasData ? formatDateTime(data.last_updated) : "Нет данных";
					const lastUpdatedDateLabel = hasData
						? formatDate(data.last_updated, { day: "2-digit", month: "2-digit", year: "numeric" })
						: lastUpdatedLabel;
					updateLastUpdatedPills({
						label: lastUpdatedLabel,
						dateLabel: lastUpdatedDateLabel,
					});
					requestAnimationFrame(() => updateDailyNameCollapsers());
				},
			});
		} catch (err) {
			console.error("Ошибка при применении дневных данных:", err);
		}
	};

	return { apply };
}
