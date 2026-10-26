import axios from 'axios'

// The message to show for a failed API call: grpc-gateway answers errors as
// { code, message, details }; anything else falls back to the error message.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(err) && err.response?.data?.message) {
    return err.response.data.message
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
