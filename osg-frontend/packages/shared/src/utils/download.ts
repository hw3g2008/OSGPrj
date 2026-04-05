import { getToken } from './storage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

type DownloadParamValue = string | number | boolean | null | undefined

export interface AdminDownloadOptions {
  path: string
  params?: Record<string, DownloadParamValue>
  fallbackFilename: string
}

const buildSearchParams = (params: Record<string, DownloadParamValue> = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    searchParams.append(key, String(value))
  })

  return searchParams
}

const resolveDownloadFilename = (contentDisposition: string | null, fallbackFilename: string) => {
  const matched = contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/)
  const encoded = matched?.[1] || matched?.[2]

  if (!encoded) {
    return fallbackFilename
  }

  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

export async function downloadAdminFile({ path, params, fallbackFilename }: AdminDownloadOptions) {
  const query = buildSearchParams(params).toString()
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  })

  if (!response.ok) {
    throw new Error(`${fallbackFilename}下载失败`)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const filename = resolveDownloadFilename(response.headers.get('content-disposition'), fallbackFilename)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)

  return {
    filename,
    size: blob.size,
  }
}
