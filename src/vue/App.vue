<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { animateView } from 'motion'
import * as db from '../db'
import type { TodoRecord } from '../db'
import TodoItem from './TodoItem.vue'

const STORE_NAME = 'vue' as const

const layoutTransition = { type: 'spring', bounce: 0.25, visualDuration: 0.35 } as const

const todos = ref<TodoRecord[]>([])
const inputValue = ref('')
const formRef = ref<HTMLFormElement | null>(null)

const pendingTodos = computed(() =>
  todos.value.filter((todo) => !todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
)

const completedTodos = computed(() =>
  todos.value.filter((todo) => todo.completed).sort((a, b) => a.statusModifiedAt - b.statusModifiedAt),
)

const hasCompletedTodos = computed(() => completedTodos.value.length > 0)

onMounted(async () => {
  await db.ensureDb()
  const records = await db.getAllTodoItems(STORE_NAME)
  todos.value = records
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

  void animateView(() => {
    todos.value = [...todos.value, record]
  }, layoutTransition)
  void db.createTodoItem(STORE_NAME, record)
  inputValue.value = ''
  formRef.value?.focus()
}

const toggleTodo = (id: string, completed: boolean) => {
  const nextTodos = todos.value.map((todo) =>
    todo.id === id
      ? {
          ...todo,
          completed,
          modifiedAt: Date.now(),
          statusModifiedAt: Date.now(),
        }
      : todo,
  )

  void animateView(() => {
    todos.value = nextTodos
  }, layoutTransition)
  const target = nextTodos.find((todo) => todo.id === id)
  if (target) {
    void db.updateTodoItem(STORE_NAME, target)
  }
}

const updateTodo = (id: string, content: string) => {
  const nextTodos = todos.value.map((todo) =>
    todo.id === id
      ? {
          ...todo,
          content,
          modifiedAt: Date.now(),
        }
      : todo,
  )

  todos.value = nextTodos
  const target = nextTodos.find((todo) => todo.id === id)
  if (target) {
    void db.updateTodoItem(STORE_NAME, target)
  }
}

const onSubmit = (event: Event) => {
  event.preventDefault()
  addTodo(inputValue.value)
}
</script>

<template>
  <main class="todo__app" aria-label="Vue todo 应用">
    <header class="todo_header">todo app vue</header>

    <form
      ref="formRef"
      class="todo__new"
      aria-label="新增待办事项"
      @submit="onSubmit"
    >
      <input
        type="text"
        class="todo__new__editor"
        name="todo__new__editor"
        v-model="inputValue"
        placeholder="type something..."
        required
        aria-label="待办事项内容"
      />
      <button type="submit" class="todo__new__action" aria-label="添加待办事项">
        add
      </button>
    </form>

    <ul class="todo__list" aria-label="待办事项列表">
        <TodoItem
          v-for="todo in pendingTodos"
          :key="todo.id"
          :todo="todo"
          :on-toggle="(value) => toggleTodo(todo.id, value)"
          :on-edit="(content) => updateTodo(todo.id, content)"
        />
      </ul>

      <details
        class="todo__list__accordion-completed"
        :class="hasCompletedTodos ? '' : 'hidden'"
        aria-label="已完成待办事项"
      >
        <summary
          class="todo__item__count-completed"
          aria-live="polite"
          :aria-label="`已完成待办事项数量：${completedTodos.length}`"
        >
          {{ `completed ${completedTodos.length}` }}
        </summary>
        <ul class="todo__list-completed" aria-label="已完成待办事项列表">
          <TodoItem
            v-for="todo in completedTodos"
            :key="todo.id"
            :todo="todo"
            :on-toggle="(value) => toggleTodo(todo.id, value)"
            :on-edit="(content) => updateTodo(todo.id, content)"
          />
        </ul>
      </details>
  </main>
</template>