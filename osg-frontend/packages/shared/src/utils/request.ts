import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'
import { i18n } from '../i18n'
import { getToken, removeToken } from './storage'

const t = (key: string): string => (i18n.global.t as unknown as (k: string) => string)(key)

export interface AppRequestConfig extends AxiosRequestConfig {
  skipErrorMessage?: boolean
  skipAuthRedirect?: boolean
  customErrorMessage?: string
}

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestConfig = response.config as AppRequestConfig
    if (requestConfig.responseType === 'blob' || requestConfig.responseType === 'arraybuffer') {
      return response.data
    }
    const { code, msg, data } = response.data

    // 若依标准响应格式
    if (code === 200) {
      const hasDataField = Object.prototype.hasOwnProperty.call(response.data, 'data')
      return hasDataField ? data : response.data
    }

    // Token 过期
    if (code === 401) {
      if (!requestConfig?.skipAuthRedirect) {
        removeToken()
        message.error(t('common.shared.request.sessionExpired'))
        window.location.href = '/login'
      }
      return Promise.reject(new Error(msg || t('common.shared.request.unauthorized')))
    }

    // 智能错误提示逻辑
    if (!requestConfig?.skipErrorMessage) {
      // 如果有自定义错误消息，使用自定义消息
      if (requestConfig?.customErrorMessage) {
        message.error(requestConfig.customErrorMessage)
      } else {
        // 默认使用后端返回的消息
        message.error(msg || t('common.shared.request.requestFailed'))
      }
    }
    return Promise.reject(new Error(msg || t('common.shared.request.requestFailed')))
  },
  (error) => {
    const requestConfig = error.config as AppRequestConfig | undefined
    const msg = error.response?.data?.msg || error.message || t('common.shared.request.networkError')
    
    // 智能错误提示逻辑
    if (!requestConfig?.skipErrorMessage) {
      // 如果有自定义错误消息，使用自定义消息
      if (requestConfig?.customErrorMessage) {
        message.error(requestConfig.customErrorMessage)
      } else {
        // 默认使用错误消息
        message.error(msg)
      }
    }
    return Promise.reject(error)
  }
)

// 封装常用方法
export const http = {
  get<T = any>(url: string, config?: AppRequestConfig): Promise<T> {
    return request.get(url, config)
  },
  post<T = any>(url: string, data?: any, config?: AppRequestConfig): Promise<T> {
    return request.post(url, data, config)
  },
  put<T = any>(url: string, data?: any, config?: AppRequestConfig): Promise<T> {
    return request.put(url, data, config)
  },
  delete<T = any>(url: string, config?: AppRequestConfig): Promise<T> {
    return request.delete(url, config)
  }
}

export default request
