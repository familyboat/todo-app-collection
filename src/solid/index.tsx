import { For, createSignal, createEffect, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import * as db from '../db'
import type { TodoRecord } from '../db'
import { animateView } from 'motion'

const STORE_NAME = 'solid' as const

const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

function TodoItem(props: {
  todo: TodoRecord
  onToggle: (value: boolean) => void
  onEdit: (content: string) => void
}) {
  const [editing, setEditing] = createSignal(false)
  const [draft, setDraft] = createSignal(props.todo.content)
  let inputRef!: HTMLInputElement

  createEffect(() => {
    if (editing() && inputRef) {
      inputRef.focus()
      inputRef.select()
    }
  })

  const handleSubmit = () => {
    const value = draft().trim()
    if (!value) {
      setDraft(props.todo.content)
      setEditing(false)
      return
    }

    props.onEdit(value)
    setEditing(false)
  }

  return (
    <li
      class="todo__item"
      style={`view-transition-name: view-${props.todo.id}`}
      aria-label={props.todo.completed ? '已完成待办事项' : '待办事项'}
      data-id={props.todo.id}
    >
      <input
        type="checkbox"
        class="todo__item__toggle"
        checked={props.todo.completed}
        aria-label={props.todo.completed ? `标记为未完成：${props.todo.content}` : `完成待办事项：${props.todo.content}`}
        onChange={(event) => props.onToggle(event.currentTarget.checked)}
      />

      {editing() ? (
        <input
          ref={inputRef}
          class="todo__item__editor"
          value={draft()}
          aria-label={`编辑待办事项：${props.todo.content}`}
          onInput={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit()
            if (event.key === 'Escape') {
              setDraft(props.todo.content)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span class="todo__item__content" aria-label={`待办事项内容：${props.todo.content}`} aria-live="polite">
          {props.todo.content}
        </span>
      )}

      <button
        type="button"
        class="todo__item__action"
        aria-label={props.todo.completed ? '编辑已完成待办事项' : '编辑待办事项'}
        onClick={() => {
          if (editing()) {
            handleSubmit()
            return
          }
          setEditing(true)
        }}
      >
        {editing() ? 'submit' : 'edit'}
      </button>
    </li>
  )
}

export function mountSolidApp(root: HTMLElement): void {
  function App () {
  const [todos, setTodos] = createSignal<TodoRecord[]>([])
  const [inputValue, setInputValue] = createSignal('')
  let formRef!: HTMLFormElement

  const pendingTodos = () =>
    [...todos()]
      .filter((todo) => !todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)

  const completedTodos = () =>
    [...todos()]
      .filter((todo) => todo.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)

  const hasCompletedTodos = () => completedTodos().length > 0

  const hydrateTodos = async () => {
    await db.ensureDb()
    const records = await db.getAllTodoItems(STORE_NAME)
    setTodos(records)
  }

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

    animateView(() => {
      setTodos((current) => [...current, record])
    }, layoutTransition)
    void db.createTodoItem(STORE_NAME, record)
    setInputValue('')
  }

  const toggleTodo = (id: string, completed: boolean) => {
    const nextTodos = todos().map((todo) =>
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
      setTodos(nextTodos)
    }, layoutTransition)
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  const updateTodo = (id: string, content: string) => {
    const nextTodos = todos().map((todo) =>
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

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    addTodo(inputValue())
  }

  onMount(() => {
    void hydrateTodos()
  })

  return (
    <main class="todo__app" aria-label="Solid todo 应用">
      <header class="todo_header">todo app solid</header>

      <form
        ref={formRef}
        class="todo__new"
        aria-label="新增待办事项"
        onSubmit={onSubmit}
      >
        <input
          type="text"
          class="todo__new__editor"
          name="todo__new__editor"
          value={inputValue()}
          onInput={(event) => setInputValue(event.currentTarget.value)}
          placeholder="type something..."
          required
          aria-label="待办事项内容"
        />
        <button type="submit" class="todo__new__action" aria-label="添加待办事项">
          add
        </button>
      </form>

      <ul class="todo__list" aria-label="待办事项列表">
        <For each={pendingTodos()}>
          {(todo) => (
            <TodoItem
              todo={todo}
              onToggle={(completed) => toggleTodo(todo.id, completed)}
              onEdit={(content) => updateTodo(todo.id, content)}
            />
          )}
        </For>
      </ul>

      <details class={`todo__list__accordion-completed ${hasCompletedTodos() ? '' : 'hidden'}`} aria-label="已完成待办事项">
        <summary class="todo__item__count-completed" aria-live="polite" aria-label={`已完成待办事项数量：${completedTodos().length}`}>
          {`completed ${completedTodos().length}`}
        </summary>
        <ul class="todo__list-completed" aria-label="已完成待办事项列表">
          <For each={completedTodos()}>
            {(todo) => (
              <TodoItem
                todo={todo}
                onToggle={(completed) => toggleTodo(todo.id, completed)}
                onEdit={(content) => updateTodo(todo.id, content)}
              />
            )}
          </For>
        </ul>
      </details>
    </main>
  )
  }

  render(() => <App />, root)
}