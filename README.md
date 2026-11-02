# JavaScript/WebGL lightweight and robust hand tracking library

## Table of contents

* [NTUT ar vto and avatar experiment](#ntut-ar-vto-and-avatar-experiment)
* [Virtual Try-on and object manipulation](#virtual-try-on-and-object-manipulation)
* [Hosting](#hosting)
* [About the tech](#about-the-tech)
* [License](#license)
* [References](#references)

## NTUT ar vto and avatar experiment

This is a research project focused on Virtual Try-On (VTO) and avatar experimentation at National Taipei University of Technology (NTUT). The project explores augmented reality applications for virtual try-on experiences and avatar interactions.

### Study11 進入點（無跑馬燈）

四組皆進入 `demos/VTOWatchOnly/vto11.html?s=11&g=...&res=materials`，偵測到手腕後開始播放對應媒體。音樂組與虛擬人組都可切換三款手錶，但媒體檔固定、不隨錶款更換。

| 進入頁 | 參數 `g` | 媒體 | 說明 |
| --- | --- | --- | --- |
| `study11/index_vto_mu.html` 或根目錄 `s11_vto_mu.html` | `mu` | `assets/music/Wi.AR+Audio-TW-High.mp3` | 背景音樂，無影片、無跑馬燈 |
| `study11/index_vto_mu_zilin.html` 或 `s11_vto_mu_zilin.html` | `mu_zilin` | `assets/music/Wi.AR+Audio-TW-zilin-High.mp3` | 同上 |
| `study11/index_vto_avat.html` 或 `s11_vto_avat.html` | `avat` | `Wi.AR+Avatar-TW-High.mp4` | 右上角播放器比例 468:688 |
| `study11/index_vto_avat_zilin.html` 或 `s11_vto_avat_zilin.html` | `avat_zilin` | `Wi.AR+Avatar-TW.zi.Lin-High.mp4` | 同上 |

影片由 `https://ntut-vto-video.zeabur.app/` 載入。總覽頁：`demos/VTOWatchOnly/study11/index.html`。

## Virtual Try-on ,object manipulation and 3D Model

* Hand VTO:
  * Wrist and ring VTO: [live demo](https://webar.rocks/demos/hand/demos/VTO/), [source code](/demos/VTO/)
  * Wrist watch realistic VTO: [live demo](https://webar.rocks/demos/hand/demos/VTOWatchOnly/), [source code](/demos/VTOWatchOnly/)

* 3D Object manipulation: 
  * Boilerplate: [live demo](https://webar.rocks/demos/hand/demos/objectManip/), [source code](/demos/objectManip)
  * Velociraptor demo: [live demo](https://webar.rocks/demos/hand/demos/objectManip2/), [source code](/demos/objectManip2)
  * Cute ghost demo: [live demo](https://webar.rocks/demos/hand/demos/objectManip3/), [source code](/demos/objectManip3)
  * Velociraptor demo with persistency if hand tracking is lost: [live demo](https://webar.rocks/demos/hand/demos/objectManip4/), [source code](/demos/objectManip4)

* 3D Model:
  * Watch: [live demo](https://ntut_vto.zeabur.app/demos/VTOWatchOnly/index.html), [source code](/dev/model3D/watchDw/)

## Hosting

You need to host the library through a HTTPS server. Indeed, the webcam JavaScript API requires that. For development purpose, you can use a local server with a self-signed certificate.

## About the tech

### Under the hood

This library relies on WebAR.rocks WebGL engine to track the hand. The neural network models have been trained using TensorFlow.

### Compatibility

* If `WebGL2` is available, it uses `WebGL2` and no specific extension is required,
* If `WebGL2` is not available but `WebGL1`, we require either `OES_TEXTURE_FLOAT` extension or `OES_TEXTURE_HALF_FLOAT` extension,
* If `WebGL2` is not available, and if `WebGL1` is not available or neither `OES_TEXTURE_FLOAT` or `OES_HALF_TEXTURE_FLOAT` are implemented, the user is not compatible.

In all cases, WebRTC should be implemented in the web browser, otherwise FaceFilter API will not be able to get the webcam video feed. Here are the compatibility tables from [caniuse.com](https://caniuse.com/) here: [WebGL1](https://caniuse.com/#feat=webgl), [WebGL2](https://caniuse.com/#feat=webgl2), [WebRTC](https://caniuse.com/#feat=stream).

If a compatibility error is triggered, please post an issue on this repository. If this is a problem with iOS, please first try to launch your Safari browser in desktop mode (even if you are on mobile). You should also check if the webpage is properly served through HTTPS.

## License

This code repository is dual licensed. You can choose between:

* commercial license
* GPLv3 license

Please contact us at [contact@webar.rocks](mailto:contact@webar.rocks) for more information.

## References

* [WebAR.rocks website](https://webar.rocks)
* [Blender website](https://www.blender.org)