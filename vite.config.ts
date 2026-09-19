import { defineConfig, type Plugin } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import solid from 'vite-plugin-solid'
import react from '@vitejs/plugin-react'
import preact from "@preact/preset-vite";
import vue from '@vitejs/plugin-vue'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const FRAMEWORK_JSX_SOURCES: Record<string, string> = {
  react: 'react',
  preact: 'preact',
  solid: 'solid-js',
}

// 依据目录为各框架的 .jsx/.tsx 注入 jsxImportSource pragma。
// oxc/esbuild 会按文件头 pragma 决定该文件的 JSX 运行时，
// 因此源码里无需（也不应）手写 pragma。
// @preact/preset-vite 会把全局默认设为 preact、vite-plugin-solid 用 babel 接管，
// 这里按路径显式对齐，避免依赖各插件的全局默认打架。
const frameworkJsxSource: Plugin = {
  name: 'framework-jsx-source',
  enforce: 'pre',
  transform(code, id) {
    const match = /\/src\/(react|preact|solid)\//.exec(id)
    if (!match || !/\.[jt]sx$/.test(id)) return null
    if (/^\/\*\* *@jsxImportSource /.test(code)) return null
    const source = FRAMEWORK_JSX_SOURCES[match[1]]
    return `/** @jsxImportSource ${source} */\n${code}`
  },
}

export default defineConfig({
  plugins: [
    frameworkJsxSource,
    angular({ fastCompile: true }),
    solid({
      include: './src/solid/**/*'
    }),
    react({
      include: './src/react/**/*'
    }),
    preact({
      include: './src/preact/**/*',
      reactAliasesEnabled: false,
    }),
    vue({
      include: './src/vue/**/*.vue',
    }),
    svelte()
  ],
})
