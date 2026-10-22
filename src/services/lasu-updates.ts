import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export type LasuUpdateCategory = 'announcement' | 'deadline' | 'registration' | 'academic' | 'opportunity'

export interface LasuOfficialUpdate {
  id: string
  source_key: string
  title: string
  summary: string
  category: LasuUpdateCategory
  official_url: string
  published_at: string | null
  source_label: string
  first_seen_at: string
  last_seen_at: string
}

export async function getLasuOfficialUpdates () {
  if (!isSupabaseConfigured) {
    throw new Error('Official LASU updates are unavailable while the online service is disconnected.')
  }

  const { data, error } = await getSupabaseClient()
    .from('lasu_official_updates')
    .select('id, source_key, title, summary, category, official_url, published_at, source_label, first_seen_at, last_seen_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('first_seen_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  return data as LasuOfficialUpdate[]
}
