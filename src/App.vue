<script setup lang="ts">
import ToastContainer from '@/shared/ui/ToastContainer.vue'
</script>

<template>
  <div id="app">
    <router-view />
    <ToastContainer position="top-right" />
  </div>
</template>
