<template>
  <div class="container">
    <div class="flex padding">
      <div class="canvas-wrapper">
        <video id="video" playsinline style="display: none" />
        <canvas id="output" />
        <div class="tools"></div>
      </div>
      <div class="flex-sub">
        <canvas id="three" />
      </div>
    </div>
    <div id="scatter-gl-container" />
    <div
      id="coutput"
      style="
        position: absolute;
        top: 0;
        left: 0;
        margin: 15px;
        width: 300px;
        overflow-wrap: break-word;
      "
    />
    <!-- <img
      id="leftEye"
      src="https://plugins-media.makeupar.com/webconsultation/looks/170428_gemini_natural/patten_eyelash_170428_gemini_01/eyelash/eyelash_170428_gemini_a.png"
    />-->
  </div>
</template>

<script>
// eslint-disable-next-line
import * as THREE from "three";
// import dat from "dat.gui";
import { ScatterGL } from "scatter-gl";
import { showKeyPoints } from "@/utils/index";

import * as tf from "@tensorflow/tfjs-core";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import Stats from "stats.js";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";

import { TRIANGULATION } from "@/utils/triangulation";
import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
); /* 
function testThreejs() {
  // loads 3js
  video = document.getElementById("video");

  camera = new THREE.PerspectiveCamera( // field of view, 75 degrees, aspect ratio, near, far points
    53, // full fov from top to bottom
    1,
    0.1,
    100
  );
  // camera.position.z = 10;
  camera.position.set(0, 0, 10); // z = 10

  scene = new THREE.Scene();

  // const axesHelper = new THREE.AxesHelper(90);
  // scene.add(axesHelper);

  const texture = new THREE.VideoTexture(video); // like basic texture but continuously sets needsUpdate to true
  texture.wrapS = THREE.RepeatWrapping; // wrapping mode - repeats to infinity
  texture.repeat.x = -1; // repeats in r to l direction

  const geometry = new THREE.PlaneGeometry(10, 10); // geometry, 16 x 10 width, height - why must we change dimensions from 1 x 1 to 16 x 10?
  // geometry.scale(0.8, 0.8, 0.8);
  const material = new THREE.MeshBasicMaterial({ map: texture }); // video texture

  const mesh = new THREE.Mesh(geometry, material);
  // mesh.position.set(0, 0, 0);
  // mesh.lookAt(camera.position);
  scene.add(mesh); // add mesh to scene

  const container = document.getElementById("three");

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: container
    // alpha: true,
  });
  const RENDERER_SIZE = 750;
  // renderer.setClearColor(0xffffff);
  // renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(RENDERER_SIZE, RENDERER_SIZE); // 1000 x 1000

  // const light = new THREE.DirectionalLight(0xffffff, 0.5);
  // light.position.set(10, 0, 10);
  // scene.add(light);

  // addLine();

  addEyeLash();
  addEyelashR();
  // addEyeLashB();
} */

/* const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;
const GREEN = "#32EEDB";
const RED = "#FF2C35";
const BLUE = "#157AB3";
const EYELASH_PIXELS_PER_UNIT = 47;
const RIGHT_UPPER_MAP = [33, 246, 161, 160, 159, 158, 157, 173, 133];
// const LEFT_UPPER_MAP2 = [463, 414, 286, 258, 257, 259, 260, 467, 359];
// 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308
// 146, 91, 181, 84, 17, 314, 405, 321, 375, 291
const LOWER_LIP_POINTS = [
  78,
  95,
  88,
  178,
  87,
  14,
  317,
  402,
  318,
  324,
  308,
  291,
  375,
  321,
  405,
  314,
  17,
  84,
  181,
  91,
  146,
  78
];
const UPPER_LIP_POINTS = [
  78,
  191,
  80,
  81,
  82,
  13,
  312,
  311,
  310,
  415,
  308,
  291,
  409,
  270,
  269,
  267,
  0,
  37,
  39,
  40,
  185,
  61,
  78
]; */

/* let camera, renderer, scene;
let leftUpEyelash, rightUpEyelash; */
// leftBottomEyeslash;

/* let lipLower, lipUpper; */

/* function populateOutput(msg) {
  const el = document.getElementById("coutput");
  el.innerHTML = JSON.stringify(msg);
}

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

function distance3d(a, b) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
      Math.pow(a[1] - b[1], 2) +
      Math.pow(a[2] - b[2], 2)
  );
} */

/* function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
} */
/*
function placeEyelash(
  points,
  object,
  xOffset,
  yOffset,
  zRotMultiplier,
  zRotOffset,
  yRotMultiplier,
  zRotNegativeOffset,
  zRotPositiveOffset
) {
  const xVals = points.map(pt => pt[0]);
  const yVals = points.map(pt => pt[1]);
  const zVals = points.map(pt => pt[2]);
  const min = Math.max(...xVals);
  if (points.length > 0) {
    const p1 = points.find(x => x[0] === min);
    if (!p1) return;

    const avgX = getAvg(xVals);
    const avgY = getAvg(yVals);
    const target = transform(avgX, avgY);
    object?.position?.set(target.x + xOffset, target.y + yOffset, 0.1);


    const yfirst = yVals[0];
    const ylast = yVals[yVals.length - 1];
    const xfirst = xVals[0];
    const xlast = xVals[xVals.length - 1];
    const run = xfirst - xlast;
    const rise = ylast - yfirst;
    const zfirst = zVals[0];
    const zlast = zVals[zVals.length - 1];
    const deepRun = zlast - zfirst;
    const slope = rise / run;
    const zSlope = deepRun / run;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const eyelashDist = distance3d(firstPoint, lastPoint);
    const newScale = eyelashDist / EYELASH_PIXELS_PER_UNIT;
    object.scale.x = newScale;

    const newZRot = Math.atan(slope);
    const zAbs = Math.abs(newZRot);
    const zOffMultiplier =
      zAbs < 0.1
        ? zRotMultiplier
        : newZRot > 0
        ? zRotPositiveOffset
        : zRotNegativeOffset;
    populateOutput(zOffMultiplier);
    object.rotation.z = -newZRot * zOffMultiplier + zRotOffset;
    const newYRot = Math.atan(zSlope);
    object.rotation.y = newYRot * yRotMultiplier;
  }
} */

/* let model,
  ctx,
  videoWidth,
  videoHeight,
  video,
  canvas,
  scatterGLHasInitialized = false,
  scatterGL,
  // eslint-disable-next-line
  rafID;

const VIDEO_SIZE = 500;
const mobile = isMobile();
// Don't render the point cloud on mobile in order to maximize performance and
// to avoid crowding limited screen space.
const renderPointcloud = mobile === false;
const stats = new Stats();
const state = {
  backend: "webgl",
  maxFaces: 1,
  triangulateMesh: false,
  predictIrises: true,
  showFullPoints: true
}; */

// eslint-disable-next-line
/* async function setupCamera() {
  video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      // Only setting the video to a specified size in order to accommodate a
      // point cloud, so on mobile devices accept the default size.
      width: mobile ? undefined : VIDEO_SIZE,
      height: mobile ? undefined : VIDEO_SIZE
    }
  });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

function getAvg(arr) {
  const sum = arr.reduce((prev, cur) => {
    return prev + cur;
  });
  return sum / arr.length;
} */

/* async function renderPrediction() {
  stats.begin();

  const predictions = await model.estimateFaces({
    input: video,
    returnTensors: false,
    flipHorizontal: false,
    predictIrises: state.predictIrises
  }); // array

  ctx.drawImage(
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (predictions.length > 0) {
    predictions.forEach(prediction => {
      const keypoints = prediction.scaledMesh;
      const rightEyePoints = prediction.annotations.rightEyeUpper0;
      const leftEyePoints = prediction.annotations.leftEyeUpper0;
      const leftEyePoints2 = prediction.annotations.leftEyeUpper1;
      const leftEyePoints3 = prediction.annotations.leftEyeUpper2;
      placeEyelash(
        rightEyePoints,
        rightUpEyelash,
        0.13,
        0.025,
        1,
        0.2, // z- offset
        1.3,
        1, // negative z mult
        0.8 // positive z multiplier
      );
      placeEyelash(
        leftEyePoints,
        leftUpEyelash,
        -0.13,
        0.025,
        1,
        -0.15,
        1.3,
        0.65,
        1.2
      );
      // left bottom

      const lipLowerPoints = LOWER_LIP_POINTS.map(
        idx => prediction.scaledMesh[idx]
      );

      if (lipLowerPoints.length > 0) {
        const transformedLipLowerPoints = lipLowerPoints.map(x =>
          transform(x[0], x[1])
        );
        addLipLower(transformedLipLowerPoints);
      }

      const lipUpperPoints = UPPER_LIP_POINTS.map(
        x => prediction.scaledMesh[x]
      );
      if (lipUpperPoints.length > 0) {
        const transformedLipUpperPoints = lipUpperPoints.map(x =>
          transform(x[0], x[1])
        );
        addLipUpper(transformedLipUpperPoints);
      }

      if (state.triangulateMesh) {
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
          const points = [
            TRIANGULATION[i * 3],
            TRIANGULATION[i * 3 + 1],
            TRIANGULATION[i * 3 + 2]
          ].map(index => keypoints[index]);
          drawPath(ctx, points, true);
        }
      } else {
        ctx.fillStyle = GREEN;
        if (state.showFullPoints) {
          // showKeyPoints(ctx, keypoints, "#FFF");
          let leftUpper = RIGHT_UPPER_MAP.map(idx => keypoints[idx]);
          showKeyPoints(ctx, leftUpper);

          let lowerLip = LOWER_LIP_POINTS.map(idx => keypoints[idx]);
          showKeyPoints(ctx, lowerLip, RED);
          showKeyPoints(
            ctx,
            UPPER_LIP_POINTS.map(x => keypoints[x])
          );

          showKeyPoints(ctx, leftEyePoints2);

          showKeyPoints(ctx, leftEyePoints3, BLUE);
        }
      }

      if (keypoints.length > NUM_KEYPOINTS) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 1;
        const leftCenter = keypoints[NUM_KEYPOINTS];
        const leftDiameterY = distance(
          keypoints[NUM_KEYPOINTS + 4],
          keypoints[NUM_KEYPOINTS + 2]
        );
        const leftDiameterX = distance(
          keypoints[NUM_KEYPOINTS + 3],
          keypoints[NUM_KEYPOINTS + 1]
        );
        ctx.beginPath();
        ctx.ellipse(
          leftCenter[0],
          leftCenter[1],
          leftDiameterX / 2,
          leftDiameterY / 2,
          0,
          0,
          2 * Math.PI
        );
        //   ctx.stroke();
        if (keypoints.length > NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS) {
          const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];
          const rightDiameterY = distance(
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4]
          );
          const rightDiameterX = distance(
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
            keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1]
          );
          ctx.beginPath();
          ctx.ellipse(
            rightCenter[0],
            rightCenter[1],
            rightDiameterX / 2,
            rightDiameterY / 2,
            0,
            0,
            2 * Math.PI
          );
          //  ctx.stroke();
        }
      }
    });
    if (renderPointcloud && state.renderPointcloud && scatterGL != null) {
      const pointsData = predictions.map(prediction => {
        let scaledMesh = prediction.scaledMesh;
        return scaledMesh.map(point => [-point[0], -point[1], -point[2]]);
      });
      let flattenedPointsData = [];
      for (let i = 0; i < pointsData.length; i++) {
        flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
      }
      const dataset = new ScatterGL.Dataset(flattenedPointsData);
      if (!scatterGLHasInitialized) {
        scatterGL.setPointColorer(i => {
          if (i % (NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS * 2) > NUM_KEYPOINTS) {
            return RED;
          }
          return BLUE;
        });
        scatterGL.render(dataset);
      } else {
        scatterGL.updateDataset(dataset);
      }
      scatterGLHasInitialized = true;
    }
  } */

// try to add image

/*   if (scene) {
    renderer.render(scene, camera);
  }

  // leftUpEyelash.position.set()

  stats.end();
  rafID = requestAnimationFrame(renderPrediction);
} */

/* // a is x coordinate of point to transform
// b is y coord of point to translate
// w and h not passed in .  they currently match the dimensions of the plane geometry mesh
const transform = (a, b, w = 10, h = 10.0) => {
  // x becomes w * (500 - )  since width and height of rendering area is 1000
  return {
    x: (w * (500.0 - a)) / 500.0 - w / 2,
    y: (h * (500 - b)) / 500.0 - h / 2
  };
};

function getEyelashPlaneHeight(width) {
  return width * (200 / 476);
}

function addEyeLash() {
  THREE.Cache.enabled = true;
  const loader = new THREE.TextureLoader(); // load from file
  console.log("attempting to load");
  loader.load(
    "images/eyelashcropped.png",
    function(texture) {
      console.log("loaded");

      const geometry = new THREE.PlaneGeometry(1.5, getEyelashPlaneHeight(1.5)); // width, height  1 unit of this eyelash is about 47 px
      const meterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
      });
      leftUpEyelash = new THREE.Mesh(geometry, meterial);
      scene.add(leftUpEyelash);
    },
    undefined,
    function(err) {
      console.error("error while laoding", err);
    }
  );
}

function addEyelashR() {
  THREE.Cache.enabled = true;
  const loader = new THREE.TextureLoader(); // load from file
  loader.load(
    "images/eyelash_r.png",
    function(texture) {
      const geometry = new THREE.PlaneGeometry(1.5, getEyelashPlaneHeight(1.5)); // width, height  1 unit of this eyelash is about 47 px
      const meterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
      });
      rightUpEyelash = new THREE.Mesh(geometry, meterial);
      scene.add(rightUpEyelash);
    },
    undefined,
    function(err) {
      console.error("error while laoding", err);
    }
  );
} */

/*
function addEyeLashB() {
  // bottom eyelash
  const loader = new THREE.TextureLoader();
  loader.load("images/eyelash_b.png", function(texture) {
    const geometry = new THREE.PlaneGeometry(3, 2);
    const meterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    leftBottomEyeslash = new THREE.Mesh(geometry, meterial);
    scene.add(leftBottomEyeslash);
  });
} */
/* 
function addLipLower(poly) {
  if (lipLower != null) {
    scene.remove(lipLower);
  }

  if (!poly || poly.length === 0) return;

  const shape = new THREE.Shape();
  shape.moveTo(poly[0].x, poly[0].y);

  for (let index = 0; index < poly.length; index++) {
    const point = poly[index];
    shape.lineTo(point.x, point.y);
  }
  shape.lineTo(poly[0].x, poly[0].y);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0x800000,
    transparent: true,
    opacity: 0.4
  });

  lipLower = new THREE.Mesh(geometry, material);
  scene.add(lipLower);
}

function addLipUpper(poly) {
  if (lipUpper != null) {
    scene.remove(lipUpper);
  }

  if (!poly || poly.length === 0) return;

  const shape = new THREE.Shape();
  shape.moveTo(poly[0].x, poly[0].y);

  for (let index = 0; index < poly.length; index++) {
    const point = poly[index];
    shape.lineTo(point.x, point.y);
  }
  shape.lineTo(poly[0].x, poly[0].y);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0x800000,
    transparent: true,
    opacity: 0.4
  });

  lipUpper = new THREE.Mesh(geometry, material);
  scene.add(lipUpper);
}
 */ export default {
  async mounted() {
    await tf.setBackend(state.backend);
    // setupDatGui();
    // stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.getElementById("app").appendChild(stats.dom);
    await setupCamera();
    video.play();
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    console.log("videoWidth", videoWidth);
    console.log("videoHeight", videoHeight);
    testThreejs();

    canvas = document.getElementById("output");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector(".canvas-wrapper");
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;
    ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); // move right the length of canvas
    ctx.scale(-1, 1); // flip x
    ctx.fillStyle = GREEN;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 0.5;
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: state.maxFaces, predictIrises: true }
    );
    renderPrediction();
    // if (renderPointcloud) {
    //   document.querySelector(
    //     "#scatter-gl-container"
    //   ).style = `width: ${VIDEO_SIZE}px; height: ${VIDEO_SIZE}px;`;
    //   scatterGL = new ScatterGL(
    //     document.querySelector("#scatter-gl-container"),
    //     { rotateOnStart: false, selectEnabled: false }
    //   );
    // }
  },
  data() {
    return {
      NUM_KEYPOINTS: 468,
      NUM_IRIS_KEYPOINTS: 5,
      GREEN: "#32EEDB",
      RED: "#FF2C35",
      BLUE: "#157AB3",
      EYELASH_PIXELS_PER_UNIT: 47,
      RIGHT_UPPER_MAP: [33, 246, 161, 160, 159, 158, 157, 173, 133],
      // const LEFT_UPPER_MAP2 = [463, 414, 286, 258, 257, 259, 260, 467, 359];
      // 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308
      // 146, 91, 181, 84, 17, 314, 405, 321, 375, 291
      LOWER_LIP_POINTS: [
        78,
        95,
        88,
        178,
        87,
        14,
        317,
        402,
        318,
        324,
        308,
        291,
        375,
        321,
        405,
        314,
        17,
        84,
        181,
        91,
        146,
        78
      ],
      UPPER_LIP_POINTS: [
        78,
        191,
        80,
        81,
        82,
        13,
        312,
        311,
        310,
        415,
        308,
        291,
        409,
        270,
        269,
        267,
        0,
        37,
        39,
        40,
        185,
        61,
        78
      ],
      camera: null,
      renderer: null,
      scene: null,
      leftUpEyelash: null,
      rightUpEyelash: null,
      lipLower: null,
      lipUpper: null,
      model: null,
      ctx: null,
      videoWidth: null,
      videoHeight: null,
      video: null,
      canvas: null,
      scatterGLHasInitialized: false,
      scatterGL: null,
      // eslint-disable-next-line
      rafID: null,

      VIDEO_SIZE: 500,
      mobile: this.isMobile(),
      // Don't render the point cloud on mobile in order to maximize performance and
      // to avoid crowding limited screen space.
      renderPointcloud: mobile === false,
      stats: new Stats(),
      state: {
        backend: "webgl",
        maxFaces: 1,
        triangulateMesh: false,
        predictIrises: true,
        showFullPoints: true
      }
    };
  },
  computed: {},
  watch: {
    renderPointCloud(n, o) {
      if (n) {
        this.state.renderPointcloud = true;
      }
    }
  },
  methods: {
    testThreejs() {
      // loads 3js
      this.video = document.getElementById("video");

      this.camera = new THREE.PerspectiveCamera( // field of view, 75 degrees, aspect ratio, near, far points
        53, // full fov from top to bottom
        1,
        0.1,
        100
      );
      // camera.position.z = 10;
      this.camera.position.set(0, 0, 10); // z = 10

      this.scene = new THREE.Scene();

      // const axesHelper = new THREE.AxesHelper(90);
      // scene.add(axesHelper);

      const texture = new THREE.VideoTexture(video); // like basic texture but continuously sets needsUpdate to true
      texture.wrapS = THREE.RepeatWrapping; // wrapping mode - repeats to infinity
      texture.repeat.x = -1; // repeats in r to l direction

      const geometry = new THREE.PlaneGeometry(10, 10); // geometry, 16 x 10 width, height - why must we change dimensions from 1 x 1 to 16 x 10?
      // geometry.scale(0.8, 0.8, 0.8);
      const material = new THREE.MeshBasicMaterial({ map: texture }); // video texture

      const mesh = new THREE.Mesh(geometry, material);
      // mesh.position.set(0, 0, 0);
      // mesh.lookAt(camera.position);
      this.scene.add(mesh); // add mesh to scene

      const container = document.getElementById("three");

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: container
        // alpha: true,
      });
      const RENDERER_SIZE = 750;
      // renderer.setClearColor(0xffffff);
      // renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(RENDERER_SIZE, RENDERER_SIZE); // 1000 x 1000

      // const light = new THREE.DirectionalLight(0xffffff, 0.5);
      // light.position.set(10, 0, 10);
      // scene.add(light);

      // addLine();

      addEyeLash();
      addEyelashR();
      // addEyeLashB();
    },
    addLipLower(poly) {
      if (this.lipLower != null) {
        this.scene.remove(this.lipLower);
      }

      if (!poly || poly.length === 0) return;

      const shape = new THREE.Shape();
      shape.moveTo(poly[0].x, poly[0].y);

      for (let index = 0; index < poly.length; index++) {
        const point = poly[index];
        shape.lineTo(point.x, point.y);
      }
      shape.lineTo(poly[0].x, poly[0].y);

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color: 0x800000,
        transparent: true,
        opacity: 0.4
      });

      lipLower = new THREE.Mesh(geometry, material);
      this.scene.add(lipLower);
    },

    addLipUpper(poly) {
      if (this.lipUpper != null) {
        this.scene.remove(this.lipUpper);
      }

      if (!poly || poly.length === 0) return;

      const shape = new THREE.Shape();
      shape.moveTo(poly[0].x, poly[0].y);

      for (let index = 0; index < poly.length; index++) {
        const point = poly[index];
        shape.lineTo(point.x, point.y);
      }
      shape.lineTo(poly[0].x, poly[0].y);

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color: 0x800000,
        transparent: true,
        opacity: 0.4
      });

      this.lipUpper = new THREE.Mesh(geometry, material);
      this.scene.add(lipUpper);
    },

    // a is x coordinate of point to transform
    // b is y coord of point to translate
    // w and h not passed in .  they currently match the dimensions of the plane geometry mesh
    transform(a, b, w = 10, h = 10.0) {
      // x becomes w * (500 - )  since width and height of rendering area is 1000
      return {
        x: (w * (500.0 - a)) / 500.0 - w / 2,
        y: (h * (500 - b)) / 500.0 - h / 2
      };
    },

    getEyelashPlaneHeight(width) {
      return width * (200 / 476);
    },

    addEyeLash() {
      THREE.Cache.enabled = true;
      const loader = new THREE.TextureLoader(); // load from file
      console.log("attempting to load");
      loader.load(
        "images/eyelashcropped.png",
        function(texture) {
          const geometry = new THREE.PlaneGeometry(
            1.5,
            this.getEyelashPlaneHeight(1.5)
          ); // width, height  1 unit of this eyelash is about 47 px
          const meterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
          });
          this.leftUpEyelash = new THREE.Mesh(geometry, meterial);
          this.scene.add(this.leftUpEyelash);
        },
        undefined,
        function(err) {
          console.error("error while laoding", err);
        }
      );
    },

    addEyelashR() {
      THREE.Cache.enabled = true;
      const loader = new THREE.TextureLoader(); // load from file
      loader.load(
        "images/eyelash_r.png",
        function(texture) {
          const geometry = new THREE.PlaneGeometry(
            1.5,
            this.getEyelashPlaneHeight(1.5)
          ); // width, height  1 unit of this eyelash is about 47 px
          const meterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
          });
          rightUpEyelash = new THREE.Mesh(geometry, meterial);
          scene.add(rightUpEyelash);
        },
        undefined,
        function(err) {
          console.error("error while laoding", err);
        }
      );
    },
    async renderPrediction() {
      this.stats.begin();

      const predictions = await this.model.estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: this.state.predictIrises
      }); // array

      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.videoWidth,
        this.videoHeight,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      if (predictions.length > 0) {
        predictions.forEach(prediction => {
          const keypoints = prediction.scaledMesh;
          const rightEyePoints = prediction.annotations.rightEyeUpper0;
          const leftEyePoints = prediction.annotations.leftEyeUpper0;
          const leftEyePoints2 = prediction.annotations.leftEyeUpper1;
          const leftEyePoints3 = prediction.annotations.leftEyeUpper2;
          this.placeEyelash(
            rightEyePoints,
            this.rightUpEyelash,
            0.13,
            0.025,
            1,
            0.2, // z- offset
            1.3,
            1, // negative z mult
            0.8 // positive z multiplier
          );
          this.placeEyelash(
            leftEyePoints,
            this.leftUpEyelash,
            -0.13,
            0.025,
            1,
            -0.15,
            1.3,
            0.65,
            1.2
          );
          // left bottom

          const lipLowerPoints = this.LOWER_LIP_POINTS.map(
            idx => prediction.scaledMesh[idx]
          );

          if (lipLowerPoints.length > 0) {
            const transformedLipLowerPoints = lipLowerPoints.map(x =>
              this.transform(x[0], x[1])
            );
            this.addLipLower(transformedLipLowerPoints);
          }

          const lipUpperPoints = this.UPPER_LIP_POINTS.map(
            x => prediction.scaledMesh[x]
          );
          if (lipUpperPoints.length > 0) {
            const transformedLipUpperPoints = lipUpperPoints.map(x =>
              this.transform(x[0], x[1])
            );
            this.addLipUpper(transformedLipUpperPoints);
          }

          if (this.state.triangulateMesh) {
            this.ctx.strokeStyle = GREEN;
            this.ctx.lineWidth = 0.5;
            for (let i = 0; i < TRIANGULATION.length / 3; i++) {
              const points = [
                TRIANGULATION[i * 3],
                TRIANGULATION[i * 3 + 1],
                TRIANGULATION[i * 3 + 2]
              ].map(index => keypoints[index]);
              this.drawPath(this.ctx, points, true);
            }
          } else {
            this.ctx.fillStyle = this.GREEN;
            if (state.showFullPoints) {
              // showKeyPoints(ctx, keypoints, "#FFF");
              let leftUpper = RIGHT_UPPER_MAP.map(idx => keypoints[idx]);
              this.showKeyPoints(this.ctx, this.leftUpper);

              let lowerLip = this.LOWER_LIP_POINTS.map(idx => keypoints[idx]);
              this.showKeyPoints(this.ctx, this.lowerLip, this.RED);
              this.showKeyPoints(
                this.ctx,
                this.UPPER_LIP_POINTS.map(x => keypoints[x])
              );

              this.showKeyPoints(this.ctx, leftEyePoints2);

              this.showKeyPoints(this.ctx, leftEyePoints3, this.BLUE);
            }
          }

          if (keypoints.length > this.NUM_KEYPOINTS) {
            this.ctx.strokeStyle = this.RED;
            this.ctx.lineWidth = 1;
            const leftCenter = keypoints[this.NUM_KEYPOINTS];
            const leftDiameterY = this.distance(
              keypoints[this.NUM_KEYPOINTS + 4],
              keypoints[this.NUM_KEYPOINTS + 2]
            );
            const leftDiameterX = this.distance(
              keypoints[this.NUM_KEYPOINTS + 3],
              keypoints[this.NUM_KEYPOINTS + 1]
            );
            this.ctx.beginPath();
            this.ctx.ellipse(
              leftCenter[0],
              leftCenter[1],
              leftDiameterX / 2,
              leftDiameterY / 2,
              0,
              0,
              2 * Math.PI
            );
            //   ctx.stroke();
            if (
              keypoints.length >
              this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS
            ) {
              const rightCenter =
                keypoints[this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS];
              const rightDiameterY = this.distance(
                keypoints[this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS + 2],
                keypoints[this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS + 4]
              );
              const rightDiameterX = this.distance(
                keypoints[this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS + 3],
                keypoints[this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS + 1]
              );
              this.ctx.beginPath();
              this.ctx.ellipse(
                rightCenter[0],
                rightCenter[1],
                rightDiameterX / 2,
                rightDiameterY / 2,
                0,
                0,
                2 * Math.PI
              );
              //  ctx.stroke();
            }
          }
        });
        if (
          this.renderPointcloud &&
          this.state.renderPointcloud &&
          this.scatterGL != null
        ) {
          const pointsData = predictions.map(prediction => {
            let scaledMesh = prediction.scaledMesh;
            return scaledMesh.map(point => [-point[0], -point[1], -point[2]]);
          });
          let flattenedPointsData = [];
          for (let i = 0; i < pointsData.length; i++) {
            flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
          }
          const dataset = new ScatterGL.Dataset(flattenedPointsData);
          if (!this.scatterGLHasInitialized) {
            this.scatterGL.setPointColorer(i => {
              if (
                i % (this.NUM_KEYPOINTS + this.NUM_IRIS_KEYPOINTS * 2) >
                this.NUM_KEYPOINTS
              ) {
                return this.RED;
              }
              return this.BLUE;
            });
            this.scatterGL.render(dataset);
          } else {
            this.scatterGL.updateDataset(dataset);
          }
          this.scatterGLHasInitialized = true;
          if (this.scene) {
            this.renderer.render(this.scene, this.camera);
          }

          // leftUpEyelash.position.set()

          this.stats.end();
          this.rafID = requestAnimationFrame(this.renderPrediction);
        }
      }
    },
    async setupCamera() {
      this.video = document.getElementById("video");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          // Only setting the video to a specified size in order to accommodate a
          // point cloud, so on mobile devices accept the default size.
          width: this.mobile ? undefined : this.VIDEO_SIZE,
          height: this.mobile ? undefined : this.VIDEO_SIZE
        }
      });
      this.video.srcObject = stream;

      return new Promise(resolve => {
        this.video.onloadedmetadata = () => {
          resolve(this.video);
        };
      });
    },

    getAvg(arr) {
      const sum = arr.reduce((prev, cur) => {
        return prev + cur;
      });
      return sum / arr.length;
    },
    populateOutput(msg) {
      const el = document.getElementById("coutput");
      el.innerHTML = JSON.stringify(msg);
    },

    isMobile() {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      return isAndroid || isiOS;
    },

    distance(a, b) {
      return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
    },

    distance3d(a, b) {
      return Math.sqrt(
        Math.pow(a[0] - b[0], 2) +
          Math.pow(a[1] - b[1], 2) +
          Math.pow(a[2] - b[2], 2)
      );
    },

    drawPath(ctx, points, closePath) {
      const region = new Path2D();
      region.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        region.lineTo(point[0], point[1]);
      }

      if (closePath) {
        region.closePath();
      }
      ctx.stroke(region);
    },

    placeEyelash(
      points,
      object,
      xOffset,
      yOffset,
      zRotMultiplier,
      zRotOffset,
      yRotMultiplier,
      zRotNegativeOffset,
      zRotPositiveOffset
    ) {
      const xVals = points.map(pt => pt[0]);
      const yVals = points.map(pt => pt[1]);
      const zVals = points.map(pt => pt[2]);
      // const zVals = leftEyePoints.map(pt => pt[2]);
      const min = Math.max(...xVals);
      if (points.length > 0) {
        const p1 = points.find(x => x[0] === min);
        if (!p1) return;

        const avgX = this.getAvg(xVals);
        const avgY = this.getAvg(yVals);
        // const target = transform(p1[0], p1[1]); // when in upper left corner, x is -5.5 and y is 2.9
        const target = this.transform(avgX, avgY);
        // in lower right corner, x is 4.4, y is -2.6

        object?.position?.set(target.x + xOffset, target.y + yOffset, 0.1); // .15 mine, a vertical offset due to the dimensions of image itself // z fixed

        // in x-y plane can get current angle of eyelash using first and last point.

        const yfirst = yVals[0];
        const ylast = yVals[yVals.length - 1];
        const xfirst = xVals[0];
        const xlast = xVals[xVals.length - 1];
        const run = xfirst - xlast;
        const rise = ylast - yfirst;
        const zfirst = zVals[0];
        const zlast = zVals[zVals.length - 1];
        const deepRun = zlast - zfirst;
        const slope = rise / run;
        const zSlope = deepRun / run;
        // tilted left, slope is -0.55
        // straight on .004
        // tilted right, slope is .55
        //   const max = Math.min(...xVals);
        /*         const eyewidth = Math.abs(max - min); */
        //naive scale - just measures x axis width of bounding box
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        //  console.log('firstPoint,', firstPoint, lastPoint)

        const eyelashDist = this.distance3d(firstPoint, lastPoint);
        const newScale = eyelashDist / this.EYELASH_PIXELS_PER_UNIT;
        object.scale.x = newScale;

        // naive z-rotation - independent of scale
        const newZRot = Math.atan(slope);
        const zAbs = Math.abs(newZRot);
        const zOffMultiplier =
          zAbs < 0.1
            ? zRotMultiplier
            : newZRot > 0
            ? zRotPositiveOffset
            : zRotNegativeOffset;
        this.populateOutput(zOffMultiplier);
        object.rotation.z = -newZRot * zOffMultiplier + zRotOffset;
        const newYRot = Math.atan(zSlope);
        object.rotation.y = newYRot * yRotMultiplier;
      }
    }
  }
};
</script>

<style>
#scatter-gl-container {
  display: inline-block;
  vertical-align: top;
}

.canvas-wrapper {
  position: relative;
}

.canvas-wrapper canvas {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%;
  top: 50px;
}

#scatter-gl-container {
  border: solid 1px black;
  position: relative;
}

/* center the canvas within its wrapper */
#scatter-gl-container canvas {
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate3d(-50%, -50%, 0);
}

#three {
  width: 800px;
  height: 800px;
  overflow: hidden;
}
</style>
