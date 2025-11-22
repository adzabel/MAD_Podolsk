import { formatDate } from "@js/utils.js";

export function openAverageDailyModal({ elements, summaryDailyRevenue, selectedMonthLabel, isCurrentMonth }) {
  if (!summaryDailyRevenue.length || !elements.dailyModal || !isCurrentMonth) {
    return;
  }

  const titleEl = elements.dailyModal.querySelector("#daily-modal-title") || document.getElementById("daily-modal-title");
  if (titleEl) titleEl.textContent = "Среднедневная выручка";

  const monthLabel = selectedMonthLabel || "выбранный месяц";
  if (elements.dailyModalSubtitle) {
    elements.dailyModalSubtitle.textContent = `По дням за ${monthLabel.toLowerCase()}`;
  }

  elements.dailyModal.classList.add("visible");
  elements.dailyModal.setAttribute("aria-hidden", "false");
}

export function openWorkBreakdownModal({ elements, workName }) {
  if (!elements.dailyModal || !workName) {
    return;
  }

  const titleEl = elements.dailyModal.querySelector("#daily-modal-title") || document.getElementById("daily-modal-title");
  if (titleEl) titleEl.textContent = `Расшифровка: ${workName}`;
  if (elements.dailyModalSubtitle) {
    elements.dailyModalSubtitle.textContent = "";
  }

  elements.dailyModal.classList.add("visible");
  elements.dailyModal.setAttribute("aria-hidden", "false");
}

export function closeDailyModalView({ elements }) {
  if (!elements.dailyModal) return;
  elements.dailyModal.classList.remove("visible");
  elements.dailyModal.setAttribute("aria-hidden", "true");
}

export function renderDailyModalListView({
  elements,
  dailyRevenue,
  dailyModalMode,
  selectedMonthLabel,
}) {
  if (!elements.dailyModalList || !elements.dailyModalEmpty) return;

  const monthLabel = selectedMonthLabel || "выбранный месяц";
  if (elements.dailyModalSubtitle) {
    elements.dailyModalSubtitle.textContent = `По дням за ${monthLabel.toLowerCase()}`;
  }

  elements.dailyModalList.innerHTML = "";
  const sorted = [...dailyRevenue].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!sorted.length) {
    elements.dailyModalEmpty.style.display = "block";
    elements.dailyModalList.style.display = "none";
    return;
  }

  elements.dailyModalEmpty.style.display = "none";
  elements.dailyModalList.style.display = "grid";

  const isWorkMode =
    dailyModalMode === "work"
    || sorted.some((it) => it.unit || (it.total_amount !== null && it.total_amount !== undefined));

  const header = document.createElement("div");
  header.className = "modal-row modal-row-header";
  if (isWorkMode) {
    header.innerHTML = `
      <div class="modal-row-date">Дата</div>
      <div class="modal-row-value"><span class="modal-value-number">Объем</span></div>
      <div class="modal-row-sum">Сумма,₽</div>
    `;
  } else {
    header.innerHTML = `
      <div class="modal-row-date">Дата</div>
      <div class="modal-row-sum">Сумма, ₽</div>
    `;
  }
  elements.dailyModalList.appendChild(header);

  const fragment = document.createDocumentFragment();
  sorted.forEach((item) => {
    const row = document.createElement("div");
    row.className = "modal-row";

    const isMobile = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : false;
    const dateLabel = isMobile
      ? formatDate(item.date, { day: "2-digit", month: "2-digit" })
      : formatDate(item.date);

    if (isWorkMode) {
      const amount = Number(item.amount);
      const formattedAmount = Number.isFinite(amount) ? amount.toFixed(1) : "–";
      const unit = item.unit || "";
      const totalAmount = Number(item.total_amount);
      const formattedTotal = Number.isFinite(totalAmount)
        ? totalAmount.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "–";
      row.innerHTML = `
        <div class="modal-row-date">${dateLabel}</div>
        <div class="modal-row-value">
          <span class="modal-value-number">${formattedAmount}</span>
          ${unit ? `<span class="modal-value-unit">(${unit})</span>` : ""}
        </div>
        <div class="modal-row-sum">${formattedTotal}</div>
      `;
    } else {
      const sumAmount = Number(item.amount);
      const formattedSum = Number.isFinite(sumAmount)
        ? sumAmount.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "–";
      row.innerHTML = `
        <div class="modal-row-date">${dateLabel}</div>
        <div class="modal-row-sum">${formattedSum}</div>
      `;
    }

    fragment.appendChild(row);
  });

  elements.dailyModalList.appendChild(fragment);
}
