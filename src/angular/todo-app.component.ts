import { ApplicationRef, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core'
import { animateView } from 'motion'
import * as db from '../db'
import type { TodoRecord } from '../db'
import { TodoItemComponent } from './todo-item.component'

const STORE_NAME = 'angular'

const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

@Component({
  selector: 'angular-todo-app',
  standalone: true,
  imports: [TodoItemComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <main class="todo__app" aria-label="Angular todo 应用">
      <header class="todo_header">todo app angular</header>

      <form class="todo__new" aria-label="新增待办事项" (submit)="onSubmit($event)">
        <input
          type="text"
          class="todo__new__editor"
          name="todo__new__editor"
          [value]="inputValue()"
          (input)="onNewInput($event)"
          placeholder="type something..."
          required
          aria-label="待办事项内容"
        />
        <button type="submit" class="todo__new__action" aria-label="添加待办事项">add</button>
      </form>

      <ul class="todo__list" aria-label="待办事项列表">
        @for (todo of pendingTodos(); track todo.id) {
          <angular-todo-item [todo]="todo" [onToggle]="onToggleFor(todo.id)" [onEdit]="onEditFor(todo.id)" />
        }
      </ul>

      <details
        class="todo__list__accordion-completed"
        [class.hidden]="!hasCompletedTodos()"
        aria-label="已完成待办事项"
      >
        <summary
          class="todo__item__count-completed"
          aria-live="polite"
          [attr.aria-label]="'已完成待办事项数量：' + completedTodos().length"
        >completed {{ completedTodos().length }}</summary>
        <ul class="todo__list-completed" aria-label="已完成待办事项列表">
          @for (todo of completedTodos(); track todo.id) {
            <angular-todo-item [todo]="todo" [onToggle]="onToggleFor(todo.id)" [onEdit]="onEditFor(todo.id)" />
          }
        </ul>
      </details>
    </main>
  `,
})
export class TodoAppComponent {
  todos = signal<TodoRecord[]>([])
  inputValue = signal('')

  private readonly appRef = inject(ApplicationRef)

  readonly pendingTodos = computed(() =>
    this.todos()
      .filter((todo) => !todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
  )

  readonly completedTodos = computed(() =>
    this.todos()
      .filter((todo) => todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
  )

  readonly hasCompletedTodos = computed(() => this.completedTodos().length > 0)

  constructor() {
    void this.hydrate()
  }

  private async hydrate(): Promise<void> {
    await db.ensureDb()
    const records = await db.getAllTodoItems(STORE_NAME)
    this.todos.set(records)
  }

  onNewInput(event: Event) {
    this.inputValue.set((event.target as HTMLInputElement).value)
  }

  onSubmit(event: Event) {
    event.preventDefault()
    this.addTodo(this.inputValue())
  }

  addTodo(content: string) {
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
      this.todos.update((current) => [...current, record])
      this.appRef.tick()
    }, layoutTransition)
    void db.createTodoItem(STORE_NAME, record)
    this.inputValue.set('')
  }

  toggleTodo(id: string, completed: boolean) {
    const nextTodos = this.todos().map((todo) =>
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
      this.todos.set(nextTodos)
      this.appRef.tick()
    }, layoutTransition)
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  updateTodo(id: string, content: string) {
    const nextTodos = this.todos().map((todo) =>
      todo.id === id
        ? {
            ...todo,
            content,
            modifiedAt: Date.now(),
          }
        : todo,
    )

    this.todos.set(nextTodos)
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  onToggleFor = (id: string) => (value: boolean) => this.toggleTodo(id, value)
  onEditFor = (id: string) => (content: string) => this.updateTodo(id, content)
}