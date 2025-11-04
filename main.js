import { createSSRApp } from 'vue'
import App from './App.vue'

// uni-app 入口文件
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
