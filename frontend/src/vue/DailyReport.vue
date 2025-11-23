<template>
  <section class="panel daily-only" id="daily-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">
          {{ titleText }}
        </div>
        <div class="panel-subtitle">
          {{ subtitleText }}
        </div>
      </div>
    </div>

    <div
      class="work-list work-list-skeleton daily-skeleton"
      aria-hidden="true"
      v-show="isLoading"
    >
      <div class="work-row-skeleton" v-for="n in 4" :key="n">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    </div>

    <div class="empty-state" v-if="!isLoading && emptyMessage">
      {{ emptyMessage }}
    </div>

    <div class="work-list daily-table" v-if="!isLoading && rows.length">
      <div class="work-row work-row-header">
        <div>Смета</div>
        <div>Работы</div>
        <div>Ед. изм.</div>
        <div>Объём</div>
        <div>Сумма, ₽</div>
      </div>

      <div
        v-for="(item, index) in rows"
        :key="index"
        class="work-row daily-row"
        :class="{ 'work-row-last': index === rows.length - 1 }"
      >
        <div class="daily-cell daily-cell-smeta">{{ item.smeta || "—" }}</div>
        <div class="daily-cell daily-cell-name">
          <div class="work-row-name work-row-name--collapsed" data-expanded="false">
            <span class="work-row-name-text">{{ item.description || "Без названия" }}</span>
          </div>
        </div>
        <div class="daily-cell daily-cell-unit">
          <span class="daily-cell-label">Ед. изм.</span>
          <span class="daily-cell-value">{{ item.unit || "—" }}</span>
        </div>
        <div class="daily-cell daily-cell-volume">
          <span class="daily-cell-label">Объём</span>
          <span class="daily-cell-value"><strong>{{ item.volumeLabel }}</strong></span>
        </div>
        <div class="daily-cell daily-cell-amount">
          <span class="daily-cell-label">Сумма</span>
          <span class="daily-cell-value"><strong>{{ item.amountLabel }}</strong></span>
        </div>
      </div>

      <div class="work-row work-row-total daily-total-row">
        <div class="daily-cell daily-cell-total-label">Итого по сумме</div>
        <div class="daily-cell daily-cell-total-gap"></div>
        <div class="daily-cell daily-cell-total-gap"></div>
        <div class="daily-cell daily-cell-total-gap"></div>
        <div class="daily-cell daily-cell-total-amount"><strong>{{ totalAmountLabel }}</strong></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, watchEffect } from "vue";
import { API_DAILY_URL } from "@config/config.frontend.js";

const state = reactive({
  isLoading: true,
  hasData: false,
  selectedDateIso: null,
  items: [],
  source: "none", // "day-select" | "external" | "none"
  requestToken: 0,
});

function formatDateLabel(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

function formatNumber(value, maximumFractionDigits = 3) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function formatMoneyRub(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
}

const titleText = computed(() => {
  const label = formatDateLabel(state.selectedDateIso);
  return label ? `Данные за ${label}` : "Данные за выбранный день";
});

const subtitleText = computed(() => {
  const label = formatDateLabel(state.selectedDateIso);
  return label
    ? "Данные доступны только для текущего месяца"
    : "Выберите день, чтобы увидеть данные";
});

const emptyMessage = computed(() => {
  if (state.isLoading) return "";
  if (state.hasData && !state.items.length) {
    return "Нет данных по выбранному дню";
  }
  if (!state.hasData) {
    return "Нет данных";
  }
  return "";
});

const rows = computed(() => {
  if (!Array.isArray(state.items) || !state.items.length) return [];

  const sorted = [...state.items].sort((a, b) => {
    const aVal = Number.isFinite(Number(a?.total_amount)) ? Number(a.total_amount) : 0;
    const bVal = Number.isFinite(Number(b?.total_amount)) ? Number(b.total_amount) : 0;
    return bVal - aVal;
  });

  return sorted.map((item) => ({
    ...item,
    volumeLabel: formatNumber(item.total_volume, 3),
    amountLabel: formatMoneyRub(item.total_amount),
  }));
});

const totalAmountLabel = computed(() => {
  const total = (state.items || []).reduce((sum, item) => {
    const amount = Number(item.total_amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return formatMoneyRub(total);
});

async function fetchDailyReport(dayIso) {
  if (!dayIso || typeof window === "undefined") {
    state.items = [];
    state.hasData = false;
    state.isLoading = false;
    return;
  }

  const token = ++state.requestToken;

  try {
    state.isLoading = true;
    state.hasData = false;
    state.items = [];

    if (typeof window !== "undefined" && typeof window.__vueSetLastUpdated === "function") {
      window.__vueSetLastUpdated({
        dailyStatus: "loading",
      });
    }

    const url = new URL(API_DAILY_URL, window.location.origin);
    url.searchParams.set("day", dayIso);
    url.searchParams.set("_", Date.now().toString());

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    // Если за время запроса пользователь успел выбрать другой день,
    // игнорируем устаревший ответ.
    if (token !== state.requestToken) {
      return;
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    const hasData = Boolean(data?.has_data);

    state.items = items;
    state.hasData = hasData;
    state.selectedDateIso = data?.date || dayIso;
    state.source = "day-select";

    if (typeof window !== "undefined" && typeof window.__vueSetLastUpdated === "function") {
      window.__vueSetLastUpdated({
        dailyStatus: "idle",
      });
    }
  } catch (error) {
    console.error("DailyReport: failed to load daily report", error);
    state.items = [];
    state.hasData = false;
    if (typeof window !== "undefined" && typeof window.__vueSetLastUpdated === "function") {
      window.__vueSetLastUpdated({
        dailyStatus: "error",
      });
    }
  } finally {
    state.isLoading = false;
  }
}

if (typeof window !== "undefined") {
  // Основной канал: выбор дня из DaySelect.vue вызывает этот обработчик.
  window.__onDayChange = (iso) => {
    state.selectedDateIso = iso || null;
    state.source = "day-select";
  };

  // Фолбэк для старого кода, если где-то ещё вызывается __vueSetDailyReport.
  window.__vueSetDailyReport = (payload) => {
    state.isLoading = Boolean(payload?.isLoading);
    state.hasData = Boolean(payload?.hasData);
    state.selectedDateIso = payload?.selectedDateIso || null;
    state.items = Array.isArray(payload?.items) ? payload.items : [];
    state.source = "external";
  };
}

watchEffect(() => {
  const dayIso = state.selectedDateIso;
  if (dayIso && state.source === "day-select") {
    fetchDailyReport(dayIso);
  }
});

const isLoading = computed(() => state.isLoading);
</script>
