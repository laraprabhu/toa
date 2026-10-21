import { parseCsv } from './erl-issues-sync.mjs';

export const ERL_DOCUMENTS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1lsv00lKoM9ItsRVwK46yhgiEs4S3Mo7itxG5GB1GBBQ/gviz/tq?tqx=out:csv';

const headerAliases = {
  id: ['document id', 'id'],
  category: ['category'],
  name: ['document name', 'document'],
  description: ['description', 'details'],
  handedOver: ['handed over', 'received'],
  handedOverDate: ['handover date', 'received date'],
  remarks: ['remarks', 'notes'],
};

export class DocumentSheetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DocumentSheetError';
  }
}

export function syncErlDocumentsFromCsv(
  csv,
  existingChecklist = null,
  now = new Date(),
) {
  let rows;
  try {
    rows = parseCsv(csv);
  } catch (error) {
    throw new DocumentSheetError(
      error instanceof Error ? error.message : 'Unable to parse the CSV.',
    );
  }

  if (rows.length < 2) {
    throw new DocumentSheetError(
      'The document Google Sheet has no document rows.',
    );
  }

  const columns = mapColumns(rows[0].map(normalizeHeader));
  const ids = new Set();
  const categories = new Map();
  const items = [];
  const itemCategories = new Map();

  rows.slice(1).forEach((row, rowIndex) => {
    const sheetRow = rowIndex + 2;
    const id = requiredText(
      row,
      columns.id,
      'Document ID',
      sheetRow,
    ).toUpperCase();
    if (!/^DOC-\d{3}$/.test(id)) {
      throw new DocumentSheetError(
        `Row ${sheetRow} has an invalid Document ID: ${id}. Use DOC-001 style IDs.`,
      );
    }
    if (ids.has(id)) {
      throw new DocumentSheetError(`Document ID ${id} appears more than once.`);
    }
    ids.add(id);

    const category = requiredText(row, columns.category, 'Category', sheetRow);
    const categoryKey = normalizeComparableText(category).toLowerCase();
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, {
        id: slugify(category),
        title: category,
        items: [],
      });
    }

    const handedOver = parseHandedOver(
      requiredText(row, columns.handedOver, 'Handed Over', sheetRow),
      sheetRow,
    );
    const rawDate = cleanText(readColumn(row, columns.handedOverDate));
    const handedOverDate = rawDate
      ? parseDate(rawDate, 'Handover Date', sheetRow)
      : null;

    if (handedOver && !handedOverDate) {
      throw new DocumentSheetError(
        `Row ${sheetRow} is marked Yes but has no Handover Date.`,
      );
    }
    if (!handedOver && handedOverDate) {
      throw new DocumentSheetError(
        `Row ${sheetRow} has a Handover Date but is marked No.`,
      );
    }

    const item = {
      id,
      name: requiredText(row, columns.name, 'Document Name', sheetRow),
      notes: requiredText(row, columns.description, 'Description', sheetRow),
      handedOver,
      handedOverDate,
      remarks: cleanText(readColumn(row, columns.remarks)),
    };
    categories.get(categoryKey).items.push(item);
    items.push(item);
    itemCategories.set(id, category);
  });

  if (items.length < 1 || items.length > 100) {
    throw new DocumentSheetError(
      `Expected between 1 and 100 documents, but received ${items.length}.`,
    );
  }

  const checklist = {
    title:
      cleanText(existingChecklist?.title) ||
      'Society Handover Document Checklist',
    sections: [...categories.values()],
  };
  const existingItems = new Map(
    (existingChecklist?.sections ?? [])
      .flatMap((section) =>
        (section.items ?? []).map((item) => ({
          item,
          category: section.title,
        })),
      )
      .filter(({ item }) => item.id)
      .map(({ item, category }) => [item.id, { item, category }]),
  );

  return {
    checklist,
    changed: JSON.stringify(checklist) !== JSON.stringify(existingChecklist),
    importedCount: items.length,
    handedOverCount: items.filter((item) => item.handedOver).length,
    changedCount: items.filter((item) => {
      const existing = existingItems.get(item.id);
      return (
        !existing ||
        itemCategories.get(item.id) !== existing.category ||
        JSON.stringify(item) !== JSON.stringify(existing.item)
      );
    }).length,
    removedCount: [...existingItems.keys()].filter((id) => !ids.has(id)).length,
    syncedOn: formatIndiaDate(now),
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
      throw new DocumentSheetError(
        `The document Google Sheet is missing the required ${field} column.`,
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

function requiredText(row, index, label, rowNumber) {
  const value = cleanText(readColumn(row, index));
  if (!value) {
    throw new DocumentSheetError(`Row ${rowNumber} is missing ${label}.`);
  }
  return value;
}

function parseHandedOver(value, rowNumber) {
  const normalized = normalizeComparableText(value).toLowerCase();
  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;
  throw new DocumentSheetError(
    `Row ${rowNumber} has an invalid Handed Over value: ${value}. Use Yes or No.`,
  );
}

function parseDate(value, label, rowNumber) {
  const text = cleanText(value);
  let year;
  let month;
  let day;

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    if (match) {
      const [, first, second, parsedYear] = match;
      year = parsedYear;
      if (Number(second) > 12 && Number(first) <= 12) {
        month = first;
        day = second;
      } else {
        day = first;
        month = second;
      }
    } else {
      const parsed = new Date(`${text} 00:00:00 UTC`);
      if (!Number.isNaN(parsed.getTime())) {
        year = String(parsed.getUTCFullYear());
        month = String(parsed.getUTCMonth() + 1);
        day = String(parsed.getUTCDate());
      }
    }
  }

  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const date = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay));
  if (
    !Number.isInteger(numericYear) ||
    numericYear < 2000 ||
    numericYear > 2100 ||
    date.getUTCFullYear() !== numericYear ||
    date.getUTCMonth() !== numericMonth - 1 ||
    date.getUTCDate() !== numericDay
  ) {
    throw new DocumentSheetError(
      `Row ${rowNumber} has an invalid ${label}: ${value}.`,
    );
  }

  return `${String(numericYear).padStart(4, '0')}-${String(numericMonth).padStart(2, '0')}-${String(numericDay).padStart(2, '0')}`;
}

function slugify(value) {
  const slug = normalizeComparableText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) {
    throw new DocumentSheetError(
      `Unable to create a category ID for ${value}.`,
    );
  }
  return slug;
}

function formatIndiaDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}
