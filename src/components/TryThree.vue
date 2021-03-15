<template>
  <div></div>
</template>

<script>
import * as THREE from "three";
import WEBGL from "../utils/webgl";
import faceMesh from "./data/facemesh.json";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

export default {
  data() {
    return {
      scene: undefined,
      camera: undefined,
      renderer: undefined,
      font: undefined,
      text: "Optize",
      group: undefined,
      faceMesh: undefined
    };
  },
  mounted() {
    this.init();
    // this.drawLine();
   // this.drawCube();
    // this.drawText();
    this.faceMesh = faceMesh[0].scaledMesh;
    this.drawFace();

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  },
  methods: {
    init() {
      console.log(window.innerWidth);
      console.log(window.innerHeight);
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x000000, 10, 1100);

      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      this.camera.lookAt(0, 0, 0);
      this.camera.position.set(0, 0, 100);

      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      this.renderer.render(this.scene, this.camera);
    },
    drawFace() {
      const threePts = this.faceMesh.map(point => {
        return new THREE.Vector3(point[0] / 9, point[1] / 9, point[2] / 9);
      });
      const geometry = new ConvexGeometry(threePts);
      //  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      //  const face = new THREE.Mesh(geometry, material)
      const wireframe = new THREE.WireframeGeometry(geometry);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1,
        linejoin: "miter"
      });

      const face = new THREE.LineSegments(wireframe, material);

      face.position.y = 0;
      face.position.x = -10;
      face.position.z = -90;
      this.scene.add(face);
      const animate = () => {
        requestAnimationFrame(animate);
        face.rotation.y += 0.01;

        this.render();
      };
      animate();
    },
    drawLine() {
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
      const linePoints = [];
      linePoints.push(new THREE.Vector3(-1100, 760, -900));
      linePoints.push(new THREE.Vector3(1100, 760, -900));
      linePoints.push(new THREE.Vector3(1110, -760, -900));
      linePoints.push(new THREE.Vector3(-1110, -760, -900));
      linePoints.push(new THREE.Vector3(-1100, 760, -900));

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(linePoints),
        lineMaterial
      );

      this.scene.add(line);
    },
    drawCube() {
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.y = 0;
      cube.position.z = 90;
      cube.position.x = 6;
      this.scene.add(cube);

      const animate = () => {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        this.render();
      };

      if (WEBGL.isWebGLAvailable()) {
        animate();
      } else {
        const warning = WEBGL.getWebGLErrorMessage();
        document.getElementById("app").appendChild(warning);
      }
    },

    drawText() {
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.125);
      dirLight.position.set(0, 0, 100).normalize();
      this.scene.add(dirLight);

      const pointLight = new THREE.PointLight(0xffffff, 1.5);
      pointLight.position.set(0, 20, 10);
      this.scene.add(pointLight);

      pointLight.color.setHSL(Math.random(), 1, 0.5);
      // const hex = this.decimalToHex(pointLight.color.getHex());

      this.group = new THREE.Group();
      this.group.position.x = 0;
      this.group.position.y = 0;

      this.scene.add(this.group);

      // load font
      const loader = new THREE.FontLoader();
      const that = this;
      loader.load("fonts/optimer_bold.typeface.json", function(response) {
        that.font = response;
        console.log(that.font);
        that.createText();
        // that.render();
      });
    },
    createText() {
      const textGeo = new THREE.TextGeometry(this.text, {
        font: this.font,
        size: 70,
        height: 20,
        curveSegments: 4,
        bevelThickness: 3,
        bevelSize: 1.5,
        bevelEnabled: true
      });

      textGeo.computeBoundingBox();

      const materials = [
        new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }), // front
        new THREE.MeshPhongMaterial({ color: 0xffffff }) // side
      ];

      const centerOffset =
        -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

      const textMesh1 = new THREE.Mesh(textGeo, materials);
      textMesh1.position.x = centerOffset;
      textMesh1.position.y = 20;
      textMesh1.position.z = -150;

      textMesh1.rotation.x = 0;
      textMesh1.rotation.y = Math.PI * 2;

      const textMesh2 = new THREE.Mesh(textGeo, materials);

      textMesh2.position.x = centerOffset;
      textMesh2.position.y = -40;
      textMesh2.position.z = -150;

      textMesh2.rotation.x = Math.PI;
      textMesh2.rotation.y = Math.PI * 2;

      this.group.add(textMesh1);
      this.group.add(textMesh2);

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 10000),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          opacity: 0.5,
          transparent: true
        })
      );
      plane.position.y = 50;
      plane.rotation.x = -Math.PI / 2;
      this.scene.add(plane);
    },
    render() {
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
};
</script>

<style>
body {
  margin: 0;
}
</style>