import {
  formatMoney,
  formatPercent,
  formatMoneyRub,
  formatDateTime,
  formatDate,
  formatNumber,
  showToast,
  calculateDelta,
  debounce,
} from "@shared/utils.js";
// ...existing code...
import { UiStore } from "@js/store/index.js";
import { renderCategoriesFacade } from "@js/views/categories-view.js";
import { initWorkListView, renderWorkRowsView } from "@js/ui/workListView.js";
import {
  openAverageDailyModal,
  openWorkBreakdownModal,
  closeDailyModalView,
  renderDailyModalListView,
} from "@js/ui/dailyModalView.js";
import { showDailyLoadingState, showDailyEmptyState, handleDailyLoadError } from "@js/views/daily-view.js";

function normalizePercent(value) {
  if (!isValidPercent(value)) return 0;
  return Math.max(0, value * 100);
}

function buildProgressColor(percent) {
  const progressPercent = Math.max(0, percent);
  const cappedHue = Math.min(120, Math.max(0, progressPercent));
  if (progressPercent > 100) {
    return "#16a34a";
  }
  const lightness = progressPercent >= 50 ? 43 : 47;
  return `hsl(${cappedHue}, 78%, ${lightness}%)`;
}

export class UIManager {
  constructor({ dataManager, elements, apiPdfUrl, pdfButtonDefaultLabel, visitorTracker }) {
    this.uiStore = new UiStore();
    this.dataManager = dataManager;
    this.elements = elements;
    this.apiPdfUrl = apiPdfUrl;
    this.pdfButtonDefaultLabel = pdfButtonDefaultLabel;
    this.visitorTracker = visitorTracker || null;
    this.groupedCategories = [];
    this.activeCategoryKey = null;
    this.workHeaderEl = null;
    this.liveRegion = null;
    this.metrics = null;
    this.lastUpdatedMonthlyLabel = null;
    this.lastUpdatedMonthlyDateLabel = null;
    this.lastUpdatedDailyLabel = null;
    this.lastUpdatedDailyDateLabel = null;
    this.summaryDailyRevenue = [];
    this.dailyRevenue = [];
    this.workSort = { column: "planned" };
    this.initialMonth = new URLSearchParams(window.location.search).get("month");
    this.uiStore.setViewMode("monthly");
    if (this.elements.page) {
      this.elements.page.dataset.viewMode = "monthly";
    }
    this.dayOptionsLoaded = false;
    this.currentDailyData = null;
    if (this.elements.workSortSelect) {
      this.elements.workSortSelect.value = this.workSort.column;
    }
    this.handleResize = debounce(() => {
      this.updateWorkNameCollapsers();
      this.updateDailyNameCollapsers();
    }, 150);
    this.monthOptionsLoaded = false;
    this.pdfModule = null;
  }

  setActiveCategoryTitle(desktopText, mobileValueText = desktopText) {
    if (this.elements.activeCategoryTitleDesktop) {
      this.elements.activeCategoryTitleDesktop.textContent = desktopText;
    } else if (this.elements.activeCategoryTitle) {
      this.elements.activeCategoryTitle.textContent = desktopText;
    }

    if (this.elements.activeCategoryTitleMobileValue) {
      this.elements.activeCategoryTitleMobileValue.textContent = mobileValueText;
    }
  }

  init() {
    this.prepareWorkList();
    this.liveRegion = this.createLiveRegion();
    this.bindEvents();
    // По умолчанию скрываем подсказку о ежедневных данных до выбора месяца
    if (this.elements.workDetailHint) {
      this.elements.workDetailHint.hidden = true;
    }
    this.updateViewModeLayout();
    this.initMonthSelect();
    this.initDaySelect();
    window.addEventListener("resize", this.handleResize);

    if (typeof window !== "undefined" && typeof window.__onUiReady === "function") {
      window.__onUiReady(this);
    }
  }

  toggleSkeletons(isLoading) {
    if (this.elements.summarySkeleton) {
      this.elements.summarySkeleton.style.display = isLoading ? "grid" : "none";
    }
    if (this.elements.categorySkeleton) {
      this.elements.categorySkeleton.style.display = isLoading ? "grid" : "none";
    }
    if (this.elements.workSkeleton) {
      this.elements.workSkeleton.style.display = isLoading ? "block" : "none";
    }
    if (this.elements.summaryGrid) {
      this.elements.summaryGrid.hidden = isLoading;
    }
    if (this.elements.categoryGrid) {
      this.elements.categoryGrid.style.display = isLoading ? "none" : "";
    }
    if (this.elements.workList) {
      this.elements.workList.style.display = isLoading ? "none" : "";
    }
  }

  updateViewModeLayout() {
    const viewMode = this.uiStore.getViewMode();

    if (this.elements.page) {
      this.elements.page.dataset.viewMode = viewMode;
    }
    if (this.elements.viewModeMonthly) {
      this.elements.viewModeMonthly.classList.toggle("is-active", viewMode === "monthly");
      this.elements.viewModeMonthly.setAttribute("aria-selected", viewMode === "monthly" ? "true" : "false");
    }
    if (this.elements.viewModeDaily) {
      this.elements.viewModeDaily.classList.toggle("is-active", viewMode === "daily");
      this.elements.viewModeDaily.setAttribute("aria-selected", viewMode === "daily" ? "true" : "false");
    }

    const shouldDisablePdf = viewMode === "daily";
    if (this.elements.pdfButton) {
      this.elements.pdfButton.disabled = shouldDisablePdf || !this.groupedCategories.length;
    }

    this.updateLastUpdatedPills();
  }

  prepareWorkList() {
    const { headerEl, scroller, sortButtons } = initWorkListView({
      container: this.elements.workList,
      onSortChange: (column) => this.handleWorkSortChange(column),
      onWorkClick: (item, event) => {
        if (event && event.target.closest(".work-row-name-toggle")) return;
        this.openWorkModal(item);
      },
      initializeNameToggle: (nameWrapper) => this.initializeNameToggle(nameWrapper),
    });

    this.workHeaderEl = headerEl;
    this.elements.workListScroller = scroller;
    this.workSortButtons = sortButtons;
    this.updateWorkSortButtons();
  }

  clearWorkRows() {
    if (this.elements.workListScroller) {
      this.elements.workListScroller.innerHTML = "";
    }
  }

  renderWorkRows(works) {
    renderWorkRowsView({
      scroller: this.elements.workListScroller,
      works,
      onWorkClick: (item, event) => {
        if (event && event.target.closest(".work-row-name-toggle")) return;
        this.openWorkModal(item);
      },
      initializeNameToggle: (nameWrapper) => this.initializeNameToggle(nameWrapper),
    });
    requestAnimationFrame(() => this.updateWorkNameCollapsers());
  }

  bindEvents() {
    if (this.elements.workSortSelect) {
      this.elements.workSortSelect.addEventListener("change", (event) => {
        const column = event.target.value;
        this.handleWorkSortChange(column);
      });
    }
    this.elements.pdfButton.addEventListener("click", (event) => this.downloadPdfReport(event));
    if (this.elements.viewModeMonthly) {
      this.elements.viewModeMonthly.addEventListener("click", () => this.switchViewMode("monthly"));
    }
    if (this.elements.viewModeDaily) {
      this.elements.viewModeDaily.addEventListener("click", () => this.switchViewMode("daily"));
    }
  }

  async loadPdfModule() {
    if (this.pdfModule) return this.pdfModule;
    this.pdfModule = await import("@js/pdf-client.js").catch(() => null);
    return this.pdfModule;
  }

  async initMonthSelect() {
    if (typeof window !== "undefined") {
      window.__fetchAvailableMonths = async () => {
        const availableMonths = await this.dataManager.fetchAvailableMonths();
        return availableMonths || [];
      };

      window.__onMonthChange = (iso) => {
        if (!iso) return;
        this.loadMonthData(iso);
      };
    }
  }

  async initDaySelect() {
    if (typeof window !== "undefined") {
      window.__fetchAvailableDays = async () => {
        const availableDays = await this.dataManager.fetchAvailableDays();
        return availableDays || [];
      };
      // Выбор дня теперь обрабатывается Vue-компонентом DaySelect + DailyReport.
    }
  }

  getCurrentMonthIso() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }

  getCurrentDayIso() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getMonthKey(monthIso) {
    if (!monthIso) {
      return null;
    }

    // Пытаемся распарсить строку в формате YYYY-MM или YYYY-MM-DD
    const match = /^(\d{4})-(\d{1,2})/.exec(monthIso);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (!Number.isNaN(year) && month >= 1 && month <= 12) {
        // Возвращаем ключ с индексом месяца (0-based), как это делает getMonth()
        return `${year}-${month - 1}`;
      }
    }

    return null;
  }

  isCurrentMonth(monthIso) {
    const targetKey = this.getMonthKey(monthIso);
    if (!targetKey) {
      return false;
    }

    const today = new Date();
    const currentKey = `${today.getFullYear()}-${today.getMonth()}`;
    return targetKey === currentKey;
  }

  async switchViewMode(mode) {
    const normalized = mode === "daily" ? "daily" : "monthly";
    if (this.uiStore.getViewMode() === normalized) {
      return;
    }
    this.uiStore.setViewMode(normalized);
    this.updateViewModeLayout();

    if (normalized === "daily") {
      if (!this.dayOptionsLoaded) {
        await this.initDaySelect();
      }
      const availableDays = this.uiStore.getAvailableDays();
      const targetDay = this.elements.daySelect?.value
        || this.uiStore.getSelectedDay()
        || (availableDays[0] ? availableDays[0].iso : null)
        || this.getCurrentDayIso();
      if (targetDay) {
        this.setDaySelectValue(targetDay);
        await this.loadDailyData(targetDay);
      } else {
        this.showDailyEmptyState("Нет данных за текущий месяц");
      }
    } else {
      this.updateLastUpdatedPills();
    }
  }

  // downloadPdfReport определён ниже; здесь раньше был дублирующий фрагмент,
  // оставшийся от старой реализации. Он удалён как мёртвый код.

  updateDailyAverageVisibility(monthIso = this.uiStore.getSelectedMonth()) {
    const isCurrentMonth = this.isCurrentMonth(monthIso);
    if (this.elements.dailyAverageNote) {
      this.elements.dailyAverageNote.hidden = !isCurrentMonth;
    }
    if (this.elements.dailyAverageHint) {
      this.elements.dailyAverageHint.hidden = !isCurrentMonth;
    }
    // Подзаголовок в разделе «Расшифровка работ по смете» показываем только для текущего месяца
    if (this.elements.workDetailHint) {
      this.elements.workDetailHint.hidden = !isCurrentMonth;
    }
  }

  setMonthSelectPlaceholder(message) {
    if (!this.elements.monthSelect) {
      return;
    }
    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;
    option.disabled = true;
    option.selected = true;
    this.elements.monthSelect.appendChild(option);
    this.elements.monthSelect.disabled = true;
  }

  async loadMonthData(monthIso) {
    this.uiStore.setSelectedMonth(monthIso);
    this.selectedMonthIso = monthIso;
    this.updateDailyAverageVisibility(monthIso);
    const cached = this.dataManager.getCached(monthIso);
    if (cached) {
      this.applyData(cached);
    } else {
      this.showLoadingState();
    }
    try {
      const { data } = await this.dataManager.fetchData(monthIso, { force: Boolean(cached) });
      this.applyData(data);
      this.announce(`Данные за ${this.getSelectedMonthLabel() || "выбранный месяц"} обновлены.`);
    } catch (error) {
      console.error(error);
      if (!cached) {
        this.handleLoadError();
      } else {
        this.announce("Не удалось обновить данные");
      }
    }
  }

  showLoadingState() {
    this.groupedCategories = [];
    this.activeCategoryKey = null;
    this.summaryDailyRevenue = [];
    this.dailyRevenue = [];
    this.toggleSkeletons(true);
    this.elements.categoryGrid.innerHTML = "";
    this.lastUpdatedMonthlyLabel = null;
    this.lastUpdatedMonthlyDateLabel = null;
    this.updateLastUpdatedPills();
    if (typeof window !== "undefined" && typeof window.__vueSetMonthlyLastUpdatedStatus === "function") {
      window.__vueSetMonthlyLastUpdatedStatus("loading");
    }
    // Сводка теперь рендерится Vue: уведомляем её о состоянии загрузки,
    // а прямой доступ к DOM-элементам sumPlanned/sumFact/sumDelta убираем.
    if (typeof window !== "undefined" && typeof window.__vueSetSummaryMetrics === "function") {
      window.__vueSetSummaryMetrics({
        planned: null,
        fact: null,
        delta: null,
        completion: null,
        completionLabel: "…",
      });
    }
    if (typeof window !== "undefined" && typeof window.__vueSetDailyAverage === "function") {
      window.__vueSetDailyAverage({
        averageValue: null,
        daysWithData: 0,
        isCurrentMonth: false,
      });
    }
    this.setActiveCategoryTitle("Загрузка...");
    this.elements.workEmptyState.style.display = "none";
    this.elements.workList.classList.remove("has-data");
    this.workHeaderEl.hidden = true;
    this.elements.workListScroller.style.display = "none";
    this.clearWorkRows();
    this.elements.pdfButton.disabled = true;
    this.updateContractCard(null);
  }

  handleLoadError() {
    this.toggleSkeletons(false);
    this.elements.workEmptyState.style.display = "block";
    this.elements.workEmptyState.textContent = "Ошибка загрузки данных";
    this.lastUpdatedMonthlyLabel = null;
    this.lastUpdatedMonthlyDateLabel = null;
    this.updateLastUpdatedPills();
    if (typeof window !== "undefined" && typeof window.__vueSetMonthlyLastUpdatedStatus === "function") {
      window.__vueSetMonthlyLastUpdatedStatus("error");
    }
    // Сводка теперь управляется Vue, поэтому обновляем её через глобальный хук,
    // а прямые манипуляции с DOM-элементами sum* убираем.
    if (typeof window !== "undefined" && typeof window.__vueSetSummaryMetrics === "function") {
      window.__vueSetSummaryMetrics({
        planned: null,
        fact: null,
        delta: null,
        completion: null,
        completionLabel: "–",
      });
    }
    this.summaryDailyRevenue = [];
    this.dailyRevenue = [];
    if (typeof window !== "undefined" && typeof window.__vueSetDailyAverage === "function") {
      window.__vueSetDailyAverage({
        averageValue: null,
        daysWithData: 0,
        isCurrentMonth: false,
      });
    }
    this.updateContractCard(null);
    this.setActiveCategoryTitle("Смета не выбрана");
    this.elements.workList.classList.remove("has-data");
    this.workHeaderEl.hidden = true;
    this.elements.workListScroller.style.display = "none";
    this.clearWorkRows();
    this.elements.pdfButton.disabled = true;
    this.elements.categoryGrid.innerHTML = '<div class="empty-state">Ошибка загрузки данных</div>';
  }

  applyData(data) {
    this.dataManager.setCurrentData(data);
    this.toggleSkeletons(false);
    const items = Array.isArray(data.items) ? data.items : [];
    this.groupedCategories = this.dataManager.buildCategories(items);
    this.ensureActiveCategory();
    const hasData = data.has_data;
    const lastUpdatedLabel = hasData
      ? formatDateTime(data.last_updated)
      : "Нет данных";
    const lastUpdatedDateLabel = hasData
      ? formatDate(data.last_updated, { day: "2-digit", month: "2-digit", year: "numeric" })
      : "Нет данных";
    this.lastUpdatedMonthlyLabel = lastUpdatedLabel;
    this.lastUpdatedMonthlyDateLabel = lastUpdatedDateLabel;
    this.updateLastUpdatedPills();
    if (typeof window !== "undefined" && typeof window.__vueSetLastUpdatedFromDb === "function") {
      window.__vueSetLastUpdatedFromDb(lastUpdatedLabel);
    }
    if (typeof window !== "undefined" && typeof window.__vueSetMonthlyLastUpdatedStatus === "function") {
      window.__vueSetMonthlyLastUpdatedStatus(hasData ? "idle" : "idle");
    }
    const hasAnyData = data.has_data && items.length > 0;
    this.elements.pdfButton.disabled = !hasAnyData;
    // Отладка: логируем метрики, которые передаются во Vue-компоненты
    const metrics = this.dataManager.calculateMetrics(data);
    console.log('[DEBUG] Metrics for Vue:', metrics);
    // Обновляем Vue-компоненты с метриками
    if (typeof window !== "undefined" && typeof window.__vueSetSummaryMetrics === "function") {
      window.__vueSetSummaryMetrics({
        planned: metrics?.planned ?? null,
        fact: metrics?.fact ?? null,
        delta: metrics?.delta ?? null,
        completion: metrics?.completion ?? null,
        completionLabel: metrics?.completion !== null && metrics?.completion !== undefined ?
          (typeof formatPercent === 'function' ? formatPercent(metrics.completion) : "–") : "–",
      });
    }
    if (typeof window !== "undefined" && typeof window.__vueSetDailyAverage === "function") {
      window.__vueSetDailyAverage({
        averageValue: metrics?.averageDailyRevenue ?? null,
        daysWithData: Array.isArray(metrics?.dailyRevenue) ? metrics.dailyRevenue.length : 0,
        isCurrentMonth: this.isCurrentMonth(this.uiStore.getSelectedMonth()),
        summaryDailyRevenue: Array.isArray(metrics?.dailyRevenue) ? metrics.dailyRevenue : [],
        selectedMonthLabel: this.getSelectedMonthLabel ? this.getSelectedMonthLabel() : '',
      });
    }
    // Обновляем Vue-компонент ContractCard
    const contractMetrics = this.dataManager.calculateContractMetrics(data);
    if (typeof window !== "undefined" && typeof window.__vueSetContractMetrics === "function") {
      window.__vueSetContractMetrics({
        contractAmount: contractMetrics?.contractAmount ?? null,
        executed: contractMetrics?.executed ?? null,
        completion: contractMetrics?.completion ?? null,
        // Можно добавить titleDate, если нужно
      });
    }
    this.renderCategories();
    this.renderWorkList();
  }

  ensureActiveCategory() {
    if (this.activeCategoryKey && this.groupedCategories.some((cat) => cat.key === this.activeCategoryKey)) {
      return;
    }
    this.activeCategoryKey = this.groupedCategories.length ? this.groupedCategories[0].key : null;
  }

  // ...existing code...

  // ...existing code...

  updateLastUpdatedPills() {
    const monthlyLabel = this.lastUpdatedMonthlyLabel || "Нет данных";
    const monthlyDateLabel = this.lastUpdatedMonthlyDateLabel || monthlyLabel;
    const dailyLabel = this.lastUpdatedDailyLabel || monthlyLabel;
    const dailyDateLabel = this.lastUpdatedDailyDateLabel || dailyLabel;

    if (this.uiStore.getViewMode() === "daily") {
      this.updateContractTitleDate(dailyDateLabel);
    } else {
      this.updateContractTitleDate(monthlyDateLabel);
    }

    if (typeof window !== "undefined" && typeof window.__vueSetLastUpdatedFromDb === "function") {
      window.__vueSetLastUpdatedFromDb(monthlyLabel);
    }
  }

  updateContractTitleDate(label) {
    if (!this.elements.contractTitleDate) {
      return;
    }
    this.elements.contractTitleDate.textContent = label ? `на ${label}` : "";
  }

  updateContractCard(contractMetrics) {
    // Обновляем Vue-карточку напрямую
    this.contractMetrics = contractMetrics || null;
    if (typeof window !== "undefined" && typeof window.__vueSetContractMetrics === "function") {
      window.__vueSetContractMetrics({
        contractAmount: contractMetrics?.contractAmount ?? null,
        executed: contractMetrics?.executed ?? null,
        completion: contractMetrics?.completion ?? null,
      });
    }
  }

  updateContractProgress(completion) {
    updateContractProgressExternal({ completion, elements: this.elements });
  }

  // ...existing code...

  setDaySelectValue(dayIso) {
    if (!this.elements.daySelect || !dayIso) {
      return;
    }
    this.elements.daySelect.value = dayIso;
  }

  showDailyLoadingState() {
    showDailyLoadingState({
      elements: this.elements,
      setLastUpdated: () => {},
    });
  }

  handleDailyLoadError(message = "Ошибка загрузки данных") {
    handleDailyLoadError({
      elements: this.elements,
      message,
      setLastUpdated: () => {},
      updateLastUpdatedPills: () => {},
    });
  }

  showDailyEmptyState(message) {
    showDailyEmptyState({ elements: this.elements, message });
  }

  applyDailyData(data) {
    this.currentDailyData = data;
    // Vue-компонент DailyReport теперь сам отвечает за отрисовку дневных данных.
    if (typeof window !== "undefined" && typeof window.__vueSetDailyReport === "function") {
      const items = Array.isArray(data?.items) ? data.items : [];
      const hasData = Boolean(data?.has_data);

      window.__vueSetDailyReport({
        isLoading: false,
        hasData,
        selectedDateIso: data?.date || null,
        items,
      });
    }
  }

  async loadDailyData(dayIso) {
    if (!dayIso) {
      this.handleDailyLoadError("Выберите день, чтобы загрузить данные");
      return;
    }
    this.selectedDayIso = dayIso;
    this.setDaySelectValue(dayIso);
    const cached = this.dataManager.getCachedDaily(dayIso);
    if (cached) {
      this.applyDailyData(cached);
    } else {
      this.showDailyLoadingState();
    }

    try {
      const { data } = await this.dataManager.fetchDailyReport(dayIso, { force: Boolean(cached) });
      this.applyDailyData(data);
      this.announce(`Данные за ${formatDailyDateLabel(dayIso)} обновлены.`);
    } catch (error) {
      console.error(error);
      if (!cached) {
        this.handleDailyLoadError();
      } else {
        this.announce("Не удалось обновить данные дня");
      }
    }
  }


  async openWorkModal(item) {
    const monthIso = this.uiStore.getSelectedMonth();
    if (!item || !this.elements.dailyModal || !this.isCurrentMonth(monthIso)) {
      return;
    }
    this.selectedMonthIso = monthIso;
  try {
    const dailyRevenue = await openWorkModalView({
      elements: this.elements,
      item,
      selectedMonthIso: this.selectedMonthIso,
      dataManager: this.dataManager,
      visitorTracker: this.visitorTracker,
      setDailyModalState: ({ mode, dailyRevenue: revenue }) => {
      this.dailyModalMode = mode;
      this.dailyRevenue = revenue;
      },
    });
    this.dailyRevenue = dailyRevenue || [];
    this.renderDailyModalList();
  } catch (err) {
    console.error("Ошибка загрузки расшифровки по работе:", err);
    showToast("Не удалось загрузить расшифровку по работе.", "error");
  }
  }

  closeDailyModal() {
  closeDailyModalViewFacade({ elements: this.elements });
  }

  renderDailyModalList() {
  renderDailyModalListViewFacade({
    elements: this.elements,
    dailyRevenue: this.dailyRevenue,
    dailyModalMode: this.dailyModalMode,
    selectedMonthLabel: this.getSelectedMonthLabel(),
  });
  }

  renderCategories() {
  renderCategoriesFacade({
    groupedCategories: this.groupedCategories,
    activeCategoryKey: this.activeCategoryKey,
    elements: this.elements,
    onSelect: (key) => {
    this.activeCategoryKey = key;
    this.renderCategories();
    this.renderWorkList();
    },
  });

    this.enhanceAccessibility();
  }

  renderWorkList() {
    const currentData = this.dataManager.getCurrentData();
    const activeCategory = this.groupedCategories.find((cat) => cat.key === this.activeCategoryKey) || null;
    if (this.elements.workSortSelect) {
      this.elements.workSortSelect.disabled = !activeCategory;
    }

    if (!activeCategory) {
      this.elements.workEmptyState.style.display = "block";
      this.elements.workEmptyState.textContent = currentData && !currentData.has_data
        ? "Данные за выбранный месяц отсутствуют"
        : "Здесь появится список работ выбранной сметы.";
      this.setActiveCategoryTitle("Смета не выбрана");
      this.elements.workList.classList.remove("has-data");
      this.workHeaderEl.hidden = true;
      this.elements.workListScroller.style.display = "none";
      this.clearWorkRows();
      return;
    }

    const works = [...activeCategory.works];

    this.sortWorks(works);

    this.setActiveCategoryTitle(
      `Расшифровка работ по смете «${activeCategory.title}»`,
      activeCategory.title
    );

    if (!works.length) {
      this.elements.workEmptyState.style.display = "block";
      this.elements.workEmptyState.textContent = "В этой смете нет строк для отображения";
      this.elements.workList.classList.remove("has-data");
      this.workHeaderEl.hidden = true;
      this.elements.workListScroller.style.display = "none";
      this.clearWorkRows();
      return;
    }

    this.elements.workEmptyState.style.display = "none";
    this.elements.workList.classList.add("has-data");
    this.workHeaderEl.hidden = false;
    this.elements.workListScroller.style.display = "block";
    this.renderWorkRows(works);
  }

  handleWorkSortChange(column) {
    if (!column || this.workSort.column === column) {
      return;
    }
    this.workSort.column = column;
    this.updateWorkSortButtons();
    this.renderWorkList();
  }

  updateWorkSortButtons() {
    if (this.workSortButtons) {
      this.workSortButtons.forEach((button) => {
        const isActive = button.dataset.sort === this.workSort.column;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }
    if (this.elements.workSortSelect && this.elements.workSortSelect.value !== this.workSort.column) {
      this.elements.workSortSelect.value = this.workSort.column;
    }
  }

  getSortValueForWork(item) {
    if (!item) {
      return Number.NEGATIVE_INFINITY;
    }
    let value;
    switch (this.workSort.column) {
      case "fact":
        value = item.fact_amount;
        break;
      case "delta":
        value = calculateDelta(item);
        break;
      case "planned":
      default:
        value = item.planned_amount ?? item.fact_amount;
        break;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY;
  }

  sortWorks(works) {
    if (!Array.isArray(works)) {
      return works;
    }
    if (this.workSort.column === "delta") {
      works.sort((a, b) => {
        const deltaA = calculateDelta(a);
        const deltaB = calculateDelta(b);
        const isNegativeA = deltaA < 0;
        const isNegativeB = deltaB < 0;

        if (isNegativeA !== isNegativeB) {
          return isNegativeA ? -1 : 1;
        }

        if (isNegativeA && isNegativeB) {
          const diff = deltaA - deltaB;
          if (diff !== 0) {
            return diff;
          }
        } else {
          const diff = deltaB - deltaA;
          if (diff !== 0) {
            return diff;
          }
        }

        const nameA = (a?.work_name || a?.description || "").toLowerCase();
        const nameB = (b?.work_name || b?.description || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      return works;
    }

    works.sort((a, b) => {
      const valueA = this.getSortValueForWork(a);
      const valueB = this.getSortValueForWork(b);
      const diff = valueB - valueA;
      if (diff !== 0) {
        return diff;
      }
      const nameA = (a?.work_name || a?.description || "").toLowerCase();
      const nameB = (b?.work_name || b?.description || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return works;
  }

  initializeNameToggle(nameWrapper) {
    if (!nameWrapper) {
      return;
    }
    const toggleBtn = nameWrapper.querySelector(".work-row-name-toggle");
    if (!toggleBtn) {
      return;
    }
    nameWrapper.dataset.expanded = "false";
    toggleBtn.addEventListener("click", () => {
      const isExpanded = nameWrapper.classList.toggle("work-row-name--expanded");
      if (isExpanded) {
        nameWrapper.classList.remove("work-row-name--collapsed");
      } else {
        nameWrapper.classList.add("work-row-name--collapsed");
      }
      nameWrapper.dataset.expanded = String(isExpanded);
      toggleBtn.setAttribute("aria-expanded", String(isExpanded));
      toggleBtn.setAttribute(
        "aria-label",
        isExpanded ? "Свернуть название" : "Развернуть полное название"
      );
    });
  }

  updateNameCollapsers(container) {
    if (!container) {
      return;
    }
    const nameWrappers = container.querySelectorAll(".work-row-name");
    nameWrappers.forEach((wrapper) => {
      const textEl = wrapper.querySelector(".work-row-name-text");
      const toggleBtn = wrapper.querySelector(".work-row-name-toggle");
      if (!textEl || !toggleBtn) {
        return;
      }

      const isExpanded = wrapper.dataset.expanded === "true";
      wrapper.classList.toggle("work-row-name--expanded", isExpanded);
      if (isExpanded) {
        wrapper.classList.remove("work-row-name--collapsed");
      } else {
        wrapper.classList.add("work-row-name--collapsed");
      }
      toggleBtn.setAttribute("aria-expanded", String(isExpanded));
      toggleBtn.setAttribute(
        "aria-label",
        isExpanded ? "Свернуть название" : "Развернуть полное название"
      );
      wrapper.classList.remove("work-row-name--collapsible");
      toggleBtn.hidden = true;

      const lineHeight = parseFloat(window.getComputedStyle(textEl).lineHeight || "0");
      const maxHeight = lineHeight && !Number.isNaN(lineHeight) ? lineHeight * 2 : null;
      const isOverflowing = maxHeight
        ? textEl.scrollHeight > maxHeight + 1
        : textEl.scrollHeight > textEl.offsetHeight + 1;
      if (isOverflowing) {
        wrapper.classList.add("work-row-name--collapsible");
        toggleBtn.hidden = false;
      } else if (!isExpanded) {
        wrapper.classList.remove("work-row-name--collapsed");
      }
    });
  }

  updateDailyNameCollapsers() {
    this.updateNameCollapsers(this.elements.dailyTable);
  }

  createWorkRow(item, index, total) {
    const workName = item.work_name || item.description || "Без названия";
    const delta = calculateDelta(item);
    const deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "";
    const plannedFormatted = formatMoney(item.planned_amount);
    const factFormatted = formatMoney(item.fact_amount);
    const deltaFormatted = formatMoney(delta);
    const row = document.createElement("div");
    row.className = "work-row";
    if (index === total - 1) {
      row.classList.add("work-row-last");
    }
    row.innerHTML = `
      <div class="work-row-name work-row-name--collapsed" data-expanded="false">
        <span class="work-row-name-text">${workName}</span>
        <button
          type="button"
          class="work-row-name-toggle"
          aria-expanded="false"
          aria-label="Развернуть полное название"
        >
          <span class="work-row-name-toggle-icon" aria-hidden="true"></span>
        </button>
      </div>
      <div class="work-row-money work-row-plan">
        <span class="work-row-label">План</span>
        <span>${plannedFormatted}</span>
      </div>
      <div class="work-row-money work-row-fact">
        <span class="work-row-label">Факт</span>
        <span>${factFormatted}</span>
      </div>
      <div class="work-row-delta ${deltaClass}">
        <span class="work-row-label">Отклонение</span>
        <span class="work-row-delta-value">${deltaFormatted}</span>
      </div>
    `;
    this.initializeNameToggle(row.querySelector(".work-row-name"));
    // Клик по строке работы открывает подневную расшифровку (только для текущего месяца).
    row.addEventListener("click", (event) => {
      // не обрабатываем клик по кнопке разворачивания названия
      if (event.target.closest(".work-row-name-toggle")) return;
      try {
        this.openWorkModal(item);
      } catch (err) {
        // Ошибка обработки — логируем и показываем тост
        console.error(err);
      }
    });
    return row;
  }

  updateWorkNameCollapsers() {
    this.updateNameCollapsers(this.elements.workListScroller);
  }

  getSelectedMonthLabel() {
    const selectedMonthIso = this.uiStore.getSelectedMonth() || this.selectedMonthIso;
    if (!selectedMonthIso) {
      return "";
    }
    try {
      const date = new Date(selectedMonthIso);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  async downloadPdfReport(event) {
    event.preventDefault();
    if (this.elements.pdfButton.disabled) {
      return;
    }
    const currentMonthIso = this.uiStore.getSelectedMonth() || this.selectedMonthIso || "";
    const selectedMonth = this.getSelectedMonthLabel() || currentMonthIso || "period";
    const fileNameSlug = selectedMonth
      .toString()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^0-9A-Za-zА-Яа-я\-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = fileNameSlug ? `mad-podolsk-otchet-${fileNameSlug}.pdf` : "mad-podolsk-otchet.pdf";
    this.elements.pdfButton.disabled = true;
    this.elements.pdfButton.innerHTML = "Формируем PDF…";
    try {
      const pdfUrl = new URL(this.apiPdfUrl, window.location.origin);
      if (currentMonthIso) {
        pdfUrl.searchParams.set("month", currentMonthIso);
      }
      const response = await fetch(pdfUrl.toString(), {
        headers: {
          Accept: "application/pdf",
          ...(this.visitorTracker ? this.visitorTracker.buildHeaders() : {}),
        },
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      this.announce("PDF-отчёт сформирован.");
    } catch (error) {
      console.error("PDF export error", error);
      showToast("Не удалось сформировать PDF. Попробуйте ещё раз позже.", "error");
      this.announce("Ошибка формирования PDF");
    } finally {
      this.elements.pdfButton.innerHTML = this.pdfButtonDefaultLabel;
      this.elements.pdfButton.disabled = !this.groupedCategories.length;
    }
  }

  enhanceAccessibility() {
    const cards = this.elements.categoryGrid.querySelectorAll(".category-card");
    cards.forEach((card, index) => {
      const title = card.querySelector(".category-title span")?.textContent?.trim() || `Смета ${index + 1}`;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Смета ${title}`);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          card.click();
        }
      });
    });
  }

  createLiveRegion() {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  announce(message) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = "";
    requestAnimationFrame(() => {
      this.liveRegion.textContent = message;
    });
  }
}
