<script lang="ts">
  import { onMount } from 'svelte'
  import * as db from '../db'
  import type { TodoRecord } from '../db'
  import { animateView } from 'motion'
  import TodoItem from './TodoItem.svelte'

  const STORE_NAME = 'svelte'

  const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

  let todos: TodoRecord[] = $state([])
  let inputValue = $state('')
  let form: HTMLFormElement

  const pendingTodos = $derived(
    todos.filter((todo) => !todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
  )

  const completedTodos = $derived(
    todos.filter((todo) => todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
  )

  const hasCompletedTodos = $derived(completedTodos.length > 0)

  const hydrateTodos = async () => {
    await db.ensureDb()
    const records = await db.getAllTodoItems(STORE_NAME)
    todos = records
  }

  onMount(() => {
    void hydrateTodos()
  })

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
      todos = [...todos, record]
    }, layoutTransition)
    void db.createTodoItem(STORE_NAME, record)
    inputValue = ''
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

    animateView(() => {
      todos = nextTodos
    }, layoutTransition)
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

    todos = nextTodos
    const target = nextTodos.find((todo) => todo.id === id)
    if (target) {
      void db.updateTodoItem(STORE_NAME, target)
    }
  }

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    addTodo(inputValue)
  }
</script>

<main class="todo__app" aria-label="Svelte todo 应用">
  <header class="todo_header">todo app svelte</header>

  <form bind:this={form} class="todo__new" aria-label="新增待办事项" onsubmit={onSubmit}>
    <input
      type="text"
      class="todo__new__editor"
      name="todo__new__editor"
      bind:value={inputValue}
      placeholder="type something..."
      required
      aria-label="待办事项内容"
    />
    <button type="submit" class="todo__new__action" aria-label="添加待办事项">
      add
    </button>
  </form>

  <ul class="todo__list" aria-label="待办事项列表">
    {#each pendingTodos as todo (todo.id)}
      <TodoItem
        {todo}
        onToggle={(value) => toggleTodo(todo.id, value)}
        onEdit={(content) => updateTodo(todo.id, content)}
      />
    {/each}
  </ul>

  <details
    class="todo__list__accordion-completed"
    class:hidden={!hasCompletedTodos}
    aria-label="已完成待办事项"
  >
    <summary
      class="todo__item__count-completed"
      aria-live="polite"
      aria-label={`已完成待办事项数量：${completedTodos.length}`}
    >
      completed {completedTodos.length}
    </summary>
    <ul class="todo__list-completed" aria-label="已完成待办事项列表">
      {#each completedTodos as todo (todo.id)}
        <TodoItem
          {todo}
          onToggle={(value) => toggleTodo(todo.id, value)}
          onEdit={(content) => updateTodo(todo.id, content)}
        />
      {/each}
    </ul>
  </details>
</main>