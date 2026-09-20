import { test, expect, type Locator, type Page } from '@playwright/test'
import type { TodoRecord } from '../src/db'

const FRAMEWORKS = [
  { id: 'native', label: 'Native', editShortcuts: false },
  { id: 'react', label: 'React', editShortcuts: true },
  { id: 'preact', label: 'Preact', editShortcuts: true },
  { id: 'vue', label: 'Vue', editShortcuts: true },
  { id: 'svelte', label: 'Svelte', editShortcuts: true },
  { id: 'lit', label: 'Lit', editShortcuts: true },
  { id: 'solid', label: 'Solid', editShortcuts: true },
  { id: 'angular', label: 'Angular', editShortcuts: true },
] as const

type Framework = (typeof FRAMEWORKS)[number]

function appRoot(page: Page, id: string) {
  const root = page.locator(`#${id} .todo__app`)
  return {
    root,
    newEditor: root.locator('input.todo__new__editor'),
    newAction: root.locator('button.todo__new__action'),
    pendingList: root.locator('ul.todo__list'),
    completedList: root.locator('ul.todo__list-completed'),
    accordion: root.locator('details.todo__list__accordion-completed'),
    summary: root.locator('summary.todo__item__count-completed'),
  }
}

function itemParts(item: Locator) {
  return {
    toggle: item.locator('input.todo__item__toggle'),
    content: item.locator('span.todo__item__content'),
    editor: item.locator('input.todo__item__editor'),
    action: item.locator('button.todo__item__action'),
  }
}

async function waitForAnimations(page: Page) {
  await page.waitForFunction(
    () => !document.getAnimations().some((animation) => animation.playState === 'running'),
  )
}

async function dbGetRecords(page: Page, store: string): Promise<TodoRecord[]> {
  return page.evaluate(
    (storeName) =>
      new Promise<TodoRecord[]>((resolve, reject) => {
        const request = indexedDB.open('todo-app')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(storeName, 'readonly')
          const getAll = transaction.objectStore(storeName).getAll()
          getAll.onsuccess = () => resolve(getAll.result as TodoRecord[])
          getAll.onerror = () => reject(getAll.error)
        }
      }),
    store,
  )
}

async function addTodo(page: Page, framework: Framework, content: string): Promise<Locator> {
  const app = appRoot(page, framework.id)
  await app.newEditor.fill(content)
  await app.newAction.click()
  await waitForAnimations(page)
  return app.pendingList.locator('li.todo__item')
}

for (const framework of FRAMEWORKS) {
  test.describe(`todo app — ${framework.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
    })

    test('loads with an empty pending list and hidden completed section', async ({ page }) => {
      const app = appRoot(page, framework.id)
      await expect(app.pendingList.locator('li.todo__item')).toHaveCount(0)
      await expect(app.completedList.locator('li.todo__item')).toHaveCount(0)
      await expect(app.accordion).toBeHidden()
    })

    test('adds a todo via the add button', async ({ page }) => {
      const app = appRoot(page, framework.id)
      const item = await addTodo(page, framework, 'write e2e tests')
      await expect(item).toHaveCount(1)
      await expect(itemParts(item).content).toHaveText('write e2e tests')
      await expect(app.newEditor).toHaveValue('')
    })

    test('adds a todo by pressing Enter', async ({ page }) => {
      const app = appRoot(page, framework.id)
      await app.newEditor.fill('press enter')
      await app.newEditor.press('Enter')
      const item = app.pendingList.locator('li.todo__item')
      await expect(item).toHaveCount(1)
      await expect(itemParts(item).content).toHaveText('press enter')
    })

    test('ignores whitespace-only input', async ({ page }) => {
      const app = appRoot(page, framework.id)
      await app.newEditor.fill('   ')
      await app.newAction.click()
      await expect(app.pendingList.locator('li.todo__item')).toHaveCount(0)
    })

    test('completes a todo and updates the completed section', async ({ page }) => {
      const app = appRoot(page, framework.id)
      const item = await addTodo(page, framework, 'finish project')
      await itemParts(item).toggle.click()
      await waitForAnimations(page)
      await expect(app.pendingList.locator('li.todo__item')).toHaveCount(0)
      const completed = app.completedList.locator('li.todo__item')
      await expect(completed).toHaveCount(1)
      await expect(itemParts(completed).content).toHaveText('finish project')
      await expect(app.accordion).toBeVisible()
      await expect(app.summary).toHaveText('completed 1')
    })

    test('uncompletes a todo and moves it back to pending', async ({ page }) => {
      const app = appRoot(page, framework.id)
      const item = await addTodo(page, framework, 'one')
      await itemParts(item).toggle.click()
      await waitForAnimations(page)
      const completed = app.completedList.locator('li.todo__item')
      await expect(completed).toHaveCount(1)
      await app.summary.click()
      await itemParts(completed).toggle.click()
      await waitForAnimations(page)
      await expect(app.completedList.locator('li.todo__item')).toHaveCount(0)
      const pending = app.pendingList.locator('li.todo__item')
      await expect(pending).toHaveCount(1)
      await expect(itemParts(pending).content).toHaveText('one')
      await expect(app.accordion).toBeHidden()
      await expect(app.summary).toHaveText('completed 0')
    })

    test('edits a todo and submits via the button', async ({ page }) => {
      const app = appRoot(page, framework.id)
      const item = await addTodo(page, framework, 'before edit')
      const parts = itemParts(item)

      await parts.action.click()
      await expect(parts.editor).toBeVisible()
      await expect(parts.content).toBeHidden()
      await expect(parts.action).toHaveText('submit')

      await parts.editor.fill('after edit')
      await parts.action.click()
      await expect(parts.content).toBeVisible()
      await expect(parts.content).toHaveText('after edit')
      await expect(parts.editor).toBeHidden()
      await expect(parts.action).toHaveText('edit')
      await expect(app.summary).toHaveText('completed 0')
    })

    test('submits an edit by pressing Enter', async ({ page }) => {
      test.skip(!framework.editShortcuts, '编辑器内不支持回车提交')
      const item = await addTodo(page, framework, 'old text')
      const parts = itemParts(item)
      await parts.action.click()
      await parts.editor.fill('new text')
      await parts.editor.press('Enter')
      await expect(parts.content).toBeVisible()
      await expect(parts.content).toHaveText('new text')
      await expect(parts.action).toHaveText('edit')
    })

    test('cancels editing with Escape', async ({ page }) => {
      test.skip(!framework.editShortcuts, '编辑器内不支持 Escape 取消')
      const item = await addTodo(page, framework, 'keep me')
      const parts = itemParts(item)
      await parts.action.click()
      await parts.editor.fill('discard me')
      await parts.editor.press('Escape')
      await expect(parts.content).toBeVisible()
      await expect(parts.content).toHaveText('keep me')
      await expect(parts.action).toHaveText('edit')
    })

    test('disables the toggle while editing and re-enables it on submit', async ({ page }) => {
      const item = await addTodo(page, framework, 'guard toggling')
      const parts = itemParts(item)

      await expect(parts.toggle).toBeEnabled()
      await parts.action.click()
      await expect(parts.toggle).toBeDisabled()
      await parts.action.click()
      await expect(parts.toggle).toBeEnabled()
    })

    test('re-enables the toggle when editing is cancelled with Escape', async ({ page }) => {
      test.skip(!framework.editShortcuts, '编辑器内不支持 Escape 取消')
      const item = await addTodo(page, framework, 'guard toggling')
      const parts = itemParts(item)
      await parts.action.click()
      await expect(parts.toggle).toBeDisabled()
      await parts.editor.press('Escape')
      await expect(parts.toggle).toBeEnabled()
    })

    test('focuses the editor without selecting its text', async ({ page }) => {
      const item = await addTodo(page, framework, 'do not select me')
      const parts = itemParts(item)
      await parts.action.click()
      await expect(parts.editor).toBeFocused()
      const [selectionStart, selectionEnd] = await parts.editor.evaluate(
        (el: HTMLInputElement) => [el.selectionStart, el.selectionEnd],
      )
      expect(selectionStart).toBeGreaterThanOrEqual(0)
      expect(selectionEnd).toBe(selectionStart)
    })

    test('persists todos across a page reload', async ({ page }) => {
      const app = appRoot(page, framework.id)
      const item = await addTodo(page, framework, 'persist me')
      await itemParts(item).toggle.click()
      await waitForAnimations(page)
      await expect
        .poll(() => dbGetRecords(page, framework.id), { timeout: 5000 })
        .toMatchObject([{ content: 'persist me', completed: true }])

      await page.reload()

      const pending = app.pendingList.locator('li.todo__item')
      const completed = app.completedList.locator('li.todo__item')
      await expect(pending).toHaveCount(0)
      await expect(completed).toHaveCount(1)
      await expect(itemParts(completed).content).toHaveText('persist me')
      await expect(app.accordion).toBeVisible()
      await expect(app.summary).toHaveText('completed 1')
    })
  })
}