import { LitElement, html } from 'lit'
import type { PropertyValues } from 'lit'
import type { TodoRecord } from '../db'

export class TodoItem extends LitElement {
  static properties = {
    todo: { type: Object },
    onToggle: { attribute: false },
    onEdit: { attribute: false },
    editing: { state: true },
    draft: { state: true },
  }

  constructor() {
    super()
    this.editing = false
    this.draft = ''
    this.onToggle = () => {}
    this.onEdit = () => {}
  }

  declare todo: TodoRecord
  declare onToggle: (value: boolean) => void
  declare onEdit: (content: string) => void
  declare editing: boolean
  declare draft: string

  createRenderRoot(): HTMLElement {
    return this
  }

  updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('editing') && this.editing) {
      const input = this.querySelector('input.todo__item__editor') as HTMLInputElement | null
      input?.focus()
      input?.select()
    }
  }

  private handleToggle = (event: Event) => {
    this.onToggle((event.currentTarget as HTMLInputElement).checked)
  }

  private handleDraftInput = (event: Event) => {
    this.draft = (event.currentTarget as HTMLInputElement).value
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      this.submit()
    }
    if (event.key === 'Escape') {
      this.draft = this.todo.content
      this.editing = false
    }
  }

  private submit = () => {
    const value = this.draft.trim()
    if (!value) {
      this.draft = this.todo.content
      this.editing = false
      return
    }

    this.onEdit(value)
    this.editing = false
  }

  private handleAction = () => {
    if (this.editing) {
      this.submit()
      return
    }
    this.draft = this.todo.content
    this.editing = true
  }

  render() {
    return html`
      <li
        class="todo__item"
        style="view-transition-name: view-${this.todo.id}"
        aria-label="${this.todo.completed ? '已完成待办事项' : '待办事项'}"
        data-id="${this.todo.id}"
      >
        <input
          type="checkbox"
          class="todo__item__toggle"
          .checked="${this.todo.completed}"
          aria-label="${this.todo.completed ? `标记为未完成：${this.todo.content}` : `完成待办事项：${this.todo.content}`}"
          @change="${this.handleToggle}"
        />

        ${this.editing
          ? html`
              <input
                class="todo__item__editor"
                aria-label="${`编辑待办事项：${this.todo.content}`}"
                .value="${this.draft}"
                @input="${this.handleDraftInput}"
                @keydown="${this.handleKeyDown}"
              />
            `
          : html`
              <span
                class="todo__item__content"
                aria-label="${`待办事项内容：${this.todo.content}`}"
                aria-live="polite"
              >
                ${this.todo.content}
              </span>
            `}

        <button
          type="button"
          class="todo__item__action"
          aria-label="${this.todo.completed ? '编辑已完成待办事项' : '编辑待办事项'}"
          @click="${this.handleAction}"
        >
          ${this.editing ? 'submit' : 'edit'}
        </button>
      </li>
    `
  }
}

customElements.define('todo-item', TodoItem)