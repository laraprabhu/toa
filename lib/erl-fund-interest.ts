export interface CompoundPayment {
  date: string;
  amountPaise: number;
}

export interface AnnualCompoundInput {
  openingBalancePaise: number;
  annualRatePercent: number;
  startDate: string;
  payments: CompoundPayment[];
  now: number;
}

export interface AnnualCompoundResult {
  totalDebtPaise: number;
  dailyInterestPaise: number;
  completedYears: number;
  currentYearElapsedDays: number;
  currentYearTotalDays: number;
  totalElapsedDays: number;
}

const millisecondsPerDay = 86_400_000;

export function calculateAnnualCompoundBalance({
  openingBalancePaise,
  annualRatePercent,
  startDate,
  payments,
  now,
}: AnnualCompoundInput): AnnualCompoundResult {
  const startTimestamp = indiaDateStartUtc(startDate);
  const currentTimestamp = Math.max(now, startTimestamp);
  const annualRate = annualRatePercent / 100;
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const paymentEvents = payments
    .map((payment) => ({
      timestamp: Math.max(startTimestamp, indiaDateStartUtc(payment.date)),
      amountPaise: payment.amountPaise,
    }))
    .filter((payment) => payment.timestamp <= currentTimestamp)
    .sort((left, right) => left.timestamp - right.timestamp);

  let capitalizedBalance = openingBalancePaise;
  let accruedInterest = 0;
  let completedYears = 0;
  let paymentIndex = 0;
  let periodStart = startTimestamp;
  let currentYearElapsedDays = 0;
  let currentYearTotalDays = 0;

  while (periodStart <= currentTimestamp) {
    const periodEnd = indiaDatePartsStartUtc(
      startYear + completedYears + 1,
      startMonth,
      startDay,
    );
    const segmentEnd = Math.min(currentTimestamp, periodEnd);
    const periodMilliseconds = periodEnd - periodStart;
    let cursor = periodStart;

    while (
      paymentIndex < paymentEvents.length &&
      paymentEvents[paymentIndex].timestamp <= segmentEnd
    ) {
      const payment = paymentEvents[paymentIndex];
      accruedInterest +=
        capitalizedBalance *
        annualRate *
        ((payment.timestamp - cursor) / periodMilliseconds);
      capitalizedBalance = Math.max(
        0,
        capitalizedBalance - payment.amountPaise,
      );
      cursor = payment.timestamp;
      paymentIndex += 1;
    }

    accruedInterest +=
      capitalizedBalance *
      annualRate *
      ((segmentEnd - cursor) / periodMilliseconds);

    if (segmentEnd < periodEnd) {
      currentYearElapsedDays = (segmentEnd - periodStart) / millisecondsPerDay;
      currentYearTotalDays = periodMilliseconds / millisecondsPerDay;
      break;
    }

    capitalizedBalance += Math.round(accruedInterest);
    accruedInterest = 0;
    completedYears += 1;
    periodStart = periodEnd;

    if (periodStart === currentTimestamp) {
      const nextPeriodEnd = indiaDatePartsStartUtc(
        startYear + completedYears + 1,
        startMonth,
        startDay,
      );
      currentYearElapsedDays = 0;
      currentYearTotalDays = (nextPeriodEnd - periodStart) / millisecondsPerDay;
      break;
    }
  }

  return {
    totalDebtPaise: Math.max(
      0,
      Math.round(capitalizedBalance + accruedInterest),
    ),
    dailyInterestPaise:
      (capitalizedBalance * annualRate) / currentYearTotalDays,
    completedYears,
    currentYearElapsedDays,
    currentYearTotalDays,
    totalElapsedDays: (currentTimestamp - startTimestamp) / millisecondsPerDay,
  };
}

export function indiaDateStartUtc(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return indiaDatePartsStartUtc(year, month, day);
}

function indiaDatePartsStartUtc(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1_000;
}
