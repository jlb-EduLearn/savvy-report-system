/** Site grouping — one deployment URL = one site */

function normalizeSiteLink(link) {
  if (!link || !String(link).trim()) return '';
  return String(link)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function siteStatusPriority(statuses) {
  if (statuses.some((s) => s === 'Deployed')) return 'Deployed';
  if (statuses.some((s) => s === 'In Progress')) return 'In Progress';
  return 'Undeployed';
}

function programLabelFromName(name) {
  const match = name.match(/(?:elementary|regular high school|science high school|high school|academy|college|inc\.?)$/i);
  if (match) return name.trim();
  return '';
}

/** Merge rows that share the same site link into one site record */
function mergeSiteGroup(rows) {
  if (rows.length === 1) return { ...rows[0] };

  const withLink = rows.find((r) => normalizeSiteLink(r.link));
  const primary = withLink || rows[0];
  const programs = rows
    .map((r) => r.programs || programLabelFromName(r.name) || r.name)
    .filter(Boolean);

  let siteName = primary.name;
  if (/baguio/i.test(siteName)) siteName = 'University of Baguio';
  else {
    siteName = siteName
      .replace(/\s+(Elementary|Regular High School|Science High School)$/i, '')
      .trim();
  }

  return {
    ...primary,
    id: Math.min(...rows.map((r) => r.id)),
    name: siteName,
    link: primary.link || withLink?.link || '',
    programs: [...new Set(programs)].join(', '),
    status: siteStatusPriority(rows.map((r) => r.status)),
    accountCreation: rows.some((r) => r.accountCreation),
    teachers: rows.some((r) => r.teachers),
    students: rows.some((r) => r.students),
    enrollment: rows.some((r) => r.enrollment),
  };
}

/** Group schools by shared site link; rows without a link stay separate */
function groupSchoolsBySite(schools) {
  const linked = new Map();
  const unlinked = [];

  schools.forEach((school) => {
    const key = normalizeSiteLink(school.link);
    if (!key) {
      unlinked.push({ ...school });
      return;
    }
    if (!linked.has(key)) linked.set(key, []);
    linked.get(key).push(school);
  });

  return [...Array.from(linked.values()).map(mergeSiteGroup), ...unlinked];
}

/** Fix known multi-program sites saved as separate rows (e.g. University of Baguio) */
function migrateMultiProgramSites(schools) {
  const baguio = schools.filter((s) => /baguio/i.test(s.name));
  if (baguio.length <= 1) return schools;

  const others = schools.filter((s) => !/baguio/i.test(s.name));
  const merged = mergeSiteGroup(baguio.map((s) => ({ ...s, link: s.link || 'ub.edulearntechnologies.com' })));
  merged.name = 'University of Baguio';
  merged.link = 'ub.edulearntechnologies.com';
  merged.programs = 'Elementary, Regular High School, Science High School';

  return [...others, merged].sort((a, b) => a.id - b.id);
}

function consolidateSchools(schools) {
  return groupSchoolsBySite(migrateMultiProgramSites(schools));
}

function getSiteDisplayName(school) {
  return school.name;
}

function getSiteSubtitle(school) {
  return school.programs || '';
}
