import { readFile, writeFile } from 'node:fs/promises';
import {
  ERL_FUNDS_SHEET_CSV_URL,
  syncErlFundsFromCsv,
} from '../lib/erl-funds-sync.mjs';

const fundDataPath = new URL(
  '../content/erl-issues/fund-data.json',
  import.meta.url,
);
const inputIndex = process.argv.indexOf('--input');
const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : undefined;
const dryRun = process.argv.includes('--dry-run');

if (inputIndex >= 0 && !inputPath) {
  throw new Error('--input requires a CSV file path.');
}

const csv = inputPath
  ? await readFile(inputPath, 'utf8')
  : await downloadSheetCsv(
      process.env.ERL_FUNDS_SHEET_CSV_URL ?? ERL_FUNDS_SHEET_CSV_URL,
    );
const existing = await readExistingFundData();
const result = syncErlFundsFromCsv(csv, existing);

if (result.changed && !dryRun) {
  await writeFile(
    fundDataPath,
    `${JSON.stringify(result.fundData, null, 2)}\n`,
  );
}

console.log(
  JSON.stringify({
    changed: result.changed,
    balanceCount: result.balanceCount,
    paymentCount: result.paymentCount,
    sourceUpdatedOn: result.sourceUpdatedOn,
    dryRun,
  }),
);

async function readExistingFundData() {
  try {
    return JSON.parse(await readFile(fundDataPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function downloadSheetCsv(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'toa-erl-funds-sync/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(
      `Google Sheets download failed with HTTP ${response.status}.`,
    );
  }
  return response.text();
}
