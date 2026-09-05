export interface FiscalYearBoundary {
  startDate: Date;
  endDate: Date;
}

export class FiscalYearUtility {
  /**
   * Calculates the fiscal year boundary for a given date.
   * In Pakistan, the fiscal year begins on July 1st and ends on June 30th.
   *
   * Month >= 7 (July - December):
   *   startDate: July 1 of current year
   *   endDate:   June 30 of next year
   *
   * Month < 7 (January - June):
   *   startDate: July 1 of previous year
   *   endDate:   June 30 of current year
   */
  static getBoundaries(inputDate: Date | string = new Date()): FiscalYearBoundary {
    const d = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
    const currentMonth = d.getMonth() + 1; // 1-indexed (1 to 12)
    const currentYear = d.getFullYear();

    let fiscalStartYear: number;
    let fiscalEndYear: number;

    if (currentMonth >= 7) {
      fiscalStartYear = currentYear;
      fiscalEndYear = currentYear + 1;
    } else {
      fiscalStartYear = currentYear - 1;
      fiscalEndYear = currentYear;
    }

    return {
      startDate: new Date(`${fiscalStartYear}-07-01T00:00:00.000Z`),
      endDate: new Date(`${fiscalEndYear}-06-30T23:59:59.999Z`)
    };
  }

  /**
   * Convenience helper returning the current active fiscal year boundaries.
   */
  static getCurrentBoundary(): FiscalYearBoundary {
    return this.getBoundaries(new Date());
  }
}
