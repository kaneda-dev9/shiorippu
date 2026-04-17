import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  queryOptions: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
} satisfies PiniaColadaOptions
