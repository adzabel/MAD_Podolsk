import { calculateDelta, normalizeAmount } from "@shared/utils.js";


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
