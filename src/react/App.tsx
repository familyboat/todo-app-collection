import { useState, useRef, useMemo, useEffect, startTransition } from "react"
import type { TodoRecord } from "../db"
import * as db from '../db'
import { TodoItem } from "./TodoItem"

const STORE_NAME = 'react' as const

export function App () {
    const [todos, setTodos] = useState<TodoRecord[]>([])
    const [inputValue, setInputValue] = useState('')
    const formRef = useRef<HTMLFormElement | null>(null)

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

      startTransition(() => {
        setTodos([...todos, record])
      })

      void db.createTodoItem(STORE_NAME, record)
      setInputValue('')
      formRef.current?.focus()
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

      startTransition(() => {
        setTodos(nextTodos)
      })

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
      <main className="todo__app" aria-label="React todo 应用">
        <header className="todo_header">todo app react</header>

        <form
          ref={formRef}
          className="todo__new"
          aria-label="新增待办事项"
          onSubmit={(event) => {
            event.preventDefault()
            addTodo(inputValue)
          }}
        >
          <input
            type="text"
            className="todo__new__editor"
            name="todo__new__editor"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="type something..."
            required
            aria-label="待办事项内容"
          />
          <button type="submit" className="todo__new__action" aria-label="添加待办事项">
            add
          </button>
        </form>

        <ul className="todo__list" aria-label="待办事项列表">
            {pendingTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={(completed) => toggleTodo(todo.id, completed)}
                onEdit={(content) => updateTodo(todo.id, content)}
              />
            ))}
          </ul>

          <details className={`todo__list__accordion-completed ${hasCompletedTodos ? '' : 'hidden'}`} aria-label="已完成待办事项">
            <summary className="todo__item__count-completed" aria-live="polite" aria-label={`已完成待办事项数量：${completedTodos.length}`}>
              {`completed ${completedTodos.length}`}
            </summary>
            <ul className="todo__list-completed" aria-label="已完成待办事项列表">
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