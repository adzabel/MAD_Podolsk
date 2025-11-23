export class UiStore {
  constructor() {
    this.viewMode = "monthly";
    this.selectedMonthIso = null;
    this.selectedDayIso = null;
    this.availableDays = [];
  }

  getViewMode() {
    return this.viewMode || "monthly";
  }

  getSelectedMonth() {
    return this.selectedMonthIso;
  }

  getSelectedDay() {
    return this.selectedDayIso;
  }

  getAvailableDays() {
    return Array.isArray(this.availableDays) ? this.availableDays : [];
  }

  setViewMode(mode) {
    this.viewMode = mode === "daily" ? "daily" : "monthly";
    if (typeof window !== "undefined" && typeof window.__vueSetViewMode === "function") {
      window.__vueSetViewMode(this.viewMode);
    }
  }

  setSelectedMonth(monthIso) {
    this.selectedMonthIso = monthIso || null;
  }

  setSelectedDay(dayIso) {
    this.selectedDayIso = dayIso || null;
  }

  setAvailableDays(days) {
    this.availableDays = Array.isArray(days) ? days : [];
  }
}
