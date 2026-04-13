import { API_BASE } from '../api-base'

export async function uploadStudentPhoto(
  studentId: string,
  blob: Blob,
): Promise<{ photoUrl: string; sizeBytes: number }> {
  const token = localStorage.getItem('authToken')
  const formData = new FormData()
  formData.append('photo', blob, 'photo.webp')

  const res = await fetch(`${API_BASE}/api/students/${studentId}/photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error || 'Upload failed')
  }

  return res.json()
}

export async function uploadUserPhoto(
  userId: string,
  blob: Blob,
): Promise<{ photoUrl: string; sizeBytes: number }> {
  const token = localStorage.getItem('authToken')
  const formData = new FormData()
  formData.append('photo', blob, 'photo.webp')

  const res = await fetch(`${API_BASE}/api/users/${userId}/photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error || 'Upload failed')
  }

  return res.json()
}
