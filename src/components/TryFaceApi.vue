<template>
  <div class="relative">
    <video ref="video" id="video" autoplay muted playsinline></video>
    <canvas id="overlay" class="absolute" width="360" height="480"></canvas>
  </div>
</template>

<script>
import * as faceapi from "face-api.js";

export default {
  data() {
    return {
      video: {},
      globalAlpha: 0.2,
      fillStyle: "rgb(255, 100, 255)"
    };
  },
  async mounted() {
    this.video = document.getElementById("video");
    await this.prepare();

    this.video.onloadedmetadata = async () => {
      this.play();
    };
  },
  methods: {
    draw(canvas, resizedResult, width, globalAlpha, fillStyle) {
      let positions = resizedResult.landmarks.getMouth();
      positions.forEach(element => {
        element._x = width - element._x;
      });
      let ctx = canvas.getContext("2d");
      ctx.strokeStyle = "rgb(255, 150,150)";
      ctx.globalAlpha = globalAlpha;
      ctx.fillStyle = fillStyle;
      ctx.moveTo(positions[0].x, positions[0].y);
      ctx.beginPath();
      // this is upper lip top
      for (let i = 0; i < 7; i++) {
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      // upper lip bottom
      for (let i = 16; i >= 12; i--) {
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      ctx.fill();
      ctx.closePath();
      ctx.beginPath();
      // lower lip top
      ctx.moveTo(positions[16].x, positions[16].y);
      for (let i = 16; i < 20; i++) {
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      ctx.lineTo(positions[0].x, positions[0].y);
      // lower lip bottom
      for (let i = 13; i >= 6; i--) {
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      ctx.fill();
      ctx.closePath();
    },
    async prepare() {
      const loaded = await this.isFaceDetectionModelLoaded();
      if (!loaded) {
        await this.getCurrent().load("/weights");
      }
      await faceapi.loadFaceLandmarkModel("/weights");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 360
          },
          height: {
            ideal: 480
          }
        }
      });
      this.video.srcObject = stream;
    },
    async isFaceDetectionModelLoaded() {
      return !!this.getCurrent().params;
    },
    getCurrent() {
      return faceapi.nets.tinyFaceDetector;
    },
    async play() {
      requestAnimationFrame(this.play);

      const canvas = document.getElementById("overlay");
      const width = canvas.getAttribute("width");
      const videoElement = document.getElementById("video");

      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 160,
        scoreThreshold: 0.5
      });

      const result = await faceapi
        .detectSingleFace(videoElement, options)
        .withFaceLandmarks();

      if (result) {
        const dims = faceapi.matchDimensions(canvas, videoElement, true);
        const resizedResult = faceapi.resizeResults(result, dims);

        this.draw(canvas, resizedResult, width, this.globalAlpha, this.fillStyle);
        /*  let mouth = resizedResult.landmarks.positions.slice(48, 68);
    mouth.forEach((element) => {
      element._x = width - element._x;
    });

    const context = canvas.getContext("2d");
    context.strokeStyle = "red";
    context.lineWith = 5;
    faceapi.draw.drawContour(context, mouth, true);

    context.fillStyle = "red";
    context.fill(); */
      }
    }
  }
};
</script>

<style>
#video,
#overlay {
  width: 360px;
  height: 480px;
}
#overlay {
  border: 1px solid lightblue;
  top: 0;
  left: 0;
}
#video {
  transform: rotateY(180deg);
}
</style>