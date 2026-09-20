<script lang="ts">
  import type { TodoRecord } from '../db'

  let {
    todo,
    onToggle,
    onEdit,
  }: {
    todo: TodoRecord
    onToggle: (value: boolean) => void
    onEdit: (content: string) => void
  } = $props()

  let editing = $state(false)
  let draft = $state('')
  let input = $state<HTMLInputElement>()

  $effect(() => {
    if (editing) {
      input?.focus()
      input?.select()
    }
  })

  const handleToggle = (event: Event) => {
    onToggle((event.currentTarget as HTMLInputElement).checked)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit()
    }
    if (event.key === 'Escape') {
      draft = todo.content
      editing = false
    }
  }

  const handleSubmit = () => {
    const value = draft.trim()
    if (!value) {
      draft = todo.content
      editing = false
      return
    }

    onEdit(value)
    editing = false
  }

  const handleAction = () => {
    if (editing) {
      handleSubmit()
      return
    }
    draft = todo.content
    editing = true
  }
</script>

<li
  class="todo__item"
  style="view-transition-name: view-{todo.id}"
  aria-label={todo.completed ? '已完成待办事项' : '待办事项'}
  data-id={todo.id}
>
  <input
    type="checkbox"
    class="todo__item__toggle"
    checked={todo.completed}
    disabled={editing}
    aria-label={todo.completed ? `标记为未完成：${todo.content}` : `完成待办事项：${todo.content}`}
    onchange={handleToggle}
  />

  {#if !editing}
    <span
      class="todo__item__content"
      aria-label={`待办事项内容：${todo.content}`}
      aria-live="polite"
    >
      {todo.content}
    </span>
  {:else}
    <input
      bind:this={input}
      class="todo__item__editor"
      aria-label={`编辑待办事项：${todo.content}`}
      bind:value={draft}
      onkeydown={handleKeyDown}
    />
  {/if}

  <button
    type="button"
    class="todo__item__action"
    aria-label={todo.completed ? '编辑已完成待办事项' : '编辑待办事项'}
    onclick={handleAction}
  >
    {editing ? 'submit' : 'edit'}
  </button>
</li>