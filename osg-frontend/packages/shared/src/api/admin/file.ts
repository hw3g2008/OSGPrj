import { http } from '../../utils/request'

export type FileType = 'folder' | 'pdf' | 'word'
export type FileAuthType = 'all' | 'class' | 'user'

export interface FileRow {
  fileId: number
  fileName: string
  fileType: FileType
  className?: string | null
  fileSize: string
  authType: FileAuthType
  authorizedTo: string
  createTime?: string | null
}

export interface FileListFilters {
  keyword?: string
}

export interface CreateFileFolderPayload {
  folderName: string
  className: string
}

export interface UpdateFileAuthPayload {
  fileId: number
  authType: FileAuthType
  authorizedClasses?: string[]
  authorizedUsers?: string[]
}

const toParams = (filters: FileListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.keyword) params.keyword = filters.keyword

  return params
}

export function getFileList(filters: FileListFilters = {}) {
  return http.get<{ rows: FileRow[] }>('/admin/file/list', {
    params: toParams(filters)
  })
}

export function createFileFolder(payload: CreateFileFolderPayload) {
  return http.post<FileRow>('/admin/file/folder', payload)
}

export function updateFileAuth(payload: UpdateFileAuthPayload) {
  return http.put<FileRow>('/admin/file/auth', payload)
}
