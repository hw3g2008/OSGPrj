import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'
import { i18n } from '@osg/shared'
import 'ant-design-vue/dist/reset.css'
import '../../shared/src/styles/index.scss'
import './styles/app.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(Antd)
app.mount('#app')
