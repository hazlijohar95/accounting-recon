import { UploadView } from '@/components/views/upload-view'

// Force dynamic rendering - PDF.js uses browser APIs (DOMMatrix)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Upload Documents | Reconcile',
}

export default function UploadPage() {
  return <UploadView />
}
