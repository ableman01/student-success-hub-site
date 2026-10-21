import { getCurrentUser } from '@/lib/auth'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export interface TimetableEntry {
  id: string
  user_id: string
  title: string
  course: string
  location: string
  notes: string
  repeats_weekly: boolean
  day_of_week: number | null
  event_date: string | null
  start_time: string
  end_time: string
  created_at: string
}

export type TimetableEntryInput = Omit<TimetableEntry, 'id' | 'user_id' | 'created_at'>

function demoStorageKey (userId: string) {
  return `student-hub-timetable-${userId}`
}

async function getDemoContext () {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in before opening your timetable.')
  return { user, key: demoStorageKey(user.id) }
}

function readDemoEntries (key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as TimetableEntry[]
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

export async function getTimetableEntries () {
  if (!isSupabaseConfigured) {
    const { key } = await getDemoContext()
    return readDemoEntries(key).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const { data, error } = await getSupabaseClient()
    .from('timetable_entries')
    .select('*')
    .order('start_time', { ascending: true })

  if (error) throw error
  return data
}

export async function createTimetableEntry (entry: TimetableEntryInput) {
  if (!isSupabaseConfigured) {
    const { user, key } = await getDemoContext()
    const created: TimetableEntry = {
      ...entry,
      id: globalThis.crypto.randomUUID(),
      user_id: user.id,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify([...readDemoEntries(key), created]))
    return created
  }

  const { data, error } = await getSupabaseClient()
    .from('timetable_entries')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTimetableEntry (id: string, entry: TimetableEntryInput) {
  if (!isSupabaseConfigured) {
    const { key } = await getDemoContext()
    const entries = readDemoEntries(key)
    const index = entries.findIndex(item => item.id === id)
    if (index < 0) throw new Error('Timetable entry not found.')
    entries[index] = { ...entries[index]!, ...entry }
    localStorage.setItem(key, JSON.stringify(entries))
    return entries[index]!
  }

  const { data, error } = await getSupabaseClient()
    .from('timetable_entries')
    .update(entry)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTimetableEntry (id: string) {
  if (!isSupabaseConfigured) {
    const { key } = await getDemoContext()
    const entries = readDemoEntries(key)
    const remaining = entries.filter(item => item.id !== id)
    if (remaining.length === entries.length) throw new Error('Timetable entry not found.')
    localStorage.setItem(key, JSON.stringify(remaining))
    return
  }

  const { error } = await getSupabaseClient()
    .from('timetable_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}
