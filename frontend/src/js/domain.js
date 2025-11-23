
import { calculateDelta, normalizeAmount } from "@shared/utils.js";


export function hasMeaningfulAmount(value) {
	const normalized = normalizeAmount(value);
	return normalized !== null && normalized !== 0;
}

export function shouldIncludeItem(item) {
	if (!item) {
		return false;
	}
	return hasMeaningfulAmount(item.planned_amount) || hasMeaningfulAmount(item.fact_amount);
}

export function resolveCategoryMeta(rawKey, smetaValue) {
	const keyCandidate = (rawKey || "").trim();
	const fallbackTitle = (smetaValue || "").trim();
	const resolvedKey = keyCandidate || fallbackTitle || "Прочее";
	const resolvedTitle = fallbackTitle || resolvedKey;
	return { key: resolvedKey, title: resolvedTitle };
}
