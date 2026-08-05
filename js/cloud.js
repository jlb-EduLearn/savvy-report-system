/** Cloud sync via Supabase REST API */

const CLOUD_ROW_ID = 1;
let cloudSaveTimer = null;
let cloudSaveInFlight = false;
let lastCloudSyncAt = null;

function isCloudEnabled() {
  return Boolean(CLOUD_CONFIG?.supabaseUrl && CLOUD_CONFIG?.supabaseAnonKey);
}

function cloudHeaders(extra = {}) {
  return {
    apikey: CLOUD_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`,
    ...extra,
  };
}

function setSyncStatus(state, detail = '') {
  const el = document.getElementById('sync-status-label');
  if (!el) return;

  const labels = {
    loading: 'Syncing…',
    synced: 'Cloud synced',
    saving: 'Saving…',
    local: 'Local only — cloud not configured',
    error: 'Cloud unavailable — using local copy',
  };

  el.textContent = detail || labels[state] || '';
  el.className = `sync-status sync-${state}`;
}

async function fetchCloudSchools() {
  const url = `${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data?id=eq.${CLOUD_ROW_ID}&select=schools,updated_at`;
  const res = await fetch(url, { headers: cloudHeaders() });

  if (!res.ok) {
    throw new Error(`Cloud fetch failed (${res.status})`);
  }

  const rows = await res.json();
  if (!rows.length) return null;

  lastCloudSyncAt = rows[0].updated_at;
  return rows[0].schools;
}

async function upsertCloudSchools(schools) {
  const url = `${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data`;
  const payload = {
    id: CLOUD_ROW_ID,
    schools,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: cloudHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Cloud save failed (${res.status})`);
  }

  lastCloudSyncAt = payload.updated_at;
}

function scheduleCloudSave(schools) {
  if (!isCloudEnabled()) return;

  clearTimeout(cloudSaveTimer);
  setSyncStatus('saving');

  cloudSaveTimer = setTimeout(async () => {
    if (cloudSaveInFlight) return;
    cloudSaveInFlight = true;
    try {
      await upsertCloudSchools(schools);
      setSyncStatus('synced');
      updateLastSavedLabel(lastCloudSyncAt);
    } catch {
      setSyncStatus('error');
      showToast('Could not save to cloud', 'error');
    } finally {
      cloudSaveInFlight = false;
    }
  }, 400);
}

async function loadSchoolsWithCloud() {
  if (!isCloudEnabled()) {
    setSyncStatus('local');
    return loadSchoolsFromStorage();
  }

  setSyncStatus('loading');

  try {
    const cloudSchools = await fetchCloudSchools();

    // Cloud has data (including intentional empty list)
    if (Array.isArray(cloudSchools)) {
      const consolidated = consolidateSchools(cloudSchools);
      saveSchoolsToStorage(consolidated, { skipCloud: true });
      setSyncStatus('synced');
      return consolidated;
    }

    // No cloud row yet — start blank, do not load seed data
    const empty = emptySchoolList();
    saveSchoolsToStorage(empty, { skipCloud: true });
    await upsertCloudSchools(empty);
    setSyncStatus('synced');
    return empty;
  } catch {
    setSyncStatus('error');
    showToast('Cloud unavailable — showing local data', 'error');
    return loadSchoolsFromStorage();
  }
}

async function pushLocalToCloud(schools) {
  if (!isCloudEnabled()) {
    showToast('Cloud not configured', 'info');
    return;
  }
  setSyncStatus('saving');
  try {
    await upsertCloudSchools(schools);
    setSyncStatus('synced');
    showToast('Saved to cloud', 'success');
  } catch {
    setSyncStatus('error');
    showToast('Cloud save failed', 'error');
  }
}
