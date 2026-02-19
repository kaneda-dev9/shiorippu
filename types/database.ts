// ===========================================
// Supabase Database Types for しおりっぷ
// ===========================================

export type EventCategory =
  | 'transport_train' | 'transport_car' | 'transport_plane'
  | 'transport_bus' | 'transport_walk' | 'transport_ship'
  | 'meal_restaurant' | 'meal_cafe' | 'meal_izakaya'
  | 'stay_hotel' | 'stay_ryokan' | 'stay_camp'
  | 'sightseeing_temple' | 'sightseeing_theme_park'
  | 'sightseeing_beach' | 'sightseeing_park' | 'sightseeing_museum'
  | 'onsen' | 'shopping' | 'photo_spot'
  | 'activity' | 'memo' | 'other'

export type BookingStatus = 'none' | 'pending' | 'confirmed' | 'cancelled'

export type CollaboratorRole = 'owner' | 'editor'

export type ChatRole = 'user' | 'assistant' | 'system'

// ===========================================
// Row types (as returned from Supabase)
// ===========================================

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Shiori {
  id: string
  owner_id: string
  title: string
  start_date: string | null
  end_date: string | null
  area: string | null
  template_id: string
  custom_style: Record<string, unknown>
  cover_image_url: string | null
  is_public: boolean
  invite_token: string | null
  invite_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Day {
  id: string
  shiori_id: string
  day_number: number
  date: string | null
  sort_order: number
  created_at: string
}

export interface Event {
  id: string
  day_id: string
  title: string
  category: EventCategory
  icon: string
  start_time: string | null
  end_time: string | null
  memo: string | null
  url: string | null
  image_url: string | null
  place_id: string | null
  lat: number | null
  lng: number | null
  address: string | null
  booking_status: BookingStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  shiori_id: string
  role: ChatRole
  content: string
  metadata: ChatMessageMetadata
  created_at: string
}

export interface Collaborator {
  id: string
  shiori_id: string
  user_id: string
  role: CollaboratorRole
  last_active: string
  created_at: string
}

// ===========================================
// AI Chat metadata types
// ===========================================

export interface ChatChoice {
  id: string
  label: string
  emoji: string
  description?: string
  tags?: string[]
}

export interface ChatMessageMetadata {
  // For assistant messages with choices
  choices?: ChatChoice[]
  step?: number
  multiSelect?: boolean
  // For user messages with selections
  selected_ids?: string[]
  other_text?: string
}

// ===========================================
// Insert types (for creating new records)
// ===========================================

export interface ShioriInsert {
  title?: string
  start_date?: string | null
  end_date?: string | null
  area?: string | null
  template_id?: string
  custom_style?: Record<string, unknown>
  cover_image_url?: string | null
}

export interface DayInsert {
  shiori_id: string
  day_number: number
  date?: string | null
  sort_order?: number
}

export interface EventInsert {
  day_id: string
  title: string
  category?: EventCategory
  icon?: string
  start_time?: string | null
  end_time?: string | null
  memo?: string | null
  url?: string | null
  place_id?: string | null
  lat?: number | null
  lng?: number | null
  address?: string | null
  booking_status?: BookingStatus
  sort_order?: number
}

// ===========================================
// Joined/enriched types (for frontend use)
// ===========================================

export interface ShioriWithDays extends Shiori {
  days: DayWithEvents[]
}

export interface DayWithEvents extends Day {
  events: Event[]
}

export interface CollaboratorWithProfile extends Collaborator {
  profile: Profile | null
}
