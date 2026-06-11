<script setup lang="ts">
import { ref } from 'vue';

import BoxView from './views/BoxView.vue';
import ImageFilterView from './views/ImageFilterView.vue';

type TabId = 'box' | 'image';

const tabs: { id: TabId; label: string }[] = [
  { id: 'box', label: 'Box' },
  { id: 'image', label: 'Image Filter' },
];

const activeTab = ref<TabId>('box');
</script>

<template>
  <div class="app">
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="tab-content">
      <BoxView v-if="activeTab === 'box'" />
      <ImageFilterView v-else />
    </main>
  </div>
</template>
