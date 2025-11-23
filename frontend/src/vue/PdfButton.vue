<template>
  <div class="pdf-button-wrapper">
    <button
      class="btn btn-airy btn-pdf-compact"
      type="button"
      aria-live="polite"
      :disabled="isDisabled"
      @click="handleDownload"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.5" width="18" height="18">
        <path d="M12 3v11m-4-4l4 4 4-4M4 19h16" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <span>{{ buttonLabel }}</span>
    </button>
    <span class="sr-only" aria-live="polite">{{ liveRegionMessage }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { showToast } from "@shared/utils.js";
import { usePdfStore } from "./usePdfStore.js";

const pdfStore = usePdfStore();
const liveRegionMessage = ref("");

const buttonLabel = computed(() => (pdfStore.state.isDownloading ? "Формируем PDF…" : pdfStore.state.defaultLabel));
const isDisabled = computed(() => pdfStore.state.isDisabled);

const buildFileName = () => {
  const selectedMonth = pdfStore.state.selectedMonthLabel || pdfStore.state.selectedMonthIso || "period";
  const fileNameSlug = selectedMonth
    .toString()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^0-9A-Za-zА-Яа-я\-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return fileNameSlug ? `mad-podolsk-otchet-${fileNameSlug}.pdf` : "mad-podolsk-otchet.pdf";
};

const announce = (message) => {
  liveRegionMessage.value = "";
  requestAnimationFrame(() => {
    liveRegionMessage.value = message;
  });
};

const handleDownload = async () => {
  if (isDisabled.value) return;
  const fileName = buildFileName();
  pdfStore.startDownloading();
  announce("");
  try {
    const pdfUrl = new URL(pdfStore.state.apiPdfUrl, window.location.origin);
    if (pdfStore.state.selectedMonthIso) {
      pdfUrl.searchParams.set("month", pdfStore.state.selectedMonthIso);
    }
    const headers = {
      Accept: "application/pdf",
      ...(pdfStore.state.visitorTracker ? pdfStore.state.visitorTracker.buildHeaders() : {}),
    };
    const response = await fetch(pdfUrl.toString(), { headers });
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
    announce("PDF-отчёт сформирован.");
  } catch (error) {
    console.error("PDF export error", error);
    showToast("Не удалось сформировать PDF. Попробуйте ещё раз позже.", "error");
    announce("Ошибка формирования PDF");
  } finally {
    pdfStore.finishDownloading();
  }
};
</script>
