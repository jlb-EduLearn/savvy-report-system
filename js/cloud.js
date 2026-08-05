/** Cloud sync via Supabase REST API */

const CLOUD_ROW_ID = 1;
let lastCloudSyncAt = null;
let lastAppliedRemoteAt = null;
let cloudSaveInFlight = false;
let cloudSyncInterval = null;

function isCloudEnabled() {
  return Boolean(CLOUD_CONFIG?.supabaseUrl && CLOUD_CONFIG?.supabaseAnonKey);
}

function isFileProtocol() {
  return window.location.protocol === 'file:';
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
    saving: 'Saving to cloud…',
    local: 'Local only — cloud not configured',
    error: 'Cloud save failed — local copy only',
  };

  el.textContent = detail || labels[state] || '';
  el.className = `sync-status sync-${state}`;
}

function showCloudBanner(message, type = 'warning') {
  const el = document.getElementById('cloud-banner');
  if (!el || !message) return;
  el.textContent = message;
  el.className = `cloud-banner cloud-banner-${type}`;
  el.hidden = false;
}

function checkCloudEnvironment() {
  if (isFileProtocol() && isCloudEnabled()) {
    showCloudBanner(
      'Opened as a local file — cloud sync is blocked. Use your Vercel URL on all devices.',
      'warning'
    );
    return;
  }

  if (!isCloudEnabled()) {
    showCloudBanner(
      'Cloud not connected. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, then Redeploy.',
      'error'
    );
  }
}

function isModalOpen() {
  const modal = document.getElementById('school-modal');
  return modal && modal.style.display !== 'none';
}

async function fetchCloudSnapshot() {
  const url = `${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data?id=eq.${CLOUD_ROW_ID}&select=schools,updated_at`;
  const res = await fetch(url, { headers: cloudHeaders() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud fetch failed (${res.status}): ${text}`);
  }

  const rows = await res.json();
  if (!rows.length) return null;

  return {
    schools: rows[0].schools,
    updated_at: rows[0].updated_at,
  };
}

async function fetchCloudSchools() {
  const snapshot = await fetchCloudSnapshot();
  if (!snapshot) return null;
  lastCloudSyncAt = snapshot.updated_at;
  return snapshot.schools;
}

async function upsertCloudSchools(schools) {
  const payload = {
    schools,
    updated_at: new Date().toISOString(),
  };

  const patchUrl = `${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data?id=eq.${CLOUD_ROW_ID}`;
  let res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: cloudHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data`, {
      method: 'POST',
      headers: cloudHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({ id: CLOUD_ROW_ID, ...payload }),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  lastCloudSyncAt = payload.updated_at;
  lastAppliedRemoteAt = payload.updated_at;
}

async function saveCloudSchoolsNow(schools) {
  if (!isCloudEnabled()) return false;
  if (isFileProtocol()) {
    setSyncStatus('error', 'Use Vercel URL for cloud sync');
    return false;
  }

  cloudSaveInFlight = true;
  setSyncStatus('saving');

  try {
    await upsertCloudSchools(schools);
    setSyncStatus('synced');
    updateLastSavedLabel(lastCloudSyncAt);
    return true;
  } catch (err) {
    console.error('Cloud save error:', err);
    setSyncStatus('error');
    showToast('Cloud save failed — saved on this device only', 'error');
    return false;
  } finally {
    cloudSaveInFlight = false;
  }
}

async function persistSchools(schools) {
  saveSchoolsToStorage(schools);
  return saveCloudSchoolsNow(schools);
}

async function loadSchoolsWithCloud() {
  checkCloudEnvironment();

  if (!isCloudEnabled()) {
    setSyncStatus('local');
    return loadSchoolsFromStorage();
  }

  if (isFileProtocol()) {
    setSyncStatus('error', 'Local file — use Vercel URL for sync');
    return loadSchoolsFromStorage();
  }

  setSyncStatus('loading');

  try {
    const snapshot = await fetchCloudSnapshot();

    if (snapshot && Array.isArray(snapshot.schools)) {
      const consolidated = consolidateSchools(snapshot.schools);
      saveSchoolsToStorage(consolidated);
      lastAppliedRemoteAt = snapshot.updated_at;
      lastCloudSyncAt = snapshot.updated_at;
      setSyncStatus('synced');
      return consolidated;
    }

    const empty = emptySchoolList();
    saveSchoolsToStorage(empty);
    await upsertCloudSchools(empty);
    setSyncStatus('synced');
    return empty;
  } catch (err) {
    console.error('Cloud load error:', err);
    setSyncStatus('error');
    showToast('Cloud unavailable — showing local data', 'error');
    return loadSchoolsFromStorage();
  }
}

async function pullFromCloudIfNewer(onUpdate) {
  if (!isCloudEnabled() || isFileProtocol() || cloudSaveInFlight || isModalOpen()) {
    return;
  }

  try {
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot || !Array.isArray(snapshot.schools)) return;

    if (snapshot.updated_at === lastAppliedRemoteAt) return;

    const consolidated = consolidateSchools(snapshot.schools);
    onUpdate(consolidated, snapshot.updated_at);
    lastAppliedRemoteAt = snapshot.updated_at;
    lastCloudSyncAt = snapshot.updated_at;
    setSyncStatus('synced');
  } catch (err) {
    console.error('Auto-sync pull error:', err);
  }
}

function startAutoCloudSync(onUpdate) {
  if (!isCloudEnabled() || isFileProtocol()) return;

  const interval = APP_CONFIG.cloudSyncIntervalMs || 8000;

  if (cloudSyncInterval) clearInterval(cloudSyncInterval);

  cloudSyncInterval = setInterval(() => pullFromCloudIfNewer(onUpdate), interval);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullFromCloudIfNewer(onUpdate);
    }
  });
}

async function pushLocalToCloud(schools) {
  return saveCloudSchoolsNow(schools);
}
