<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { renderBox } from '../webgl/box/renderBox';

const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (!canvasRef.value) return;

  const gl = canvasRef.value.getContext('webgl2');
  if (!gl) return;

  renderBox(gl);
});
</script>

<template>
  <div class="view-container">
    <canvas ref="canvasRef" class="webgl-canvas" />
  </div>
</template>
