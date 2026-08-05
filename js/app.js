/** Application state and event wiring */

let currentSchoolData = [];
let sortState = { key: 'name', direction: 'asc' };
let filters = { search: '', handler: '', status: '' };

function getVisibleSchools() {
  let schools = filterSchools(currentSchoolData, filters);
  schools = sortSchools(schools, sortState.key, sortState.direction);
  return schools;
}

function refreshDashboard(options = {}) {
  const { resetCheckboxes = false } = options;
  const visible = getVisibleSchools();
  const allStats = calculateStats(currentSchoolData);

  renderMetrics(
    allStats.total,
    allStats.teachersOnly.length,
    allStats.bothUploaded.length,
    allStats.noEntry.length,
    allStats.enrollmentActive
  );

  renderTable(visible, sortState);
  populateHandlerFilter(currentSchoolData, filters.handler);
  updateLastSavedLabel();

  if (resetCheckboxes) {
    document.getElementById('select-all-checkbox').checked = true;
    document.querySelectorAll('.school-checkbox').forEach((cb) => {
      cb.checked = true;
    });
  }

  updateReportFromSelection();
}

async function loadAndRenderData() {
  setLoadingState(true);

  try {
    currentSchoolData = await loadSchoolsWithCloud();
    filters = { search: '', handler: '', status: '' };
    document.getElementById('search-input').value = '';
    document.getElementById('filter-status').value = '';
    refreshDashboard({ resetCheckboxes: true });
    showToast(isCloudEnabled() ? 'Synced from cloud' : 'Data loaded', 'success');
  } catch {
    currentSchoolData = loadSchoolsFromStorage();
    refreshDashboard({ resetCheckboxes: true });
    showToast('Failed to load data', 'error');
  } finally {
    setLoadingState(false);
  }
}

function updateReportFromSelection() {
  const selectedCheckboxes = document.querySelectorAll('.school-checkbox:checked');
  const selectedIds = Array.from(selectedCheckboxes).map((cb) => parseInt(cb.dataset.schoolId, 10));
  const reportNote = document.querySelector('.report-note');

  let schoolsForReport;
  if (selectedIds.length > 0 && selectedIds.length < currentSchoolData.length) {
    schoolsForReport = currentSchoolData.filter((s) => selectedIds.includes(s.id));
    reportNote.textContent = `Report for ${selectedIds.length} selected school(s).`;
  } else {
    schoolsForReport = currentSchoolData;
    reportNote.textContent = 'Select schools in the table to generate a partial report.';
  }

  displayReport(generateReportText(calculateStats(schoolsForReport)));
}

function handleSearchInput(e) {
  filters.search = e.target.value;
  refreshDashboard();
}

function handleFilterChange() {
  filters.handler = document.getElementById('filter-handler').value;
  filters.status = document.getElementById('filter-status').value;
  refreshDashboard();
}

function handleSortClick(e) {
  const th = e.target.closest('th[data-sort]');
  if (!th) return;

  const key = th.dataset.sort;
  if (sortState.key === key) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.key = key;
    sortState.direction = 'asc';
  }

  refreshDashboard();
}

async function handleTableClick(e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn) {
    const id = parseInt(editBtn.dataset.id, 10);
    const school = currentSchoolData.find((s) => s.id === id);
    if (school) openSchoolModal('edit', school);
    return;
  }

  if (deleteBtn) {
    const id = parseInt(deleteBtn.dataset.id, 10);
    const school = currentSchoolData.find((s) => s.id === id);
    if (!school) return;

    const confirmed = confirm(`Delete "${school.name}"? This cannot be undone.`);
    if (!confirmed) return;

    currentSchoolData = deleteSchool(currentSchoolData, id);
    refreshDashboard({ resetCheckboxes: true });
    await syncAfterChange(`Deleted ${school.name} and synced to cloud`);
  }
}

function handleCheckboxChange(e) {
  if (e.target.classList.contains('school-checkbox') || e.target.id === 'select-all-checkbox') {
    if (e.target.id === 'select-all-checkbox') {
      const checked = e.target.checked;
      document.querySelectorAll('.school-checkbox').forEach((cb) => {
        cb.checked = checked;
      });
    } else {
      syncSelectAllCheckbox(getVisibleSchools());
    }
    updateReportFromSelection();
  }
}

async function applyRemoteSchools(schools, updatedAt) {
  const localJson = JSON.stringify(currentSchoolData);
  const remoteJson = JSON.stringify(schools);
  if (localJson === remoteJson) return;

  currentSchoolData = schools;
  saveSchoolsToStorage(schools);
  refreshDashboard();
  updateLastSavedLabel(updatedAt);
}

async function syncAfterChange(message) {
  const ok = await persistSchools(currentSchoolData);
  showToast(ok ? message : 'Saved locally — cloud sync failed', ok ? 'success' : 'error');
  return ok;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = readSchoolFormData();
  const idValue = document.getElementById('school-id').value;

  if (idValue) {
    currentSchoolData = updateSchool(currentSchoolData, parseInt(idValue, 10), formData);
  } else {
    currentSchoolData = createSchool(currentSchoolData, formData);
  }

  closeSchoolModal();
  refreshDashboard({ resetCheckboxes: true });
  await syncAfterChange(idValue ? 'Updated and synced to cloud' : 'Added and synced to cloud');
}

async function handleSyncCloud() {
  const ok = await persistSchools(currentSchoolData);
  showToast(ok ? 'Synced to cloud' : 'Cloud sync failed', ok ? 'success' : 'error');
}

function handleCopyReport() {
  const copyBtn = document.getElementById('copy-btn');
  const originalText = copyBtn.textContent;

  copyReportToClipboard()
    .then(() => {
      copyBtn.textContent = 'Copied';
      showToast('Report copied', 'success');
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    })
    .catch(() => {
      showToast('Failed to copy report', 'error');
    });
}

function handleExportCSV() {
  const csv = schoolsToCSV(currentSchoolData);
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `SAVVY-Schools-${date}.csv`, 'text/csv');
  showToast('CSV exported', 'success');
}

function handleImportCSV(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const rows = parseCSV(event.target.result);
      if (!rows.length) {
        showToast('No valid rows found in CSV', 'error');
        return;
      }

      const mode = confirm(
        `Found ${rows.length} school(s).\n\nOK = Replace all existing data\nCancel = Append to existing data`
      )
        ? 'replace'
        : 'append';

      currentSchoolData = importSchoolsFromCSV(currentSchoolData, rows, mode);
      refreshDashboard({ resetCheckboxes: true });
      await syncAfterChange(`Imported ${rows.length} school(s) and synced to cloud`);
    } catch {
      showToast('Failed to parse CSV file', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

async function handleResetData() {
  const confirmed = confirm(
    'Clear all schools and reset to blank? Cloud data will be cleared too.'
  );
  if (!confirmed) return;

  currentSchoolData = resetToSeedData();
  refreshDashboard({ resetCheckboxes: true });
  await syncAfterChange('Reset to blank and synced to cloud');
}

function handleHandlerSummary() {
  const summary = generateHandlerSummary(currentSchoolData);
  displayReport(summary);
  showToast('Handler summary loaded into report panel', 'info');
}

function initApp() {
  document.getElementById('load-data-btn').addEventListener('click', loadAndRenderData);
  document.getElementById('copy-btn').addEventListener('click', handleCopyReport);
  document.getElementById('download-report-btn').addEventListener('click', downloadReportAsFile);
  document.getElementById('handler-summary-btn').addEventListener('click', handleHandlerSummary);
  document.getElementById('add-school-btn').addEventListener('click', () => openSchoolModal('add'));
  document.getElementById('cancel-btn').addEventListener('click', closeSchoolModal);
  document.getElementById('school-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);
  document.getElementById('import-csv-input').addEventListener('change', handleImportCSV);
  document.getElementById('reset-data-btn').addEventListener('click', handleResetData);
  document.getElementById('sync-cloud-btn').addEventListener('click', handleSyncCloud);

  document.getElementById('search-input').addEventListener('input', handleSearchInput);
  document.getElementById('filter-handler').addEventListener('change', handleFilterChange);
  document.getElementById('filter-status').addEventListener('change', handleFilterChange);

  document.querySelector('table thead').addEventListener('click', handleSortClick);
  document.getElementById('school-table-body').addEventListener('click', handleTableClick);
  document.addEventListener('change', handleCheckboxChange);

  document.getElementById('school-modal').addEventListener('click', (e) => {
    if (e.target.id === 'school-modal') closeSchoolModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSchoolModal();
  });

  loadAndRenderData().then(() => {
    startAutoCloudSync(applyRemoteSchools);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
