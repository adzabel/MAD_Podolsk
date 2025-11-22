// Фасад для отрисовки и управления списком категорий.

import { renderCategoriesView as renderCategoriesViewInternal } from "@js/ui/categoriesView.js";

export const CATEGORY_COLORS = [
	{ accent: "#22c55e", soft: "rgba(34, 197, 94, 0.25)" },
	{ accent: "#2563eb", soft: "rgba(37, 99, 235, 0.25)" },
	{ accent: "#f97316", soft: "rgba(249, 115, 22, 0.25)" },
	{ accent: "#dc2626", soft: "rgba(220, 38, 38, 0.25)" },
	{ accent: "#a855f7", soft: "rgba(168, 85, 247, 0.25)" },
	{ accent: "#0f766e", soft: "rgba(15, 118, 110, 0.25)" },
];

export function renderCategoriesFacade({
	groupedCategories,
	activeCategoryKey,
	elements,
	onSelect,
}) {
	renderCategoriesViewInternal({
		groupedCategories,
		activeCategoryKey,
		elements,
		colors: CATEGORY_COLORS,
		onSelect,
	});
}
