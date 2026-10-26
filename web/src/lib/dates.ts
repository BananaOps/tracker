// A timestamp as the API may send it: an RFC 3339 string (protojson), or the
// seconds and nanos of a protobuf Timestamp.
export type ApiTimestamp = string | { seconds: number | string; nanos?: number } | null | undefined

export function parseTimestamp(ts: ApiTimestamp): Date | null {
  if (!ts) return null
  if (typeof ts === 'string') {
    const date = new Date(ts)
    return isNaN(date.getTime()) ? null : date
  }
  return new Date(Number(ts.seconds) * 1000 + (ts.nanos || 0) / 1000000)
}
