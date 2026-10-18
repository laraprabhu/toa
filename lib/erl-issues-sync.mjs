export const ERL_ISSUES_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/13DREMQUny0iHV71Lc8GbUjSmGQR3LixC/gviz/tq?tqx=out:csv';

/** @typedef {'done' | 'not-done' | 'in-progress'} IssueStatus */
/** @typedef {'TOA' | 'ERL'} IssueParty */

/**
 * @typedef {object} SyncedErlIssue
 * @property {number} number
 * @property {string} id
 * @property {string} title
 * @property {string} tower
 * @property {string} category
 * @property {IssueParty} raisedBy
 * @property {IssueParty} owner
 * @property {IssueStatus} status
 * @property {string | null} startDate
 * @property {string | null} etaDate
 * @property {string} erlComment
 * @property {string} momComment
 * @property {string} updatedOn
 */

const headerAliases = {
  number: ['sr no', 'serial no', 'number'],
  title: ['issue'],
  tower: ['tower', 'block'],
  category: ['issue type', 'category'],
  raisedBy: ['highlighted by', 'raised by'],
  owner: ['owner'],
  startDate: ['start date'],
  etaDate: ['eta date', 'eta'],
  erlComment: ['erl comments', 'erl comment', 'erl response'],
  momComment: ['toa erl meeting mom 29 08 2026', 'mom comments', 'mom comment'],
  status: ['status'],
};

export class IssueSheetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IssueSheetError';
  }
}

export function parseCsv(csv) {
  if (typeof csv !== 'string' || !csv.trim()) {
    throw new IssueSheetError('The Google Sheet returned no CSV data.');
  }

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) {
    throw new IssueSheetError('The Google Sheet CSV contains an open quote.');
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((values) => values.some((value) => value.trim()));
}

export function inferIssueStatus(erlComment) {
  const text = normalizeComparableText(erlComment).toLowerCase();
  if (!text) return 'not-done';

  if (
    /\b(?:in progress|underway|ongoing|partly completed|partially completed)\b/.test(
      text,
    ) ||
    /\b\d{1,2}(?:\.\d+)?\s*%\s*(?:complete|completed)\b/.test(text)
  ) {
    return 'in-progress';
  }

  if (
    /\b(?:will|shall)\s+(?:be\s+)?(?:start|complete|completed|provide|do|take|finish|close|apply|create)\b/.test(
      text,
    ) ||
    /\b(?:to be|yet to|not planned|more clarity|required|separate discussion|to discuss|tobe discussed|need to|needs to|before\s+\d)\b/.test(
      text,
    )
  ) {
    return 'not-done';
  }

  if (
    /\b(?:completed|work completed|done|provided|collected|handed over|remitted)\b/.test(
      text,
    )
  ) {
    return 'done';
  }

  return 'not-done';
}

/**
 * @param {string} csv
 * @param {SyncedErlIssue[]} existingIssues
 * @param {Date} [now]
 */
export function syncErlIssuesFromCsv(csv, existingIssues, now = new Date()) {
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    throw new IssueSheetError('The Google Sheet has no issue rows.');
  }

  const headers = rows[0].map(normalizeHeader);
  const columns = mapColumns(headers);
  const existingByNumber = new Map(
    existingIssues.map((issue) => [issue.number, issue]),
  );
  const updateDate = formatIndiaDate(now);
  const numbers = new Set();

  const issues = rows.slice(1).map((row, rowIndex) => {
    const numberText = readColumn(row, columns.number);
    const number = Number(numberText);
    if (!Number.isSafeInteger(number) || number < 1 || number > 100) {
      throw new IssueSheetError(
        `Row ${rowIndex + 2} has an invalid issue number: ${numberText || 'blank'}.`,
      );
    }
    if (numbers.has(number)) {
      throw new IssueSheetError(
        `Issue number ${number} appears more than once.`,
      );
    }
    numbers.add(number);

    const existing = existingByNumber.get(number);
    const erlComment = cleanText(readColumn(row, columns.erlComment));
    const explicitStatus = columns.status
      ? parseStatus(readColumn(row, columns.status))
      : undefined;
    const commentUnchanged =
      existing &&
      normalizeComparableText(existing.erlComment) ===
        normalizeComparableText(erlComment);

    /** @type {SyncedErlIssue} */
    const candidate = {
      number,
      id: existing?.id ?? `erl-issue-${String(number).padStart(3, '0')}`,
      title: requiredText(row, columns.title, 'Issue', rowIndex),
      tower: requiredText(row, columns.tower, 'Tower', rowIndex),
      category: requiredText(row, columns.category, 'Issue type', rowIndex),
      raisedBy: parseParty(
        requiredText(row, columns.raisedBy, 'Highlighted by', rowIndex),
        'Highlighted by',
        rowIndex,
      ),
      owner: parseParty(
        requiredText(row, columns.owner, 'Owner', rowIndex),
        'Owner',
        rowIndex,
      ),
      status:
        explicitStatus ??
        (commentUnchanged && existing
          ? existing.status
          : inferIssueStatus(erlComment)),
      startDate: parseOptionalDate(
        readColumn(row, columns.startDate),
        rowIndex,
      ),
      etaDate: parseOptionalDate(readColumn(row, columns.etaDate), rowIndex),
      erlComment,
      momComment: cleanText(readColumn(row, columns.momComment)),
      updatedOn: existing?.updatedOn ?? updateDate,
    };

    if (!existing || !issueContentEqual(candidate, existing)) {
      candidate.updatedOn = updateDate;
    }
    return candidate;
  });

  if (issues.length < 1 || issues.length > 100) {
    throw new IssueSheetError(
      `Expected between 1 and 100 issues, but received ${issues.length}.`,
    );
  }

  issues.sort((left, right) => left.number - right.number);
  const previous = [...existingIssues].sort(
    (left, right) => left.number - right.number,
  );
  return {
    issues,
    changed: JSON.stringify(issues) !== JSON.stringify(previous),
    importedCount: issues.length,
    changedCount: issues.filter((issue) => {
      const existing = existingByNumber.get(issue.number);
      return !existing || !issueContentEqual(issue, existing);
    }).length,
    removedCount: existingIssues.filter((issue) => !numbers.has(issue.number))
      .length,
    syncedOn: updateDate,
  };
}

function mapColumns(headers) {
  const columns = {};
  for (const [field, aliases] of Object.entries(headerAliases)) {
    const index = headers.findIndex((header) =>
      aliases.some((alias) => header === alias || header.endsWith(` ${alias}`)),
    );
    if (index >= 0) columns[field] = index;
  }

  for (const field of [
    'number',
    'title',
    'tower',
    'category',
    'raisedBy',
    'owner',
    'erlComment',
  ]) {
    if (columns[field] === undefined) {
      throw new IssueSheetError(
        `The Google Sheet is missing the required ${field} column.`,
      );
    }
  }
  return columns;
}

function normalizeHeader(value) {
  return cleanText(value)
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparableText(value) {
  return cleanText(value).replace(/\s+([,.;:])/g, '$1');
}

function readColumn(row, index) {
  return index === undefined ? '' : (row[index] ?? '');
}

function requiredText(row, index, label, rowIndex) {
  const value = cleanText(readColumn(row, index));
  if (!value) {
    throw new IssueSheetError(`Row ${rowIndex + 2} is missing ${label}.`);
  }
  return value;
}

function parseParty(value, label, rowIndex) {
  const party = cleanText(value).toUpperCase();
  if (party !== 'TOA' && party !== 'ERL') {
    throw new IssueSheetError(
      `Row ${rowIndex + 2} has an invalid ${label}: ${value}.`,
    );
  }
  return party;
}

function parseStatus(value) {
  const status = normalizeComparableText(value).toLowerCase();
  if (!status) return undefined;
  if (['done', 'completed', 'closed'].includes(status)) return 'done';
  if (['in progress', 'in-progress', 'ongoing'].includes(status)) {
    return 'in-progress';
  }
  if (['not done', 'not-done', 'pending', 'open'].includes(status)) {
    return 'not-done';
  }
  throw new IssueSheetError(
    `The Google Sheet contains an invalid status: ${value}.`,
  );
}

function parseOptionalDate(value, rowIndex) {
  const text = cleanText(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) {
    throw new IssueSheetError(
      `Row ${rowIndex + 2} contains an unsupported date: ${text}.`,
    );
  }
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(iso)) {
    throw new IssueSheetError(
      `Row ${rowIndex + 2} contains an invalid date: ${text}.`,
    );
  }
  return iso;
}

function issueContentEqual(left, right) {
  return [
    'number',
    'id',
    'title',
    'tower',
    'category',
    'raisedBy',
    'owner',
    'status',
    'startDate',
    'etaDate',
    'erlComment',
    'momComment',
  ].every((field) => (left[field] ?? null) === (right[field] ?? null));
}

function formatIndiaDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
