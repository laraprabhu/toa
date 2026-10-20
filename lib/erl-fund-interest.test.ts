import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateAnnualCompoundBalance,
  indiaDateStartUtc,
} from './erl-fund-interest.ts';

const baseInput = {
  openingBalancePaise: 10_000,
  annualRatePercent: 10,
  startDate: '2022-09-05',
  payments: [],
};

test('keeps the opening balance unchanged on the compounding start date', () => {
  const result = calculateAnnualCompoundBalance({
    ...baseInput,
    now: indiaDateStartUtc('2022-09-05'),
  });

  assert.equal(result.totalDebtPaise, 10_000);
  assert.equal(result.completedYears, 0);
  assert.equal(result.currentYearElapsedDays, 0);
});

test('capitalizes interest on every yearly anniversary', () => {
  const firstYear = calculateAnnualCompoundBalance({
    ...baseInput,
    now: indiaDateStartUtc('2023-09-05'),
  });
  const secondYear = calculateAnnualCompoundBalance({
    ...baseInput,
    now: indiaDateStartUtc('2024-09-05'),
  });

  assert.equal(firstYear.totalDebtPaise, 11_000);
  assert.equal(firstYear.completedYears, 1);
  assert.equal(secondYear.totalDebtPaise, 12_100);
  assert.equal(secondYear.completedYears, 2);
});

test('prorates the incomplete compounding year using its actual length', () => {
  const now = indiaDateStartUtc('2024-03-05');
  const result = calculateAnnualCompoundBalance({ ...baseInput, now });
  const elapsedDays = 182;
  const leapYearPeriodDays = 366;
  const expected = Math.round(
    11_000 + 11_000 * 0.1 * (elapsedDays / leapYearPeriodDays),
  );

  assert.equal(result.totalDebtPaise, expected);
  assert.equal(result.completedYears, 1);
  assert.equal(result.currentYearElapsedDays, elapsedDays);
  assert.equal(result.currentYearTotalDays, leapYearPeriodDays);
});

test('reduces the interest-bearing balance from a payment date', () => {
  const paymentDate = '2023-03-05';
  const result = calculateAnnualCompoundBalance({
    ...baseInput,
    payments: [{ date: paymentDate, amountPaise: 2_000 }],
    now: indiaDateStartUtc('2023-09-05'),
  });
  const daysBeforePayment = 181;
  const daysAfterPayment = 184;
  const expected = Math.round(
    8_000 +
      10_000 * 0.1 * (daysBeforePayment / 365) +
      8_000 * 0.1 * (daysAfterPayment / 365),
  );

  assert.equal(result.totalDebtPaise, expected);
});

test('includes existing interest in the balance that earns interest', () => {
  const corpusPaise = 2_767_711_200;
  const existingInterestPaise = 742_397_500;
  const result = calculateAnnualCompoundBalance({
    openingBalancePaise: corpusPaise + existingInterestPaise,
    annualRatePercent: 12.4,
    startDate: '2022-09-05',
    payments: [],
    now: indiaDateStartUtc('2023-09-05'),
  });

  assert.equal(
    result.totalDebtPaise,
    Math.round((corpusPaise + existingInterestPaise) * 1.124),
  );
  assert.ok(
    result.totalDebtPaise > corpusPaise * 1.124 + existingInterestPaise,
  );
});
