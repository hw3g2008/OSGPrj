import { http } from '../../utils/request'

export interface ComplaintRow {
  complaintId: number
  studentName: string
  complaintType: 'complaint' | 'suggestion'
  complaintTitle: string
  complaintContent: string
  processStatus: 'pending' | 'processing' | 'completed'
  submitTime: string
  handleTime?: string | null
}

export function getComplaintList() {
  return http.get<{ rows: ComplaintRow[] }>('/admin/complaint/list')
}

export function updateComplaintStatus(complaintId: number, processStatus: ComplaintRow['processStatus']) {
  return http.put<ComplaintRow>(`/admin/complaint/${complaintId}/status?processStatus=${processStatus}`)
}
