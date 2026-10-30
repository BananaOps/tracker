import { catalogApi } from './api'

// The whole catalog, shared by every page under one cache key. The backend
// returns every catalog whatever the page size, and mutations invalidate the
// ['catalog'] prefix.
export const catalogListQuery = {
  queryKey: ['catalog', 'list'],
  queryFn: () => catalogApi.list({ perPage: 1000 }),
} as const
