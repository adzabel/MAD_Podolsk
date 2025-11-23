import { cacheDomElements, setElementsDisabled } from "@shared/utils.js";
import { DataManager } from "@js/services/data-service.js";
import { VisitorTracker } from "@js/services/visitor-service.js";
import { UIManager } from "@js/components.js";
import {
  API_URL,
  API_BASE,
  API_PDF_URL,
  API_MONTHS_URL,
  API_DAYS_URL,
  API_DAILY_URL,
  MOBILE_MEDIA_QUERY,
  DEFAULT_PDF_LABEL,
  SELECTORS,
} from "@config/config.frontend.js";

export function initDom() {
  const elements = cacheDomElements(SELECTORS);

  const pdfButtonDefaultLabel = elements.pdfButton ? elements.pdfButton.innerHTML : DEFAULT_PDF_LABEL;
  setElementsDisabled(
    {
      pdfButton: elements.pdfButton,
      workSortSelect: elements.workSortSelect,
    },
    true,
  );

  const pdfMobileMediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  const movePdfButton = (isMobile) => {
    if (!elements.pdfButton || !elements.pdfButtonContainerDesktop || !elements.pdfButtonContainerMobile) {
      return;
    }

    const target = isMobile ? elements.pdfButtonContainerMobile : elements.pdfButtonContainerDesktop;
    if (elements.pdfButton.parentElement !== target) {
      target.appendChild(elements.pdfButton);
    }
  };

  movePdfButton(pdfMobileMediaQuery.matches);
  pdfMobileMediaQuery.addEventListener("change", (event) => movePdfButton(event.matches));

  return { elements, pdfButtonDefaultLabel };
}

export function initServices() {
  const visitorTracker = new VisitorTracker();

  const dataManager = new DataManager(API_URL, {
    monthsUrl: API_MONTHS_URL,
    daysUrl: API_DAYS_URL,
    dailyUrl: API_DAILY_URL,
    visitorTracker,
  });

  return { visitorTracker, dataManager };
}

export function initUi({ elements, pdfButtonDefaultLabel, dataManager, visitorTracker }) {
  const uiManager = new UIManager({
    dataManager,
    elements,
    apiPdfUrl: API_PDF_URL,
    pdfButtonDefaultLabel,
    visitorTracker,
  });

  uiManager.init();

  return { uiManager };
}

export function bootstrapApp() {
  const { elements, pdfButtonDefaultLabel } = initDom();
  const { visitorTracker, dataManager } = initServices();
  const { uiManager } = initUi({ elements, pdfButtonDefaultLabel, dataManager, visitorTracker });

  // Вызовем window.__onUiReady, если она определена, чтобы смонтировать Vue-компоненты
  if (typeof window !== "undefined" && typeof window.__onUiReady === "function") {
    window.__onUiReady(uiManager);
  }

  const endpointPath = new URL(API_URL, window.location.origin).pathname;
  visitorTracker.logInitialVisit({ apiBase: API_BASE, endpoint: endpointPath });
}
