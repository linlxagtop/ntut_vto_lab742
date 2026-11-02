/*
  study11 前後測問卷：匿名受試者 ID（Participant ID）產生與 Google 表單預填連結
  - 由 study11/index_vto_*.html（前測）與 vto11.html（後測）共用
*/

// Google 表單設定
// 若要啟用預填，請改用表單「取得預先填入的連結」產生的長網址（docs.google.com/forms/d/e/.../viewform?usp=pp_url），
// 並填入「匿名受試者代碼」題目的 entry ID；entry key 留空時只開啟表單、不預填。
const CONFIG = {
  PRE_TEST_FORM_URL: "https://forms.gle/Bvfk3gzNCTrDCJdS9",
  PRE_TEST_ENTRY_KEY: "", // 前測「匿名受試者代碼」的 entry ID，例如 "entry.1234567"

  POST_TEST_FORM_URL: "https://forms.gle/WwHLdo1av44sx9Nm6",
  POST_TEST_ENTRY_KEY: "" // 後測「匿名受試者代碼」的 entry ID，例如 "entry.7654321"
};

const PARTICIPANT_ID_STORAGE_KEY = 'study11_participant_id';

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

function readStoredParticipantId() {
  try {
    return localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY) || sessionStorage.getItem(PARTICIPANT_ID_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function storeParticipantId(pid) {
  try {
    localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, pid);
  } catch (e) {
    try { sessionStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, pid); } catch (e2) {}
  }
}

// 取得受試者 ID：網址參數 pid / participant_id → localStorage → 新產生
function getParticipantId() {
  const urlParams = new URLSearchParams(window.location.search);
  let pid = urlParams.get('pid') || urlParams.get('participant_id') || readStoredParticipantId();
  if (!pid) {
    pid = generateParticipantId();
  }
  storeParticipantId(pid);
  return pid;
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

function getPostTestUrl(participantId) {
  return buildPrefilledFormUrl(CONFIG.POST_TEST_FORM_URL, CONFIG.POST_TEST_ENTRY_KEY, participantId);
}
