// 用於存儲當前選擇的模型集合（正常或低解析度）
let currentModelSet = null;

const _settings = {
  marqueeState: null,
  threshold: 0.95, // detection sensitivity, between 0 and 1
  
  // pose computation and stabilization:

  poseLandmarksLabels: [
    // for NN 41, 42:
   'wristRight',
   'wristPalm',

   'wristRightBottom',
   'wristLeftBottom',

   'wristBackBottom2',
   'wristPalmBottom2',
   'wristBackMiddlePinky',
   'wristBackMiddleThumb'
   ],
  modelOffset: [-0.3*0, 0, -0.504*0], // bring pinky side, up
  modelScale: 1.3 * 1.462,
  NNsPaths: ['../../neuralNets/NN_WRISTBACK_42.json'],
  objectPointsPositionFactors: [1.0, 1.0, 1.0], //*/

  isPoseFilter: false,//true,
  
  // soft occluder parameters (soft because we apply a fading gradient)
  occluderRadiusRange: [4, 4.7], // first value: minimum or interior radius of the  (full transparency).
                                 // second value: maximum or exterior radius of the occluder (full opacity, no occluding effect)
  occluderHeight: 48, // height of the cylinder
  occluderOffset: [0,0,0], // relative to the wrist 3D model
  occluderQuaternion: [0.707,0,0,0.707], // rotation of Math.PI/2 along X axis,
  occluderFlattenCoeff: 0.6, // 1 -> occluder is a cylinder 0.5 -> flatten by 50%

  stabilizerOptions: {
    minCutOff: 0.001,
    beta: 5,
    freqRange: [2, 144],
    forceFilterNNInputPxRange: [2.5, 6],//[1.5, 4],
  },

  // model settings:
  modelURL: 'assets/watchDw_gold.glb',
  //modelURL: 'assets/watchDw_red.glb',
  //modelURL: 'assets/watchDw_black.glb',
  //modelURL: 'assets/watchDw_gold_low.glb',
  //modelURL: 'assets/watchDw_red_low.glb',
  //modelURL: 'assets/watchDw_black_low.glb',
  //modelOffset: [0.076, -0.916, -0.504],
  
  modelQuaternion: [0,0,0,1], // Format: X,Y,Z,W (and not W,X,Y,Z like Blender)

  // debug flags:
  debugDisplayLandmarks: false,
  debugMeshMaterial: false,
  debugOccluder: false,
  
  // watch models mapping
  watchModels: {
    'gold': 'assets/watchDw_gold.glb',
    'red': 'assets/watchDw_red.glb',
    'black': 'assets/watchDw_black.glb'
  },
  watchModelsLow: {
    'gold': 'assets/watchDw_gold_low.glb',
    'red': 'assets/watchDw_red_low.glb',
    'black': 'assets/watchDw_black_low.glb'
  },
  watchModelsMaterials: {
  //  'leather': 'assets/watchDw_leather.glb',
  //  'happy': 'assets/watchDw_happy.glb',
  //  'silver': 'assets/watchDw_silver.glb'
    'leather': 'assets/watchDw_gold.glb',
    'happy': 'assets/watchDw_black.glb',
    'silver': 'assets/watchDw_red.glb'
  },
  currentWatchColor: 'leather' // 預設款式
};

// Marquee JSON Data
const marqueeData = {
  'study01': {
    'uti': {
      'black': 'study01/study01_uti_black.json',
      'gold': 'study01/study01_uti_gold.json',
      'red': 'study01/study01_uti_red.json'
    },
    'hed': {
      'black': 'study01/study01_hed_black.json',
      'gold': 'study01/study01_hed_gold.json',
      'red': 'study01/study01_hed_red.json'
    }
  },
  'study02': {
    'comm': {
      'black': 'study02/study02_comm_black.json',
      'gold': 'study02/study02_comm_gold.json',
      'red': 'study02/study02_comm_red.json'
    }
  },
  'study03': {
    'comm': {
      'black': 'study03/study03_comm_black.json',
      'gold': 'study03/study03_comm_gold.json',
      'red': 'study03/study03_comm_red.json'
    }
  },
  'study04': {
    'comm': {
      'black': 'study04/study04_comm_black.json',
      'gold': 'study04/study04_comm_gold.json',
      'red': 'study04/study04_comm_red.json'
    }
  },
  // 2026/04/08 added
  'study05': {
    'v2026': {
      'leather': 'study05/study05_comm_leather.json',
      'happy': 'study05/study05_comm_happy.json',
      'silver': 'study05/study05_comm_silver.json'
    }
  },
  'study05vn': {
    'v2026': {
      'leather': 'study05/study05_comm_leather_vn.json',
      'happy': 'study05/study05_comm_happy_vn.json',
      'silver': 'study05/study05_comm_silver_vn.json'
    }
  },
  'study06': {
    'v2026': {
      'leather': 'study05/study05_comm_leather.json',
      'happy': 'study05/study05_comm_happy.json',
      'silver': 'study05/study05_comm_silver.json'
    }
  },
  'study07': {
    'v2026': {
      'leather': 'study05/study05_comm_leather.json',
      'happy': 'study05/study05_comm_happy.json',
      'silver': 'study05/study05_comm_silver.json'
    }
  },
  'study08': {
    'v2026': {
      'leather': 'study05/study05_comm_leather.json',
      'happy': 'study05/study05_comm_happy.json',
      'silver': 'study05/study05_comm_silver.json'
    }
  }
}

// 影片數據結構，根據 gParam 和 color 映射到特定的影片 ID
const videoData = {
  // 可用的影片列表
  availableVideos: [
    'ClassicAuburn_High', 'ClassicAuburn_Low',
    'ClassicCanterbury_High', 'ClassicCanterbury_Low',
    'ClassicGlasgow_High', 'ClassicGlasgow_Low',
    'Welcome_High', 'Welcome_Low',
    'ClassicStMawes_leather', 'ClassicSheffield_happy', 'Petite_silver'
  ],
  // 預設影片組
  comm: {
    red: 'ClassicCanterbury_High',
    black: 'ClassicGlasgow_High',
    gold: 'ClassicAuburn_High'
  },
  // 高解析度影片組
  high: {
    red: 'ClassicCanterbury_High',
    black: 'ClassicGlasgow_High',
    gold: 'ClassicAuburn_High'
  },
  // 低解析度影片組
  low: {
    red: 'ClassicCanterbury_Low',
    black: 'ClassicGlasgow_Low',
    gold: 'ClassicAuburn_Low'
  },
  // uti,hed等其他研究版本的影片組
  uti: {
    red: 'ClassicCanterbury_High',
    black: 'ClassicGlasgow_High',
    gold: 'ClassicAuburn_High'
  },
  hed: {
    red: 'ClassicCanterbury_High',
    black: 'ClassicGlasgow_High',
    gold: 'ClassicAuburn_High'
  },
  // 2026 scenario avatar videos
  v2026: {
    leather: 'ClassicStMawes_leather',
    happy: 'ClassicSheffield_happy',
    silver: 'Petite_silver'
  },
  // 預設影片
  default: 'Welcome_High'
};

const _states = {
  notLoaded: -1,
  loading: 0,
  idle: 1,
  running: 2,
  busy: 3
};
let _state = _states.notLoaded;
let _isInstructionsHidden = false;

// 將 three 對象設為全局變量
let threeStuff = null;

function setFullScreen(cv){
  const pixelRatio = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  cv.width = pixelRatio * Math.min(w, h*3/4);
  cv.height = pixelRatio * h;
}


// entry point:
function main(){
  handleUrlParameters();
  _state = _states.loading;

  // get canvases and size them:
  const handTrackerCanvas = document.getElementById('handTrackerCanvas');
  const VTOCanvas = document.getElementById('VTOCanvas');
  
  setFullScreen(handTrackerCanvas);
  setFullScreen(VTOCanvas);

  // init change VTO button:
  ChangeCameraHelper.init({
    canvases: [handTrackerCanvas, VTOCanvas],
    DOMChangeCameraButton: document.getElementById('changeCamera')
  })

  // initialize Helper:
  HandTrackerThreeHelper.init({
    landmarksStabilizerSpec: _settings.stabilizerOptions,
    scanSettings: {
      //translationScalingFactors: [0.3,0.3,0.3],
      //translationScalingFactors: [0.2,0.2,0.3],
      translationScalingFactors: [0.3,0.3,1],
    },
    stabilizationSettings: {
      switchNNErrorThreshold: 0.7,
      NNSwitchMask: {
        isRightHand: true,
        isFlipped: false
      }
    },
    objectPointsPositionFactors: _settings.objectPointsPositionFactors,
    poseRotationDirectionSrc: [0,1,0],
    poseRotationDirectionDst: [0,0,1],
    poseLandmarksLabels: _settings.poseLandmarksLabels,
    poseFilter: (_settings.isPoseFilter) ? PoseFlipFilter.instance({}) : null,
    NNsPaths: _settings.NNsPaths,
    threshold: _settings.threshold,
    callbackTrack: callbackTrack,
    VTOCanvas: VTOCanvas,
    videoSettings: {
      facingMode: 'user'
    },
    handTrackerCanvas: handTrackerCanvas,
    debugDisplayLandmarks: _settings.debugDisplayLandmarks,
  }).then(start).catch(function(err){
    throw new Error(err);
  });
} 


function setup_lighting(three){
  const scene = three.scene;

  const pmremGenerator = new THREE.PMREMGenerator( three.renderer );
  pmremGenerator.compileEquirectangularShader();

  new THREE.RGBELoader().setDataType( THREE.HalfFloatType )
    .load('assets/hotel_room_1k.hdr', function ( texture ) {
    const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
    pmremGenerator.dispose();
    scene.environment = envMap;
  });

  // improve WebGLRenderer settings:
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;
}


function load_model(threeLoadingManager){
  if (_state !== _states.running && _state !== _states.idle){
    return; // model is already loaded or state is busy or loading
  }
  _state = _states.busy;
  
  // remove previous model but not occluders:
  HandTrackerThreeHelper.clear_threeObjects(false);
  
  // load new model:
  new THREE.GLTFLoader(threeLoadingManager).load(_settings.modelURL, function(model){
    const me = model.scene.children[0]; // instance of THREE.Mesh
    me.scale.set(1, 1, 1);
    
    // tweak the material:
    if (_settings.debugMeshMaterial){
      me.traverse(function(child){
        if (child.material){
          child.material = new THREE.MeshNormalMaterial();
        }});
    }

    // tweak position, scale and rotation:
    if (_settings.modelScale){
      me.scale.multiplyScalar(_settings.modelScale);
    }
    
    // 根據相機模式調整模型方向
    if (_settings.modelOffset){
      const d = _settings.modelOffset;
      // 前置鏡頭和後置鏡頭使用不同的 X 軸偏移
      // 在前置鏡頭模式下，X 軸需要鏡像翻轉
      const xOffset = _isSelfieCamera ? d[0] : -d[0];
      const displacement = new THREE.Vector3(xOffset, d[2], -d[1]); // inverse Y and Z
      me.position.add(displacement);
    }
    
    if (_settings.modelQuaternion){
      const q = _settings.modelQuaternion;
      // 根據相機模式調整旋轉
      // 在前置鏡頭和後置鏡頭模式下使用不同的旋轉
      if (_isSelfieCamera) {
        me.quaternion.set(q[0], q[2], -q[1], q[3]);
      } else {
        // 在後置鏡頭模式下翻轉 Y 軸旋轉
        me.quaternion.set(-q[0], q[2], -q[1], q[3]);
      }
    }

    // add to the tracker:
    HandTrackerThreeHelper.add_threeObject(me);

    _state = _states.running;

  });
}


function start(three){
  VTOCanvas.style.zIndex = 3; // fix a weird bug on iOS15 / safari
  
  // 保存 three 對象以供後續使用
  threeStuff = three;

  setup_lighting(three);

  three.loadingManager.onLoad = function(){
    console.log('INFO in main.js: All THREE.js stuffs are loaded');
    hide_loading();
    _state = _states.running;
  }

  add_softOccluder().then(function(){
    _state = _states.idle;
  }).then(function(){
    load_model(three.loadingManager);
  });
}


function add_softOccluder(){
  // add a soft occluder (for the wrist for example):
  const occluderRadius = _settings.occluderRadiusRange[1];
  const occluderMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(occluderRadius, occluderRadius, _settings.occluderHeight, 32, 1, true),
    new THREE.MeshNormalMaterial()
  );
  const dr = _settings.occluderRadiusRange[1] - _settings.occluderRadiusRange[0];
  occluderMesh.position.fromArray(_settings.occluderOffset);
  occluderMesh.quaternion.fromArray(_settings.occluderQuaternion);
  occluderMesh.scale.set(1.0, 1.0, _settings.occluderFlattenCoeff);
  HandTrackerThreeHelper.add_threeSoftOccluder(occluderMesh, occluderRadius, dr, _settings.debugOccluder);
  return Promise.resolve();
}


function hide_loading(){
  // remove loading:
  const domLoading = document.getElementById('loading');
  // Check if the loading element exists before trying to access its properties
  if (domLoading) {
    domLoading.style.opacity = 0;
    
    // Show the changeCamera wrapper when loading is complete
    const changeCameraWrapper = document.getElementById('changeCameraWrapper');
    if (changeCameraWrapper) {
      changeCameraWrapper.style.display = 'block';
    }
    
    setTimeout(function(){
      // Check again in case it was removed during the timeout
      if (domLoading.parentNode) {
        domLoading.parentNode.removeChild(domLoading);
      }
    }, 800);
  }
}


function hide_instructions(){
  const domInstructions = document.getElementById('instructions');
  if (!domInstructions){
    return;
  }
  domInstructions.style.opacity = 0;
  _isInstructionsHidden = true;
  setTimeout(function(){
    domInstructions.parentNode.removeChild(domInstructions);
  }, 800);
  
  // 執行 callbackTrack 中的必要動作
  
  // 1. 啟動倒數計時器
  if (!_isCountdownStarted) {
    startCountdownTimer();
    _isCountdownStarted = true;
  }
  
  // 2. 處理影片播放
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoId && !_isVideoStarted && _state === _states.running) {
    _isVideoStarted = true;
    videoPlayer.style.display = 'block';
    setTimeout(() => {
      videoPlayer.play().catch(error => {
        console.log('Video autoplay failed:', error);
      });
    }, 1000);
  }
  
  // 3. 顯示手錶描述
  if (!_isWatchDescriptionShown) {
    const watchDescription = document.getElementById('watchDescription');
    const descriptionContainer = document.querySelector('.description-buttons-container');
    const currentWatchDescription = _settings.currentWatchDescription;
    const currentStudy = _settings.currentStudy;
    // 確保容器必須顯示
    if (descriptionContainer) {
      descriptionContainer.style.display = 'block';
    }
    // 確保挑色選項按鈕顯示，並設定 gold 按鈕預設被選中
    setActiveButton(document.getElementById('leather'));
    _isWatchDescriptionShown = true;
    // 只有study01和study02才顯示手錶描述
    if ((currentStudy=='study01' || currentStudy=='study02' || currentStudy=='study05' || currentStudy=='study05vn' || currentStudy=='study06' || currentStudy=='study07' || currentStudy=='study08') && watchDescription && currentWatchDescription) {
      watchDescription.style.display = 'block';
    }
  }
  
  // 4. 處理跑馬燈顯示
  const scrollingText = document.getElementById('scrollingText');
  if (_settings.marqueeState) {
    if (!_isMarqueeShown) {
      const gParam = urlParams.get('g');
      const color = _settings.currentWatchColor || 'gold';
      const studyVersion = _settings.currentStudy || 'study01';
      // 內容根據 studyVersion, g 參數與目前顏色
      if (gParam && marqueeData[studyVersion] && marqueeData[studyVersion][gParam] && marqueeData[studyVersion][gParam][color]) {
        const jsonPath = marqueeData[studyVersion][gParam][color];
        console.log('Loading marquee data from:', jsonPath);
        fetch(jsonPath)
          .then(response => response.json())
          .then(data => {
            if (scrollingText && data.comments) {
              scrollingText.style.display = 'block';
              updateMarqueeText(data.comments);
              _isMarqueeShown = true;
            }
          })
          .catch(error => console.error('Error loading messages:', error));
      } else {
        // 若無對應資料則隱藏跑馬燈
        console.log('No marquee data found for:', studyVersion, gParam, color);
        if (scrollingText) scrollingText.style.display = 'none';
        _isMarqueeShown = true;
      }
    }
  } else {
    if (scrollingText) scrollingText.style.display = 'none';
    _isMarqueeShown = false;
  }
}


// 跟踪相機是否為前置鏡頭（selfie mode）
let _isSelfieCamera = true;

function change_camera(){
  ChangeCameraHelper.change_camera().then(function(isSelfieMode) {
    // 更新相機狀態
    _isSelfieCamera = isSelfieMode;
    
    // 重新載入模型以調整方向
    if (threeStuff && threeStuff.loadingManager) {
      load_model(threeStuff.loadingManager);
    }
  }).catch(function(err) {
    console.error('切換相機失敗:', err);
  });
}

let _isVideoStarted = false;
let _isMarqueeShown = false;
let _isWatchDescriptionShown = false;
let _isCountdownStarted = false;
let _countdownInterval = null;

function callbackTrack(detectState){
  if (detectState.isDetected) {
    if (!_isInstructionsHidden){
      hide_instructions();
    }
    
    // 啟動倒數計時器（只在第一次偵測到手時啟動）
    if (!_isCountdownStarted) {
      startCountdownTimer();
      _isCountdownStarted = true;
    }
    
    // 影片播放處理
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoId && !_isVideoStarted && _state === _states.running) {
      _isVideoStarted = true;
      videoPlayer.style.display = 'block';
      setTimeout(() => {
        videoPlayer.play().catch(error => {
          console.log('Video autoplay failed:', error);
        });
      }, 1000);
    }
    
    // 手錶描述顯示處理（只在第一次觸發時顯示）
    if (!_isWatchDescriptionShown) {
      const watchDescription = document.getElementById('watchDescription');
      const descriptionContainer = document.querySelector('.description-buttons-container');
      const currentWatchDescription = _settings.currentWatchDescription;
      const currentStudy = _settings.currentStudy;
      // 確保容器必須顯示
      if (descriptionContainer) {
        descriptionContainer.style.display = 'block';
      }
      // 確保挑色選項按鈕顯示，並設定 gold 按鈕預設被選中
      setActiveButton(document.getElementById('gold'));
      _isWatchDescriptionShown = true;
      // 只有study01和study02才顯示手錶描述
      if ((currentStudy=='study01' || currentStudy=='study02') && watchDescription && currentWatchDescription) {
        watchDescription.style.display = 'block';
      }
    }
    
    // 跑馬燈顯示處理（只在第一次觸發時載入內容）
    const scrollingText = document.getElementById('scrollingText');
    if (_settings.marqueeState) {
      if (!_isMarqueeShown) {
        const urlParams = new URLSearchParams(window.location.search);
        const gParam = urlParams.get('g');
        const color = _settings.currentWatchColor || 'gold';
        const studyVersion = _settings.currentStudy || 'study01';
        // 內容根據 studyVersion, g 參數與目前顏色
        if (gParam && marqueeData[studyVersion] && marqueeData[studyVersion][gParam] && marqueeData[studyVersion][gParam][color]) {
          const jsonPath = marqueeData[studyVersion][gParam][color];
          console.log('Loading marquee data from:', jsonPath);
          fetch(jsonPath)
            .then(response => response.json())
            .then(data => {
              if (scrollingText && data.comments) {
                scrollingText.style.display = 'block';
                updateMarqueeText(data.comments);
                _isMarqueeShown = true;
              }
            })
            .catch(error => console.error('Error loading messages:', error));
        } else {
          // 若無對應資料則隱藏跑馬燈
          console.log('No marquee data found for:', studyVersion, gParam, color);
          if (scrollingText) scrollingText.style.display = 'none';
          _isMarqueeShown = true;
        }
      }
    } else {
      if (scrollingText) scrollingText.style.display = 'none';
      _isMarqueeShown = false;
    }
  }
}

// 設置活動按鈕
function setActiveButton(clickedButton) {
  // 移除所有按鈕的 active 類
  document.querySelectorAll('.color-button').forEach(button => {
    button.classList.remove('active');
  });
  // 為點擊的按鈕添加 active 類
  clickedButton.classList.add('active');
}

// 修改為切換模型的函數
function changeWatchColor(color) {
  // 確保選擇的顏色存在於模型集合中
  if (currentModelSet && currentModelSet[color]) {
    // 更新模型URL
    _settings.modelURL = currentModelSet[color];
    
    // 重新載入模型
    load_model(threeStuff.loadingManager);
    
    // 更新當前顏色
    _settings.currentWatchColor = color;
    
    // 更新按鈕狀態
    setActiveButton(document.getElementById(color));
  }
  
  // 取得網址參數
  const urlParams = new URLSearchParams(window.location.search);
  const gParam = urlParams.get('g'); // 例如 'uti' 或 'hed'
  const studyParam = urlParams.get('s'); // 研究版本參數
  // 使用當前研究版本 (從handleUrlParameters中獲取)
  const currentStudy = _settings.currentStudy || 'study01';
  
  // 檢查研究版本參數
  if (studyParam === '1' || studyParam === '2' || studyParam === '5' || studyParam === '5vn' || studyParam === '6' || studyParam === '7' || studyParam === '8') {
    // 若 s 參數是上述 study 情境，才需要 scrollingText 和 WatchDescription
    
    // 若 g 參數與 color 都存在於 marqueeData 中
    if (gParam && marqueeData[currentStudy] && marqueeData[currentStudy][gParam] && marqueeData[currentStudy][gParam][color]) {
      const jsonPath = marqueeData[currentStudy][gParam][color];
      const scrollingText = document.getElementById('scrollingText');
      fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
          if (scrollingText && data.comments) {
            scrollingText.style.display = 'block';
            updateMarqueeText(data.comments);
          }
        })
        .catch(error => console.error('Error loading messages:', error));
    } else {
      // 若無對應資料則隱藏跑馬燈
      const scrollingText = document.getElementById('scrollingText');
      if (scrollingText) scrollingText.style.display = 'none';
    }
    
    // 載入手錶描述
    loadWatchDescription(currentStudy, gParam, color);
  } 
  else if (studyParam === '3' || studyParam === '4') {
    // 若 s 參數是 3 或 4，需要依照點選 color 更新 videoId 以播放不同影片
    // 根據 gParam 和 color 取得對應的影片 ID
    let videoId;
    if (videoData[gParam] && videoData[gParam][color]) {
      videoId = videoData[gParam][color];
    } else {
      videoId = videoData.default;
    }
    
    // 播放對應的影片
    playVideo(videoId);
  } 
}

// 將 changeWatchColor 函數添加到 window 對象，使其可以從 HTML 中調用
window.changeWatchColor = changeWatchColor;

// 播放指定影片的函數
function playVideo(videoId = 'Welcome_High') {
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoPlayer) {
    // 檢查videoId是否在可用列表中，若不在則使用預設值
    const validVideoId = videoData.availableVideos.includes(videoId) ? videoId : videoData.default;
    
    // 設置影片來源並加載
    videoPlayer.src = `https://ntut-vto-video.zeabur.app/${validVideoId}.mp4`;
    videoPlayer.load();
    
    // 確保影片屬性設置正確
    videoPlayer.setAttribute('playsinline', '');
    videoPlayer.setAttribute('webkit-playsinline', '');
    
    // 顯示播放器控制項
    videoPlayer.controls = true;
    
    // 顯示影片播放器
    videoPlayer.style.display = 'block';
    
    // 播放影片
    videoPlayer.play().catch(e => {
      console.error('影片播放失敗:', e);
    });
    
    return true;
  } else {
    console.error('Video player not found');
    return false;
  }
}

// 將 playVideo 函數添加到 window 對象，使其可以從 HTML 中調用
window.playVideo = playVideo;

// URL參數處理函數
function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // 處理3D模型資源參數 res
  var resource = urlParams.get('res');
  // 根據resource參數選擇使用哪個模型集合
  if(resource === 'low') {
    currentModelSet = _settings.watchModelsLow;
    _settings.modelScale = 3.5;
  }  else if(resource === 'materials') {
    currentModelSet = _settings.watchModelsMaterials;
    _settings.modelScale = 1.3 * 1.462;
  } else {
    resource = 'high';
    currentModelSet = _settings.watchModels;
    _settings.modelScale = 1.3 * 1.462;
  }
  
  // 更新初始模型URL為相應材質資源的模型
  _settings.modelURL = currentModelSet[_settings.currentWatchColor];
  console.log('Initial model URL set to:', _settings.modelURL);
  console.log('Using model set: ', resource);

  // 處理研究版本參數 s
  const studyParam = urlParams.get('s');
  let gParam = urlParams.get('g'); // 例如 'uti' 或 'hed' 或 'comm' 或 'v2026'
  let commentId = urlParams.get('c');
  
  // 設定研究版本 (從study01到studyXX)
  if (studyParam === '1') {
    _settings.currentStudy = 'study01';
  } else if (studyParam === '2') {
    _settings.currentStudy = 'study02';
  } else if (studyParam === '3') {
    _settings.currentStudy = 'study03';
  } else if (studyParam === '4') {
    _settings.currentStudy = 'study04';
  } else if (studyParam === '5') {
    _settings.currentStudy = 'study05';
  } else if (studyParam === '5vn') {
    _settings.currentStudy = 'study05vn';
  } else if (studyParam === '6') {
    _settings.currentStudy = 'study06';
  } else if (studyParam === '7') {
    _settings.currentStudy = 'study07';
  } else if (studyParam === '8') {
    _settings.currentStudy = 'study08';
  } else {
    _settings.currentStudy = 'study01'; // 預設使用study01
  }
  
  // 處理跑馬燈參數 c
  _settings.marqueeState = commentId ? commentId : null;
  
  // 載入初始手錶描述
  if ((studyParam === '1' || studyParam === '2' || studyParam === '5' || studyParam === '5vn') && gParam) {
    loadWatchDescription(_settings.currentStudy, gParam, _settings.currentWatchColor);
  }
  
  // 處理影片參數 v
  const videoId = urlParams.get('v');
  if (videoId) {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.style.display = 'block';
    playVideo(videoId); // 使用新的 playVideo 函數
  } else {
    // 若沒有指定影片參數，但有其他參數，則根據 gParam 和 color 選擇影片
    const gParam = urlParams.get('g');
    const studyParam = urlParams.get('s');
    
    // 只有當 s=3-8  且有 gParam 參數時，才根據 videoData 選擇影片
    if ((studyParam === '3' || studyParam === '4' || studyParam === '5' || studyParam === '5vn' || studyParam === '6' || studyParam === '7' || studyParam === '8') && gParam && videoData[gParam]) {
      const color = _settings.currentWatchColor || 'gold'; // 預設為 gold
      
      if (videoData[gParam][color]) {
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoPlayer) videoPlayer.style.display = 'block';
        playVideo(videoData[gParam][color]);
      }
    }
  }

  console.log('Using study version:', _settings.currentStudy);
  console.log('Using g parameter:', gParam);
  console.log('Using c parameter:', commentId);
  console.log('Using v parameter:', videoId);
}

// 更新跑馬燈文字
// 跑馬燈定時器全域變數
window.marqueeIntervalId = window.marqueeIntervalId || null;

function updateMarqueeText(messages) {
  const marquee = document.getElementById('scrollingText');
  if (!marquee || !messages || messages.length === 0) return;

  // 清除前一個定時器
  if (window.marqueeIntervalId) {
    clearInterval(window.marqueeIntervalId);
    window.marqueeIntervalId = null;
  }

  let currentIndex = 0;
  const animationDuration = 1000; // 動畫持續時間（毫秒）
  const displayDuration = 3000; // 顯示時間（毫秒）
  
  function showNextMessage() {
    // 移除動畫class以重置動畫
    marquee.classList.remove('animate');
    
    // 設定新的文字
    marquee.textContent = messages[currentIndex];
    currentIndex = (currentIndex + 1) % messages.length;
    
    // 強制重繪
    void marquee.offsetWidth;
    
    // 添加動畫class
    marquee.classList.add('animate');
  }

  // 立即顯示第一條消息
  showNextMessage();

  // 定時切換消息
  window.marqueeIntervalId = setInterval(showNextMessage, animationDuration + displayDuration);
}

// 更新手錶描述文字
function updateWatchDescription(description) {
  const descriptionElement = document.getElementById('watchDescription');
  const scrollingContent = descriptionElement ? descriptionElement.querySelector('.scrolling-content') : null;
  if (!descriptionElement || !scrollingContent || !description) return;
  
  // 設定新的描述文字
  scrollingContent.textContent = description;
  
  // 重置動畫
  scrollingContent.style.animation = 'none';
  void scrollingContent.offsetWidth; // 強制重繪
  scrollingContent.style.animation = '';
}

// 載入手錶描述的函數
function loadWatchDescription(studyVersion, gParam, color) {
  if (!studyVersion || !gParam || !color) return;
  
  const introJsonPath = `${studyVersion}/${studyVersion}_intro.json`;
  
  fetch(introJsonPath)
    .then(response => response.json())
    .then(data => {
      if (data && data[gParam] && data[gParam][color]) {
        const description = data[gParam][color];
        updateWatchDescription(description);
        // 儲存描述到設置中，供後續顯示用
        _settings.currentWatchDescription = description;
      } else {
        // 若無對應資料則隱藏描述
        const descriptionElement = document.getElementById('watchDescription');
        if (descriptionElement) {
          descriptionElement.style.display = 'none';
        }
        _settings.currentWatchDescription = null;
      }
    })
    .catch(error => {
      console.error('Error loading watch description:', error);
      // 發生錯誤時隱藏描述
      const descriptionElement = document.getElementById('watchDescription');
      if (descriptionElement) {
        descriptionElement.style.display = 'none';
      }
      _settings.currentWatchDescription = null;
    });
}

// 倒數計時器功能
function startCountdownTimer() {
  // 取得需要控制的元素
  const countdownEl = document.getElementById('countdownTimer');
  const countdownWrapper = document.getElementById('countdownTimerWrapper');
  const changeCameraWrapper = document.getElementById('changeCameraWrapper');
  const videoPlayer = document.getElementById('videoPlayer'); //暫時保持不變
  const scrollingText = document.getElementById('scrollingText'); //暫時保持不變
  const descriptionContainer = document.querySelector('.description-buttons-container'); //暫時保持不變
  const surveyButtonWrapper = document.getElementById('surveyButtonWrapper');
  
  // 顯示倒數計時器容器
  if (countdownWrapper) {
    countdownWrapper.style.display = 'block';
  }
  
  // 顯示切換鏡頭按鈕容器
  if (changeCameraWrapper) {
    changeCameraWrapper.style.display = 'block';
  }
  
  // 設定初始時間（60秒）
  let timeLeft = 60;
  
  // 每秒更新計時器
  _countdownInterval = setInterval(function() {
    timeLeft--;
    
    // 格式化時間為 MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `實驗時間 ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新計時器顯示
    if (countdownEl) {
      countdownEl.textContent = formattedTime;
    }
    
    // 時間結束時
    if (timeLeft <= 0) {
      clearInterval(_countdownInterval);
      
      // 隱藏倒數計時器容器
      if (countdownWrapper) countdownWrapper.style.display = 'none';
      
      // 其他元素保持不變
      //if (videoPlayer) videoPlayer.style.display = 'none';
      //if (scrollingText) scrollingText.style.display = 'none';
      //if (descriptionContainer) descriptionContainer.style.display = 'none';
      
      // 顯示問卷按鈕容器，位置與倒數計時器容器相同
      if (surveyButtonWrapper) surveyButtonWrapper.style.display = 'block';
    }
  }, 1000);
}

window.addEventListener('load', main);