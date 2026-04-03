import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let optionsSet = false

export function useGoogleMaps() {
  const config = useRuntimeConfig()
  const loaded = useState('google-maps-loaded', () => false)
  const loading = useState('google-maps-loading', () => false)

  /** Google Maps API をロードする */
  async function load(): Promise<typeof google.maps> {
    if (loaded.value) return google.maps

    if (!optionsSet) {
      setOptions({
        key: config.public.googleMapsApiKey as string,
        v: 'weekly',
        language: 'ja',
        region: 'JP',
      })
      optionsSet = true
    }

    loading.value = true
    try {
      await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
      ])
      loaded.value = true
      return google.maps
    }
    finally {
      loading.value = false
    }
  }

  /** 指定要素にマップを作成する */
  async function createMap(
    element: HTMLElement,
    options?: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    await load()
    return new google.maps.Map(element, {
      center: { lat: 35.6762, lng: 139.6503 }, // 東京デフォルト
      zoom: 12,
      mapId: useRuntimeConfig().public.googleMapsMapId || 'DEMO_MAP_ID',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      ...options,
    })
  }

  return {
    load,
    createMap,
    loaded: readonly(loaded),
    loading: readonly(loading),
  }
}
