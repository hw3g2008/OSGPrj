/**
 * 权限颜色配置工具
 * 
 * 基于权限颜色显示定义规划的标准实现
 * 确保整个系统权限颜色显示的一致性
 */

// 权限颜色类型
export type PermissionColorType = 'purple' | 'info' | 'success' | 'warning' | 'danger' | 'teal' | 'default'

// 权限颜色映射
export const PERMISSION_COLOR_CONFIG: Record<string, PermissionColorType> = {
  // 系统核心 - 紫色系
  '首页': 'purple',
  '权限管理': 'purple',
  '权限配置': 'purple',
  '后台用户管理': 'purple',
  '基础数据管理': 'purple',
  
  // 用户中心 - 蓝色系
  '用户中心': 'info',
  '学生列表': 'info',
  '合同管理': 'info',
  '导师列表': 'info',
  '导师排期管理': 'info',
  
  // 求职中心 - 绿色系
  '求职中心': 'success',
  '岗位信息': 'success',
  '学生自添岗位': 'success',
  '学员求职总览': 'success',
  '模拟应聘管理': 'success',
  
  // 教学中心 - 橙色系
  '教学中心': 'warning',
  '课程记录': 'warning',
  '人际关系沟通记录': 'warning',
  
  // 财务中心 - 红色系
  '财务中心': 'danger',
  '课时结算': 'danger',
  '报销管理': 'danger',
  
  // 资源中心 - 青色系
  '资源中心': 'teal',
  '文件': 'teal',
  '在线测试题库': 'teal',
  '真人面试题库': 'teal',
  '面试真题': 'teal',
  
  // 个人中心 - 灰色系
  '个人中心': 'default',
  '邮件': 'default',
  '消息管理': 'default',
  '投诉建议': 'default',
  '操作日志': 'default'
}

/**
 * 获取权限颜色类型
 * @param permissionName 权限名称
 * @returns 颜色类型
 */
export const getPermissionColor = (permissionName: string): PermissionColorType => {
  return PERMISSION_COLOR_CONFIG[permissionName] || 'default'
}

/**
 * 获取权限样式类名
 * @param permissionName 权限名称
 * @returns CSS类名
 */
export const getPermissionClassName = (permissionName: string): string => {
  const colorType = getPermissionColor(permissionName)
  return `permission-pill--${colorType}`
}

/**
 * 获取权限颜色配置
 * @param colorType 颜色类型
 * @returns 颜色配置对象
 */
export const getPermissionColorConfig = (colorType: PermissionColorType) => {
  const colorConfigs: Record<PermissionColorType, { bg: string; text: string; border: string }> = {
    purple: {
      bg: '#e0e7ff',
      text: '#4f46e5',
      border: '#c7d2fe'
    },
    info: {
      bg: '#dbeafe',
      text: '#1e40af',
      border: '#bfdbfe'
    },
    success: {
      bg: '#d1fae5',
      text: '#065f46',
      border: '#a7f3d0'
    },
    warning: {
      bg: '#fef3c7',
      text: '#92400e',
      border: '#fde68a'
    },
    danger: {
      bg: '#fee2e2',
      text: '#991b1b',
      border: '#fecaca'
    },
    teal: {
      bg: '#ccfbf1',
      text: '#115e59',
      border: '#99f6e4'
    },
    default: {
      bg: '#f1f5f9',
      text: '#64748b',
      border: '#e2e8f0'
    }
  }
  
  return colorConfigs[colorType]
}

/**
 * 验证权限颜色配置的完整性
 * @returns 验证结果
 */
export const validatePermissionColorConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // 检查是否有重复的权限名称
  const permissionNames = Object.keys(PERMISSION_COLOR_CONFIG)
  const duplicates = permissionNames.filter((name, index) => permissionNames.indexOf(name) !== index)
  
  if (duplicates.length > 0) {
    errors.push(`发现重复的权限名称: ${duplicates.join(', ')}`)
  }
  
  // 检查颜色类型是否有效
  const validColorTypes: PermissionColorType[] = ['purple', 'info', 'success', 'warning', 'danger', 'teal', 'default']
  const invalidColors = Object.values(PERMISSION_COLOR_CONFIG).filter(color => !validColorTypes.includes(color))
  
  if (invalidColors.length > 0) {
    errors.push(`发现无效的颜色类型: ${[...new Set(invalidColors)].join(', ')}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
