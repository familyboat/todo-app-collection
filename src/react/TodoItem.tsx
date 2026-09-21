import { AnimateView } from "motion/react-animate-view"
import { useState, useRef, useEffect } from "react"
import type { TodoRecord } from "../db"

export function TodoItem({
  todo,
  onToggle,
  onEdit,
}: {
  todo: TodoRecord
  onToggle: (value: boolean) => void
  onEdit: (content: string) => void
}) {
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
    <AnimateView
      name={'view-' + todo.id}
      transition={{ type: 'spring', bounce: 0.25, visualDuration: 0.35 }}
    >
      <li
        className="todo__item"
        aria-label={todo.completed ? '已完成待办事项' : '待办事项'}
        data-id={todo.id}
      >
      <input
        type="checkbox"
        className="todo__item__toggle"
        checked={todo.completed}
        disabled={editing}
        aria-label={todo.completed ? `标记为未完成：${todo.content}` : `完成待办事项：${todo.content}`}
        onChange={(event) => onToggle(event.target.checked)}
      />

      {!editing ? (
        <span className="todo__item__content" aria-label={`待办事项内容：${todo.content}`} aria-live="polite">
          {todo.content}
        </span>
      ) : (
        <input
          ref={inputRef}
          className="todo__item__editor"
          value={draft}
          aria-label={`编辑待办事项：${todo.content}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit()
            }
            if (event.key === 'Escape') {
              setDraft(todo.content)
              setEditing(false)
            }
          }}
        />
      )}

      <button
        type="button"
        className="todo__item__action"
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
    </AnimateView>
  )
}
