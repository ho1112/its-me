// vite.config.ts (최종 버전)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [
    react(),
  ],
  publicDir: false,
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/widget.tsx'),
      name: 'ItsMeChatbot',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      // React와 ReactDOM을 외부 라이브러리로 처리합니다.
      external: ['react', 'react-dom'],
      output: {
        // 외부 라이브러리를 사용할 때, 전역 변수 React와 ReactDOM을 사용하도록 알려줍니다.
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
})
