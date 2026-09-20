<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { TodoRecord } from '../db'

const props = defineProps<{
  todo: TodoRecord
  onToggle: (value: boolean) => void
  onEdit: (content: string) => void
}>()

const editing = ref(false)
const draft = ref(props.todo.content)
const inputRef = ref<HTMLInputElement | null>(null)

watch(editing, async (value) => {
  if (value) {
    await nextTick()
    inputRef.value?.focus()
  }
})

const handleToggle = (event: Event) => {
  props.onToggle((event.target as HTMLInputElement).checked)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSubmit()
  }
  if (event.key === 'Escape') {
    draft.value = props.todo.content
    editing.value = false
  }
}

const handleSubmit = () => {
  const value = draft.value.trim()
  if (!value) {
    draft.value = props.todo.content
    editing.value = false
    return
  }

  props.onEdit(value)
  editing.value = false
}

const handleAction = () => {
  if (editing.value) {
    handleSubmit()
    return
  }
  editing.value = true
}
</script>

<template>
  <li
    class="todo__item"
    :style="{ viewTransitionName: 'view-' + todo.id }"
    :aria-label="todo.completed ? '已完成待办事项' : '待办事项'"
    :data-id="todo.id"
  >
    <input
      type="checkbox"
      class="todo__item__toggle"
      :checked="todo.completed"
      :disabled="editing"
      :aria-label="todo.completed ? `标记为未完成：${todo.content}` : `完成待办事项：${todo.content}`"
      @change="handleToggle"
    />

    <span
      v-if="!editing"
      class="todo__item__content"
      :aria-label="`待办事项内容：${todo.content}`"
      aria-live="polite"
    >
      {{ todo.content }}
    </span>
    <input
      v-else
      ref="inputRef"
      class="todo__item__editor"
      :aria-label="`编辑待办事项：${todo.content}`"
      v-model="draft"
      @keydown="handleKeyDown"
    />

    <button
      type="button"
      class="todo__item__action"
      :aria-label="todo.completed ? '编辑已完成待办事项' : '编辑待办事项'"
      @click="handleAction"
    >
      {{ editing ? 'submit' : 'edit' }}
    </button>
  </li>
</template>