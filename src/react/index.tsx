import { createRoot } from 'react-dom/client'
import { App } from './App'

export function mountReactApp(root: HTMLElement): void {


  const rootEl = createRoot(root)
  rootEl.render(<App />)
}