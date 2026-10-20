import { parseCsv } from './erl-issues-sync.mjs';

export const ERL_FUNDS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1wG3KF2mRPGIAV_zV-tsE10MKww7y2HUS_3ajbfzGhMk/gviz/tq?tqx=out:csv';

export const ORIGINAL_CORPUS_PAISE = 2_767_711_200;

const requiredBalanceCategories = [
  {
    key: 'corpus',
    aliases: ['corpus amount receivable', 'corpus amount'],
  },
  {
    key: 'commonAreaMaintenance',
    aliases: [
      'common area maintenance withheld by the promoter',
      'common amenities maintenance withheld by the promoter',
    ],
  },
  {
    key: 'unsoldFlatsMaintenance',
    aliases: ['maintenance dues for unsold flats'],
  },
  {
    key: 'officeCommonAreaUsage',
    aliases: [
      "common area usage charges for the promoter's office",
      'common area usage charges for the promoters office',
      'common area usage charges for promoter office',
    ],
  },
];

const headerAliases = {
  recordType: ['record type', 'type'],
  category: ['category'],
  balancePending: ['balance pending inr', 'balance pending'],
  balanceUpdatedOn: ['balance updated on', 'updated on'],
  paymentDate: ['payment date'],
  amountReceived: ['amount received inr', 'amount received'],
  notes: ['notes', 'note'],
};

export class FundSheetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FundSheetError';
  }
}

export function syncErlFundsFromCsv(csv, existingFundData = null) {
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    throw new FundSheetError('The fund Google Sheet has no data rows.');
  }

  const columns = mapColumns(rows[0].map(normalizeHeader));
  const balances = {};
  const payments = [];
  const paymentSignatures = new Set();

  rows.slice(1).forEach((row, rowIndex) => {
    const sheetRow = rowIndex + 2;
    const recordType = normalizeComparableText(
      readColumn(row, columns.recordType),
    ).toLowerCase();

    if (recordType === 'balance') {
      const categoryLabel = requiredText(
        row,
        columns.category,
        'Category',
        sheetRow,
      );
      const category = resolveCategory(categoryLabel, sheetRow);
      if (balances[category.key]) {
        throw new FundSheetError(
          `Row ${sheetRow} duplicates the ${categoryLabel} balance.`,
        );
      }

      balances[category.key] = {
        label: categoryLabel,
        amountPaise: parseRupeesToPaise(
          requiredText(
            row,
            columns.balancePending,
            'Balance Pending (INR)',
            sheetRow,
          ),
          'Balance Pending (INR)',
          sheetRow,
          true,
        ),
        updatedOn: parseDate(
          requiredText(
            row,
            columns.balanceUpdatedOn,
            'Balance Updated On',
            sheetRow,
          ),
          'Balance Updated On',
          sheetRow,
        ),
        notes: cleanText(readColumn(row, columns.notes)),
      };
      return;
    }

    if (['corpus payment', 'payment'].includes(recordType)) {
      const categoryLabel = requiredText(
        row,
        columns.category,
        'Category',
        sheetRow,
      );
      const category = resolveCategory(categoryLabel, sheetRow);
      if (category.key !== 'corpus') {
        throw new FundSheetError(
          `Row ${sheetRow} is a payment record for ${categoryLabel}. Only corpus payments belong in the payment ledger.`,
        );
      }

      const payment = {
        date: parseDate(
          requiredText(row, columns.paymentDate, 'Payment Date', sheetRow),
          'Payment Date',
          sheetRow,
        ),
        amountPaise: parseRupeesToPaise(
          requiredText(
            row,
            columns.amountReceived,
            'Amount Received (INR)',
            sheetRow,
          ),
          'Amount Received (INR)',
          sheetRow,
          false,
        ),
        notes: cleanText(readColumn(row, columns.notes)),
      };
      const signature = `${payment.date}|${payment.amountPaise}|${normalizeComparableText(payment.notes).toLowerCase()}`;
      if (paymentSignatures.has(signature)) {
        throw new FundSheetError(
          `Row ${sheetRow} duplicates an existing corpus payment.`,
        );
      }
      paymentSignatures.add(signature);
      payments.push(payment);
      return;
    }

    throw new FundSheetError(
      `Row ${sheetRow} has an invalid Record Type: ${readColumn(row, columns.recordType) || 'blank'}. Use Balance or Corpus Payment.`,
    );
  });

  for (const category of requiredBalanceCategories) {
    if (!balances[category.key]) {
      throw new FundSheetError(
        `The fund Google Sheet is missing the ${category.aliases[0]} balance.`,
      );
    }
  }

  payments.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.amountPaise - right.amountPaise ||
      left.notes.localeCompare(right.notes),
  );

  const receivedCorpusPaise = payments.reduce(
    (total, payment) => total + payment.amountPaise,
    0,
  );
  if (receivedCorpusPaise > ORIGINAL_CORPUS_PAISE) {
    throw new FundSheetError(
      'Corpus payments exceed the original corpus amount.',
    );
  }

  const expectedCorpusBalance = ORIGINAL_CORPUS_PAISE - receivedCorpusPaise;
  if (balances.corpus.amountPaise !== expectedCorpusBalance) {
    throw new FundSheetError(
      `Corpus reconciliation failed. The pending balance should be ${formatPaise(expectedCorpusBalance)} after recorded payments, but the Sheet contains ${formatPaise(balances.corpus.amountPaise)}.`,
    );
  }

  const latestPaymentDate = payments.at(-1)?.date;
  if (
    latestPaymentDate &&
    balances.corpus.updatedOn.localeCompare(latestPaymentDate) < 0
  ) {
    throw new FundSheetError(
      'The corpus Balance Updated On date cannot be earlier than the latest corpus payment.',
    );
  }

  const sourceUpdatedOn = [
    ...Object.values(balances).map((balance) => balance.updatedOn),
    ...payments.map((payment) => payment.date),
  ]
    .sort()
    .at(-1);
  const orderedBalances = Object.fromEntries(
    requiredBalanceCategories.map(({ key }) => [key, balances[key]]),
  );

  const fundData = {
    currency: 'INR',
    sourceUpdatedOn,
    balances: orderedBalances,
    payments,
  };

  return {
    fundData,
    changed: JSON.stringify(fundData) !== JSON.stringify(existingFundData),
    balanceCount: Object.keys(balances).length,
    paymentCount: payments.length,
    sourceUpdatedOn,
  };
}

function mapColumns(headers) {
  const columns = {};
  for (const [field, aliases] of Object.entries(headerAliases)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index >= 0) columns[field] = index;
  }

  for (const field of Object.keys(headerAliases)) {
    if (columns[field] === undefined) {
      throw new FundSheetError(
        `The fund Google Sheet is missing the required ${field} column.`,
      );
    }
  }
  return columns;
}

function resolveCategory(value, rowNumber) {
  const normalized = normalizeComparableText(value).toLowerCase();
  const category = requiredBalanceCategories.find((candidate) =>
    candidate.aliases.includes(normalized),
  );
  if (!category) {
    throw new FundSheetError(
      `Row ${rowNumber} contains an unsupported fund category: ${value}.`,
    );
  }
  return category;
}

function parseRupeesToPaise(value, label, rowNumber, allowZero) {
  const cleaned = cleanText(value)
    .replace(/₹/g, '')
    .replace(/\brs\.?/gi, '')
    .replace(/,/g, '')
    .trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new FundSheetError(
      `Row ${rowNumber} has an invalid ${label}: ${value}.`,
    );
  }

  const [rupees, paise = ''] = cleaned.split('.');
  const amountPaise = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  if (!Number.isSafeInteger(amountPaise) || amountPaise < (allowZero ? 0 : 1)) {
    throw new FundSheetError(
      `Row ${rowNumber} has an invalid ${label}: ${value}.`,
    );
  }
  return amountPaise;
}

function parseDate(value, label, rowNumber) {
  const text = cleanText(value);
  let iso = text;
  const localMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new FundSheetError(
      `Row ${rowNumber} has an unsupported ${label}: ${value}.`,
    );
  }
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(iso)) {
    throw new FundSheetError(
      `Row ${rowNumber} has an invalid ${label}: ${value}.`,
    );
  }
  return iso;
}

function normalizeHeader(value) {
  return cleanText(value)
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeComparableText(value) {
  return cleanText(value)
    .replace(/[’]/g, "'")
    .replace(/\s+([,.;:])/g, '$1');
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readColumn(row, index) {
  return index === undefined ? '' : (row[index] ?? '');
}

function requiredText(row, index, label, rowNumber) {
  const value = cleanText(readColumn(row, index));
  if (!value) {
    throw new FundSheetError(`Row ${rowNumber} is missing ${label}.`);
  }
  return value;
}

function formatPaise(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
