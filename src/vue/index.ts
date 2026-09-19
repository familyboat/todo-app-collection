import { createApp } from 'vue'
import App from './App.vue'

export function mountVueApp(root: HTMLElement): void {
  createApp(App).mount(root)
}