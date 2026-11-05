/*
  study11 相機權限檢查：取得相機權限後才啟動 AR（main.js 的 main()）
  - 尚未允許前，在頁面上方顯示提示列（瀏覽器的權限對話窗通常出現在中間）
  - 使用者拒絕時自動再請求一次；仍被拒絕則顯示「重新允許相機」按鈕與各平台開啟方式
  - 適用 Android / iOS / macOS / Windows 的瀏覽器與 LINE 內建瀏覽器
*/

const CAMERA_CONSTRAINTS = { video: { facingMode: 'user' }, audio: false };

function getCameraSettingsHint() {
  const ua = navigator.userAgent || '';
  const isLine = /\bLine\//i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;

  if (isLine && isIOS) {
    return '請至 iPhone「設定」→「LINE」→ 開啟「相機」，再回到此頁按「重新允許相機」。';
  }
  if (isLine && isAndroid) {
    return '請至手機「設定」→「應用程式」→「LINE」→「權限」→ 允許「相機」，再回到此頁按「重新允許相機」。';
  }
  if (isIOS) {
    return '請點網址列左側的「ᴀA」或設定圖示 →「網站設定」→「相機」→「允許」；或至 iPhone「設定」→ 瀏覽器 →「相機」→「允許」，再重新整理此頁。';
  }
  if (isAndroid) {
    return '請點網址列左側的設定圖示 →「權限」→「相機」→「允許」；或至手機「設定」→「應用程式」→ 瀏覽器 →「權限」→ 允許「相機」，再重新整理此頁。';
  }
  if (isMac) {
    return '請點網址列左側的設定圖示 →「相機」→「允許」，再重新整理此頁；若仍無法使用，請至「系統設定」→「隱私權與安全性」→「相機」允許此瀏覽器。';
  }
  return '請點網址列左側的設定圖示 →「相機」→「允許」，再重新整理此頁；若仍無法使用，請至 Windows「設定」→「隱私權與安全性」→「相機」允許此瀏覽器。';
}

function createCameraPermissionBanner() {
  const style = document.createElement('style');
  style.textContent = [
    '#cameraPermissionBanner{position:fixed;top:0;left:0;right:0;z-index:10000;padding:14px 16px;',
    'padding-top:calc(14px + env(safe-area-inset-top,0px));background:rgba(0,0,0,0.85);color:#fff;',
    'font-family:"微軟正黑體","Microsoft JhengHei",sans-serif;font-size:16px;line-height:1.5;text-align:center;box-sizing:border-box;}',
    '#cameraPermissionBanner .cp-title{font-weight:bold;font-size:17px;}',
    '#cameraPermissionBanner .cp-hint{margin-top:6px;font-size:14px;color:#ddd;}',
    '#cameraPermissionBanner .cp-actions{margin-top:10px;display:none;gap:8px;justify-content:center;flex-wrap:wrap;}',
    '#cameraPermissionBanner button{background:#0078d4;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer;}',
    '#cameraPermissionBanner button.cp-secondary{background:#555;}'
  ].join('');
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'cameraPermissionBanner';
  banner.innerHTML =
    '<div class="cp-title">請允許使用相機，才能進行 AR 虛擬試戴體驗</div>' +
    '<div class="cp-hint">請在跳出的視窗中選擇「允許」。</div>' +
    '<div class="cp-actions">' +
      '<button type="button" class="cp-retry">重新允許相機</button>' +
      '<button type="button" class="cp-secondary cp-reload">重新整理</button>' +
    '</div>';
  document.body.appendChild(banner);
  return banner;
}

function showCameraDenied(banner, err) {
  const name = err && err.name;
  let title = '尚未允許使用相機，無法進行 AR 虛擬試戴體驗';
  let hint = getCameraSettingsHint();
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    title = '找不到可使用的相機';
    hint = '請確認裝置有相機並已連接，再按「重新允許相機」。';
  } else if (name === 'NotReadableError' || name === 'AbortError') {
    title = '相機正被其他程式使用中';
    hint = '請關閉其他使用相機的 App 或分頁，再按「重新允許相機」。';
  } else if (name === 'NotSupported') {
    title = '此瀏覽器無法使用相機';
    hint = '請改用 Chrome 或 Safari 開啟此頁面（LINE 可點右上角選單 →「使用預設瀏覽器開啟」）。';
  }
  banner.querySelector('.cp-title').textContent = title;
  banner.querySelector('.cp-hint').textContent = hint;
  banner.querySelector('.cp-actions').style.display = 'flex';
  banner.style.display = 'block';
}

function showCameraRequesting(banner) {
  banner.querySelector('.cp-title').textContent = '請允許使用相機，才能進行 AR 虛擬試戴體驗';
  banner.querySelector('.cp-hint').textContent = '請在跳出的視窗中選擇「允許」。';
  banner.querySelector('.cp-actions').style.display = 'none';
  banner.style.display = 'block';
}

function requestCameraOnce() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    const err = new Error('getUserMedia not supported');
    err.name = 'NotSupported';
    return Promise.reject(err);
  }
  return navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS).then(function (stream) {
    // 只用來取得權限，立即釋放，讓 AR 函式庫自行開啟相機
    stream.getTracks().forEach(function (track) { track.stop(); });
  });
}

function queryCameraPermission() {
  if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
    return Promise.resolve(null);
  }
  return navigator.permissions.query({ name: 'camera' }).catch(function () { return null; });
}

// 取得相機權限後 resolve；未取得前持續顯示提示列，不會 reject
function ensureCameraPermission() {
  return new Promise(function (resolve) {
    let banner = null;
    let isDone = false;

    function getBanner() {
      if (!banner) {
        banner = createCameraPermissionBanner();
        banner.querySelector('.cp-retry').addEventListener('click', function () {
          attempt(false);
        });
        banner.querySelector('.cp-reload').addEventListener('click', function () {
          window.location.reload();
        });
      }
      return banner;
    }

    function done() {
      if (isDone) return;
      isDone = true;
      if (banner) banner.style.display = 'none';
      resolve();
    }

    // isAutoRetry：第一次被拒絕時自動再請求一次
    function attempt(isAutoRetry) {
      showCameraRequesting(getBanner());
      requestCameraOnce().then(done).catch(function (err) {
        console.log('Camera permission failed:', err && err.name, err);
        if (isAutoRetry && err && err.name === 'NotAllowedError') {
          attempt(false);
        } else {
          showCameraDenied(getBanner(), err);
        }
      });
    }

    queryCameraPermission().then(function (status) {
      if (status) {
        // 使用者從網址列或系統設定改成允許時，不需重新整理即可繼續
        status.onchange = function () {
          if (status.state === 'granted' && !isDone) attempt(false);
        };
      }
      if (status && status.state === 'granted') {
        requestCameraOnce().then(done).catch(function () { attempt(true); });
      } else {
        attempt(true);
      }
    });
  });
}
