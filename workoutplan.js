class WorkoutPlan {
  constructor() {
    this.minLevel = 1;
    this.maxLevel = 50;
    this.minTotalReps = 10;
    this.maxTotalReps = 500;
    this.minSeries = 4;
    this.maxSeries = 12;
    this.maxSeriesLevel = 35;
  }

  getSeries(fitLevel) {
    fitLevel = Math.max(this.minLevel, Math.min(this.maxLevel, fitLevel));
    const totalReps = this._computeTotalReps(fitLevel);
    const seriesCount = this._computeSeriesCount(fitLevel);
    return this._deterministicDistributeReps(totalReps, seriesCount);
  }

  _computeTotalReps(fitLevel) {
    let totalReps = this.minTotalReps;
    for (let level = 2; level <= fitLevel; level++) {
      const growth = this._growthRate(level);
      totalReps *= (1 + growth);
    }
    return Math.round(totalReps);
  }

  _growthRate(level) {
    if (level < 10) return 0.15;
    if (level < 20) return 0.10;
    return 0.05;
  }

  _computeSeriesCount(fitLevel) {
    const cappedLevel = Math.min(fitLevel, this.maxSeriesLevel);
    const fraction = (cappedLevel - this.minLevel) / (this.maxSeriesLevel - this.minLevel);
    return Math.round(this.minSeries + (this.maxSeries - this.minSeries) * fraction);
  }

  _deterministicDistributeReps(totalReps, seriesCount) {
    const base = Math.floor(totalReps / seriesCount);
    const reps = Array(seriesCount).fill(base);
    let remaining = totalReps - reps.reduce((a, b) => a + b, 0);

    let index = 0;
    let step = 1;
    while (remaining > 0) {
      reps[index]++;
      remaining--;
      index += step;
      if (index >= seriesCount) {
        index = 0;
        step++;
      }
    }

    for (let i = 1; i < seriesCount - 1; i++) {
      if (reps[i] === reps[i - 1] && reps[i] === reps[i + 1]) {
        if (reps[i] > 1) {
          reps[i]--;
          reps[i + 1]++;
        }
      }
    }

    return reps;
  }
}
