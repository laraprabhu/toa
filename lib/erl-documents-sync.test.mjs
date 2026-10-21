import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DocumentSheetError,
  syncErlDocumentsFromCsv,
} from './erl-documents-sync.mjs';

const headers = [
  'Document ID',
  'Category',
  'Document Name',
  'Description',
  'Handed Over',
  'Handover Date',
  'Remarks',
];

function csv(rows) {
  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}

const pendingRow = [
  'DOC-001',
  'Statutory Approvals & Legal Ownership',
  'Occupancy Certificate (OC)',
  'Covers all blocks and phases.',
  'No',
  '',
  'Awaiting ERL.',
];

const receivedRow = [
  'DOC-002',
  'Statutory Approvals & Legal Ownership',
  'Completion Certificate (CC)',
  'Confirms construction matches approved plans.',
  'Yes',
  '21/10/2026',
  'Original received by TOA.',
];

test('imports document rows and groups them by category', () => {
  const result = syncErlDocumentsFromCsv(
    csv([pendingRow, receivedRow]),
    null,
    new Date('2026-10-21T05:00:00Z'),
  );

  assert.equal(result.importedCount, 2);
  assert.equal(result.handedOverCount, 1);
  assert.equal(result.changedCount, 2);
  assert.equal(result.removedCount, 0);
  assert.equal(result.syncedOn, '2026-10-21');
  assert.equal(result.checklist.sections.length, 1);
  assert.deepEqual(result.checklist.sections[0].items[1], {
    id: 'DOC-002',
    name: 'Completion Certificate (CC)',
    notes: 'Confirms construction matches approved plans.',
    handedOver: true,
    handedOverDate: '2026-10-21',
    remarks: 'Original received by TOA.',
  });
});

test('reports no change when the normalized checklist is unchanged', () => {
  const first = syncErlDocumentsFromCsv(csv([pendingRow, receivedRow]));
  const second = syncErlDocumentsFromCsv(
    csv([pendingRow, receivedRow]),
    first.checklist,
  );

  assert.equal(second.changed, false);
  assert.equal(second.changedCount, 0);
});

test('accepts an unambiguous month-first Google Sheets date', () => {
  const monthFirst = [...receivedRow];
  monthFirst[5] = '10/21/2026';
  const result = syncErlDocumentsFromCsv(csv([monthFirst]));

  assert.equal(
    result.checklist.sections[0].items[0].handedOverDate,
    '2026-10-21',
  );
});

test('counts a category move as a changed document', () => {
  const first = syncErlDocumentsFromCsv(csv([pendingRow]));
  const moved = [...pendingRow];
  moved[1] = 'Infrastructure & Technical Handover';
  const result = syncErlDocumentsFromCsv(csv([moved]), first.checklist);

  assert.equal(result.changed, true);
  assert.equal(result.changedCount, 1);
});

test('rejects duplicate document IDs', () => {
  assert.throws(
    () => syncErlDocumentsFromCsv(csv([pendingRow, pendingRow])),
    (error) =>
      error instanceof DocumentSheetError &&
      /DOC-001 appears more than once/.test(error.message),
  );
});

test('rejects unsupported handover statuses', () => {
  const invalid = [...pendingRow];
  invalid[4] = 'Pending';
  assert.throws(
    () => syncErlDocumentsFromCsv(csv([invalid])),
    (error) =>
      error instanceof DocumentSheetError &&
      /Use Yes or No/.test(error.message),
  );
});

test('requires a handover date for received documents', () => {
  const missingDate = [...receivedRow];
  missingDate[5] = '';
  assert.throws(
    () => syncErlDocumentsFromCsv(csv([missingDate])),
    (error) =>
      error instanceof DocumentSheetError &&
      /marked Yes but has no Handover Date/.test(error.message),
  );
});

test('rejects handover dates on pending documents', () => {
  const invalid = [...pendingRow];
  invalid[5] = '2026-10-21';
  assert.throws(
    () => syncErlDocumentsFromCsv(csv([invalid])),
    (error) =>
      error instanceof DocumentSheetError &&
      /has a Handover Date but is marked No/.test(error.message),
  );
});

test('requires every supported column', () => {
  const withoutRemarks = [headers.slice(0, -1), pendingRow.slice(0, -1)]
    .map((row) => row.join(','))
    .join('\n');
  assert.throws(
    () => syncErlDocumentsFromCsv(withoutRemarks),
    (error) =>
      error instanceof DocumentSheetError &&
      /missing the required remarks column/.test(error.message),
  );
});
