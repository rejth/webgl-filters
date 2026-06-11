<script setup lang="ts">
import { ref, watch } from 'vue';

import { type Effect, type KernelName, RenderImage } from '../webgl/image/RenderImage';

const props = defineProps<{
  effects: Effect[];
}>();

const effectState = ref<Effect[]>([...props.effects]);

watch(
  () => props.effects,
  (effects) => {
    effectState.value = [...effects];
  },
);

const handleChange = (name: KernelName) => {
  const renderer = RenderImage.getCurrent();

  effectState.value = effectState.value.map((effect) =>
    effect.name === name ? { ...effect, on: !effect.on } : effect,
  );
  renderer.drawEffects(effectState.value.filter((effect) => effect.on));
};
</script>

<template>
  <div class="effects-panel">
    <h3 class="effects-title">Image Effects</h3>
    <label v-for="effect in effectState" :key="effect.name" class="effect-checkbox">
      <input type="checkbox" :checked="effect.on" @change="handleChange(effect.name)" />
      <span class="effect-name">{{ effect.name }}</span>
    </label>
  </div>
</template>
