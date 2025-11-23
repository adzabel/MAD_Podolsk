import { reactive } from "vue";
import { API_PDF_URL } from "@config/config.frontend.js";

let pdfStoreInstance = null;

function normalizeCount(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    return 0;
  }
  return numeric;
}

export function usePdfStore() {
  if (pdfStoreInstance) return pdfStoreInstance;

  const state = reactive({
    apiPdfUrl: API_PDF_URL || "",
    defaultLabel: "PDF",
    viewMode: "monthly",
    hasAnyData: false,
    groupedCategoriesCount: 0,
    isDownloading: false,
    isDisabled: true,
    selectedMonthIso: "",
    selectedMonthLabel: "",
    visitorTracker: null,
  });

  const recomputeDisabled = () => {
    state.isDisabled =
      state.isDownloading ||
      state.viewMode === "daily" ||
      !state.hasAnyData ||
      normalizeCount(state.groupedCategoriesCount) === 0;
  };

  const setConfig = ({ apiPdfUrl, defaultLabel, visitorTracker } = {}) => {
    if (apiPdfUrl) {
      state.apiPdfUrl = apiPdfUrl;
    }
    if (defaultLabel) {
      state.defaultLabel = defaultLabel;
    }
    if (visitorTracker) {
      state.visitorTracker = visitorTracker;
    }
    recomputeDisabled();
  };

  const setDefaultLabel = (label) => {
    if (!label) return;
    state.defaultLabel = label;
    recomputeDisabled();
  };

  const setVisitorTracker = (visitorTracker) => {
    state.visitorTracker = visitorTracker || null;
  };

  const setViewMode = (mode) => {
    state.viewMode = mode === "daily" ? "daily" : "monthly";
    recomputeDisabled();
  };

  const setDataAvailability = (hasData) => {
    state.hasAnyData = Boolean(hasData);
    recomputeDisabled();
  };

  const setGroupedCategoriesCount = (count) => {
    state.groupedCategoriesCount = normalizeCount(count);
    recomputeDisabled();
  };

  const setSelectedMonth = ({ iso, label } = {}) => {
    state.selectedMonthIso = iso || "";
    state.selectedMonthLabel = label || "";
  };

  const startDownloading = () => {
    state.isDownloading = true;
    state.isDisabled = true;
  };

  const finishDownloading = () => {
    state.isDownloading = false;
    recomputeDisabled();
  };

  pdfStoreInstance = {
    state,
    setConfig,
    setDefaultLabel,
    setVisitorTracker,
    setViewMode,
    setDataAvailability,
    setGroupedCategoriesCount,
    setSelectedMonth,
    startDownloading,
    finishDownloading,
  };

  return pdfStoreInstance;
}
