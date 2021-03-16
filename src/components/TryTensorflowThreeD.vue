<template>
  <div class="container">
    <div class="flex padding">
      <div class="canvas-wrapper">
        <video id="video" playsinline style="" />
        <canvas id="output" />
      </div>
      <div class="flex-sub">
        <canvas id="three" />
      </div>
    </div>
    <div id="scatter-gl-container" />
    <!-- <img
      id="leftEye"
      src="https://plugins-media.makeupar.com/webconsultation/looks/170428_gemini_natural/patten_eyelash_170428_gemini_01/eyelash/eyelash_170428_gemini_a.png"
    /> -->
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

let camera, renderer, scene;
let leftUpEyelash, leftBottomEyeslash;

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
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
  predictIrises: false,
  showFullPoints: true,
};

if (renderPointcloud) {
  state.renderPointcloud = true;
}

// eslint-disable-next-line
function setupDatGui() {
  const gui = new dat.GUI();
  gui
    .add(state, "backend", ["webgl", "wasm", "cpu"])
    .onChange(async (backend) => {
      window.cancelAnimationFrame(rafID);
      await tf.setBackend(backend);
      requestAnimationFrame(renderPrediction);
    });

  gui.add(state, "maxFaces", 1, 20, 1).onChange(async (val) => {
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: val }
    );
  });

  gui.add(state, "triangulateMesh");
  gui.add(state, "predictIrises");

  if (renderPointcloud) {
    gui.add(state, "renderPointcloud").onChange((render) => {
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
      height: mobile ? undefined : VIDEO_SIZE,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function renderPrediction() {
  stats.begin();

  const predictions = await model.estimateFaces({
    input: video,
    returnTensors: false,
    flipHorizontal: false,
    predictIrises: state.predictIrises,
  });

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
    predictions.forEach((prediction) => {
      const keypoints = prediction.scaledMesh;
      // const keypoints = prediction.annotations.leftEyeUpper1;
      // console.log(keypoints);
      // NUM_KEYPOINTS = keypoints.length;
      // left up
      const leftEyePoints = prediction.annotations.leftEyeUpper0;
      if (leftEyePoints.length > 0) {
        const min = Math.max(...leftEyePoints.map((x) => x[0]));
        const p1 = leftEyePoints.find((x) => x[0] === min);

        const target = transform(p1[0], p1[1]);

        leftUpEyelash.position.set(target.x, target.y, 0.1);
      }

      // left bottom
      const leftEyeLowerPoints = prediction.annotations.leftEyeLower0;
      if (leftEyeLowerPoints.length > 0) {
        const min = Math.max(...leftEyeLowerPoints.map((x) => x[0]));
        const p1 = leftEyeLowerPoints.find((x) => x[0] === min);

        const target = transform(p1[0], p1[1]);

        leftBottomEyeslash.position.set(target.x, target.y, 0.1);
      }

      if (state.triangulateMesh) {
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
          const points = [
            TRIANGULATION[i * 3],
            TRIANGULATION[i * 3 + 1],
            TRIANGULATION[i * 3 + 2],
          ].map((index) => keypoints[index]);
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

          for (let i = 0; i < leftEyePoints.length; i++) {
            const x = leftEyePoints[i][0];
            const y = leftEyePoints[i][1];
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
        ctx.stroke();
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
          ctx.stroke();
        }
      }
    });
    if (renderPointcloud && state.renderPointcloud && scatterGL != null) {
      const pointsData = predictions.map((prediction) => {
        let scaledMesh = prediction.scaledMesh;
        return scaledMesh.map((point) => [-point[0], -point[1], -point[2]]);
      });
      let flattenedPointsData = [];
      for (let i = 0; i < pointsData.length; i++) {
        flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
      }
      const dataset = new ScatterGL.Dataset(flattenedPointsData);
      if (!scatterGLHasInitialized) {
        scatterGL.setPointColorer((i) => {
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

const transform = (a, b, w = 16.0, h = 10.0) => {
  return {
    x: (w * (500.0 - a)) / 500.0 - w / 2 + 0.6,
    y: (h * (500 - b)) / 500.0 - h / 2 - 0.1,
  };
};

function addEyeLash() {
  const loader = new THREE.TextureLoader();
  loader.load("images/eyelash.png", function (texture) {
    const geometry = new THREE.PlaneGeometry(3, 2);
    const meterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    leftUpEyelash = new THREE.Mesh(geometry, meterial);
    scene.add(leftUpEyelash);
  });
}

function addEyeLashB() {
  const loader = new THREE.TextureLoader();
  loader.load("images/eyelash_b.png", function (texture) {
    const geometry = new THREE.PlaneGeometry(3, 2);
    const meterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    leftBottomEyeslash = new THREE.Mesh(geometry, meterial);
    scene.add(leftBottomEyeslash);
  });
}

function testThreejs() {
  video = document.getElementById("video");

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  // camera.position.z = 10;
  camera.position.set(0, 0, 10);

  scene = new THREE.Scene();

  const axesHelper = new THREE.AxesHelper(90);
  scene.add(axesHelper);

  const texture = new THREE.VideoTexture(video);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;

  const geometry = new THREE.PlaneGeometry(16, 10);
  // geometry.scale(0.8, 0.8, 0.8);
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);
  // mesh.position.set(0, 0, 0);
  // mesh.lookAt(camera.position);
  scene.add(mesh);

  const container = document.getElementById("three");

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: container,
    // alpha: true,
  });
  // renderer.setClearColor(0xffffff);
  // renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1000, 1000);

  // const light = new THREE.DirectionalLight(0xffffff, 0.5);
  // light.position.set(10, 0, 10);
  // scene.add(light);

  addLine();

  addEyeLash();
  addEyeLashB();
}

function addLine() {
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

    testThreejs();

    canvas = document.getElementById("output");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector(".canvas-wrapper");
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;
    ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = GREEN;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 0.5;
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: state.maxFaces }
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