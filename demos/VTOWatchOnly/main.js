const _settings = {
  threshold: 0.95, // detection sensitivity, between 0 and 1
  
  // pose computation and stabilization:
  
  /*poseLandmarksLabels: [
    // for NN 40:
    'wristPinkySideBot',
    'wristThumbSideBot',
    'wristPinkySideTop',
    'wristThumbSideTop',
    'wristUpTop',
    'wristUpBot',
    'wristDownTop',
    'wristDownBot'
   ],
  modelOffset: [-0.3*0, 0, -0.504*0], // bring pinky side, up
  modelScale: 1.2 * 1.462,
  NNsPaths: ['../../neuralNets/NN_WRISTBACK_40.json'],
  objectPointsPositionFactors: [1.0, 1.0, 1.0], //*/

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
  modelScale: 1.2 * 1.462,
  NNsPaths: ['../../neuralNets/NN_WRISTBACK_42.json'],
  objectPointsPositionFactors: [1.0, 1.0, 1.0], //*/

  /*poseLandmarksLabels: [
    // for NN version <= 33 or >=37:
    "wristBack", "wristLeft", "wristRight", "wristPalm", "wristPalmTop", "wristBackTop", "wristRightBottom", "wristLeftBottom" // more accurate
    //"wristBack", "wristRight", "wristPalm", "wristPalmTop", "wristBackTop", "wristLeft" // more stable
    //"wristBack", "wristRight", "wristPalm", "wristLeftBottom", "wristRightBottom", "wristLeft"
   ],
  NNsPaths: ['../../neuralNets/NN_WRISTBACK_38.json'], // best: 38
  modelOffset: [-0.3, 0.5, -0.504], // bring pinky side, up
  modelScale: 1.3 * 1.462,
  objectPointsPositionFactors: [1.0, 1.1, 1.0], // factors to apply to point positions to lower pose angles - dirty tweak */
      // if objectPointsPositionFactors.y too small -> jitters when displayed front. If too large -> scale down too much when wrist rotates

  /*poseLandmarksLabels: [
    // for NN 34,35,36:
    'wristPinkySideBot',
    'wristThumbSideBot',
    'wristPinkySideTop',
    'wristThumbSideTop',
    'wristUpTop',
    'wristUpBot',
    'wristDownTop',
    'wristDownBot'
   ],
  NNsPaths: ['../../neuralNets/NN_WRISTBACK_36.json'],
  modelOffset: [-0.3, 0.5, -0.504], // bring pinky side, up
  modelScale: 1.3 * 1.462,
  objectPointsPositionFactors: [1.0, 1.0, 1.0], // factors to apply to point positions to lower pose angles - dirty tweak
  //*/
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
  currentWatchColor: 'gold' // 預設款式
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

function callbackTrack(detectState){
  if (detectState.isDetected) {
    if (!_isInstructionsHidden){
      hide_instructions();
    }
    
    // 檢查是否有影片需要播放
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const videoPlayer = document.getElementById('videoPlayer');
    
    if (videoId && !_isVideoStarted && _state === _states.running) {
      _isVideoStarted = true;
      videoPlayer.style.display = 'block';
      // 延遲一秒後播放，確保3D模型已完全載入
      setTimeout(() => {
        videoPlayer.play().catch(error => {
          console.log('Video autoplay failed:', error);
        });
      }, 1000);
    }
  }
}

// 修改為切換模型的函數
function changeWatchColor(color) {
  if (_settings.watchModels[color] && threeStuff) {
    console.log('changeWatchColor: ' + color + ' -> ' + _settings.watchModels[color]);
    
    // 更新模型URL
    _settings.modelURL = _settings.watchModels[color];
    
    // 重新載入模型
    load_model(threeStuff.loadingManager);
    
    // 更新按鈕選中狀態
    document.querySelectorAll('.color-button').forEach(button => {
      button.classList.remove('active');
    });
    document.getElementById(color).classList.add('active');
    
    _settings.currentWatchColor = color;
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

  // 處理跑馬燈參數 c
  const commentId = urlParams.get('c');
  if (commentId) {
    fetch(`assets/${commentId}.json`)
      .then(response => response.json())
      .then(data => {
        const scrollingText = document.getElementById('scrollingText');
        if (scrollingText && data.comments) {
          scrollingText.style.display = 'block';
          updateMarqueeText(data.comments);
        }
      })
      .catch(error => console.error('Error loading messages:', error));
  }
  else{
    fetch(`assets/0001.json`)
      .then(response => response.json())
      .then(data => {
        const scrollingText = document.getElementById('scrollingText');
        if (scrollingText && data.comments) {
          scrollingText.style.display = 'block';
          updateMarqueeText(data.comments);
        }
      })
      .catch(error => console.error('Error loading messages:', error));
  }
}

// 更新跑馬燈文字
function updateMarqueeText(messages) {
  const marquee = document.querySelector('.marquee');
  if (!marquee || !messages || messages.length === 0) return;

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
  setInterval(showNextMessage, animationDuration + displayDuration);
}

window.addEventListener('load', main);