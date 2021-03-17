<template>
  <div class="container">
    <div class="canvas-wrapper">
      <canvas id="output" />
      <video
        id="video"
        playsinline
        style="
          -webkit-transform: scaleX(-1);
          transform: scaleX(-1);
          visibility: hidden;
          width: auto;
          height: auto;
        "
      />
    </div>
    <div id="scatter-gl-container" />
    <br />
    <div id="outputs" style="overflow-wrap:break-word; width: 500px;" />
  </div>
</template>

<script>
// eslint-disable-next-line
// import * as THREE from "three";
import dat from "dat.gui"; // simple gui
import { ScatterGL } from "scatter-gl"; // third party

import * as tf from "@tensorflow/tfjs-core";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import Stats from "stats.js";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
// import FileSaver from 'file-saver'

import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
// import { TRIANGULATION } from "@/utils/triangulation";
tfjsWasm.setWasmPaths(
  // wasm = webassembly
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
);

const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;
const GREEN = "#32EEDB";
const RED = "#FF2C35";
const BLUE = "#157AB3";
const LEFT_UPPER_MAP = [33, 246, 161, 160, 159, 158, 157, 173, 133];

function isMobile() {
  // helper function
  const isAndroid = /Android/i.test(navigator.userAgent); // i is case insensitive
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

function distance(a, b) {
  // helper function
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

/**
 * points - arr of size 2
 *
 */
function drawPath(ctx, points, closePath) {
  // helper method, path drawing
  const region = new Path2D(); // Path2D : webapi - experimental - canvas 2D API - wrapper for path, saves need to call beginPath
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
const renderPointcloud = mobile !== mobile;
// mobile has no scatter plot

const stats = new Stats(); // Stats.js, from mr. doob - performance monitor
const state = {
  // gui control rows
  backend: "webgl",
  maxFaces: 1,
  triangulateMesh: false,
  predictIrises: true
};

if (renderPointcloud) {
  state.renderPointcloud = true;
}

function populateOutput(content) {
  const outputEl = document.getElementById("outputs");
  if (!outputEl) return;
  outputEl.innerHTML = JSON.stringify(content);
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
      // hookup maxFaces to gui
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      {
        maxFaces: val
      }
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
  // start webcam/cameraphone video stream
  video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user", // not supported on android chrome yet - on phones, use front or back camera

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
/* 
let saved = false
function capturePredictions(prediction) {
  if (!prediction[0] || saved) return

  let asStr = JSON.stringify(prediction)
  FileSaver.saveAs(new Blob([asStr],  {type: "text/plain;charset=utf-8"}), 'facePoints')
  saved = true
} */

async function renderPrediction() {
  // the 2d canvas face mesh drawing "prediction" because it is predicting depth and predicting facial parts
  stats.begin();

  const predictions = await model.estimateFaces({
    // model is the tensorflow model, use it to predict/estimate face points
    input: video,
    returnTensors: false,
    flipHorizontal: false,
    predictIrises: state.predictIrises
  });
  ctx.drawImage(
    // draw video snapshot onto canvas
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  ); // draws image onto canvas, arg 2-5 are clip start and w/h

  if (predictions.length > 0) {
    ctx.strokeStyle = GREEN;
    ctx.fillStyle = "rgba(0,0,255, .2)";
    ctx.lineWidth = 0.5;
    // capturePredictions(predictions)
    predictions.forEach(prediction => {
      populateOutput(Object.keys(prediction.annotations)); // bounding box, mesh, scaledMesh - normalized mesh, annotations
      // populateOutput(prediction.annotations.lipsUpperOuter);
      //annotations include leftEyeUpperm,
      // lipsUpperOuter, lipsUpperInner, lipsLowerInner
      // silhouette: dark shape and outline of someone orsomething against a brighter background

      const keypoints = prediction.scaledMesh; // scale applied
      // populateOutput(keypoints[0].length);
      // prediction are 3d points

      if (state.triangulateMesh) {
        // flag from ui

        const upperLipsOuter = prediction?.annotations?.lipsUpperOuter;
        const lipsUpperInner = prediction?.annotations?.lipsUpperInner.reverse();
        const innerOffsetted = lipsUpperInner.map(point => {
          return point;
        });
        // let upperLip = upperLipsOuter.concat(lipsUpperInner);
        let upperLip = upperLipsOuter.concat(innerOffsetted);
        upperLip.push(upperLipsOuter[0]);
        upperLip = upperLip.map(point => {
          point[1] += 2.5;
          return point;
        });
        ctx.beginPath();
        ctx.moveTo(upperLip[0][0], upperLip[0][1]);
        // console.log("triangulation is ", TRIANGULATION.length);
        for (let i = 0; i < upperLip.length - 1; i++) {
          //        for (let i = upperLipsOuter.length; i < upperLipsOuter.length + 2; i++) {
          // triangulation - a util that is an array of length 2640
          if (upperLip && upperLip[0]) {
            let points2 = [upperLip[i], upperLip[i + 1]];

            // region.moveTo(points2[0][0], points2[0][1]);
            ctx.lineTo(points2[1][0], points2[1][1]);
            //  ctx.stroke();
            if (10000000 < points2.length) {
              drawPath(ctx, points2, false);
            } // draw triangle
          }
        }
        ctx.closePath();
        ctx.fill();
        // ctx.stroke()
        // ctx.stroke();
        /*          for (let i = 0; i < lipsUpperInner.length - 1; i++) {
          // triangulation - a util that is an array of length 2640
          if (lipsUpperInner && lipsUpperInner[0]) {
            let points2 = [lipsUpperInner[i], lipsUpperInner[i+1]]
            drawPath(ctx, points2, true); // draw triangle
          }
        } */
      } else {
        // triangulation option off
        ctx.fillStyle = GREEN;
        const leftUpper = LEFT_UPPER_MAP.map(idx => keypoints[idx]);
        /*  for (let i = 0; i < NUM_KEYPOINTS; i++) {
          // hardcoded to 468 points
          const x = keypoints[i][0];
          const y = keypoints[i][1]; */
        for (let i = 0; i < leftUpper.length; i++) {
          // hardcoded to 468 points
          const x = leftUpper[i][0];
          const y = leftUpper[i][1];
          ctx.beginPath();
          ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI); // draw dots 1px radius
          ctx.fill();
        }
      }

      if (keypoints.length < NUM_KEYPOINTS) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 1;

        const leftCenter = keypoints[NUM_KEYPOINTS]; // last few keypoints are special points, rendered in red
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
       // ctx.stroke();

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
          // ctx.stroke();
        }
      }
    });

    // 2d canvas work done

    // bgin renderPointCloud

    if (renderPointcloud && state.renderPointcloud && scatterGL != null) {
      const pointsData = predictions.map(prediction => {
        let scaledMesh = prediction.scaledMesh;
        return scaledMesh.map(point => [-point[0], -point[1], -point[2]]); // uses all three points
      });

      let flattenedPointsData = [];
      for (let i = 0; i < pointsData.length; i++) {
        flattenedPointsData = flattenedPointsData.concat(pointsData[i]); // flatten the array of 3 dim points
      }
      const dataset = new ScatterGL.Dataset(flattenedPointsData); // feed it to scatterGL

      if (!scatterGLHasInitialized) {
        scatterGL.setPointColorer(i => {
          if (i % (NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS * 2) > NUM_KEYPOINTS) {
            return RED;
          }
          return BLUE;
        });
        scatterGL.render(dataset); // black box
      } else {
        scatterGL.updateDataset(dataset);
      }
      scatterGLHasInitialized = true;
    }
  }

  stats.end();
  rafID = requestAnimationFrame(renderPrediction); // animation loop
}

export default {
  async mounted() {
    await tf.setBackend(state.backend); // options - webgl, webasm, cpu
    setupDatGui();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.getElementById("app").appendChild(stats.dom);
    await setupCamera();
    video.play();
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;
    canvas = document.getElementById("output");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector(".canvas-wrapper");
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;
    ctx = canvas.getContext("2d"); // 2d context
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = GREEN;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 0.5;
    model = await faceLandmarksDetection.load(
      // nn model
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, // uses mediaPipeFaceMesh model
      { maxFaces: state.maxFaces }
    );
    renderPrediction(); // start render loop
    if (renderPointcloud) {
      document.querySelector(
        "#scatter-gl-container"
      ).style = `width: ${VIDEO_SIZE}px; height: ${VIDEO_SIZE}px;`;
      scatterGL = new ScatterGL(
        document.querySelector("#scatter-gl-container"),
        { rotateOnStart: false, selectEnabled: false }
      );
    }
  }
};
</script>

<style>
.canvas-wrapper,
#scatter-gl-container {
  display: inline-block;
  vertical-align: top;
  margin-top: 50px;
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
</style>