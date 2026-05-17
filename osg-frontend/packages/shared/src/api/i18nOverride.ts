import { http } from '../utils/request'

export interface I18nManifestItem {
  keyPath: string
  value: string
}

export interface I18nManifestResponse {
  lang: string
  items: I18nManifestItem[]
}

/**
 * 拉取指定语言的 i18n 覆盖清单。匿名接口，登录前即可调用。
 * 失败时静默返回空清单（不打断前端启动）。
 */
export async function fetchI18nManifest(lang: string): Promise<I18nManifestResponse> {
  try {
    const resp: any = await http.get('/system/i18n/manifest', {
      params: { lang },
      skipErrorMessage: true,
    } as any)
    const items = Array.isArray(resp?.items) ? (resp.items as I18nManifestItem[]) : []
    return { lang: resp?.lang || lang, items }
  } catch {
    return { lang, items: [] }
  }
}
