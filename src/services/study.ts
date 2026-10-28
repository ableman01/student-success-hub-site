import type { RealtimeChannel } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { getInstitutionKey } from '@/lib/institutions'
import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

const studyImageBucket = 'study-chat-images'
const maxStudyImageSize = 5 * 1024 * 1024

export type StudyMessageType = 'discussion' | 'assignment'
export type GroupPostType = 'discussion' | 'question' | 'assignment' | 'practice'

export interface StudyGroup {
  id: string
  name: string
  course: string
  description: string
  invite_code: string
  owner_id: string
  institution_key: string
}

export interface StudyGroupPost {
  id: string
  group_id: string
  user_id: string
  sender_name: string
  post_type: GroupPostType
  content: string
  image_path: string | null
  image_url?: string | null
  created_at: string
}

export interface StudyMessage {
  id: string
  course: string
  institution_key: string
  user_id: string
  sender_name: string
  message_type: StudyMessageType
  content: string
  image_path: string | null
  image_url?: string | null
  created_at: string
}

export async function getStudyGroups () {
  const user = await getCurrentUser()
  if (!user) return []
  const institutionKey = getInstitutionKey(user.institutionType, user.institution)
  const client = requireSupabase()
  const { data: memberships, error: membershipError } = await client
    .from('study_group_members')
    .select('group_id')
  if (membershipError) throw getSchemaError(membershipError)

  const groupIds = (memberships ?? []).map(item => item.group_id)
  if (groupIds.length === 0) return []

  const { data, error } = await client.from('study_groups').select('*').eq('institution_key', institutionKey).in('id', groupIds).order('created_at', { ascending: false })
  if (error) throw getSchemaError(error)
  return data as StudyGroup[]
}

export async function createStudyGroup (input: { name: string, course: string, description: string }) {
  const { data, error } = await requireSupabase().functions.invoke('create-study-group', { body: input })
  if (error) throw await getFunctionError(error)
  return data as StudyGroup
}

export async function joinStudyGroup (inviteCode: string) {
  const normalizedInvite = normalizeInviteCode(inviteCode)
  if (!normalizedInvite) throw new Error('Paste a valid group invite code or invite link.')
  const { data, error } = await requireSupabase().functions.invoke('join-study-group', { body: { invite_code: normalizedInvite } })
  if (error) throw await getFunctionError(error)
  return data as Pick<StudyGroup, 'id' | 'name' | 'course' | 'description'>
}

export async function deleteStudyGroup (groupId: string) {
  const { data, error } = await requireSupabase()
    .from('study_groups')
    .delete()
    .eq('id', groupId)
    .select('id')
    .maybeSingle()
  if (error) throw getSchemaError(error)
  if (!data) throw new Error('Only the group creator can delete this group, or it may already be gone.')
}

export async function leaveStudyGroupMembership (groupId: string) {
  const { data, error } = await requireSupabase()
    .from('study_group_members')
    .delete()
    .eq('group_id', groupId)
    .select('group_id')
    .maybeSingle()
  if (error) throw getSchemaError(error)
  if (!data) throw new Error('You are no longer a member of this group.')
}

function normalizeInviteCode (value: string) {
  const input = value.trim()
  if (!input) return ''
  try {
    const url = new URL(input)
    return url.searchParams.get('invite')?.trim() || ''
  } catch {
    return input
  }
}

async function getFunctionError (error: unknown) {
  if (typeof error === 'object' && error !== null && 'context' in error && error.context instanceof Response) {
    try {
      const body = await error.context.clone().json() as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return new Error(body.error)
    } catch {
      // Use the SDK error below when the response has no JSON body.
    }
  }
  return getSchemaError(error as { code?: string, message: string })
}

export async function getStudyGroupPosts (groupId: string) {
  const { data, error } = await requireSupabase().from('study_group_posts').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(100)
  if (error) throw getSchemaError(error)
  return addStudyImageUrls(data as StudyGroupPost[])
}

export async function sendStudyGroupPost (groupId: string, postType: GroupPostType, content: string, image?: File | null) {
  const text = content.trim()
  if ((!text && !image) || text.length > maxMessageLength) throw new Error('Write a message or attach an image. Messages can be up to 2,000 characters.')
  const imagePath = image ? await uploadStudyImage(image, `groups/${groupId}`) : null
  const { data, error } = await requireSupabase().from('study_group_posts').insert({ group_id: groupId, post_type: postType, content: text, image_path: imagePath }).select('*').single()
  if (error && imagePath) await requireSupabase().storage.from(studyImageBucket).remove([imagePath])
  if (error) throw getSchemaError(error)
  return addStudyImageUrls([data as StudyGroupPost]).then(posts => posts[0])
}

export function subscribeToStudyGroup (groupId: string, onPost: (post: StudyGroupPost) => void) {
  return requireSupabase().channel(`study-group:${groupId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_group_posts', filter: `group_id=eq.${groupId}` }, async payload => onPost((await addStudyImageUrls([payload.new as StudyGroupPost]))[0]))
    .subscribe()
}

export async function leaveStudyGroup (channel: RealtimeChannel | null) {
  if (channel) {
    const { error } = await requireSupabase().removeChannel(channel)
    if (error) throw new Error(getErrorMessage(error, 'Could not leave the group room cleanly.'))
  }
}

const maxMessageLength = 2000

function normalizeStudyCourse (course: string) {
  return course.trim().replace(/\s+/g, ' ').toLocaleUpperCase().slice(0, 80)
}

function requireSupabase () {
  if (!isSupabaseConfigured) {
    throw new Error('Live study rooms need a connected Supabase project.')
  }

  return getSupabaseClient()
}

function getSchemaError (error: { code?: string, message: string }) {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error('Live study rooms are not set up in Supabase yet. Run the latest supabase/schema.sql in the Supabase SQL Editor, then reload.')
  }

  return new Error(getErrorMessage(error))
}

export async function getStudyMessages (course: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to join a study room.')
  const { data, error } = await requireSupabase()
    .from('study_messages')
    .select('*')
    .eq('course', normalizeStudyCourse(course))
    .eq('institution_key', getInstitutionKey(user.institutionType, user.institution))
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    throw getSchemaError(error)
  }

  return addStudyImageUrls(data as StudyMessage[])
}

export async function openStudyRoom (courseInput: string) {
  const course = normalizeStudyCourse(courseInput)
  if (!course) throw new Error('Choose a course before opening a room.')

  const client = requireSupabase()
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to open a study room.')
  const institutionKey = getInstitutionKey(user.institutionType, user.institution)
  const { error: openError } = await client
    .from('study_rooms')
    .upsert({ course, institution_key: institutionKey }, { onConflict: 'institution_key,course', ignoreDuplicates: true })
  if (openError) throw getSchemaError(openError)

  const { data, error } = await client.from('study_rooms').select('course').eq('institution_key', institutionKey).eq('course', course).single()
  if (error) throw getSchemaError(error)
  return data.course as string
}

export async function deleteStudyRoom (courseInput: string) {
  const course = normalizeStudyCourse(courseInput)
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to manage a study room.')
  const { data, error } = await requireSupabase()
    .from('study_rooms')
    .delete()
    .eq('institution_key', getInstitutionKey(user.institutionType, user.institution))
    .eq('course', course)
    .select('course')
    .maybeSingle()

  if (error) throw getSchemaError(error)
  if (!data) throw new Error('Only an admin can delete a live course room, or the room was already removed.')
}

export async function sendStudyMessage (
  course: string,
  messageType: StudyMessageType,
  content: string,
  image?: File | null,
) {
  course = normalizeStudyCourse(course)
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to post in a study room.')
  const text = content.trim()
  if (!text && !image) {
    throw new Error('Write a message or attach an image.')
  }
  if (text.length > maxMessageLength) {
    throw new Error(`Messages must be ${maxMessageLength} characters or fewer.`)
  }

  const imagePath = image ? await uploadStudyImage(image, 'rooms') : null
  const { data, error } = await requireSupabase()
    .from('study_messages')
    .insert({
      course,
      institution_key: getInstitutionKey(user.institutionType, user.institution),
      message_type: messageType,
      content: text,
      image_path: imagePath,
    })
    .select('*')
    .single()

  if (error) {
    if (imagePath) await requireSupabase().storage.from(studyImageBucket).remove([imagePath])
    throw getSchemaError(error)
  }

  return (await addStudyImageUrls([data as StudyMessage]))[0]
}

export function validateStudyImage (file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP, or GIF image.')
  if (file.size > maxStudyImageSize) throw new Error('Images must be 5 MB or smaller.')
}

async function uploadStudyImage (file: File, scope: string) {
  validateStudyImage(file)
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to upload an image.')
  const safeName = file.name.replace(/[^\w.-]/g, '_').slice(-100) || 'solution-image'
  const path = `${scope}/${user.id}/${globalThis.crypto.randomUUID()}-${safeName}`
  const { error } = await requireSupabase().storage.from(studyImageBucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(getErrorMessage(error, 'Could not upload this image.'))
  return path
}

async function addStudyImageUrls<T extends { image_path?: string | null }> (items: T[]) {
  const client = requireSupabase()
  return Promise.all(items.map(async item => {
    if (!item.image_path) return { ...item, image_url: null }
    const { data, error } = await client.storage.from(studyImageBucket).createSignedUrl(item.image_path, 60 * 60)
    return { ...item, image_url: error ? null : data.signedUrl }
  }))
}

export async function subscribeToStudyRoom (
  course: string,
  onMessage: (message: StudyMessage) => void,
  onPresence: (count: number) => void,
  onError: (error: Error) => void,
  onRoomClosed?: () => void,
) {
  course = normalizeStudyCourse(course)
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in to join a study room.')
  }

  const client = requireSupabase()
  const institutionKey = getInstitutionKey(user.institutionType, user.institution)
  const channel: RealtimeChannel = client.channel(
    `study-room:${institutionKey}:${encodeURIComponent(course.toLocaleLowerCase())}`,
    { config: { private: true, presence: { key: globalThis.crypto.randomUUID() } } },
  )
  channel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_messages' }, payload => {
      const message = payload.new as StudyMessage
      if (message.course === course && message.institution_key === institutionKey) {
        void addStudyImageUrls([message]).then(items => onMessage(items[0]))
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'study_rooms' }, payload => {
      const deleted = payload.old as { course?: string, institution_key?: string }
      if (deleted.course === course && deleted.institution_key === institutionKey) onRoomClosed?.()
    })
    .on('presence', { event: 'sync' }, () => {
      onPresence(Object.values(channel.presenceState()).reduce(
        (total, members) => total + members.length,
        0,
      ))
    })

  channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      const { error } = await channel.track({
        online_at: new Date().toISOString(),
      })
      if (error) {
        onError(new Error(getErrorMessage(error, 'Could not join the live room.')))
        return
      }
      onPresence(Object.values(channel.presenceState()).reduce(
        (total, members) => total + members.length,
        0,
      ))
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onError(new Error('Could not connect to the live study room. Check your connection and try again.'))
    }
  })

  return channel
}

export async function leaveStudyRoom (channel: RealtimeChannel | null) {
  if (channel) {
    const { error } = await requireSupabase().removeChannel(channel)
    if (error) {
      throw new Error(getErrorMessage(error, 'Could not leave the live study room cleanly.'))
    }
  }
}
