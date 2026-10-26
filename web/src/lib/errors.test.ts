import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { apiErrorMessage } from './errors'

const gatewayError = (message: string) => {
  const err = new AxiosError('Request failed with status code 400')
  err.response = { data: { code: 9, message, details: [] }, status: 400 } as AxiosResponse
  return err
}

describe('apiErrorMessage', () => {
  it('uses the message of a grpc-gateway error', () => {
    expect(apiErrorMessage(gatewayError('service api is already locked'), 'x')).toBe('service api is already locked')
  })

  it('falls back to the error message, then to the fallback', () => {
    expect(apiErrorMessage(new Error('network down'), 'x')).toBe('network down')
    expect(apiErrorMessage('boom', 'Error creating lock')).toBe('Error creating lock')
    expect(apiErrorMessage(undefined, 'Error creating lock')).toBe('Error creating lock')
  })
})
