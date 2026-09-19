import { mount } from 'svelte'
import App from './App.svelte'

export function mountSvelteApp(root: HTMLElement): void {
  mount(App, { target: root })
}