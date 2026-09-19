import 'zone.js'
import { createApplication } from '@angular/platform-browser'
import { createCustomElement } from '@angular/elements'
import { TodoAppComponent } from './todo-app.component'

export async function mountAngularApp(root: HTMLElement): Promise<void> {
  const appRef = await createApplication({ providers: [] })

  if (!customElements.get('angular-todo-app')) {
    customElements.define(
      'angular-todo-app',
      createCustomElement(TodoAppComponent, { injector: appRef.injector }),
    )
  }

  root.appendChild(document.createElement('angular-todo-app'))
}