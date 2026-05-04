/*
main.js 程式結構簡要（含呼叫順序）
1) 入口：window.addEventListener('load', main)。
＊2) main()：解析 URL 參數（handleUrlParameters），設定畫布/切鏡頭按鈕，呼叫
   HandTrackerThreeHelper.init(...) 啟動手部追蹤與 Three.js，完成後進入 start(three)。
   ＊ handleUrlParameters() 解析 URL 參數尤其重要，設定實驗情境、手錶款式、影片、資源等。
3) start(three)：設定光源（setup_lighting）與 loading manager，先加遮擋器
   （add_softOccluder），再載入手錶模型（load_model）。
＊4) 執行期：每幀由 callbackTrack(detectState) 驅動偵測狀態與互動流程，必要時觸發
   UI/內容更新（如 hide_instructions、playVideo、updateMarqueeText、updateWatchDescription）。
   ＊ hide_instructions() 隱藏手臂姿勢提示 尤其重要，偵測到手臂開始VTO體驗時，連鎖觸發實驗情境的所有動作，如以下設定：
   playVideo 播放影片
   playMusic 播放背景音樂
   updateMarqueeText 更新跑馬燈文字
   updateWatchDescription 更新手錶描述
   changeWatchColor 切換錶款與模型
   change_camera 切換前後鏡頭
   startCountdownTimer 控制實驗倒數與問卷按鈕顯示
   handleUrlParameters 解析 URL 參數
5) 輔助功能：changeWatchColor 切換錶款與模型、change_camera 切換前後鏡頭、
   startCountdownTimer 控制實驗倒數與問卷按鈕顯示。
*/

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
    'leather': 'assets/watchDw_leather.glb',
    'happy': 'assets/watchDw_happy.glb',
    'silver': 'assets/watchDw_silver.glb'
  },
  currentWatchColor: 'leather', // 預設款式
  currentStudy: '',
  currentGroup: ''
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
      'leather': 'study05/study05_leather.json',
      'happy': 'study05/study05_happy.json',
      'silver': 'study05/study05_silver.json'
    }
  },
  'study05vn': {
    'v2026': {
      'leather': 'study05/study05_leather_vn.json',
      'happy': 'study05/study05_happy_vn.json',
      'silver': 'study05/study05_silver_vn.json'
    }
  },
  'study06': {
    'v2026': {
      'leather': 'study06/study06_leather.json',
      'happy': 'study06/study06_happy.json',
      'silver': 'study06/study06_silver.json'
    }
  },
  'study07': {
    'av': {
      'leather': 'study07/study07_leather.json',
      'happy': 'study07/study07_happy.json',
      'silver': 'study07/study07_silver.json'
    },
    'ew': {
      'leather': 'study07/study07_leather.json',
      'happy': 'study07/study07_happy.json',
      'silver': 'study07/study07_silver.json'
    }
  },
  'study08': {
    'av': {
      'leather': 'study07/study07_leather.json',
      'happy': 'study07/study07_happy.json',
      'silver': 'study07/study07_silver.json'
    },
    'ew': {
      'leather': 'study07/study07_leather.json',
      'happy': 'study07/study07_happy.json',
      'silver': 'study07/study07_silver.json'
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
    'ClassicStMawes_leather', 'ClassicSheffield_happy', 'Petite_silver',
    'ClassicStMawes_leather_mus', 'ClassicSheffield_happy_mus', 'Petite_silver_mus'
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
  av: {
    leather: 'ClassicStMawes_leather',
    happy: 'ClassicSheffield_happy',
    silver: 'Petite_silver'
  },
  ew: {
    leather: 'ClassicStMawes_leather',
    happy: 'ClassicSheffield_happy',
    silver: 'Petite_silver'
  },
  music: {
    leather: 'ClassicStMawes_leather_mus',
    happy: 'ClassicSheffield_happy_mus',
    silver: 'Petite_silver_mus'
  },
  nom: {
    leather: 'ClassicStMawes_leather',
    happy: 'ClassicSheffield_happy',
    silver: 'Petite_silver'
  },
  // 預設影片
  default: 'Welcome_High'
};

// 播放指定影片的函數
function playVideo(videoId = 'Welcome_High') {
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoPlayer) {
    // 檢查videoId是否在可用列表中，若不在則使用預設值
    const validVideoId = videoData.availableVideos.includes(videoId) ? videoId : videoData.default;
    
    // 設置影片來源並加載
    videoPlayer.src = `https://ntut-vto-video.zeabur.app/${validVideoId}.mp4`;
    console.log('Play video:', videoPlayer.src);
    videoPlayer.load();
    
    // 確保影片屬性設置正確
    videoPlayer.setAttribute('playsinline', '');
    videoPlayer.setAttribute('webkit-playsinline', '');
    
    // 顯示播放器控制項
    videoPlayer.controls = true;
    
    // 顯示影片播放器
    videoPlayer.style.display = 'block';
    
    // 播放影片
    setTimeout(() => {
      videoPlayer.play().catch(error => {
        console.log('Video autoplay failed:', error);
      });
    }, 1000);
    
    return true;
  } else {
    console.error('Video player not found');
    return false;
  }
}

// study09 音樂情境（URL: s=9 & g=music）：錶款對應背景音樂（供 #musicPlayer 使用，如 vto06.html）
/* original video
const musicData = {
  leather: 'assets/music/EasyToLove.mp3',
  happy: 'assets/music/IFeelFine.mp3',
  silver: 'assets/music/EasyAndFun.mp3'
};
*/
const musicData = {
  leather: 'assets/music/EasyToLove_mus.mp3',
  happy: 'assets/music/IFeelFine_mus.mp3',
  silver: 'assets/music/EasyAndFun_mus.mp3'
};

function playMusic(color) {
  const musicPlayer = document.getElementById('musicPlayer');
  if (!musicPlayer) {
    return;
  }
  const path = musicData[color] || musicData.leather;
  musicPlayer.loop = true;
  musicPlayer.volume = 0.35;
  musicPlayer.src = path;
  musicPlayer.load();
  const playPromise = musicPlayer.play();
  if (playPromise !== undefined) {
    playPromise.catch(function (err) {
      console.log('Music play failed:', err);
    });
  }
}

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

  }, undefined, function (err) {
    console.error('GLTFLoader failed — check Network tab (status, bytes, URL). modelURL =', _settings.modelURL, err);
    _state = _states.idle;
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

// 偵測到手臂開始VTO體驗
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
  const currentStudy = _settings.currentStudy;
  const urlParams = new URLSearchParams(window.location.search);
  
  // 1. 處理影片播放
  const videoId = urlParams.get('v');
  const color = _settings.currentWatchColor;
  const gParam = urlParams.get('g'); // 例如 'uti' 或 'hed'
  const studyParam = urlParams.get('s'); // 研究版本參數
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoId && !_isVideoStarted && _state === _states.running) {
    // 播放對應的影片
    _isVideoStarted = playVideo(videoId);
  }
  // 若study情境是3, 4, 7, 8, 9，需要依照點選 color 更新 videoId 以播放不同影片
  else if (studyParam === '3' || studyParam === '4' || 
    (studyParam === '7' && gParam === 'av') || (studyParam === '8' && gParam === 'av') || studyParam === '9') {
    // 根據 gParam 和 color 取得對應的影片 ID
    let videoId;
    if (videoData[gParam] && videoData[gParam][color]) {
      videoId = videoData[gParam][color];
    } else {
      videoId = videoData.default;
    }
    
    // 播放對應的影片
    _isVideoStarted = playVideo(videoId);
  } 
  // 其他情況不需要影片
  else{
    if (videoPlayer) {
      // 隱藏影片播放器
      videoPlayer.style.display = 'none';
      _isVideoStarted = false;
    }
  }
  
  // 2. 顯示手錶描述
  if (!_isWatchDescriptionShown) {
    const watchDescription = document.getElementById('watchDescription');
    const descriptionContainer = document.querySelector('.description-buttons-container');
    const currentWatchDescription = _settings.currentWatchDescription;
    // 顯示手錶描述
    if ((currentStudy=='study01' || currentStudy=='study02' || 
      currentStudy=='study05' || currentStudy=='study05vn' || currentStudy=='study06' || 
      (studyParam === '7' && gParam === 'ew') || (studyParam === '8' && gParam === 'ew')) && watchDescription && currentWatchDescription) {
      if (descriptionContainer) {
        descriptionContainer.style.display = 'block';
      }
      if (watchDescription) {
        watchDescription.style.display = 'block';
      }
      _isWatchDescriptionShown = true;
      updateWatchDescription(currentWatchDescription);
    }
  }
  
  // 3. 處理跑馬燈顯示
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

  // 4. 處理背景音樂
  /* 以將音樂放到影片音軌處理
  if (studyParam === '9' && gParam === 'music') {
    playMusic(color);
  }
  */
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

// add listener by main()
function callbackTrack(detectState){
  const currentStudy = _settings.currentStudy || 'study01'; // 研究版本參數
  const gParam = _settings.currentGroup; // 例如 'uti' 或 'hed'
  const color = _settings.currentWatchColor || 'gold';
  if (detectState.isDetected) {
    // 隱藏手臂姿勢提示
    if (!_isInstructionsHidden){
      hide_instructions();
    }
    
    // 啟動倒數計時器（只在第一次偵測到手時啟動）
    if (!_isCountdownStarted) {
      startCountdownTimer();
      _isCountdownStarted = true;
    }

    // 手錶描述顯示處理（只在第一次觸發時顯示）
    if (!_isWatchDescriptionShown) {
      const watchDescription = document.getElementById('watchDescription');
      const descriptionContainer = document.querySelector('.description-buttons-container');
      const currentWatchDescription = _settings.currentWatchDescription;
      // 確保容器必須顯示
      if (descriptionContainer) {
        descriptionContainer.style.display = 'block';
      }
      _isWatchDescriptionShown = true;
      // 只有study01, study02, study05, study06, study07, study08才顯示手錶描述
      if (watchDescription && currentWatchDescription) { 
        if (currentStudy=='study01' || currentStudy=='study02') {
          // 確保挑色選項按鈕顯示，並設定 gold 按鈕預設被選中
          setActiveButton(document.getElementById('gold'));
        }
        if (currentStudy=='study05' || currentStudy=='study05vn' || currentStudy=='study06' || (currentStudy=='study07' && gParam === 'ew') || (currentStudy=='study08' && gParam === 'ew')) {
          // 確保挑色選項按鈕顯示，並設定 leather 按鈕預設被選中
          setActiveButton(document.getElementById('leather'));
        }
        watchDescription.style.display = 'block';
      }
    }
    
    // 跑馬燈顯示處理（只在第一次觸發時載入內容）
    const scrollingText = document.getElementById('scrollingText');
    if (_settings.marqueeState) {
      if (!_isMarqueeShown) {
        // 內容根據 currentStudy, g 參數與目前顏色
        if (gParam && marqueeData[currentStudy] && marqueeData[currentStudy][gParam] && marqueeData[currentStudy][gParam][color]) {
          const jsonPath = marqueeData[currentStudy][gParam][color];
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
          console.log('No marquee data found for:', currentStudy, gParam, color);
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
  
  const gParam = _settings.currentGroup; // 例如 'uti' 或 'hed'
  const currentStudy = _settings.currentStudy || 'study01'; // 研究版本參數
  
  // 檢查study參數，若 s 參數是上述 study 情境，才需要 scrollingText 和 WatchDescription
  if (currentStudy=='study01' || currentStudy=='study02' || currentStudy=='study05' || currentStudy=='study05vn' || currentStudy=='study06' || (currentStudy=='study07' && gParam === 'ew') || (currentStudy=='study08' && gParam === 'ew')) {
    
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

  // 若study情境是3, 4, 7, 8, 9，需要依照點選 color 更新 videoId 以播放不同影片
  if (currentStudy=='study03' || currentStudy=='study04' || (currentStudy=='study07' && gParam === 'av') || (currentStudy=='study08' && gParam === 'av') || currentStudy=='study09') {
    // 根據 gParam 和 color 取得對應的影片 ID
    let videoId;
    if (videoData[gParam] && videoData[gParam][color]) {
      videoId = videoData[gParam][color];
    } else {
      videoId = videoData.default;
    }
    
    // 播放對應的影片
    _isVideoStarted = playVideo(videoId);
  } 
  // 不需要影片
  else{
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
      // 隱藏影片播放器
      videoPlayer.style.display = 'none';
      _isVideoStarted = false;
    }
  }

  // study09 音樂情境：背景音樂（與 playVideo 相同觸發點）
  /* 以將音樂放到影片音軌處理
  if (studyParam === '9' && gParam === 'music') {
    playMusic(color);
  }
  */
}

// 將 changeWatchColor 函數添加到 window 對象，使其可以從 HTML 中調用
window.changeWatchColor = changeWatchColor;

// 將 playVideo 函數添加到 window 對象，使其可以從 HTML 中調用
window.playVideo = playVideo;

// 從 main 優先呼叫，透過 URL 參數設定頁面實驗情境
function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // 處理3D模型資源參數 res
  var resource = urlParams.get('res');
  // 根據resource參數選擇使用哪個模型集合
  if(resource === 'low') {
    currentModelSet = _settings.watchModelsLow;
    _settings.modelScale = 3.5;
  } else if(resource === 'materials') {
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

  
  // 處理 study 情境 s 參數，從study01到studyXX
  const studyParam = urlParams.get('s');
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
  } else if (studyParam === '9') {
    _settings.currentStudy = 'study09';
  }  else {
    _settings.currentStudy = 'study01'; // 預設使用study01
  }

  // 處理Group參數 g
  _settings.currentGroup = urlParams.get('g'); // 例如 'uti' 或 'hed' 或 'comm' 或 'v2026'
  const gParam = _settings.currentGroup;
  
  // 處理跑馬燈參數 c
  const commentId = urlParams.get('c');
  _settings.marqueeState = commentId ? commentId : null;
  
  // 處理影片參數 v
  const videoId = urlParams.get('v');
  if (videoId) {
    const videoPlayer = document.getElementById('videoPlayer');
    _settings.currentWatchColor = 'gold';
    videoPlayer.style.display = 'block';
  } 
  // 沒有 v 參數可能會因 study 情境需要播放影片
  else if (studyParam === '3' || studyParam === '4') {
    _settings.currentWatchColor = 'gold';
    videoPlayer.style.display = 'block';
  } 
  else if (studyParam === '7' && gParam === 'av' || studyParam === '8' || studyParam === '9') {
    _settings.currentWatchColor = 'leather';
    videoPlayer.style.display = 'block';
  } 
  else {
    if (videoPlayer) {
      // 隱藏影片播放器
      videoPlayer.style.display = 'none';
    }
  }
  
  // 載入初始手錶描述，需根據影片設定中的 _settings.currentWatchColor 控制 color
  if ((studyParam === '1' || studyParam === '2' || 
    studyParam === '5' || studyParam === '5vn' || studyParam === '6' || 
    (studyParam === '7' && gParam === 'ew') || (studyParam === '8' && gParam === 'ew')) && gParam) {
    loadWatchDescription(_settings.currentStudy, gParam, _settings.currentWatchColor);
  }

  console.log('Using study(s) version:', _settings.currentStudy);
  console.log('Using group(g) scenario:', gParam);
  console.log('Using comment(c) scenario:', commentId);
  console.log('Using video(v) scenario:', videoId);
  console.log('Using resource(res) 3D model:', resource);
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
function loadWatchDescription(currentStudy = _settings.currentStudy, gParam, color) {
  if (!currentStudy || !gParam || !color) return;
  
  let introJsonPath = '';
  if(currentStudy =='study05vn'){
    introJsonPath = `study05/study05_intro_vn.json`;
  }
  else{
    introJsonPath = `${currentStudy}/${currentStudy}_intro.json`;
  }
  console.log('Load watch description:', introJsonPath);

  fetch(introJsonPath)
    .then(response => response.json())
    .then(data => {
      if (data && data[gParam] && data[gParam][color]) {
        const description = data[gParam][color];
        console.log('Watch description:', description);
        updateWatchDescription(description);
        // 儲存描述到設置中，供後續顯示用
        _settings.currentWatchDescription = description;
      } else {
        // 若無對應資料則隱藏描述
        console.log('No watch description');
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
    const currentStudy = _settings.currentStudy
    let formattedTime = ''
    if(currentStudy =='study05vn'){
      formattedTime = `Thời gian thí nghiệm ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    else{
      formattedTime = `實驗時間 ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    
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