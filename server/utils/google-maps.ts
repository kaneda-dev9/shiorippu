/**
 * Google Maps Platform API ユーティリティ（サーバーサイド）
 * Places API (New) / Directions API を使った場所検索・ルート計算
 */

// --- 型定義 ---

interface PlaceResult {
  name: string
  address: string
  rating?: number
  userRatingCount?: number
  types: string[]
  placeId: string
  openingHours?: string[]
  priceLevel?: string
  websiteUri?: string
  editorialSummary?: string
}

interface DirectionsResult {
  origin: string
  destination: string
  mode: string
  duration: string
  distance: string
  steps?: string[]
}

// --- Places API (New) ---

/**
 * Google Places API (New) でテキスト検索
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 */
export async function searchPlaces(
  query: string,
  location?: string,
  type?: string,
): Promise<PlaceResult[]> {
  const apiKey = (useRuntimeConfig().googleMapsServerApiKey as string) || useRuntimeConfig().public.googleMapsApiKey
  if (!apiKey) return []

  try {
    const textQuery = location ? `${query} ${location}` : query

    const body: Record<string, unknown> = {
      textQuery,
      languageCode: 'ja',
      maxResultCount: 5,
    }

    // Place type フィルタ（指定がある場合）
    if (type) {
      body.includedType = type
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.types',
          'places.id',
          'places.regularOpeningHours',
          'places.priceLevel',
          'places.websiteUri',
          'places.editorialSummary',
        ].join(','),
      },
      body: JSON.stringify(body),
    })

    const data = await res.json() as {
      places?: {
        displayName?: { text: string }
        formattedAddress?: string
        rating?: number
        userRatingCount?: number
        types?: string[]
        id?: string
        regularOpeningHours?: { weekdayDescriptions?: string[] }
        priceLevel?: string
        websiteUri?: string
        editorialSummary?: { text: string }
      }[]
    }

    return (data.places ?? []).map(p => ({
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      types: p.types ?? [],
      placeId: p.id ?? '',
      openingHours: p.regularOpeningHours?.weekdayDescriptions,
      priceLevel: p.priceLevel,
      websiteUri: p.websiteUri,
      editorialSummary: p.editorialSummary?.text,
    }))
  }
  catch (err) {
    console.error('Places API 検索エラー:', err)
    return []
  }
}

/**
 * Google Places API (New) でプレース詳細を取得
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const apiKey = (useRuntimeConfig().googleMapsServerApiKey as string) || useRuntimeConfig().public.googleMapsApiKey
  if (!apiKey) return null

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'displayName',
          'formattedAddress',
          'rating',
          'userRatingCount',
          'types',
          'id',
          'regularOpeningHours',
          'priceLevel',
          'websiteUri',
          'editorialSummary',
        ].join(','),
      },
    })

    const p = await res.json() as {
      displayName?: { text: string }
      formattedAddress?: string
      rating?: number
      userRatingCount?: number
      types?: string[]
      id?: string
      regularOpeningHours?: { weekdayDescriptions?: string[] }
      priceLevel?: string
      websiteUri?: string
      editorialSummary?: { text: string }
    }

    return {
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      types: p.types ?? [],
      placeId: p.id ?? '',
      openingHours: p.regularOpeningHours?.weekdayDescriptions,
      priceLevel: p.priceLevel,
      websiteUri: p.websiteUri,
      editorialSummary: p.editorialSummary?.text,
    }
  }
  catch (err) {
    console.error('Places API 詳細取得エラー:', placeId, err)
    return null
  }
}

// --- Directions API ---

/**
 * Google Directions API で移動ルート・所要時間を取得
 */
export async function getDirections(
  origin: string,
  destination: string,
  mode: string = 'transit',
): Promise<DirectionsResult | null> {
  const apiKey = (useRuntimeConfig().googleMapsServerApiKey as string) || useRuntimeConfig().public.googleMapsApiKey
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      language: 'ja',
      region: 'jp',
      key: apiKey,
    })

    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`)
    const data = await res.json() as {
      status: string
      routes?: {
        legs?: {
          duration?: { text: string }
          distance?: { text: string }
          start_address?: string
          end_address?: string
          steps?: { html_instructions: string }[]
        }[]
      }[]
    }

    if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
      return null
    }

    const leg = data.routes[0].legs[0]
    return {
      origin: leg.start_address ?? origin,
      destination: leg.end_address ?? destination,
      mode,
      duration: leg.duration?.text ?? '不明',
      distance: leg.distance?.text ?? '不明',
    }
  }
  catch (err) {
    console.error('Directions API エラー:', err)
    return null
  }
}
