import { describe, expect, it } from 'vitest'
import { ERROR_MESSAGES, mapErrorMessage } from '@/lib/constants/upload'

describe('upload constants', () => {
  it('maps known error messages to friendly errors', () => {
    expect(mapErrorMessage('Rate limit exceeded')).toEqual(ERROR_MESSAGES.RATE_LIMIT)
    expect(mapErrorMessage('File type not allowed')).toEqual(ERROR_MESSAGES.FILE_TYPE_NOT_ALLOWED)
    expect(mapErrorMessage('File too large')).toEqual(ERROR_MESSAGES.FILE_TOO_LARGE)
    expect(mapErrorMessage('Authentication failed')).toEqual(ERROR_MESSAGES.AUTHENTICATION_EXPIRED)
    expect(mapErrorMessage('Unauthorized request')).toEqual(ERROR_MESSAGES.AUTHENTICATION_EXPIRED)
    expect(mapErrorMessage('Network error while uploading')).toEqual(ERROR_MESSAGES.NETWORK_ERROR)
    expect(mapErrorMessage('Upload cancelled by user')).toEqual(ERROR_MESSAGES.UPLOAD_CANCELLED)
    expect(mapErrorMessage('Upload canceled')).toEqual(ERROR_MESSAGES.UPLOAD_CANCELLED)
    expect(mapErrorMessage('Upload timed out after 5 minutes')).toEqual(ERROR_MESSAGES.UPLOAD_TIMEOUT)
    expect(mapErrorMessage('timeout reached')).toEqual(ERROR_MESSAGES.UPLOAD_TIMEOUT)
  })

  it('returns a default error for unknown messages', () => {
    const error = mapErrorMessage('Something unexpected happened')
    expect(error).toEqual({
      title: 'Upload failed',
      description: 'Something unexpected happened',
    })
  })
})
