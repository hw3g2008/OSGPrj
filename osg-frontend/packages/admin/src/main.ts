import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import { i18n } from '@osg/shared'
import App from './App.vue'
import router from './router'
import hasPermiDirective from './directives/hasPermi'
import 'ant-design-vue/dist/reset.css'
import '../../shared/src/styles/index.scss'
import './styles/global.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)
app.use(i18n)
app.directive('hasPermi', hasPermiDirective)

app.mount('#app')
