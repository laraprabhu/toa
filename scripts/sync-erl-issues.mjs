import { readFile, writeFile } from 'node:fs/promises';
import {
  ERL_ISSUES_SHEET_CSV_URL,
  syncErlIssuesFromCsv,
} from '../lib/erl-issues-sync.mjs';

const issuesPath = new URL(
  '../content/erl-issues/issues.json',
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
      process.env.ERL_ISSUES_SHEET_CSV_URL ?? ERL_ISSUES_SHEET_CSV_URL,
    );
const existing = JSON.parse(await readFile(issuesPath, 'utf8'));
const result = syncErlIssuesFromCsv(csv, existing);

if (result.changed && !dryRun) {
  await writeFile(issuesPath, `${JSON.stringify(result.issues, null, 2)}\n`);
}

console.log(
  JSON.stringify({
    changed: result.changed,
    changedCount: result.changedCount,
    importedCount: result.importedCount,
    removedCount: result.removedCount,
    syncedOn: result.syncedOn,
    dryRun,
  }),
);

async function downloadSheetCsv(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'toa-erl-issues-sync/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(
      `Google Sheets download failed with HTTP ${response.status}.`,
    );
  }
  return response.text();
}
