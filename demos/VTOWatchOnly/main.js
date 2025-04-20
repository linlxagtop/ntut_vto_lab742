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
  currentWatchColor: 'gold' // 預設款式
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
    if (_settings.modelOffset){
      const d = _settings.modelOffset;
      const displacement = new THREE.Vector3(d[0], d[2], -d[1]); // inverse Y and Z
      me.position.add(displacement);
    }
    if (_settings.modelQuaternion){
      const q = _settings.modelQuaternion;
      me.quaternion.set(q[0], q[2], -q[1], q[3]);
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
  domLoading.style.opacity = 0;
  setTimeout(function(){
    domLoading.parentNode.removeChild(domLoading);
  }, 800);
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
}


function change_camera(){
  ChangeCameraHelper.change_camera();
}


let _isVideoStarted = false;
let _isMarqueeShown = false;

function callbackTrack(detectState){
  if (detectState.isDetected) {
    if (!_isInstructionsHidden){
      hide_instructions();
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
    // 跑馬燈顯示處理（只在第一次觸發時載入內容）
    const scrollingText = document.getElementById('scrollingText');
    if (_settings.marqueeState) {
      if (!_isMarqueeShown) {
        const urlParams = new URLSearchParams(window.location.search);
        const gParam = urlParams.get('g');
        const color = _settings.currentWatchColor || 'gold';
        // 內容根據 g 參數與目前顏色
        if (gParam && marqueeData['study01'] && marqueeData['study01'][gParam] && marqueeData['study01'][gParam][color]) {
          const jsonPath = marqueeData['study01'][gParam][color];
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
  // 使用在handleUrlParameters中設置的模型集合
  if (currentModelSet[color] && threeStuff) {
    console.log('changeWatchColor: ' + color + ' -> ' + currentModelSet[color]);
    
    // 更新模型URL
    _settings.modelURL = currentModelSet[color];
    
    // 重新載入模型
    load_model(threeStuff.loadingManager);
    
    // 更新當前顏色
    _settings.currentWatchColor = color;
    
    // 更新按鈕狀態
    setActiveButton(document.getElementById(color));
  }
  // 處理跑馬燈顯示
  // 取得網址 g 參數
  const urlParams = new URLSearchParams(window.location.search);
  const gParam = urlParams.get('g'); // 例如 'uti' 或 'hed'
  // 若 g 參數與 color 都存在於 marqueeData 中
  if (gParam && marqueeData['study01'] && marqueeData['study01'][gParam] && marqueeData['study01'][gParam][color]) {
    const jsonPath = marqueeData['study01'][gParam][color];
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
}

// 將 changeWatchColor 函數添加到 window 對象，使其可以從 HTML 中調用
window.changeWatchColor = changeWatchColor;

// URL參數處理函數
function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // 處理影片參數 v
  const videoId = urlParams.get('v');
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoId && videoPlayer) {
    videoPlayer.src = `https://video.zeabur.app/${videoId}.mp4`;
    videoPlayer.load();
  }
  else if (videoPlayer) {
    videoPlayer.src = `https://video.zeabur.app/Welcome_High.mp4`;
    videoPlayer.load();
  }
  else{
    console.error('Video player not found');
  }
  
  // 處理3D模型解析度參數 res
  const resolution = urlParams.get('res');
  // 根據resolution參數選擇使用哪個模型集合
  currentModelSet = (resolution === 'low') ? _settings.watchModelsLow : _settings.watchModels;
  _settings.modelScale = (resolution === 'low') ? 3.5 : 1.3 * 1.462;
  
  // 更新初始模型URL為相應解析度的模型
  _settings.modelURL = currentModelSet[_settings.currentWatchColor];
  console.log('Initial model URL set to:', _settings.modelURL);
  console.log('Using model set:', resolution === 'low' ? 'low resolution' : 'high resolution');

  // 處理跑馬燈參數 c
  const commentId = urlParams.get('c');
  _settings.marqueeState = commentId ? commentId : null;
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

window.addEventListener('load', main);