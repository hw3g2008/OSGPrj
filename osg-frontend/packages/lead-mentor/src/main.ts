import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'
import { i18n } from '@osg/shared'
import '../../shared/src/styles/index.scss'
import 'ant-design-vue/dist/reset.css'
import '../../admin/node_modules/@mdi/font/css/materialdesignicons.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(Antd)
app.mount('#app')
