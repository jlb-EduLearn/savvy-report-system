/** Statistics and badge helpers */

function calculateStats(schools) {
  const sites = groupSchoolsBySite(schools);
  const teachersOnly = [];
  const bothUploaded = [];
  const noEntry = [];
  let totalDeployed = 0;
  let enrollmentActive = 0;

  sites.forEach((s) => {
    const label = getSiteSubtitle(s) ? `${s.name} (${s.programs})` : s.name;
    if (s.teachers && s.students) {
      bothUploaded.push(label);
    } else if (s.teachers && !s.students) {
      teachersOnly.push(label);
    } else {
      noEntry.push(label);
    }
    if (s.status.toLowerCase() === 'deployed') totalDeployed++;
    if (s.enrollment) enrollmentActive++;
  });

  return {
    teachersOnly,
    bothUploaded,
    noEntry,
    totalDeployed,
    enrollmentActive,
    total: sites.length,
  };
}

function getStatusBadgeClass(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'deployed') return 'badge-success';
  if (normalized === 'in progress') return 'badge-warning';
  return 'badge-danger';
}

function getUploadSummary(school) {
  const parts = [];
  if (school.accountCreation) parts.push('Accounts');
  if (school.teachers) parts.push('Teachers');
  if (school.students) parts.push('Students');
  if (school.enrollment) parts.push('Enrollment');
  return parts.length ? parts.join(', ') : 'None';
}
