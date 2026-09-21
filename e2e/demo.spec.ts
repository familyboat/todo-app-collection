import { test, expect } from '@playwright/test'

test('demo: manually step through the todo flow', async ({ page }) => {
  test.skip(!process.env.DEMO, '设置 DEMO=1 才运行此用例')
  await page.goto('/')
  const app = page.locator('#react .todo__app')

  // 运行到这里会暂停，弹出 Playwright Inspector。
  // 可点击 Step Over / Resume 逐步观察，也可直接在浏览器里手动操作。
  await page.pause()

  await app.locator('input.todo__new__editor').fill('watch me')
  await app.locator('button.todo__new__action').click()

  const item = app.locator('ul.todo__list li.todo__item')
  await expect(item).toHaveCount(1)
  await item.locator('input.todo__item__toggle').click()

  await expect(app.locator('summary.todo__item__count-completed')).toHaveText('completed 1')
  await expect(app.locator('details.todo__list__accordion-completed')).not.toHaveClass(/hidden/)
})