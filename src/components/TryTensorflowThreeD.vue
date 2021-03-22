<template>
  <div class="container">
    <div class="flex padding">
      <div class="canvas-wrapper">
        <video id="video" playsinline style="display:none" />
        <canvas id="output" />
      </div>
      <div class="flex-sub">
        <canvas id="three" />
      </div>
    </div>
    <div id="scatter-gl-container" />
    <div
      id="coutput"
      style="position: absolute; top: 0; left: 0;margin: 15px; width: 300px; overflow-wrap: break-word"
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
import dat from "dat.gui";
import { ScatterGL } from "scatter-gl";

import * as tf from "@tensorflow/tfjs-core";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import Stats from "stats.js";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";

import { TRIANGULATION } from "@/utils/triangulation";
import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
);

const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;
const GREEN = "#32EEDB";
const RED = "#FF2C35";
const BLUE = "#157AB3";
const EYELASH_PIXELS_PER_UNIT = 47;
const RIGHT_UPPER_MAP = [33, 246, 161, 160, 159, 158, 157, 173, 133];
// const LEFT_UPPER_MAP2 = [463, 414, 286, 258, 257, 259, 260, 467, 359];

let camera, renderer, scene;
let leftUpEyelash;
// leftBottomEyeslash;

function populateOutput(msg) {
  const el = document.getElementById("coutput");
  el.innerHTML = JSON.stringify(msg);
}

let lipLower;

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
}

function drawPath(ctx, points, closePath) {
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
}
let model,
  ctx,
  videoWidth,
  videoHeight,
  video,
  canvas,
  scatterGLHasInitialized = false,
  scatterGL,
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
};

if (renderPointcloud) {
  state.renderPointcloud = true;
}

// eslint-disable-next-line
function setupDatGui() {
  const gui = new dat.GUI();
  gui
    .add(state, "backend", ["webgl", "wasm", "cpu"])
    .onChange(async backend => {
      window.cancelAnimationFrame(rafID);
      await tf.setBackend(backend);
      requestAnimationFrame(renderPrediction);
    });

  gui.add(state, "maxFaces", 1, 20, 1).onChange(async val => {
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: val }
    );
  });

  gui.add(state, "triangulateMesh");
  gui.add(state, "predictIrises");

  if (renderPointcloud) {
    gui.add(state, "renderPointcloud").onChange(render => {
      document.querySelector("#scatter-gl-container").style.display = render
        ? "inline-block"
        : "none";
    });
  }
}

// eslint-disable-next-line
async function setupCamera() {
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

/* function toDegrees(rad) {
  return rad * (180/Math.PI)
} */

function getAvg(arr) {
  const sum = arr.reduce((prev, cur) => {
    return prev + cur;
  });
  return sum / arr.length;
}

async function renderPrediction() {
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
      // const keypoints = prediction.annotations.leftEyeUpper1;
      // console.log(keypoints);
      // NUM_KEYPOINTS = keypoints.length;
      // left up
      // populateOutput(Object.keys(prediction.annotations));
      const leftEyePoints = prediction.annotations.leftEyeUpper0;
      const leftEyePoints2 = prediction.annotations.leftEyeUpper1;
      const leftEyePoints3 = prediction.annotations.leftEyeUpper2;
      const xVals = leftEyePoints.map(pt => pt[0]);
      const yVals = leftEyePoints.map(pt => pt[1]);
      const zVals = leftEyePoints.map(pt => pt[2]);
      // const zVals = leftEyePoints.map(pt => pt[2]);
      const min = Math.max(...xVals);
      if (leftEyePoints.length > 0) {
        const p1 = leftEyePoints.find(x => x[0] === min);
        if (!p1) return;
        const avgX = getAvg(xVals);
        const avgY = getAvg(yVals);
        // const target = transform(p1[0], p1[1]); // when in upper left corner, x is -5.5 and y is 2.9
        const target = transform(avgX, avgY);
        // in lower right corner, x is 4.4, y is -2.6

        leftUpEyelash?.position?.set(target.x - 0.13, target.y + 0.03, 0.1); // .15 mine, a vertical offset due to the dimensions of image itself // z fixed

        // #region scale and rotation

        // when facing straight on:
        // z values - [7.2, 5.5, 4.1, 2.9, 2.7, 3.4, 4.4]

        // when turned right
        // z values - [-17.2, -17.3, -17.1, -15.4, -13.1, -10.4, -8.4]

        // when turned left
        // z values - [25.8, 23.6, 21.1, 18.0, 15.8, 14.7, 14.3]

        // close up
        // z values - [4.3, 2.6, 1.1, -0.2, -0.4, 0.5, 1.6]

        // far away
        // z values - [11.1, 9.5, 8.0, 6.8, 6.5, 7.1, 7.9]

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
        const firstPoint = leftEyePoints[0];
        const lastPoint = leftEyePoints[leftEyePoints.length - 1];
        //  console.log('firstPoint,', firstPoint, lastPoint)

        const eyelashDist = distance3d(firstPoint, lastPoint);
        const newScale = eyelashDist / EYELASH_PIXELS_PER_UNIT;
        leftUpEyelash.scale.x = newScale;

        // naive z-rotation - independent of scale
        const newZRot = Math.atan(slope);
        leftUpEyelash.rotation.z = -newZRot * 1.05 - .2;
        const newYRot = Math.atan(zSlope);
        leftUpEyelash.rotation.y = newYRot * 1.3;

        populateOutput(newYRot);
        // #endregion scale
        // sets position in scene
      }

      // left bottom
      /*       const leftEyeLowerPoints = prediction.annotations.leftEyeLower0;
      if (leftEyeLowerPoints.length > 0) {
        const min = Math.max(...leftEyeLowerPoints.map((x) => x[0]));
        const p1 = leftEyeLowerPoints.find((x) => x[0] === min);

        const target = transform(p1[0], p1[1]);

        leftBottomEyeslash?.position?.set(target.x, target.y, 0.1);
      } */

      // lip lower
      const lipLowerPoints = [
        ...prediction.annotations.lipsLowerInner,
        ...prediction.annotations.lipsLowerOuter,
      ];
      if (lipLowerPoints.length > 0) {
        const transformedLipLowerPoints = lipLowerPoints.map((x) =>
          transform(x[0], x[1])
        );
        populateOutput(transformedLipLowerPoints)
         addLipLower(transformedLipLowerPoints);
       
       /*lipLower.position.set(
          transformedLipLowerPoints[0].x,
          transformedLipLowerPoints[0].y,
          0.0001
        ); */
/*          leftUpEyelash?.position?.set(          
           transformedLipLowerPoints[0].x,
           transformedLipLowerPoints[0].y,
           0.0001) */
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
          // for (let i = 0; i < NUM_KEYPOINTS; i++) {
          //   const x = keypoints[i][0];
          //   const y = keypoints[i][1];
          //   ctx.beginPath();
          //   ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
          //   ctx.fill();
          // }

          /*           for (let i = 0; i < leftEyePoints.length; i++) {
            const x = leftEyePoints[i][0];
            const y = leftEyePoints[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
          } */
          let leftUpper = RIGHT_UPPER_MAP.map(idx => keypoints[idx]);
          for (let i = 0; i < leftUpper.length; i++) {
            const x = leftUpper[i][0];
            const y = leftUpper[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.fillStyle = RED;
          for (let i = 0; i < leftEyePoints2.length; i++) {
            const x = leftEyePoints2[i][0];
            const y = leftEyePoints2[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.fillStyle = BLUE;
          for (let i = 0; i < leftEyePoints3.length; i++) {
            const x = leftEyePoints3[i][0];
            const y = leftEyePoints3[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
            ctx.fill();
          }
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
  }

  // try to add image

  if (scene) {
    renderer.render(scene, camera);
  }

  // leftUpEyelash.position.set()

  stats.end();
  rafID = requestAnimationFrame(renderPrediction);
}

// a is x coordinate of point to transform
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
    opacity: 0.75,
  });

  lipLower = new THREE.Mesh(geometry, material);
  scene.add(lipLower);
}

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
  console.log("mesh is ", mesh);
  console.log("camera is at ", camera);

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
  // addEyeLashB();
}

/* function addLine() {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const linePoints = [];
  linePoints.push(new THREE.Vector3(-8, 5, 0));
  linePoints.push(new THREE.Vector3(8, 5, 0));
  linePoints.push(new THREE.Vector3(8, -5, 0));
  linePoints.push(new THREE.Vector3(-8, -5, 0));
  linePoints.push(new THREE.Vector3(-8, 5, 0));

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    lineMaterial
  );

  scene.add(line);
}
 */
export default {
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
  top: 502px;
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