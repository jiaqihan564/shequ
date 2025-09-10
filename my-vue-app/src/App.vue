<script setup lang="ts">
import ToastContainer from '@/shared/ui/ToastContainer.vue'
</script>

<template>
  <div id="app">
    <router-view />
    <ToastContainer position="top-right" />
  </div>

</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html, body, #app {
  min-height: 100vh;
}
</style>
