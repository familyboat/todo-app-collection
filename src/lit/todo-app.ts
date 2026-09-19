import { LitElement, html } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import * as db from '../db'
import type { TodoRecord } from '../db'
import { animateView } from 'motion'
import './todo-item'

const STORE_NAME = 'lit'

const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

export class TodoApp extends LitElement {
  static properties = {
    todos: { state: true },
    inputValue: { state: true },
  }

  constructor() {
    super()
    this.todos = []
    this.inputValue = ''
  }

  declare todos: TodoRecord[]
  declare inputValue: string

  get pendingTodos(): TodoRecord[] {
    return this.todos
      .filter((todo) => !todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)
  }

  get completedTodos(): TodoRecord[] {
    return this.todos
      .filter((todo) => todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)
  }

  get hasCompletedTodos(): boolean {
    return this.completedTodos.length > 0
  }

  createRenderRoot(): HTMLElement {
    return this
  }

  firstUpdated(): void {
    void this.hydrateTodos()
  }

  private async hydrateTodos(): Promise<void> {
    await db.ensureDb()
    const records = await db.getAllTodoItems(STORE_NAME)
    this.todos = records
  }

  private addTodo = (content: string) => {
    const value = content.trim()
    if (!value) return

    const now = Date.now()
    const record: TodoRecord = {
      id: crypto.randomUUID(),
      content: value,
      createdAt: now,
      modifiedAt: now,
      statusModifiedAt: now,
      completed: false,
    }

    animateView(() => {
      this.todos = [...this.todos, record]
    }, layoutTransition)
    void db.createTodoItem(STORE_NAME, record)
    this.inputValue = ''
  }

  private toggleTodo = (id: string, completed: boolean) => {
    const nextTodos = this.todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed,
            modifiedAt: Date.now(),
            statusModifiedAt: Date.now(),
          }
        : todo,
    )

    animateView(() => {
      this.todos = nextTodos
    }, layoutTransition)
    const targetRecord = nextTodos.find((todo) => todo.id === id)
    if (targetRecord) {
      void db.updateTodoItem(STORE_NAME, targetRecord)
    }
  }

  private updateTodo = (id: string, content: string) => {
    const nextTodos = this.todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            content,
            modifiedAt: Date.now(),
          }
        : todo,
    )

    this.todos = nextTodos
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  private handleSubmit = (event: Event) => {
    event.preventDefault()
    this.addTodo(this.inputValue)
  }

  private handleNewInput = (event: Event) => {
    this.inputValue = (event.currentTarget as HTMLInputElement).value
  }

  render() {
    return html`
      <main class="todo__app" aria-label="Lit todo 应用">
        <header class="todo_header">todo app lit</header>

        <form
          class="todo__new"
          aria-label="新增待办事项"
          @submit="${this.handleSubmit}"
        >
          <input
            type="text"
            class="todo__new__editor"
            name="todo__new__editor"
            .value="${this.inputValue}"
            @input="${this.handleNewInput}"
            placeholder="type something..."
            required
            aria-label="待办事项内容"
          />
          <button type="submit" class="todo__new__action" aria-label="添加待办事项">
            add
          </button>
        </form>

        <ul class="todo__list" aria-label="待办事项列表">
          ${repeat(
            this.pendingTodos,
            (todo) => todo.id,
            (todo) =>
              html`<todo-item
                .todo="${todo}"
                .onToggle="${(completed: boolean) => this.toggleTodo(todo.id, completed)}"
                .onEdit="${(content: string) => this.updateTodo(todo.id, content)}"
              ></todo-item>`,
          )}
        </ul>

        <details
          class="todo__list__accordion-completed ${this.hasCompletedTodos ? '' : 'hidden'}"
          aria-label="已完成待办事项"
        >
          <summary
            class="todo__item__count-completed"
            aria-live="polite"
            aria-label="${`已完成待办事项数量：${this.completedTodos.length}`}"
          >
            completed ${this.completedTodos.length}
          </summary>
          <ul class="todo__list-completed" aria-label="已完成待办事项列表">
            ${repeat(
              this.completedTodos,
              (todo) => todo.id,
              (todo) =>
                html`<todo-item
                  .todo="${todo}"
                  .onToggle="${(completed: boolean) => this.toggleTodo(todo.id, completed)}"
                  .onEdit="${(content: string) => this.updateTodo(todo.id, content)}"
                ></todo-item>`,
            )}
          </ul>
        </details>
      </main>
    `
  }
}

customElements.define('todo-app', TodoApp)