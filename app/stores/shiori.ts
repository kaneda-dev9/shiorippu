import { defineStore } from 'pinia'
import type { ShioriWithDays, DayWithEvents, Event, EventInsert, DayInsert } from '~~/types/database'

export const useShioriStore = defineStore('shiori', () => {
  const supabase = useSupabase()

  // State
  const currentShiori = ref<ShioriWithDays | null>(null)
  const loading = ref(false)

  // Fetch a shiori with all its data
  async function fetchShiori(id: string) {
    loading.value = true

    const { data: shioriData } = await supabase
      .from('shioris')
      .select('*')
      .eq('id', id)
      .single()

    if (!shioriData) {
      loading.value = false
      return null
    }

    const { data: daysData } = await supabase
      .from('days')
      .select('*, events:events(*)')
      .eq('shiori_id', id)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'events' })

    currentShiori.value = {
      ...shioriData,
      days: (daysData || []) as DayWithEvents[],
    }

    loading.value = false
    return currentShiori.value
  }

  // Update shiori metadata
  async function updateShiori(updates: Partial<ShioriWithDays>) {
    if (!currentShiori.value) return

    const { data } = await supabase
      .from('shioris')
      .update(updates)
      .eq('id', currentShiori.value.id)
      .select()
      .single()

    if (data) {
      Object.assign(currentShiori.value, data)
    }
  }

  // Add a day
  async function addDay(insert: DayInsert) {
    const { data } = await supabase
      .from('days')
      .insert(insert)
      .select()
      .single()

    if (data && currentShiori.value) {
      currentShiori.value.days.push({ ...data, events: [] })
    }
    return data
  }

  // Add an event
  async function addEvent(insert: EventInsert) {
    const { data } = await supabase
      .from('events')
      .insert(insert)
      .select()
      .single()

    if (data && currentShiori.value) {
      const day = currentShiori.value.days.find(d =>
        d.id === data.day_id,
      )
      if (day) {
        day.events.push(data as Event)
      }
    }
    return data
  }

  // Update an event
  async function updateEvent(eventId: string, updates: Partial<Event>) {
    const { data } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (data && currentShiori.value) {
      for (const day of currentShiori.value.days) {
        const idx = day.events.findIndex(e => e.id === eventId)
        if (idx !== -1) {
          day.events[idx] = data as Event
          break
        }
      }
    }
    return data
  }

  // Delete an event
  async function deleteEvent(eventId: string) {
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (currentShiori.value) {
      for (const day of currentShiori.value.days) {
        day.events = day.events.filter(e => e.id !== eventId)
      }
    }
  }

  // Reset store
  function $reset() {
    currentShiori.value = null
    loading.value = false
  }

  return {
    currentShiori,
    loading,
    fetchShiori,
    updateShiori,
    addDay,
    addEvent,
    updateEvent,
    deleteEvent,
    $reset,
  }
})
