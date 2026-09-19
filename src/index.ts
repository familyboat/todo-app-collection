/* @refresh reload */
import './index.css'
import { createTodo } from './native/index.ts'
import { mountPreactApp } from './preact/index.tsx'
import { mountReactApp } from './react/index.tsx'
import {mountSolidApp} from './solid/index.tsx'
import { mountVueApp } from './vue/index.ts'
import { mountSvelteApp } from './svelte/index.ts'
import { mountLitApp } from './lit/index.ts'
import { mountAngularApp } from './angular/index.ts'

mountSolidApp(document.getElementById('solid')!)
mountReactApp(document.getElementById('react')!)
mountPreactApp(document.getElementById('preact')!)
mountVueApp(document.getElementById('vue')!)
mountSvelteApp(document.getElementById('svelte')!)
mountLitApp(document.getElementById('lit')!)
void mountAngularApp(document.getElementById('angular')!)
createTodo(document.getElementById('native')!)