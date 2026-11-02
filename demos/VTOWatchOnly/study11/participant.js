/*
  study11 前後測問卷：匿名受試者 ID（Participant ID）產生與 Google 表單預填連結
  - 流程：study11/start.html（產生 PID → 前測）→ s11_portal.html（隨機分派 EXID）
    → s11_vto_*.html → vto11.html（PID + EXID → 後測）
*/

// Google 表單設定：預填連結 + 「匿名受試者代碼」題目的 entry ID
const CONFIG = {
  PRE_TEST_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSdYSxWEScKgeCrk2-kWYCI4MMvj6yh7DvusFxftej950hEiPA/viewform?usp=pp_url",
  PRE_TEST_ENTRY_KEY: "entry.548571719",

  POST_TEST_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfJSIgmMB7gQVtNxnf0l0DcNnY4OhMObF9dVo3itfYeVx9C_A/viewform?usp=pp_url",
  POST_TEST_ENTRY_KEY: "entry.592418543",
  POST_TEST_EXID_ENTRY_KEY: "entry.1374428065" // 後測「情境 ID」的 entry ID
};

// study11 四個情境：EXID 為數字 1~4，對應 vto11.html 的 g 參數與進入頁
const STUDY11_CONDITIONS = {
  1: { g: 'mu', page: 's11_vto_mu.html' },
  2: { g: 'mu_zilin', page: 's11_vto_mu_zilin.html' },
  3: { g: 'avat', page: 's11_vto_avat.html' },
  4: { g: 'avat_zilin', page: 's11_vto_avat_zilin.html' }
};

const PARTICIPANT_ID_STORAGE_KEY = 'study11_participant_id';
const EXID_STORAGE_KEY = 'study11_exid';

function generateParticipantId() {
  let uuid;
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    uuid = window.crypto.randomUUID();
  } else {
    // 非 HTTPS 等環境沒有 randomUUID 時的備援
    uuid = Date.now().toString(16) + Math.random().toString(16).slice(2);
  }
  return 'usr_' + uuid.replace(/-/g, '').slice(0, 8);
}

function readStoredValue(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function storeValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    try { sessionStorage.setItem(key, value); } catch (e2) {}
  }
}

// 取得受試者 ID：網址參數 pid / participant_id → localStorage → 新產生
function getParticipantId() {
  const urlParams = new URLSearchParams(window.location.search);
  let pid = urlParams.get('pid') || urlParams.get('participant_id') || readStoredValue(PARTICIPANT_ID_STORAGE_KEY);
  if (!pid) {
    pid = generateParticipantId();
  }
  storeValue(PARTICIPANT_ID_STORAGE_KEY, pid);
  return pid;
}

// 取得情境 ID：已分派過就沿用（重新整理不會換組），否則隨機分派
function getOrAssignExid() {
  let exid = getStoredExid();
  if (!exid) {
    const ids = Object.keys(STUDY11_CONDITIONS).map(Number);
    exid = ids[Math.floor(Math.random() * ids.length)];
    storeValue(EXID_STORAGE_KEY, exid);
  }
  return exid;
}

// 讀取已分派的 EXID（數字）；不合法的舊值視為未分派
function getStoredExid() {
  const exid = Number(readStoredValue(EXID_STORAGE_KEY));
  return STUDY11_CONDITIONS[exid] ? exid : null;
}

// 由 g 參數反查 EXID（localStorage 沒有 EXID 時的備援）
function getExidByGroup(gParam) {
  const exid = Object.keys(STUDY11_CONDITIONS).map(Number).find(function(id) {
    return STUDY11_CONDITIONS[id].g === gParam;
  });
  return exid || null;
}

// 產生 Google 表單預填連結
function buildPrefilledFormUrl(baseUrl, entryKey, participantId) {
  if (!entryKey || !participantId) {
    return baseUrl;
  }
  const separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return baseUrl + separator + encodeURIComponent(entryKey) + '=' + encodeURIComponent(participantId);
}

// 在網址後附加 pid 參數，讓下一頁沿用同一個 ID
function appendParticipantIdToUrl(url, participantId) {
  const separator = url.indexOf('?') === -1 ? '?' : '&';
  return url + separator + 'pid=' + encodeURIComponent(participantId);
}

function getPreTestUrl(participantId) {
  return buildPrefilledFormUrl(CONFIG.PRE_TEST_FORM_URL, CONFIG.PRE_TEST_ENTRY_KEY, participantId);
}

function getPostTestUrl(participantId, exid) {
  const url = buildPrefilledFormUrl(CONFIG.POST_TEST_FORM_URL, CONFIG.POST_TEST_ENTRY_KEY, participantId);
  return buildPrefilledFormUrl(url, CONFIG.POST_TEST_EXID_ENTRY_KEY, exid);
}
