import { render } from 'solid-js/web'
import { App } from './App'

export function mountSolidApp(root: HTMLElement): void {
  render(() => <App />, root)
}