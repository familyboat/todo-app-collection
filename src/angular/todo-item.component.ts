import { Component, ElementRef, ViewEncapsulation, effect, input, signal, viewChild } from '@angular/core'
import type { TodoRecord } from '../db'

@Component({
  selector: 'angular-todo-item',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <li
      class="todo__item"
      [style.view-transition-name]="'view-' + todo().id"
      [attr.aria-label]="todo().completed ? '已完成待办事项' : '待办事项'"
      [attr.data-id]="todo().id"
    >
      <input
        type="checkbox"
        class="todo__item__toggle"
        [checked]="todo().completed"
        [disabled]="editing()"
        [attr.aria-label]="todo().completed ? '标记为未完成：' + todo().content : '完成待办事项：' + todo().content"
        (change)="onToggleChange($event)"
      />

      @if (!editing()) {
        <span
          class="todo__item__content"
          [attr.aria-label]="'待办事项内容：' + todo().content"
          aria-live="polite"
        >{{ todo().content }}</span>
      } @else {
        <input
          #editor
          class="todo__item__editor"
          [attr.aria-label]="'编辑待办事项：' + todo().content"
          [value]="draft()"
          (input)="onDraftInput($event)"
          (keydown)="onKeydown($event)"
        />
      }

      <button
        type="button"
        class="todo__item__action"
        [attr.aria-label]="todo().completed ? '编辑已完成待办事项' : '编辑待办事项'"
        (click)="onAction()"
      >{{ editing() ? 'submit' : 'edit' }}</button>
    </li>
  `,
})
export class TodoItemComponent {
  todo = input.required<TodoRecord>()
  onToggle = input<(value: boolean) => void>(() => {})
  onEdit = input<(content: string) => void>(() => {})

  editing = signal(false)
  draft = signal('')
  editor = viewChild<ElementRef<HTMLInputElement>>('editor')

  constructor() {
    effect(() => {
      if (this.editing()) {
        const el = this.editor()?.nativeElement
        el?.focus()
      }
    })
  }

  onToggleChange(event: Event) {
    this.onToggle()((event.target as HTMLInputElement).checked)
  }

  onDraftInput(event: Event) {
    this.draft.set((event.target as HTMLInputElement).value)
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSubmit()
    }
    if (event.key === 'Escape') {
      this.draft.set(this.todo().content)
      this.editing.set(false)
    }
  }

  onSubmit() {
    const value = this.draft().trim()
    if (!value) {
      this.draft.set(this.todo().content)
      this.editing.set(false)
      return
    }

    this.onEdit()(value)
    this.editing.set(false)
  }

  onAction() {
    if (this.editing()) {
      this.onSubmit()
      return
    }
    this.draft.set(this.todo().content)
    this.editing.set(true)
  }
}