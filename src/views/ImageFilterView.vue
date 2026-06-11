<script setup lang="ts">
import { onMounted, ref } from 'vue';

import flamingoUrl from '../assets/flamingo.jpg';
import EffectsPanel from '../components/EffectsPanel.vue';
import { type Effect, type KernelName, RenderImage } from '../webgl/image/RenderImage';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const effects = ref<Effect[]>([]);

onMounted(() => {
  if (!canvasRef.value) return;

  const gl = canvasRef.value.getContext('webgl2');
  if (!gl) return;

  const image = new Image();
  image.src = flamingoUrl;

  image.onload = () => {
    const renderer = new RenderImage(gl, image);
    effects.value = (Object.keys(renderer.kernels) as KernelName[]).map((name) => ({ name, on: false }));
    renderer.drawImage(effects.value);
    loading.value = false;
  };
});
</script>

<template>
  <div class="view-container">
    <canvas ref="canvasRef" class="webgl-canvas" />
    <EffectsPanel v-if="!loading" :effects="effects" />
    <div v-if="loading" class="loading">Loading...</div>
  </div>
</template>
