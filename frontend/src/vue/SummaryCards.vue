

  plan: { type: Number, default: null },
  fact: { type: Number, default: null },
  deviation: { type: Number, default: null },
  isInteractive: { type: Boolean, default: false },
  dailyAverage: { type: Number, default: null },
  daysWithData: { type: Number, default: 0 },
  isCurrentMonth: { type: Boolean, default: false },
  factProgress: { type: Number, default: null },
  factProgressLabel: { type: String, default: "–" }
});
</script>


<style>
.summary-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  width: 100%;
  margin-bottom: 32px;
}

.summary-cards > * {
  width: 100%;
  min-width: 0;
}

@media (min-width: 900px) {
  .summary-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
