import * as db from '../db'
import { animateView } from 'motion'

type TodoRecord = db.TodoRecord

const layoutTransition = { type: 'spring', bounce: 0.2, visualDuration: 0.3 } as const

function getTodoRecord(todoItem: HTMLLIElement): TodoRecord {
  const id = todoItem.dataset.id ?? crypto.randomUUID()
  const content = (todoItem.querySelector('span.todo__item__content')?.textContent ?? '').trim()
  const createdAt = Number(todoItem.dataset.createdAt ?? Date.now())
  const modifiedAt = Number(todoItem.dataset.modifiedAt ?? Date.now())
  const statusModifiedAt = Number(todoItem.dataset.statusModifiedAt ?? Date.now())
  const completed = todoItem.dataset.completed === 'true'

  return {
    id,
    content,
    createdAt,
    modifiedAt,
    statusModifiedAt,
    completed,
  }
}

function setTodoItemData(todoItem: HTMLLIElement, record: TodoRecord): void {
  todoItem.dataset.id = record.id
  todoItem.dataset.createdAt = String(record.createdAt)
  todoItem.dataset.modifiedAt = String(record.modifiedAt)
  todoItem.dataset.statusModifiedAt = String(record.statusModifiedAt)
  todoItem.dataset.completed = String(record.completed)
}

function updateCompletedSummary(todoListCompleted: HTMLUListElement, todoListAccordionCompleted: HTMLDetailsElement, todoItemCountCompleted: HTMLElement): void {
  const count = todoListCompleted.childElementCount
  if (count === 0) {
    todoListAccordionCompleted.classList.add('hidden')
    todoItemCountCompleted.textContent = 'completed 0'
  } else {
    todoListAccordionCompleted.classList.remove('hidden')
    todoItemCountCompleted.textContent = `completed ${count}`
  }
  todoItemCountCompleted.setAttribute('aria-label', `已完成待办事项数量：${count}`)
}

function renderTodoItem(todo: TodoRecord, template: HTMLTemplateElement): HTMLLIElement {
  const todoItem = (template.content.cloneNode(true) as DocumentFragment).querySelector('li.todo__item') as HTMLLIElement

  setTodoItemData(todoItem, todo)

  const toggle = todoItem.querySelector('input.todo__item__toggle') as HTMLInputElement
  toggle.checked = todo.completed
  toggle.setAttribute('aria-label', todo.completed ? `标记为未完成：${todo.content}` : `完成待办事项：${todo.content}`)

  const content = todoItem.querySelector('span.todo__item__content') as HTMLSpanElement
  content.textContent = todo.content
  content.setAttribute('aria-label', `待办事项内容：${todo.content}`)
  content.setAttribute('aria-hidden', 'false')

  const action = todoItem.querySelector('button.todo__item__action') as HTMLButtonElement
  action.textContent = 'edit'
  action.setAttribute('aria-label', todo.completed ? '编辑已完成待办事项' : '编辑待办事项')

  const editor = todoItem.querySelector('input.todo__item__editor') as HTMLInputElement
  editor.value = todo.content
  editor.setAttribute('aria-label', todo.completed ? `编辑已完成待办事项：${todo.content}` : `编辑待办事项：${todo.content}`)
  editor.setAttribute('aria-hidden', 'true')
  editor.classList.add('hidden')

  updateTodoItemAccessibility(todoItem, todo.completed)

  return todoItem
}

function updateTodoItemAccessibility(todoItem: HTMLLIElement, isCompleted: boolean): void {
  const toggle = todoItem.querySelector('input.todo__item__toggle') as HTMLInputElement
  const content = todoItem.querySelector('span.todo__item__content') as HTMLSpanElement
  const editor = todoItem.querySelector('input.todo__item__editor') as HTMLInputElement
  const action = todoItem.querySelector('button.todo__item__action') as HTMLButtonElement

  const contentText = content.textContent ?? ''

  todoItem.setAttribute('aria-label', isCompleted ? '已完成待办事项' : '待办事项')
  toggle.setAttribute('aria-label', isCompleted ? `标记为未完成：${contentText}` : `完成待办事项：${contentText}`)
  editor.setAttribute('aria-label', isCompleted ? `编辑已完成待办事项：${contentText}` : `编辑待办事项：${contentText}`)
  action.setAttribute('aria-label', isCompleted ? '编辑已完成待办事项' : '编辑待办事项')
  content.setAttribute('aria-label', `待办事项内容：${contentText}`)
}

export function createTodo(root: HTMLElement): void {
  const form = root.querySelector('form.todo__new') as HTMLFormElement
  const todoList = root.querySelector('ul.todo__list') as HTMLUListElement
  const todoListCompleted = root.querySelector('ul.todo__list-completed') as HTMLUListElement
  const template = root.querySelector('template.todo__item__template') as HTMLTemplateElement
  const todoListAccordionCompleted = root.querySelector('details.todo__list__accordion-completed') as HTMLDetailsElement
  const todoItemCountCompleted = root.querySelector('summary.todo__item__count-completed') as HTMLElement

  function moveTodoItem(todoItem: HTMLLIElement, record: TodoRecord, completed: boolean): void {
    animateView(() => {
      const targetList = completed ? todoListCompleted : todoList
      targetList.appendChild(todoItem)
      setTodoItemData(todoItem, record)
      updateTodoItemAccessibility(todoItem, completed)
      updateCompletedSummary(todoListCompleted, todoListAccordionCompleted, todoItemCountCompleted)
    }, layoutTransition).add('#native .todo__item')
  }

  function appendTodoItem(record: TodoRecord): void {
    const todoItem = renderTodoItem(record, template)

    animateView(
      () => {
        const targetList = record.completed ? todoListCompleted : todoList
        targetList.appendChild(todoItem)
        updateCompletedSummary(todoListCompleted, todoListAccordionCompleted, todoItemCountCompleted)
      },
      layoutTransition,
)
      .add('#native .todo__item')
  }

  async function hydrateTodoList(): Promise<void> {
    await db.ensureDb()
    const records = await db.getAllTodoItems('native')

    todoList.innerHTML = ''
    todoListCompleted.innerHTML = ''

    const pendingRecords = records
      .filter((record) => !record.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)

    const completedRecords = records
      .filter((record) => record.completed)
      .sort((a, b) => a.statusModifiedAt - b.statusModifiedAt)

    pendingRecords.forEach((record) => appendTodoItem(record))
    completedRecords.forEach((record) => appendTodoItem(record))
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = new FormData(form)
    const todo = (formData.get('todo__new__editor') as string).trim()

    if (todo === '') {
      return
    }

    const now = Date.now()
    const record: TodoRecord = {
      id: crypto.randomUUID(),
      content: todo,
      createdAt: now,
      modifiedAt: now,
      statusModifiedAt: now,
      completed: false,
    }

    appendTodoItem(record)
    void db.createTodoItem('native', record)

    form.reset()
  })

  function onClick(e: PointerEvent) {
    const target = e.target as HTMLElement

    if (target.closest('button.todo__item__action')) {
      const todoItem = target.closest('li.todo__item') as HTMLLIElement
      const content = todoItem.querySelector('span.todo__item__content') as HTMLSpanElement
      const editor = todoItem.querySelector('input.todo__item__editor') as HTMLInputElement
      const action = todoItem.querySelector('button.todo__item__action') as HTMLButtonElement
      const toggle = todoItem.querySelector('input.todo__item__toggle') as HTMLInputElement

      if (action.textContent === 'edit') {
        const record = getTodoRecord(todoItem)
        editor.value = record.content
        action.textContent = 'submit'
        action.setAttribute('aria-label', '提交待办事项修改')
        content.classList.toggle('hidden')
        editor.classList.toggle('hidden')
        content.setAttribute('aria-hidden', 'true')
        editor.setAttribute('aria-hidden', 'false')
        editor.focus()
        toggle.disabled = true
        return
      }

      if (action.textContent === 'submit') {
        const todo = editor.value.trim()
        if (todo === '') {
          editor.focus()
          return
        }

        const record = getTodoRecord(todoItem)
        const updatedRecord: TodoRecord = {
          ...record,
          content: todo,
          modifiedAt: Date.now(),
        }

        content.textContent = todo
        setTodoItemData(todoItem, updatedRecord)
        updateTodoItemAccessibility(todoItem, updatedRecord.completed)
        action.textContent = 'edit'
        action.setAttribute('aria-label', updatedRecord.completed ? '编辑已完成待办事项' : '编辑待办事项')
        content.classList.toggle('hidden')
        editor.classList.toggle('hidden')
        content.setAttribute('aria-hidden', 'false')
        editor.setAttribute('aria-hidden', 'true')
        toggle.disabled = false
        void db.updateTodoItem('native', updatedRecord)
      }
    }

    if (target.closest('input.todo__item__toggle')) {
      const todoItem = target.closest('li.todo__item') as HTMLLIElement
      const record = getTodoRecord(todoItem)
      const completed = target instanceof HTMLInputElement ? target.checked : record.completed
      const nextRecord: TodoRecord = {
        ...record,
        completed,
        modifiedAt: Date.now(),
        statusModifiedAt: Date.now(),
      }

      moveTodoItem(todoItem, nextRecord, completed)
      void db.updateTodoItem('native', nextRecord)
    }
  }

  todoList.addEventListener('click', onClick)
  todoListCompleted.addEventListener('click', onClick)

  void hydrateTodoList()
}