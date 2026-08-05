/** Cloud sync via Supabase REST API */

const CLOUD_ROW_ID = 1;
let lastCloudSyncAt = null;

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
      'Opened as a local file — cloud sync is blocked by the browser. Use your Vercel URL on all devices, or run: npx serve . in this folder then open http://localhost:3000',
      'warning'
    );
    return;
  }

  if (!isCloudEnabled()) {
    showCloudBanner(
      'Cloud not connected on this site. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then Redeploy.',
      'error'
    );
  }
}

async function fetchCloudSchools() {
  const url = `${CLOUD_CONFIG.supabaseUrl}/rest/v1/app_data?id=eq.${CLOUD_ROW_ID}&select=schools,updated_at`;
  const res = await fetch(url, { headers: cloudHeaders() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud fetch failed (${res.status}): ${text}`);
  }

  const rows = await res.json();
  if (!rows.length) return null;

  lastCloudSyncAt = rows[0].updated_at;
  return rows[0].schools;
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
}

async function saveCloudSchoolsNow(schools) {
  if (!isCloudEnabled()) return false;
  if (isFileProtocol()) {
    setSyncStatus('error', 'Use Vercel URL or local server for cloud sync');
    return false;
  }

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
  }
}

function scheduleCloudSave(schools) {
  saveCloudSchoolsNow(schools);
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
    const cloudSchools = await fetchCloudSchools();

    if (Array.isArray(cloudSchools)) {
      const consolidated = consolidateSchools(cloudSchools);
      saveSchoolsToStorage(consolidated, { skipCloud: true });
      setSyncStatus('synced');
      return consolidated;
    }

    const empty = emptySchoolList();
    saveSchoolsToStorage(empty, { skipCloud: true });
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

async function pushLocalToCloud(schools) {
  if (!isCloudEnabled()) {
    showToast('Cloud not configured', 'info');
    return false;
  }
  const ok = await saveCloudSchoolsNow(schools);
  if (ok) showToast('Saved to cloud — open Reload on other devices', 'success');
  return ok;
}
