<template>
  <section
    class="contract-card monthly-only"
    id="contract-card"
  >
    <div class="contract-card-header">
      <div class="contract-card-title">
        Исполнение контракта
        <span class="contract-card-title-date" id="contract-title-date">
          {{ titleDateLabel }}
        </span>
      </div>
      <div class="contract-card-values">
        <div>
          <span class="label">Контракт</span>
          <strong>{{ contractAmountLabel }}</strong>
        </div>
        <div>
          <span class="label">Выполнено</span>
          <strong>{{ executedLabel }}</strong>
        </div>
        <div>
          <span class="label">Исполнение</span>
          <strong>{{ percentLabel }}</strong>
        </div>
      </div>
    </div>
    <div
      class="contract-progress-bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="120"
      :aria-valuenow="ariaValueNow"
      aria-label="Исполнение контракта"
    >
      <div
        class="contract-progress-fill"
        :class="{ overflow: isOverflow }"
        :style="progressStyle"
      ></div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  contractState: {
    type: Object,
    required: true,
  },
});

const PROGRESS_MAX_WIDTH = 115;
const PROGRESS_MAX_ARIA = 120;
const PROGRESS_OVERFLOW_COLOR = "#16a34a";
const PROGRESS_BASE_ACCENT = "var(--accent)";

const contractMetrics = computed(() => props.contractState.contractMetrics || null);

const hasData = computed(() => {
  const m = contractMetrics.value;
  if (!m) return false;
  const hasAmount = m.contractAmount != null;
  const hasExecuted = m.executed != null;
  const hasCompletion = m.completion != null;
  return hasAmount || hasExecuted || hasCompletion;
});

const contractAmountLabel = computed(() => {
  const m = contractMetrics.value;
  if (!hasData.value || !m || m.contractAmount == null) return "–";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(m.contractAmount || 0);
});

const executedLabel = computed(() => {
  const m = contractMetrics.value;
  if (!hasData.value || !m || m.executed == null) return "–";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(m.executed || 0);
});

const completion = computed(() => {
  const m = contractMetrics.value;
  if (!hasData.value || !m) return null;
  const value = m.completion;
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, value * 100);
});

const percentLabel = computed(() => {
  if (completion.value == null) return "–";
  return `${completion.value.toFixed(1)}%`;
});

const isOverflow = computed(() => {
  return completion.value != null && completion.value > 100;
});

const ariaValueNow = computed(() => {
  if (completion.value == null) return 0;
  return Math.min(PROGRESS_MAX_ARIA, completion.value);
});

const progressStyle = computed(() => {
  const percent = completion.value ?? 0;
  const width = Math.min(PROGRESS_MAX_WIDTH, percent);
  const color = isOverflow.value ? PROGRESS_OVERFLOW_COLOR : PROGRESS_BASE_ACCENT;

  return {
    width: `${width}%`,
    "--progress-color": color,
    background: color,
  };
});

const titleDateLabel = computed(() => {
  const m = contractMetrics.value;
  const raw = m?.titleDate || m?.titleDateLabel || "";
  if (!raw) return "";

  if (typeof raw === "string" && /[а-яА-Я]/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
});
</script>
