import { calculateDelta, normalizeAmount } from "@shared/utils.js";

const MERGED_SMETA_OVERRIDES = {
  "внерегл_ч_1": { key: "внерегламент", title: "внерегламент" },
  "внерегл_ч_2": { key: "внерегламент", title: "внерегламент" },
};

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
  const override = MERGED_SMETA_OVERRIDES[keyCandidate.toLowerCase()];
  if (override) {
    return { ...override };
  }
  const fallbackTitle = (smetaValue || "").trim();
  const resolvedKey = keyCandidate || fallbackTitle || "Прочее";
  const resolvedTitle = fallbackTitle || resolvedKey;
  return { key: resolvedKey, title: resolvedTitle };
}

export function summarizeItems(items = []) {
  return items.reduce(
    (acc, item) => {
      if (item.planned_amount !== null && item.planned_amount !== undefined) {
        acc.planned += item.planned_amount;
        acc.hasPlanned = true;
      }
      if (item.fact_amount !== null && item.fact_amount !== undefined) {
        acc.fact += item.fact_amount;
        acc.hasFact = true;
      }
      return acc;
    },
    { planned: 0, fact: 0, hasPlanned: false, hasFact: false },
  );
}

export function calculateMetrics(data) {
  if (!data) {
    return null;
  }
  const items = data.items || [];
  const totals = summarizeItems(items);
  const summary = data.summary || {};
  const planned = summary.planned_amount ?? (totals.hasPlanned ? totals.planned : null);
  const fact = summary.fact_amount ?? (totals.hasFact ? totals.fact : null);
  const completion = summary.completion_pct ?? (planned ? (fact ?? 0) / planned : null);
  const hasDelta = summary.delta_amount !== null && summary.delta_amount !== undefined;
  const delta = hasDelta
    ? summary.delta_amount
    : planned !== null || fact !== null
      ? (fact ?? 0) - (planned ?? 0)
      : null;
  const dailyRevenue = Array.isArray(summary.daily_revenue)
    ? summary.daily_revenue
        .map((item) => {
          const amount = normalizeAmount(item?.amount ?? item?.fact_total ?? item?.value);
          const date = item?.date || item?.work_date || item?.day;
          if (!date || amount === null) return null;
          return { date, amount };
        })
        .filter(Boolean)
    : [];
  const averageDailyRevenue = normalizeAmount(summary.average_daily_revenue)
    ?? (dailyRevenue.length ? dailyRevenue.reduce((acc, item) => acc + item.amount, 0) / dailyRevenue.length : null);
  return { planned, fact, completion, delta, dailyRevenue, averageDailyRevenue };
}

export function calculateContractMetrics(data) {
  if (!data || !data.summary) {
    return null;
  }
  const summary = data.summary;
  const contractAmount = normalizeAmount(summary.contract_amount);
  const executed = normalizeAmount(summary.contract_executed);
  const completion = summary.contract_completion_pct ?? (contractAmount ? (executed ?? 0) / contractAmount : null);
  return {
    contractAmount,
    executed,
    completion,
  };
}

export function buildCategories(items = []) {
  const map = new Map();
  items.forEach((item) => {
    if (!shouldIncludeItem(item)) {
      return;
    }
    const rawKey = item.category || item.smeta || "";
    const trimmedKey = rawKey ? rawKey.trim() : "";
    if (!trimmedKey) return;
    if (trimmedKey.toLowerCase() === "без категории") return;
    const { key, title } = resolveCategoryMeta(trimmedKey, item.smeta);
    if (!map.has(key)) {
      map.set(key, {
        key,
        title,
        works: [],
        planned: 0,
        fact: 0,
        delta: 0,
      });
    }
    const group = map.get(key);
    if (!group.title && title) {
      group.title = title;
    }
    const isPlanOnly = item.category_plan_only === true;
    if (!isPlanOnly) {
      group.works.push(item);
    }
    const planned = item.planned_amount ?? 0;
    const fact = item.fact_amount ?? 0;
    const delta = calculateDelta(item);
    if (!isNaN(planned)) group.planned += planned;
    if (!isNaN(fact)) group.fact += fact;
    if (!isNaN(delta)) group.delta += delta;
  });
  return Array.from(map.values()).sort((a, b) => {
    const planA = !isNaN(a.planned) ? a.planned : 0;
    const planB = !isNaN(b.planned) ? b.planned : 0;
    if (planA === planB) {
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      return titleA.localeCompare(titleB, "ru");
    }
    return planB - planA;
  });
}
