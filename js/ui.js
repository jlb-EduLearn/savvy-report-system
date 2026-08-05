/** DOM rendering and UI helpers */

const sanitizeHTML = (str) => {
  const temp = document.createElement('div');
  temp.textContent = str ?? '';
  return temp.innerHTML;
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function updateLastSavedLabel(isoTime) {
  const el = document.getElementById('last-saved-label');
  if (!el) return;
  const when = isoTime ? new Date(isoTime) : new Date();
  el.textContent = `Saved ${when.toLocaleString()}`;
}

function renderFlagCell(value, label) {
  return `<span class="flag ${value ? 'flag-yes' : 'flag-no'}" title="${label}: ${value ? 'Yes' : 'No'}" aria-label="${label}: ${value ? 'Yes' : 'No'}"></span>`;
}

function renderMetrics(total, teachers, both, noEntry, enrollment) {
  document.getElementById('metric-total').innerText = total;
  document.getElementById('metric-teachers').innerText = teachers;
  document.getElementById('metric-both').innerText = both;
  document.getElementById('metric-noentry').innerText = noEntry;
  document.getElementById('metric-enrollment').innerText = enrollment;
}

function renderTable(schools, sortState) {
  const tableBody = document.getElementById('school-table-body');

  if (!schools.length) {
    tableBody.innerHTML =
      '<tr><td colspan="10" class="empty-row">No schools found.</td></tr>';
    return;
  }

  tableBody.innerHTML = schools
    .map((s) => {
      const url = s.link && !s.link.startsWith('http') ? `https://${s.link}` : s.link;
      return `
        <tr data-school-id="${s.id}">
          <td class="table-checkbox-cell"><input type="checkbox" class="school-checkbox" data-school-id="${s.id}"></td>
          <td>${sanitizeHTML(s.ss)}</td>
          <td><div class="site-name"><strong>${sanitizeHTML(s.name)}</strong>${s.programs ? `<span class="site-programs">${sanitizeHTML(s.programs)}</span>` : ''}</div></td>
          <td class="link-cell">${s.link ? `<a href="${sanitizeHTML(url)}" target="_blank" rel="noopener noreferrer">${sanitizeHTML(s.link)}</a>` : 'N/A'}</td>
          <td class="col-flag">${renderFlagCell(s.accountCreation, 'Accounts')}</td>
          <td class="col-flag">${renderFlagCell(s.teachers, 'Teachers')}</td>
          <td class="col-flag">${renderFlagCell(s.students, 'Students')}</td>
          <td class="col-flag">${renderFlagCell(s.enrollment, 'Enrollment')}</td>
          <td><span class="badge ${getStatusBadgeClass(s.status)}">${sanitizeHTML(s.status)}</span></td>
          <td class="col-actions action-cell">
            <button class="action-btn edit-btn" data-id="${s.id}">Edit</button>
            <button class="action-btn delete-btn" data-id="${s.id}">Delete</button>
          </td>
        </tr>`;
    })
    .join('');

  updateSortIndicators(sortState);
}

function updateSortIndicators(sortState) {
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortState.key) {
      th.classList.add(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function populateHandlerFilter(schools, selectedHandler) {
  const select = document.getElementById('filter-handler');
  if (!select) return;

  const handlers = getUniqueHandlers(schools);
  select.innerHTML =
    '<option value="">All Handlers</option>' +
    handlers.map((h) => `<option value="${sanitizeHTML(h)}">${sanitizeHTML(h)}</option>`).join('');

  if (selectedHandler) select.value = selectedHandler;
}

function setLoadingState(isLoading) {
  const loadBtn = document.getElementById('load-data-btn');
  if (!loadBtn) return;

  loadBtn.disabled = isLoading;
  loadBtn.textContent = isLoading ? 'Loading...' : 'Reload';
}

function openSchoolModal(mode = 'add', school = null) {
  const modal = document.getElementById('school-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('school-form');

  title.textContent = mode === 'edit' ? 'Edit School' : 'Add School';
  form.reset();

  document.getElementById('school-id').value = school?.id ?? '';
  document.getElementById('school-ss').value = school?.ss ?? '';
  document.getElementById('school-status').value = school?.status ?? 'Undeployed';
  document.getElementById('school-name').value = school?.name ?? '';
  document.getElementById('school-link').value = school?.link ?? '';
  document.getElementById('school-programs').value = school?.programs ?? '';
  document.getElementById('school-account-creation').checked = Boolean(school?.accountCreation);
  document.getElementById('school-teachers').checked = Boolean(school?.teachers);
  document.getElementById('school-students').checked = Boolean(school?.students);
  document.getElementById('school-enrollment').checked = Boolean(school?.enrollment);

  modal.style.display = 'flex';
  document.getElementById('school-name').focus();
}

function closeSchoolModal() {
  const modal = document.getElementById('school-modal');
  if (modal) modal.style.display = 'none';
}

function readSchoolFormData() {
  return {
    ss: document.getElementById('school-ss').value,
    name: document.getElementById('school-name').value,
    link: document.getElementById('school-link').value,
    programs: document.getElementById('school-programs').value,
    status: document.getElementById('school-status').value,
    accountCreation: document.getElementById('school-account-creation').checked,
    teachers: document.getElementById('school-teachers').checked,
    students: document.getElementById('school-students').checked,
    enrollment: document.getElementById('school-enrollment').checked,
  };
}

function syncSelectAllCheckbox() {
  const selectAll = document.getElementById('select-all-checkbox');
  const checkboxes = document.querySelectorAll('.school-checkbox');
  if (!selectAll || !checkboxes.length) return;

  const checkedCount = document.querySelectorAll('.school-checkbox:checked').length;
  selectAll.checked = checkedCount === checkboxes.length;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}
