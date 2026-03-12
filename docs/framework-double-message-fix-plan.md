# 框架层面双重提示问题系统性修复方案

## 问题性质
这不是个别组件的问题，而是**框架设计缺陷**导致的系统性问题：
- HTTP 拦截器自动错误提示 + 组件内手动错误提示 = 双重提示
- 影响范围：所有使用 HTTP 请求的组件

## 框架层面解决方案

### 方案A：智能错误提示（推荐）
**核心思想**：让 HTTP 拦截器智能判断是否应该显示错误提示

#### 修改 `request.ts` 响应拦截器
```typescript
// 在 AppRequestConfig 中添加新字段
export interface AppRequestConfig extends AxiosRequestConfig {
  skipErrorMessage?: boolean
  customErrorMessage?: string  // 新增：自定义错误消息
  contextHint?: string          // 新增：上下文提示，用于判断重复
}

// 修改响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestConfig = response.config as AppRequestConfig
    const { code, msg, data } = response.data

    // 若依标准响应格式
    if (code === 200) {
      const hasDataField = Object.prototype.hasOwnProperty.call(response.data, 'data')
      return hasDataField ? data : response.data
    }

    // Token 过期（特殊处理，保持原有逻辑）
    if (code === 401) {
      removeToken()
      message.error('登录已过期，请重新登录')
      window.location.href = '/login'
      return Promise.reject(new Error(msg || '未授权'))
    }

    // 智能错误提示逻辑
    if (!requestConfig?.skipErrorMessage) {
      // 如果有自定义错误消息，使用自定义消息
      if (requestConfig?.customErrorMessage) {
        message.error(requestConfig.customErrorMessage)
      } else {
        // 默认使用后端返回的消息，但添加去重机制
        const errorMsg = msg || '请求失败'
        message.error(errorMsg)
      }
    }
    return Promise.reject(new Error(msg || '请求失败'))
  },
  (error) => {
    const requestConfig = error.config as AppRequestConfig | undefined
    const msg = error.response?.data?.msg || error.message || '网络错误'
    
    if (!requestConfig?.skipErrorMessage) {
      if (requestConfig?.customErrorMessage) {
        message.error(requestConfig.customErrorMessage)
      } else {
        message.error(msg)
      }
    }
    return Promise.reject(error)
  }
)
```

#### 修改组件错误处理模式
```typescript
// 在组件中使用 customErrorMessage 提供更友好的错误提示
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const payload = { ...formState }

    if (isEdit.value) {
      await updateRole(payload as any, { 
        customErrorMessage: '角色修改失败，请检查输入信息' 
      })
      message.success('角色修改成功')
    } else {
      await addRole(payload, { 
        customErrorMessage: '角色新增失败，请检查输入信息' 
      })
      message.success('角色新增成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    // 移除组件内的 message.error，让拦截器处理
    // message.error(error?.message || '操作失败')
  } finally {
    loading.value = false
  }
}
```

### 方案B：全局错误提示管理器
**核心思想**：引入全局错误提示管理器，防止短时间内的重复提示

#### 新建 `packages/shared/src/utils/messageManager.ts`
```typescript
interface MessageRecord {
  content: string
  timestamp: number
  type: 'error' | 'success' | 'warning' | 'info'
}

class MessageManager {
  private recentMessages: Map<string, MessageRecord> = new Map()
  private readonly DEBOUNCE_TIME = 1000 // 1秒内的重复消息不显示

  showError(content: string, customKey?: string) {
    const key = customKey || content
    const now = Date.now()
    const lastMessage = this.recentMessages.get(key)

    // 如果是相同消息且在防抖时间内，不显示
    if (lastMessage && now - lastMessage.timestamp < this.DEBOUNCE_TIME) {
      return
    }

    message.error(content)
    this.recentMessages.set(key, { content, timestamp: now, type: 'error' })

    // 清理过期记录
    setTimeout(() => {
      this.recentMessages.delete(key)
    }, this.DEBOUNCE_TIME)
  }

  // 其他方法类似...
}

export const messageManager = new MessageManager()
```

#### 修改 `request.ts` 使用 messageManager
```typescript
import { messageManager } from './messageManager'

// 在响应拦截器中
if (!requestConfig?.skipErrorMessage) {
  messageManager.showError(msg || '请求失败')
}
```

### 方案C：完全禁用拦截器错误提示
**核心思想**：HTTP 拦截器只处理技术性错误（如401），业务错误全部由组件处理

#### 修改 `request.ts` 响应拦截器
```typescript
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestConfig = response.config as AppRequestConfig
    const { code, msg, data } = response.data

    // 若依标准响应格式
    if (code === 200) {
      const hasDataField = Object.prototype.hasOwnProperty.call(response.data, 'data')
      return hasDataField ? data : response.data
    }

    // Token 过期（唯一由拦截器处理的错误）
    if (code === 401) {
      removeToken()
      message.error('登录已过期，请重新登录')
      window.location.href = '/login'
      return Promise.reject(new Error(msg || '未授权'))
    }

    // 其他所有错误不在拦截器中显示提示
    return Promise.reject(new Error(msg || '请求失败'))
  },
  (error) => {
    // 网络错误等也不在拦截器中显示提示
    return Promise.reject(error)
  }
)
```

## 方案对比

| 方案 | 优点 | 缺点 | 实施难度 |
|------|------|------|----------|
| A：智能错误提示 | - 灵活性高<br>- 保持向后兼容<br>- 可提供上下文相关的错误提示 | - 需要修改现有组件<br>- 仍需要开发者注意 | 中 |
| B：全局管理器 | - 完全透明<br>- 不需要修改现有组件<br>- 防重复提示效果好 | - 增加系统复杂度<br>- 可能误杀合理的重复提示 | 低 |
| C：完全禁用 | - 最简单<br>- 责任清晰<br>- 完全避免重复 | - 需要修改所有现有组件<br>- 可能遗漏错误处理 | 高 |

## 推荐方案

**方案A：智能错误提示**

理由：
1. **平衡性最好**：既解决了重复问题，又保持了灵活性
2. **向后兼容**：现有代码可以逐步迁移
3. **上下文相关**：可以提供更友好的错误提示
4. **框架级解决**：从根本上解决问题，而不是逐个组件修补

## 实施步骤

### Phase 1：框架层修改
1. 修改 `AppRequestConfig` 接口，添加 `customErrorMessage` 字段
2. 修改 `request.ts` 响应拦截器，实现智能错误提示逻辑
3. 添加单元测试验证行为

### Phase 2：组件层迁移
1. 创建迁移指南文档
2. 优先修改权限管理相关组件（作为示例）
3. 逐步迁移其他组件

### Phase 3：清理和优化
1. 搜索并移除组件内的冗余错误提示
2. 添加 ESLint 规则防止重复错误提示
3. 完善开发者文档

## 预期效果

实施后：
- ✅ 彻底解决双重提示问题
- ✅ 错误提示更加用户友好
- ✅ 框架层统一错误处理逻辑
- ✅ 开发者体验更好

## 风险评估

- **低风险**：方案A保持向后兼容，可以渐进式实施
- **测试覆盖**：需要添加充分的单元测试和集成测试
- **开发者认知**：需要更新开发文档和最佳实践指南
