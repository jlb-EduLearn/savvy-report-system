/** Storage, CRUD, CSV import/export, filters */
/** @returns {import('./types').School[]} */
function loadSchoolsFromStorage() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return consolidateSchools(structuredClone(SEED_SCHOOLS));
    const parsed = JSON.parse(raw);
    const schools = Array.isArray(parsed) ? parsed : structuredClone(SEED_SCHOOLS);
    return consolidateSchools(schools);
  } catch {
    return consolidateSchools(structuredClone(SEED_SCHOOLS));
  }
}

function emptySchoolList() {
  return [];
}

/** @param {import('./types').School[]} schools */
function saveSchoolsToStorage(schools) {
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(schools));
}

function getNextSchoolId(schools) {
  if (!schools.length) return 1;
  return Math.max(...schools.map((s) => s.id)) + 1;
}

/** @param {import('./types').School[]} schools @param {Partial<import('./types').School>} data */
function createSchool(schools, data) {
  const school = {
    id: getNextSchoolId(schools),
    ss: data.ss?.trim() || '',
    name: data.name?.trim() || '',
    link: data.link?.trim() || '',
    programs: data.programs?.trim() || '',
    status: data.status || 'Undeployed',
    accountCreation: Boolean(data.accountCreation),
    teachers: Boolean(data.teachers),
    students: Boolean(data.students),
    enrollment: Boolean(data.enrollment),
  };
  const updated = consolidateSchools([...schools, school]);
  saveSchoolsToStorage(updated);
  return updated;
}

/** @param {import('./types').School[]} schools @param {number} id @param {Partial<import('./types').School>} data */
function updateSchool(schools, id, data) {
  const updated = schools.map((s) =>
    s.id === id
      ? {
          ...s,
          ss: data.ss?.trim() ?? s.ss,
          name: data.name?.trim() ?? s.name,
          link: data.link?.trim() ?? s.link,
          programs: data.programs?.trim() ?? s.programs ?? '',
          status: data.status ?? s.status,
          accountCreation: data.accountCreation ?? s.accountCreation,
          teachers: data.teachers ?? s.teachers,
          students: data.students ?? s.students,
          enrollment: data.enrollment ?? s.enrollment,
        }
      : s
  );
  const consolidated = consolidateSchools(updated);
  saveSchoolsToStorage(consolidated);
  return consolidated;
}

/** @param {import('./types').School[]} schools @param {number} id */
function deleteSchool(schools, id) {
  const updated = schools.filter((s) => s.id !== id);
  saveSchoolsToStorage(updated);
  return updated;
}

function resetToSeedData() {
  const fresh = consolidateSchools(structuredClone(SEED_SCHOOLS));
  saveSchoolsToStorage(fresh);
  return fresh;
}

/** @param {import('./types').School[]} schools */
function getUniqueHandlers(schools) {
  return [...new Set(schools.map((s) => s.ss).filter(Boolean))].sort();
}

/** @param {import('./types').School[]} schools @param {{ search?: string, handler?: string, status?: string }} filters */
function filterSchools(schools, filters = {}) {
  const search = (filters.search || '').toLowerCase().trim();
  const handler = filters.handler || '';
  const status = filters.status || '';

  return schools.filter((s) => {
    if (handler && s.ss !== handler) return false;
    if (status && s.status !== status) return false;
    if (search) {
      const haystack = `${s.name} ${s.ss} ${s.link} ${s.programs || ''} ${s.status}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/** @param {import('./types').School[]} schools @param {string} key @param {'asc'|'desc'} direction */
function sortSchools(schools, key, direction) {
  const sorted = [...schools];
  const mult = direction === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (typeof valA === 'boolean') valA = valA ? 1 : 0;
    if (typeof valB === 'boolean') valB = valB ? 1 : 0;

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return -1 * mult;
    if (valA > valB) return 1 * mult;
    return 0;
  });

  return sorted;
}

/** Export schools to CSV string */
function schoolsToCSV(schools) {
  const headers = [
    'SS',
    'Site Name',
    'Link',
    'Status',
    'Programs',
    'Account Creation',
    'Teachers Uploaded',
    'Students Uploaded',
    'Enrollment Module',
  ];
  const rows = schools.map((s) =>
    [
      csvEscape(s.ss),
      csvEscape(s.name),
      csvEscape(s.link),
      csvEscape(s.status),
      csvEscape(s.programs || ''),
      s.accountCreation ? 'Yes' : 'No',
      s.teachers ? 'Yes' : 'No',
      s.students ? 'Yes' : 'No',
      s.enrollment ? 'Yes' : 'No',
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function csvYesNo(value) {
  return /^(yes|true|1|✔|y)$/i.test(String(value ?? '').trim());
}

/** Normalize deploy status from CSV or manual entry (case-insensitive). */
function normalizeStatus(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return 'Undeployed';
  if (v === 'deployed' || v === 'yes') return 'Deployed';
  if (v === 'in progress' || v === 'in-progress' || v === 'inprogress') return 'In Progress';
  if (v === 'undeployed' || v === 'no') return 'Undeployed';
  return String(value).trim();
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const CSV_COLUMN_ALIASES = {
  ss: ['ss', 'solutions specialist', 'solution specialist', 'handler', 'site specialist'],
  name: ['site name', 'school name', 'name', 'site'],
  link: ['link', 'url', 'site link'],
  status: ['status', 'deploy', 'deployment status', 'deploy status'],
  programs: ['programs', 'program'],
  accountCreation: ['account creation', 'accounts', 'account'],
  teachers: ['teachers uploaded', 'teachers'],
  students: ['students uploaded', 'students'],
  enrollment: ['enrollment module', 'enrollment'],
};

function buildCSVColumnMap(headers) {
  const map = {};
  let matched = 0;

  headers.forEach((header, index) => {
    const h = header.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!h) return;

    for (const [field, aliases] of Object.entries(CSV_COLUMN_ALIASES)) {
      if (map[field] !== undefined) continue;
      if (aliases.some((alias) => h === alias || h.includes(alias))) {
        map[field] = index;
        matched++;
        break;
      }
    }
  });

  if (map.name === undefined || matched < 2) return null;
  return map;
}

function looksLikeCSVHeader(cols) {
  const joined = cols.join(' ').toLowerCase();
  return /ss|solutions specialist|handler|school name|site name|status|link/.test(joined);
}

/** Map row columns to school fields by index (Status in column D when no Programs). */
function rowFromColumns(cols, columnMap) {
  const pick = (field, fallbackIndex) => {
    const index = columnMap?.[field] ?? fallbackIndex;
    return index !== undefined && index < cols.length ? cols[index] : '';
  };

  const isStatusValue = (v) =>
    /^(deployed|undeployed|in progress|in-progress|inprogress|yes|no)$/i.test(String(v ?? '').trim());

  let statusIndex = columnMap?.status;
  let programsIndex = columnMap?.programs;

  if (statusIndex === undefined) {
    if (cols[3] !== undefined && isStatusValue(cols[3])) {
      statusIndex = 3;
      programsIndex = cols[4] !== undefined && !isStatusValue(cols[4]) ? 4 : undefined;
    } else if (cols[4] !== undefined && isStatusValue(cols[4])) {
      statusIndex = 4;
      programsIndex = 3;
    } else {
      statusIndex = 3;
    }
  }

  if (programsIndex === undefined && columnMap?.programs === undefined && statusIndex === 3 && cols.length >= 9) {
    programsIndex = 4;
  }

  let accountIndex = columnMap?.accountCreation;
  let teachersIndex = columnMap?.teachers;
  let studentsIndex = columnMap?.students;
  let enrollmentIndex = columnMap?.enrollment;

  if (accountIndex === undefined) {
    const afterFlags = programsIndex !== undefined ? programsIndex + 1 : statusIndex + 1;
    accountIndex = afterFlags;
    teachersIndex = afterFlags + 1;
    studentsIndex = afterFlags + 2;
    enrollmentIndex = afterFlags + 3;
  }

  return {
    ss: pick('ss', 0),
    name: pick('name', 1),
    link: pick('link', 2),
    status: normalizeStatus(pick('status', statusIndex)),
    programs: programsIndex !== undefined ? pick('programs', programsIndex) : '',
    accountCreation: csvYesNo(pick('accountCreation', accountIndex)),
    teachers: csvYesNo(pick('teachers', teachersIndex)),
    students: csvYesNo(pick('students', studentsIndex)),
    enrollment: csvYesNo(pick('enrollment', enrollmentIndex)),
  };
}

/** Parse CSV text into school objects (without ids — assigned on import) */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerCols = parseCSVRow(lines[0]);
  const columnMap = looksLikeCSVHeader(headerCols) ? buildCSVColumnMap(headerCols) : null;
  const dataLines = columnMap ? lines.slice(1) : lines.slice(1);

  return dataLines
    .map((line) => rowFromColumns(parseCSVRow(line), columnMap))
    .filter((s) => s.name);
}

/** Replace or append schools from imported CSV rows */
function importSchoolsFromCSV(schools, rows, mode = 'replace') {
  const toSchool = (row, id) => ({
    id,
    ss: row.ss || '',
    name: row.name || '',
    link: row.link || '',
    programs: row.programs || '',
    status: normalizeStatus(row.status || 'Undeployed'),
    accountCreation: Boolean(row.accountCreation),
    teachers: Boolean(row.teachers),
    students: Boolean(row.students),
    enrollment: Boolean(row.enrollment),
  });

  let updated;
  if (mode === 'append') {
    let nextId = getNextSchoolId(schools);
    updated = [...schools, ...rows.map((row) => toSchool(row, nextId++))];
  } else {
    updated = rows.map((row, index) => toSchool(row, index + 1));
  }

  updated = consolidateSchools(updated);
  saveSchoolsToStorage(updated);
  return updated;
}

function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
