import { reactive, readonly } from "vue";

const state = reactive({
  labelFromDb: "Нет данных",
  monthlyStatus: "loading",
  dailyStatus: "loading",
});

export function useLastUpdatedStore() {
  function setLabelFromDb(label) {
    state.labelFromDb = label || "Нет данных";
  }

  function setMonthlyStatus(status) {
    state.monthlyStatus = status || "idle";
  }

  function setDailyStatus(status) {
    state.dailyStatus = status || "idle";
  }

  return {
    state: readonly(state),
    setLabelFromDb,
    setMonthlyStatus,
    setDailyStatus,
  };
}
