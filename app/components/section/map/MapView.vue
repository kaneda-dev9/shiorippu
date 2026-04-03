<template>
  <div ref="mapContainer" class="size-full" />
</template>

<script setup lang="ts">
import type { DayWithEvents, Event, EventCategory } from '~~/types/database'
import { getDayColor } from '~~/shared/day-colors'
import { tryOnScopeDispose } from '@vueuse/core'
import MapInfoWindow from './MapInfoWindow.vue'

const props = withDefaults(defineProps<{
  days: DayWithEvents[]
  selectedDayNumbers?: number[]
  useDirections?: boolean
}>(), {
  selectedDayNumbers: () => [],
  useDirections: true,
})

const emit = defineEmits<{
  'marker-click': [event: Event, dayNumber: number]
}>()

const { createMap } = useGoogleMaps()
const { mount: mountComponent, unmountAll: unmountAllInfoWindows } = useMountComponent()
const mapContainer = useTemplateRef<HTMLElement>('mapContainer')

let map: google.maps.Map | null = null
let markers: google.maps.marker.AdvancedMarkerElement[] = []
let polylines: google.maps.Polyline[] = []
const markerEventMap = new Map<string, { marker: google.maps.marker.AdvancedMarkerElement; pinEl: HTMLElement; color: string; order: number }>()
let highlightedEventId: string | null = null
let infoWindow: google.maps.InfoWindow | null = null
// Routes API (Route.computeRoutes) を使用
// 型定義が @types/google.maps にまだないため any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let routeClass: any = null

/** イベントカテゴリから交通手段を判定 */
type RouteMode = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'STRAIGHT'

function categoryToRouteMode(category: EventCategory): RouteMode | null {
  switch (category) {
    case 'transport_train': return 'TRANSIT'
    case 'transport_bus': return 'TRANSIT'
    case 'transport_car': return 'DRIVING'
    case 'transport_walk': return 'WALKING'
    case 'transport_plane': return 'STRAIGHT'
    case 'transport_ship': return 'STRAIGHT'
    default: return null // 移動カテゴリではない
  }
}

/** 2つのイベント間の移動手段を推定 */
function inferTravelMode(from: Event, to: Event): RouteMode {
  const fromMode = categoryToRouteMode(from.category)
  const toMode = categoryToRouteMode(to.category)

  // 飛行機・船はどちらか一方にあれば直線（ルート検索不要）
  if (fromMode === 'STRAIGHT' || toMode === 'STRAIGHT') return 'STRAIGHT'

  // 到着側 → 出発側の順で判定
  return toMode || fromMode || 'DRIVING'
}

// 位置情報を持つイベントのみ抽出
interface LocatedEvent {
  event: Event
  position: google.maps.LatLngLiteral
}

// 区間情報
interface Segment {
  from: LocatedEvent
  to: LocatedEvent
  mode: RouteMode
}

// 表示対象のDay
const visibleDays = computed(() => {
  if (!props.selectedDayNumbers || props.selectedDayNumbers.length === 0) {
    return props.days
  }
  return props.days.filter(d => props.selectedDayNumbers!.includes(d.day_number))
})

// マップ初期化
onMounted(async () => {
  if (!mapContainer.value) return
  map = await createMap(mapContainer.value)
  infoWindow = new google.maps.InfoWindow({ headerDisabled: true })
  if (props.useDirections) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routesLib = await google.maps.importLibrary('routes') as any
    routeClass = routesLib.Route
  }
  await renderAll()
})

// days やフィルタが変わったら再描画（ビューポート維持）
watch([visibleDays], () => {
  renderAll(true)
}, { deep: true })

async function renderAll(preserveViewport = false) {
  clearAll()
  if (!map) return

  const bounds = new google.maps.LatLngBounds()
  let hasMarker = false
  const routePromises: Promise<void>[] = []

  for (const day of visibleDays.value) {
    const color = getDayColor(day.day_number)

    // 位置情報ありイベントを抽出
    const located: LocatedEvent[] = day.events
      .filter(ev => ev.lat != null && ev.lng != null)
      .map(ev => ({
        event: ev,
        position: { lat: ev.lat!, lng: ev.lng! },
      }))

    // マーカー描画
    for (let i = 0; i < located.length; i++) {
      const loc = located[i]!
      bounds.extend(loc.position)
      hasMarker = true

      const pinEl = createPinElement(color, i + 1)
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: loc.position,
        title: loc.event.title,
        content: pinEl,
      })

      marker.addListener('gmp-click', () => {
        highlightMarker(loc.event.id)
        emit('marker-click', loc.event, day.day_number)
      })

      markers.push(marker)
      markerEventMap.set(loc.event.id, { marker, pinEl, color, order: i + 1 })
    }

    // 区間ごとにルート描画
    if (located.length >= 2) {
      // 各区間の移動手段を判定
      const segments: Segment[] = []
      for (let i = 0; i < located.length - 1; i++) {
        segments.push({
          from: located[i]!,
          to: located[i + 1]!,
          mode: inferTravelMode(located[i]!.event, located[i + 1]!.event),
        })
      }

      if (props.useDirections && routeClass) {
        // 同一モードの連続区間をまとめてバッチ処理
        const batches = batchSegments(segments)
        for (const batch of batches) {
          routePromises.push(drawRoute(batch, color))
        }
      }
      else {
        // 直線フォールバック
        drawStraightLine(located.map(l => l.position), color)
      }
    }
  }

  // Day間をつなぐルート（前のDayの最後 → 次のDayの最初）
  const sorted = [...visibleDays.value].sort((a, b) => a.day_number - b.day_number)
  for (let i = 0; i < sorted.length - 1; i++) {
    const prevDay = sorted[i]!
    const nextDay = sorted[i + 1]!
    const prevLocated = prevDay.events.filter(ev => ev.lat != null && ev.lng != null)
    const nextLocated = nextDay.events.filter(ev => ev.lat != null && ev.lng != null)
    if (prevLocated.length === 0 || nextLocated.length === 0) continue

    const lastEv = prevLocated[prevLocated.length - 1]!
    const firstEv = nextLocated[0]!
    // 同じ場所なら不要
    if (lastEv.lat === firstEv.lat && lastEv.lng === firstEv.lng) continue

    const fromLoc: LocatedEvent = { event: lastEv, position: { lat: lastEv.lat!, lng: lastEv.lng! } }
    const toLoc: LocatedEvent = { event: firstEv, position: { lat: firstEv.lat!, lng: firstEv.lng! } }
    const mode = inferTravelMode(lastEv, firstEv)
    const bridgeColor = '#9ca3af' // stone-400: Day間は灰色で区別

    const segment: Segment = { from: fromLoc, to: toLoc, mode }
    if (props.useDirections && routeClass) {
      routePromises.push(drawRoute([segment], bridgeColor))
    }
    else {
      drawStraightLine([fromLoc.position, toLoc.position], bridgeColor)
    }
  }

  await Promise.allSettled(routePromises)

  if (hasMarker && !preserveViewport) {
    map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 })
  }
}

/** 同じ移動手段の連続区間をまとめる */
function batchSegments(segments: Segment[]): Segment[][] {
  const batches: Segment[][] = []
  let current: Segment[] = []

  for (const seg of segments) {
    if (current.length === 0 || current[current.length - 1]!.mode === seg.mode) {
      current.push(seg)
    }
    else {
      batches.push(current)
      current = [seg]
    }
  }
  if (current.length > 0) batches.push(current)
  return batches
}

/** 区間バッチのルートを描画（Routes API: Route.computeRoutes を使用） */
async function drawRoute(batch: Segment[], color: string) {
  if (!map || batch.length === 0) return

  const mode = batch[0]!.mode

  // 飛行機・船は破線の直線
  if (mode === 'STRAIGHT') {
    const coords = [batch[0]!.from.position, ...batch.map(s => s.to.position)]
    drawDashedLine(coords, color)
    return
  }

  if (!routeClass) {
    const coords = [batch[0]!.from.position, ...batch.map(s => s.to.position)]
    drawStraightLine(coords, color)
    return
  }

  const origin = batch[0]!.from.position
  const destination = batch[batch.length - 1]!.to.position

  // 中間地点を追加
  const intermediates: google.maps.LatLngLiteral[] = []
  for (let i = 0; i < batch.length - 1; i++) {
    intermediates.push(batch[i]!.to.position)
  }

  const allCoords = [origin, ...intermediates, destination]

  // Routes API でルート取得を試行
  const tryRoute = async (travelMode: string): Promise<boolean> => {
    try {
      const request: Record<string, unknown> = {
        origin,
        destination,
        travelMode,
        fields: ['path'],
      }
      if (intermediates.length > 0) {
        request.intermediates = intermediates
      }

      const { routes } = await routeClass!.computeRoutes(request)

      if (routes?.[0]?.path) {
        const path = routes[0].path as google.maps.LatLng[]
        const pathLiterals = path.map((p: google.maps.LatLng) => p.toJSON())
        if (mode === 'WALKING') {
          drawWalkingLine(pathLiterals, color)
        }
        else {
          drawOutlinedLine(pathLiterals, color)
        }
        return true
      }
    }
    catch {
      // 失敗
    }
    return false
  }

  // 1. 指定モードで試行
  if (await tryRoute(mode)) return

  // 2. 失敗時は DRIVING にフォールバック
  if (mode !== 'DRIVING') {
    if (await tryRoute('DRIVING')) return
  }

  // 3. すべて失敗時は直線
  drawStraightLine(allCoords, color)
}

/** 方向矢印アイコン（google.maps ロード後に使用） */
function getArrowIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 2.5,
    fillColor: '#ffffff',
    fillOpacity: 0.9,
    strokeWeight: 0,
  }
}

/** 白縁取り＋矢印付きポリライン */
function drawOutlinedLine(coords: google.maps.LatLngLiteral[], color: string) {
  if (!map) return
  // 下層: 白い縁取り
  const outline = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: '#ffffff',
    strokeOpacity: 0.9,
    strokeWeight: 7,
    map,
    zIndex: 1,
  })
  // 上層: 色付き + 矢印
  const line = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0.85,
    strokeWeight: 4,
    icons: [{
      icon: getArrowIcon(),
      offset: '30px',
      repeat: '80px',
    }],
    map,
    zIndex: 2,
  })
  polylines.push(outline, line)
}

/** 直線ポリラインを描画（フォールバック） */
function drawStraightLine(coords: google.maps.LatLngLiteral[], color: string) {
  if (!map) return
  drawOutlinedLine(coords, color)
}

/** 徒歩用ポリライン（点線＋矢印） */
function drawWalkingLine(coords: google.maps.LatLngLiteral[], color: string) {
  if (!map) return
  const line = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0,
    strokeWeight: 3,
    icons: [
      {
        icon: { path: google.maps.SymbolPath.CIRCLE, fillOpacity: 0.7, fillColor: color, scale: 1.5, strokeWeight: 0 },
        offset: '0',
        repeat: '8px',
      },
      {
        icon: getArrowIcon(),
        offset: '30px',
        repeat: '80px',
      },
    ],
    map,
    zIndex: 2,
  })
  polylines.push(line)
}

/** 破線ポリラインを描画（飛行機・船用） */
function drawDashedLine(coords: google.maps.LatLngLiteral[], color: string) {
  if (!map) return
  const line = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0,
    strokeWeight: 3,
    icons: [
      {
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 3 },
        offset: '0',
        repeat: '15px',
      },
      {
        icon: getArrowIcon(),
        offset: '30px',
        repeat: '80px',
      },
    ],
    map,
    zIndex: 2,
  })
  polylines.push(line)
}

/** マーカーピンのDOM要素を作成 */
function createPinElement(color: string, order: number): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
    background: ${color}; transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
  `
  const inner = document.createElement('span')
  inner.style.cssText = `
    transform: rotate(45deg); color: white; font-size: 11px;
    font-weight: bold; line-height: 1;
  `
  inner.textContent = String(order)
  el.appendChild(inner)
  return el
}

/** InfoWindow のコンテンツをVueコンポーネントからDOM要素として生成 */
function createInfoContent(ev: Event, dayNumber: number, color: string): HTMLElement {
  const { el } = mountComponent(MapInfoWindow, {
    event: ev,
    dayNumber,
    color,
    onClose: () => infoWindow?.close(),
  })
  return el
}

function clearAll() {
  unmountAllInfoWindows()
  for (const m of markers) {
    m.map = null
  }
  markers = []
  markerEventMap.clear()
  highlightedEventId = null
  for (const p of polylines) {
    p.setMap(null)
  }
  polylines = []
  infoWindow?.close()
}

// スコープ破棄時にリソースをクリーンアップ
tryOnScopeDispose(() => {
  clearAll()
  map = null
  infoWindow = null
  routeClass = null
})

/** 全マーカーが見える範囲にフィット */
function fitBounds() {
  if (!map || markers.length === 0) return
  const bounds = new google.maps.LatLngBounds()
  for (const m of markers) {
    if (m.position) {
      bounds.extend(m.position as google.maps.LatLngLiteral)
    }
  }
  map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 })
}

/** 現在地と目的地の両方が見えるズームレベルを推定 */
function getZoomForBounds(from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral): number {
  const latDiff = Math.abs(from.lat - to.lat)
  const lngDiff = Math.abs(from.lng - to.lng)
  const maxDiff = Math.max(latDiff, lngDiff)
  // 差分からズームレベルを大まかに推定
  if (maxDiff > 10) return 4
  if (maxDiff > 5) return 5
  if (maxDiff > 2) return 7
  if (maxDiff > 1) return 8
  if (maxDiff > 0.5) return 9
  if (maxDiff > 0.1) return 11
  if (maxDiff > 0.01) return 14
  return 15
}

/** idle イベントを1回だけ待つ */
function waitForIdle(): Promise<void> {
  return new Promise((resolve) => {
    const listener = map!.addListener('idle', () => {
      google.maps.event.removeListener(listener)
      resolve()
    })
  })
}

/** 特定座標にスムーズにフォーカス */
async function panTo(lat: number, lng: number, zoom?: number) {
  if (!map) return
  const target = { lat, lng }
  const targetZoom = zoom || map.getZoom() || 12
  const currentCenter = map.getCenter()

  if (!currentCenter) {
    map.setCenter(target)
    map.setZoom(targetZoom)
    return
  }

  const current = currentCenter.toJSON()
  const flyZoom = getZoomForBounds(current, target)
  const currentZoom = map.getZoom() || 12

  // 近距離ならそのまま panTo（Google Maps がアニメーション）
  if (flyZoom >= currentZoom - 1) {
    map.panTo(target)
    if (zoom) map.setZoom(zoom)
    return
  }

  // 遠距離: ズームアウト → パン → ズームイン
  map.setZoom(flyZoom)
  await waitForIdle()
  map.panTo(target)
  await waitForIdle()
  map.setZoom(targetZoom)
}

/** 表示中イベントのGoogle Mapsルート URLを生成 */
function getGoogleMapsRouteUrl(): string | null {
  const points = visibleDays.value
    .flatMap(d => d.events)
    .filter(ev => ev.lat != null && ev.lng != null)
    .map(ev => `${ev.lat},${ev.lng}`)
  if (points.length === 0) return null
  return `https://www.google.com/maps/dir/${points.join('/')}`
}

/** 指定イベントのマーカーをハイライト（バウンス+拡大アニメーション） */
function highlightMarker(eventId: string) {
  // 前回のハイライトを元に戻す
  if (highlightedEventId && highlightedEventId !== eventId) {
    const prev = markerEventMap.get(highlightedEventId)
    if (prev) {
      prev.pinEl.style.transform = 'rotate(-45deg)'
      prev.pinEl.style.width = '32px'
      prev.pinEl.style.height = '32px'
      prev.pinEl.style.zIndex = ''
    }
  }

  const entry = markerEventMap.get(eventId)
  if (!entry) return

  highlightedEventId = eventId

  // マーカーを拡大＋バウンスアニメーション
  const el = entry.pinEl
  el.style.zIndex = '999'
  el.style.transition = 'transform 0.3s ease, width 0.3s ease, height 0.3s ease'
  el.style.width = '42px'
  el.style.height = '42px'
  el.style.transform = 'rotate(-45deg) scale(1)'

  // バウンスアニメーション
  el.animate([
    { transform: 'rotate(-45deg) translateY(0)' },
    { transform: 'rotate(-45deg) translateY(-16px)' },
    { transform: 'rotate(-45deg) translateY(0)' },
    { transform: 'rotate(-45deg) translateY(-8px)' },
    { transform: 'rotate(-45deg) translateY(0)' },
  ], {
    duration: 600,
    easing: 'ease-out',
  })

  // InfoWindowも開く
  if (infoWindow && map) {
    const day = visibleDays.value.find(d =>
      d.events.some(e => e.id === eventId),
    )
    if (day) {
      const ev = day.events.find(e => e.id === eventId)
      if (ev) {
        infoWindow.setContent(createInfoContent(ev, day.day_number, entry.color))
        infoWindow.open({ anchor: entry.marker, map })
      }
    }
  }
}

defineExpose({ fitBounds, panTo, getGoogleMapsRouteUrl, highlightMarker })
</script>
