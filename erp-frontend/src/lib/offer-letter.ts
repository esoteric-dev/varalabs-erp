const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Generate and download an offer/joining letter PDF for a specific user.
 * The backend compiles LaTeX to PDF using tectonic/pdflatex.
 */
export async function generateOfferLetterForUser(
  userId: string,
  letterType: 'offer' | 'joining' = 'offer',
): Promise<void> {
  const token = localStorage.getItem('authToken')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const url = `${API_BASE}/api/offer-letter/${userId}?letter_type=${letterType}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Failed to generate PDF (${response.status})`)
  }

  // Download the PDF
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = response.headers.get('content-disposition')
    ?.match(/filename="(.+)"/)?.[1]
    || `${letterType}_letter.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
