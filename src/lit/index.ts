import './todo-item'
import { TodoApp } from './todo-app'

export function mountLitApp(root: HTMLElement): void {
  const app = new TodoApp()
  root.appendChild(app)
}