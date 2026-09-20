import { render } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import * as db from '../db'
import type { TodoRecord } from '../db'
import { animateView } from 'motion'

const STORE_NAME = 'preact' as const

const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

type TodoItemProps = {
  todo: TodoRecord
  onToggle: (value: boolean) => void
  onEdit: (content: string) => void
  onDelete?: () => void
}

function TodoItem({ todo, onToggle, onEdit }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.content)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleSubmit = () => {
    const nextContent = draft.trim()
    if (!nextContent) {
      setDraft(todo.content)
      setEditing(false)
      return
    }

    onEdit(nextContent)
    setEditing(false)
  }

  return (
    <li
      class="todo__item"
      style={{ viewTransitionName: 'view-' + todo.id }}
      aria-label={todo.completed ? '已完成待办事项' : '待办事项'}
      data-id={todo.id}
    >
      <input
        type="checkbox"
        class="todo__item__toggle"
        checked={todo.completed}
        disabled={editing}
        aria-label={todo.completed ? `标记为未完成：${todo.content}` : `完成待办事项：${todo.content}`}
        onChange={(event) => onToggle((event.target as HTMLInputElement).checked)}
      />

      {!editing ? (
        <span class="todo__item__content" aria-label={`待办事项内容：${todo.content}`} aria-live="polite">
          {todo.content}
        </span>
      ) : (
        <input
          ref={inputRef}
          class="todo__item__editor"
          value={draft}
          aria-label={`编辑待办事项：${todo.content}`}
          onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
          onKeyDown={(event) => {
            if ((event as KeyboardEvent).key === 'Enter') {
              handleSubmit()
            }
            if ((event as KeyboardEvent).key === 'Escape') {
              setDraft(todo.content)
              setEditing(false)
            }
          }}
        />
      )}

      <button
        type="button"
        class="todo__item__action"
        aria-label={todo.completed ? '编辑已完成待办事项' : '编辑待办事项'}
        onClick={() => {
          if (editing) {
            handleSubmit()
            return
          }
          setEditing(true)
        }}
      >
        {editing ? 'submit' : 'edit'}
      </button>
    </li>
  )
}

function PreactTodoApp() {
  const [todos, setTodos] = useState<TodoRecord[]>([])
  const formInputRef = useRef<HTMLInputElement | null>(null)

  const pendingTodos = useMemo(
    () => todos.filter((todo) => !todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
    [todos],
  )
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
    [todos],
  )
  const hasCompletedTodos = completedTodos.length > 0

  useEffect(() => {
    void (async () => {
      await db.ensureDb()
      const records = await db.getAllTodoItems(STORE_NAME)
      setTodos(records)
    })()
  }, [])

  const addTodo = (content: string) => {
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

    const nextTodos = [...todos, record]
    animateView(() => setTodos(nextTodos), layoutTransition)
    void db.createTodoItem(STORE_NAME, record)
    formInputRef.current?.focus()
  }

  const toggleTodo = (id: string, completed: boolean) => {
    const nextTodos = todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed,
            modifiedAt: Date.now(),
            statusModifiedAt: Date.now(),
          }
        : todo,
    )

    animateView(() => setTodos(nextTodos), layoutTransition)
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  const updateTodo = (id: string, content: string) => {
    const nextTodos = todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            content,
            modifiedAt: Date.now(),
          }
        : todo,
    )

    setTodos(nextTodos)
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  return (
    <main class="todo__app" aria-label="Preact todo 应用">
      <header class="todo_header">todo app preact</header>

      <form
        class="todo__new"
        aria-label="新增待办事项"
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget as HTMLFormElement
          const input = form.querySelector('input[name="todo__new__editor"]') as HTMLInputElement | null
          addTodo(input?.value ?? '')
          form.reset()
        }}
      >
        <input
          ref={formInputRef}
          type="text"
          class="todo__new__editor"
          name="todo__new__editor"
          placeholder="type something..."
          required
          aria-label="待办事项内容"
        />
        <button type="submit" class="todo__new__action" aria-label="添加待办事项">
          add
        </button>
      </form>

      <ul class="todo__list" aria-label="待办事项列表">
        {pendingTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={(completed) => toggleTodo(todo.id, completed)}
            onEdit={(content) => updateTodo(todo.id, content)}
          />
        ))}
      </ul>

      <details
        class={`todo__list__accordion-completed ${hasCompletedTodos ? '' : 'hidden'}`}
        aria-label="已完成待办事项"
      >
        <summary class="todo__item__count-completed" aria-live="polite" aria-label={`已完成待办事项数量：${completedTodos.length}`}>
          {`completed ${completedTodos.length}`}
        </summary>
        <ul class="todo__list-completed" aria-label="已完成待办事项列表">
          {completedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={(completed) => toggleTodo(todo.id, completed)}
              onEdit={(content) => updateTodo(todo.id, content)}
            />
          ))}
        </ul>
      </details>
    </main>
  )
}

export function mountPreactApp(root: HTMLElement): void {
  render(<PreactTodoApp />, root)
}
