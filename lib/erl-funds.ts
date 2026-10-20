import fundDataJson from '@/content/erl-issues/fund-data.json';
import { calculateAnnualCompoundBalance } from '@/lib/erl-fund-interest';

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
  openingCompoundBalance: number;
  completedCompoundYears: number;
  currentCompoundYearDays: number;
  currentCompoundYearTotalDays: number;
  formulaPeriodDays: number;
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

const interestStartDate = '2022-09-05';
const originalCorpusPaise = 2_767_711_200;
const fixedInterestPaise = 742_397_500;
const openingCompoundBalancePaise = originalCorpusPaise + fixedInterestPaise;

export function calculateLiveFundSnapshot(
  data: ErlFundData,
  now = Date.now(),
): LiveFundSnapshot {
  const compoundResult = calculateAnnualCompoundBalance({
    openingBalancePaise: openingCompoundBalancePaise,
    annualRatePercent: fundAnnualInterestRate,
    startDate: interestStartDate,
    payments: data.payments,
    now,
  });
  const currentCorpusPaise = data.balances.corpus.amountPaise;
  const totalInterestPaise = Math.max(
    fixedInterestPaise,
    compoundResult.totalDebtPaise - currentCorpusPaise,
  );
  const additionalInterestPaise = Math.max(
    0,
    totalInterestPaise - fixedInterestPaise,
  );
  const otherBalancesPaise = fundBalanceOrder
    .slice(1)
    .reduce((total, key) => total + data.balances[key].amountPaise, 0);

  return {
    liveTotal: paiseToRupees(
      compoundResult.totalDebtPaise + otherBalancesPaise,
    ),
    totalInterest: paiseToRupees(totalInterestPaise),
    additionalInterest: paiseToRupees(additionalInterestPaise),
    dailyInterest: paiseToRupees(compoundResult.dailyInterestPaise),
    currentCorpus: currentCorpusPaise / 100,
    openingCompoundBalance: paiseToRupees(openingCompoundBalancePaise),
    completedCompoundYears: compoundResult.completedYears,
    currentCompoundYearDays: compoundResult.currentYearElapsedDays,
    currentCompoundYearTotalDays: compoundResult.currentYearTotalDays,
    formulaPeriodDays: compoundResult.totalElapsedDays,
    paymentCount: data.payments.length,
  };
}

function paiseToRupees(value: number) {
  return Number(value) / 100;
}
