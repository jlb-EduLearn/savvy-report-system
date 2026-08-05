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

/** @param {import('./types').School[]} schools */
function saveSchoolsToStorage(schools, options = {}) {
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(schools));
  if (!options.skipCloud && typeof scheduleCloudSave === 'function') {
    scheduleCloudSave(schools);
  }
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
    'Handler',
    'Site Name',
    'Link',
    'Programs',
    'Status',
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
      csvEscape(s.programs || ''),
      csvEscape(s.status),
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

/** Parse CSV text into school objects (without ids — assigned on import) */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line) => {
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
  };

  const yesNo = (v) => /^(yes|true|1|✔|y)$/i.test(String(v).trim());

  return lines.slice(1).map((line) => {
    const cols = parseRow(line);
    return {
      ss: cols[0] || '',
      name: cols[1] || '',
      link: cols[2] || '',
      programs: cols[3] || '',
      status: cols[4] || 'Undeployed',
      accountCreation: yesNo(cols[5]),
      teachers: yesNo(cols[6]),
      students: yesNo(cols[7]),
      enrollment: yesNo(cols[8]),
    };
  }).filter((s) => s.name);
}

/** Replace or append schools from imported CSV rows */
function importSchoolsFromCSV(schools, rows, mode = 'replace') {
  const toSchool = (row, id) => ({
    id,
    ss: row.ss || '',
    name: row.name || '',
    link: row.link || '',
    programs: row.programs || '',
    status: row.status || 'Undeployed',
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
