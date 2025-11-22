export class UiStore {
  constructor() {
    this.viewMode = "monthly";
    this.selectedMonthIso = null;
    this.selectedDayIso = null;
    this.availableDays = [];
    this.workSort = { column: "planned" };
  }

  setViewMode(mode) {
    this.viewMode = mode === "daily" ? "daily" : "monthly";
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

  setWorkSortColumn(column) {
    if (!column) return;
    this.workSort = { ...this.workSort, column };
  }
}
