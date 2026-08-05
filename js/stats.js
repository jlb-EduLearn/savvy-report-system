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

function renderDeployStatusCell(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'Deployed') {
    return '<span class="badge badge-success">Yes</span>';
  }
  if (normalized === 'In Progress') {
    return '<span class="badge badge-warning">In Progress</span>';
  }
  return '<span class="badge badge-danger">No</span>';
}

function getUploadSummary(school) {
  const parts = [];
  if (school.accountCreation) parts.push('Accounts');
  if (school.teachers) parts.push('Teachers');
  if (school.students) parts.push('Students');
  if (school.enrollment) parts.push('Enrollment');
  return parts.length ? parts.join(', ') : 'None';
}
