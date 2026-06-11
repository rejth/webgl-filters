import { createApp } from 'vue';

import App from './App.vue';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createApp(App).mount(container);
