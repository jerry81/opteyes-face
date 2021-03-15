<template>
  <div id="app" class="flex justify-center align-center">
    <!-- <try-face-api /> -->
<!--         <try-three /> -->
    <try-tensorflow-js />
  </div>
</template>

<script>
// import TryFaceApi from "./components/TryFaceApi.vue";
import TryTensorflowJs from "./components/TryTensorflowJs.vue";
import TryThree from "./components/TryThree.vue";
export default {
  name: "App",
  // eslint-disable-next-line
  components: { TryThree, TryTensorflowJs }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
