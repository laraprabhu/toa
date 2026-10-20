import fundDataJson from '@/content/erl-issues/fund-data.json';

export type FundBalanceKey =
  | 'corpus'
  | 'commonAreaMaintenance'
  | 'unsoldFlatsMaintenance'
  | 'officeCommonAreaUsage';

export interface ErlFundBalance {
  label: string;
  amountPaise: number;
  updatedOn: string;
  notes: string;
}

export interface ErlFundPayment {
  date: string;
  amountPaise: number;
  notes: string;
}

export interface ErlFundData {
  currency: 'INR';
  sourceUpdatedOn: string;
  balances: Record<FundBalanceKey, ErlFundBalance>;
  payments: ErlFundPayment[];
}

export interface LiveFundSnapshot {
  liveTotal: number;
  totalInterest: number;
  additionalInterest: number;
  dailyInterest: number;
  currentCorpus: number;
  formulaPeriodDays: number;
  referencePeriodDays: number;
  paymentCount: number;
}

export const erlFundData = fundDataJson as ErlFundData;
export const fundBalanceOrder: FundBalanceKey[] = [
  'corpus',
  'commonAreaMaintenance',
  'unsoldFlatsMaintenance',
  'officeCommonAreaUsage',
];

export const fundInterestUpToOrder = 7_423_975;
export const fundAnnualInterestRate = 12.4;

const millisecondsPerDay = 86_400_000;
const interestStartTimestamp = indiaDateStartUtc('2022-09-05');
const referenceBaselineTimestamp = indiaDateStartUtc('2026-10-17');
const originalCorpusPaise = 2_767_711_200;
const fixedInterestPaise = 742_397_500;
const interestRateNumerator = 124;
const interestRateDenominator = 1_000;

export function calculateLiveFundSnapshot(
  data: ErlFundData,
  now = Date.now(),
): LiveFundSnapshot {
  const currentTimestamp = Math.max(now, interestStartTimestamp);
  const grossAdditionalInterest = simpleInterestPaise(
    originalCorpusPaise,
    interestStartTimestamp,
    currentTimestamp,
  );
  const paymentReduction = data.payments.reduce((total, payment) => {
    const paymentTimestamp = Math.max(
      interestStartTimestamp,
      indiaDateStartUtc(payment.date),
    );
    return (
      total +
      simpleInterestPaise(
        payment.amountPaise,
        paymentTimestamp,
        currentTimestamp,
      )
    );
  }, 0);
  const additionalInterestPaise = Math.max(
    0,
    Math.round(grossAdditionalInterest - paymentReduction),
  );
  const totalInterestPaise = fixedInterestPaise + additionalInterestPaise;
  const totalBalancesPaise = fundBalanceOrder.reduce(
    (total, key) => total + data.balances[key].amountPaise,
    0,
  );
  const currentCorpusPaise = data.balances.corpus.amountPaise;

  return {
    liveTotal: paiseToRupees(totalBalancesPaise + totalInterestPaise),
    totalInterest: paiseToRupees(totalInterestPaise),
    additionalInterest: paiseToRupees(additionalInterestPaise),
    dailyInterest:
      (currentCorpusPaise * fundAnnualInterestRate) / 100 / 365 / 100,
    currentCorpus: currentCorpusPaise / 100,
    formulaPeriodDays:
      (currentTimestamp - interestStartTimestamp) / millisecondsPerDay,
    referencePeriodDays:
      2_208 +
      (currentTimestamp - referenceBaselineTimestamp) / millisecondsPerDay,
    paymentCount: data.payments.length,
  };
}

function simpleInterestPaise(
  principalPaise: number,
  fromTimestamp: number,
  toTimestamp: number,
) {
  const elapsedMilliseconds = Math.max(0, toTimestamp - fromTimestamp);
  return (
    (principalPaise *
      interestRateNumerator *
      (elapsedMilliseconds / millisecondsPerDay)) /
    (interestRateDenominator * 365)
  );
}

function indiaDateStartUtc(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1_000;
}

function paiseToRupees(value: number) {
  return Number(value) / 100;
}
