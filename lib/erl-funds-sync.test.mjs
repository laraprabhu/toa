import assert from 'node:assert/strict';
import test from 'node:test';
import { FundSheetError, syncErlFundsFromCsv } from './erl-funds-sync.mjs';

const header =
  'Record Type,Category,Balance Pending (INR),Balance Updated On,Payment Date,Amount Received (INR),Notes';

function fundCsv({
  corpusBalance = '27677112',
  paymentRows = [],
  extraRows = [],
} = {}) {
  return [
    header,
    `Balance,Corpus amount receivable,${corpusBalance},2026-10-20,,,Current outstanding corpus balance`,
    'Balance,Common area maintenance withheld by the promoter,3030123,2026-10-20,,,Current outstanding balance',
    'Balance,Maintenance dues for unsold flats,718949.38,2026-10-20,,,Includes dues through 12 October 2026',
    "Balance,Common area usage charges for the promoter's office,120000,2026-10-20,,,Charges for April to September 2022",
    ...paymentRows,
    ...extraRows,
  ].join('\n');
}

test('imports the four balance categories without interest fields', () => {
  const result = syncErlFundsFromCsv(fundCsv());
  assert.equal(result.balanceCount, 4);
  assert.equal(result.paymentCount, 0);
  assert.equal(result.fundData.balances.corpus.amountPaise, 2_767_711_200);
  assert.equal(result.fundData.sourceUpdatedOn, '2026-10-20');
  assert.equal('interest' in result.fundData, false);
});

test('accepts a reconciled corpus payment and sorts it by date', () => {
  const result = syncErlFundsFromCsv(
    fundCsv({
      corpusBalance: '27577112',
      paymentRows: [
        'Corpus Payment,Corpus amount receivable,,,2026-10-20,100000,First corpus payment',
      ],
    }),
  );
  assert.equal(result.paymentCount, 1);
  assert.deepEqual(result.fundData.payments[0], {
    date: '2026-10-20',
    amountPaise: 10_000_000,
    notes: 'First corpus payment',
  });
});

test('rejects a corpus balance that does not reconcile to payments', () => {
  assert.throws(
    () =>
      syncErlFundsFromCsv(
        fundCsv({
          paymentRows: [
            'Corpus Payment,Corpus amount receivable,,,2026-10-20,100000,First corpus payment',
          ],
        }),
      ),
    (error) =>
      error instanceof FundSheetError &&
      error.message.includes('Corpus reconciliation failed'),
  );
});

test('rejects duplicate balance categories', () => {
  assert.throws(
    () =>
      syncErlFundsFromCsv(
        fundCsv({
          extraRows: [
            'Balance,Corpus amount receivable,27677112,2026-10-20,,,Duplicate',
          ],
        }),
      ),
    (error) =>
      error instanceof FundSheetError && error.message.includes('duplicates'),
  );
});

test('rejects amounts with more than two decimal places', () => {
  assert.throws(
    () => syncErlFundsFromCsv(fundCsv({ corpusBalance: '27677112.001' })),
    (error) =>
      error instanceof FundSheetError &&
      error.message.includes('invalid Balance Pending'),
  );
});
