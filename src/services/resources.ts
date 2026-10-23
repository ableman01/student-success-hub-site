import { getCourseAcademicLevel } from '@/lib/academics'
import { type AppUser, getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/errors'
import { findDuplicateIds, getResourceIdentityKey } from '@/lib/identity'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export type ResourceKind = 'class_material' | 'past_question'
export type ResourceCategory = 'past_question' | 'lecture_notes'
export type ResourceStatus = 'pending' | 'approved' | 'rejected'

export const resourceCategories: { title: string, value: ResourceCategory }[] = [
  { title: 'Past questions', value: 'past_question' },
  { title: 'Lecture notes', value: 'lecture_notes' },
]

export function getResourceCategoryLabel (category: ResourceCategory) {
  return resourceCategories.find(option => option.value === category)?.title || 'Course material'
}

export interface Resource {
  id: string
  title: string
  course: string
  description: string
  kind: ResourceKind
  category: ResourceCategory
  academic_level: string | null
  file_name: string
  file_path: string
  uploaded_by: string
  uploaded_by_name: string
  status: ResourceStatus
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
  url: string
}

export interface AppNotification {
  id: string
  type: 'resource_uploaded' | 'resource_approved' | 'resource_rejected'
  message: string
  resource_id: string | null
  is_read: boolean
  created_at: string
}

export interface NewResource {
  title: string
  course: string
  description: string
  kind: ResourceKind
  category?: ResourceCategory
  file: File
  academic_level?: string | null
}

const databaseName = 'student-success-hub'
const storeName = 'shared-pdfs'
const bucketName = 'student-resources'
const maxFileSize = 20 * 1024 * 1024

function matchesAcademicLevel (resource: Resource, academicLevel: string) {
  const courseLevel = getCourseAcademicLevel(resource.course)
  if (courseLevel) {
    return courseLevel === academicLevel
  }

  return !resource.academic_level || resource.academic_level === academicLevel
}

function getContributorName (user: AppUser) {
  const firstName = user.firstName === user.email ? '' : user.firstName
  return [firstName, user.lastName].filter(Boolean).join(' ').trim() || 'LASU student'
}

function openLocalDatabase () {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.addEventListener('error', () => reject(request.error || new Error('Could not open local PDF storage.')))
  })
}

async function localTransaction<T> (
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openLocalDatabase()

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = action(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.addEventListener('error', () => reject(request.error || new Error('Local PDF storage failed.')))
    transaction.oncomplete = () => database.close()
    transaction.addEventListener('error', () => reject(transaction.error || new Error('Local PDF storage failed.')))
  })
}

async function normalizeResource (
  row: Omit<Resource, 'url'>,
): Promise<Resource> {
  const { data, error } = await getSupabaseClient()
    .storage
    .from(bucketName)
    .createSignedUrl(row.file_path, 60 * 60)

  if (error) {
    throw new Error(getErrorMessage(error))
  }

  return { ...row, url: data.signedUrl }
}

function validateResource (resource: NewResource) {
  if (!resource.title.trim()) {
    throw new Error('Add a title for this PDF.')
  }
  const fileExtension = resource.file.name.toLowerCase().split('.').pop()
  const isPdf = resource.file.type === 'application/pdf' || fileExtension === 'pdf'
  if (!isPdf) {
    throw new Error('Only PDF documents can be uploaded.')
  }
  if (resource.file.size > maxFileSize) {
    throw new Error('PDFs must be 20 MB or smaller.')
  }
}

export async function getResources (kind: ResourceKind, academicLevel?: string) {
  if (!isSupabaseConfigured) {
    const rows = await localTransaction<Array<Resource & { blob: Blob }>>(
      'readonly',
      store => store.getAll(),
    )

    return rows
      .filter(resource => resource.kind === kind)
      .filter(resource =>
        kind !== 'class_material'
        || !academicLevel
        || matchesAcademicLevel(resource, academicLevel),
      )
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ blob, ...resource }) => ({
        ...resource,
        status: resource.status || 'approved',
        reviewed_at: resource.reviewed_at || null,
        review_comment: resource.review_comment || null,
        category: resource.category || (resource.kind === 'past_question' ? 'past_question' : 'lecture_notes'),
        uploaded_by_name: resource.uploaded_by_name || 'LASU student',
        url: URL.createObjectURL(blob),
      }))
  }

  const query = getSupabaseClient()
    .from('resources')
    .select('*')
    .eq('kind', kind)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    if (error.code === 'PGRST205') {
      throw new Error(
        'Supabase is connected, but the shared resource table is not installed. Run supabase/schema.sql in the Supabase SQL Editor, then reload this page.',
      )
    }
    if (error.code === 'PGRST204' || error.code === '42703') {
      throw new Error(
        'The Supabase resources table needs the latest category and contributor fields. Run the latest resource migration, then reload this page.',
      )
    }

    throw new Error(getErrorMessage(error))
  }

  const resources = await Promise.all(data.filter(row => row.status !== 'rejected').map(row => normalizeResource(row)))

  return resources
    .filter(resource => kind !== 'class_material' || !academicLevel || matchesAcademicLevel(resource, academicLevel))
}

export async function isResourceModerator (userId: string) {
  if (!isSupabaseConfigured) {
    return false
  }

  const { data, error } = await getSupabaseClient()
    .from('resource_moderators')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  return Boolean(data)
}

export async function getPendingResources () {
  const { data, error } = await getSupabaseClient()
    .from('resources')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  return Promise.all(data.map(row => normalizeResource(row)))
}

export async function reviewResource (resourceId: string, status: Exclude<ResourceStatus, 'pending'>, reviewComment: string) {
  const comment = reviewComment.trim()
  if (status === 'rejected' && !comment) {
    throw new Error('Add a reason before rejecting this upload.')
  }
  if (comment.length > 400) {
    throw new Error('Review comments must be 400 characters or fewer.')
  }
  const { data, error } = await getSupabaseClient()
    .from('resources')
    .update({ status, reviewed_at: new Date().toISOString(), review_comment: comment || null })
    .eq('id', resourceId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  if (!data) {
    throw new Error('This upload was already reviewed or is no longer available.')
  }
  return normalizeResource(data)
}

export async function getNotifications () {
  const { data, error } = await getSupabaseClient()
    .from('app_notifications')
    .select('id, type, message, resource_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  return data as AppNotification[]
}

export async function markNotificationsRead (ids: string[]) {
  if (ids.length === 0) {
    return
  }
  const { error } = await getSupabaseClient()
    .from('app_notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('is_read', false)

  if (error) {
    throw new Error(getErrorMessage(error))
  }
}

const savedResourcesStoragePrefix = 'student-hub-saved-resources:'

export async function getSavedResourceIds () {
  const user = await getCurrentUser()
  if (!user) {
    return [] as string[]
  }

  if (!isSupabaseConfigured) {
    try {
      const saved = JSON.parse(localStorage.getItem(`${savedResourcesStoragePrefix}${user.id}`) || '[]')
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return [] as string[]
    }
  }

  const { data, error } = await getSupabaseClient()
    .from('saved_resources')
    .select('resource_id')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(getErrorMessage(error))
  }
  return data.map(item => item.resource_id)
}

export async function setResourceSaved (resourceId: string, saved: boolean) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in to save study materials to your profile.')
  }

  if (!isSupabaseConfigured) {
    const key = `${savedResourcesStoragePrefix}${user.id}`
    const current = new Set(await getSavedResourceIds())
    if (saved) {
      current.add(resourceId)
    } else {
      current.delete(resourceId)
    }
    localStorage.setItem(key, JSON.stringify([...current]))
    return
  }

  if (saved) {
    const { error } = await getSupabaseClient()
      .from('saved_resources')
      .insert({ user_id: user.id, resource_id: resourceId })
    if (error && error.code !== '23505') {
      throw new Error(getErrorMessage(error))
    }
    return
  }

  const { error } = await getSupabaseClient()
    .from('saved_resources')
    .delete()
    .eq('resource_id', resourceId)

  if (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function uploadResource (input: NewResource) {
  validateResource(input)
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in before uploading a PDF.')
  }

  const existingResources = await getResources(input.kind, input.academic_level || undefined)
  const duplicate = existingResources.find(resource =>
    inSameLibrary(resource, input.kind, input.academic_level)
    && getResourceIdentityKey(resource.course, resource.title) === getResourceIdentityKey(input.course, input.title),
  )
  if (duplicate) {
    throw new Error(
      `“${duplicate.title}” for ${duplicate.course || 'this course'} is already in the library. You can edit that material instead of uploading it again.`,
    )
  }

  const fileName = input.file.name

  if (!isSupabaseConfigured) {
    const resource: Resource = {
      id: globalThis.crypto.randomUUID(),
      title: input.title.trim(),
      course: input.course.trim(),
      description: input.description.trim(),
      kind: input.kind,
      category: input.category || (input.kind === 'past_question' ? 'past_question' : 'lecture_notes'),
      academic_level: input.academic_level || null,
      file_name: fileName,
      file_path: fileName,
      uploaded_by: user.id,
      uploaded_by_name: getContributorName(user),
      status: 'approved',
      reviewed_at: null,
      review_comment: null,
      created_at: new Date().toISOString(),
      url: '',
    }

    await localTransaction<IDBValidKey>('readwrite', store => store.put({
      ...resource,
      blob: input.file,
    }))
    return resource
  }

  const safeFileName = fileName.replace(/[^\w.-]/g, '_')
  const filePath = `${user.id}/${globalThis.crypto.randomUUID()}-${safeFileName}`
  const { error: uploadError } = await getSupabaseClient()
    .storage
    .from(bucketName)
    .upload(filePath, input.file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(getErrorMessage(uploadError))
  }

  const { data, error } = await getSupabaseClient()
    .from('resources')
    .insert({
      title: input.title.trim(),
      course: input.course.trim(),
      description: input.description.trim(),
      kind: input.kind,
      category: input.category || (input.kind === 'past_question' ? 'past_question' : 'lecture_notes'),
      academic_level: input.academic_level || null,
      file_name: fileName,
      file_path: filePath,
      uploaded_by: user.id,
      uploaded_by_name: getContributorName(user),
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    const { error: cleanupError } = await getSupabaseClient()
      .storage
      .from(bucketName)
      .remove([filePath])

    if (cleanupError) {
      throw new Error(`${error.message} The uploaded file could not be cleaned up: ${cleanupError.message}`)
    }

    throw new Error(getErrorMessage(error))
  }

  return normalizeResource(data)
}

export async function deleteResource (resource: Resource) {
  const user = await getCurrentUser()
  if (!user || !await isResourceModerator(user.id)) {
    throw new Error('Only the site creator can delete shared resources.')
  }

  if (!isSupabaseConfigured) {
    await localTransaction<undefined>('readwrite', store => store.delete(resource.id))
    URL.revokeObjectURL(resource.url)
    return
  }

  const client = getSupabaseClient()
  const { error: fileError } = await client.storage.from(bucketName).remove([resource.file_path])
  if (fileError) {
    throw new Error(getErrorMessage(fileError))
  }

  const { error } = await client
    .from('resources')
    .delete()
    .eq('id', resource.id)

  if (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function updateResource (
  resourceId: string,
  changes: Partial<Pick<Resource, 'title' | 'course' | 'description' | 'category' | 'academic_level'>>,
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in before updating a resource.')
  }

  const moderator = await isResourceModerator(user.id)

  

  // Only the site admin (resource moderator) can edit shared resources.
  if (!moderator) {
    throw new Error('Only the admin can edit class materials and past questions.')
  }
if (!isSupabaseConfigured) {
    const existing = await localTransaction<Resource & { blob: Blob } | undefined>(
      'readonly',
      store => store.get(resourceId),
    )
    if (!existing) {
      throw new Error('Material not found.')
    }
    if (existing.uploaded_by !== user.id && !moderator) {
      throw new Error('You can only edit the class materials you shared.')
    }

    const updated: Resource & { blob: Blob } = {
      ...existing,
      title: changes.title === undefined ? existing.title : changes.title.trim(),
      course: changes.course === undefined ? existing.course : changes.course.trim(),
      description: changes.description === undefined ? existing.description : changes.description.trim(),
      category: changes.category === undefined ? existing.category : changes.category,
      academic_level: changes.academic_level === undefined ? existing.academic_level : changes.academic_level,
    }
    await localTransaction<IDBValidKey>('readwrite', store => store.put(updated))
    return {
      ...updated,
      url: URL.createObjectURL(updated.blob),
    }
  }

  const client = getSupabaseClient()
  const updateData: Record<string, unknown> = {}
  if (changes.title !== undefined) {
    updateData.title = changes.title.trim()
  }
  if (changes.course !== undefined) {
    updateData.course = changes.course.trim()
  }
  if (changes.description !== undefined) {
    updateData.description = changes.description.trim()
  }
  if (changes.category !== undefined) {
    updateData.category = changes.category
  }
  if (changes.academic_level !== undefined) {
    updateData.academic_level = changes.academic_level
  }

  const query = client
    .from('resources')
    .update(updateData)
    .eq('id', resourceId)

  // Admin edits any resource; no uploader restriction.

  const { data, error } = await query.select('*').single()

  if (error) {
    if (error.code === '42501') {
      throw new Error('Your account cannot edit this material yet. Ask the site creator to run the shared-resource edit migration.')
    }
    throw new Error(getErrorMessage(error))
  }
  return normalizeResource(data)
}

function inSameLibrary (resource: Resource, kind: ResourceKind, academicLevel: string | null | undefined) {
  return resource.kind === kind
    && (!academicLevel || resource.academic_level === academicLevel || matchesAcademicLevel(resource, academicLevel))
}

function getResourceGroupKey (resource: Resource) {
  return `${resource.kind}::${getResourceIdentityKey(resource.course, resource.title)}`
}

/**
 * Orders shared materials so the most useful copy of a duplicate wins:
 * an approved material beats a pending one, then the newest upload.
 */
function compareResources (a: Resource, b: Resource) {
  const statusRank: Record<ResourceStatus, number> = { approved: 3, pending: 2, rejected: 1 }
  return (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0)
    || b.created_at.localeCompare(a.created_at)
    || a.id.localeCompare(b.id)
}

export function deduplicateAndSortResources (resources: Resource[]): Resource[] {
  const groups = new Map<string, Resource[]>()

  for (const resource of resources) {
    const key = getResourceGroupKey(resource)
    const group = groups.get(key)
    if (group) {
      group.push(resource)
    } else {
      groups.set(key, [resource])
    }
  }

  return [...groups.values()]
    .map(group => group.toSorted(compareResources)[0]!)
    .toSorted((a, b) => a.course.localeCompare(b.course, undefined, { sensitivity: 'base' })
      || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}

/**
 * The ids of the repeated class materials inside a library.
 * A past question and a class material never count as duplicates of each other.
 */
export function findDuplicateResourceIds (resources: Resource[]) {
  return findDuplicateIds(
    resources,
    getResourceGroupKey,
    compareResources,
  )
}

/** Permanently removes the repeated copies of a shared material. */
export async function removeDuplicateResources (resources: Resource[]) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !await isResourceModerator(currentUser.id)) {
    throw new Error('Only the site creator can clear duplicate materials.')
  }

  const duplicateIds = findDuplicateResourceIds(resources)
  if (duplicateIds.length === 0) {
    return []
  }

  const duplicates = resources.filter(resource => duplicateIds.includes(resource.id))

  for (const duplicate of duplicates) {
    await deleteResource(duplicate)
  }

  return duplicateIds
}
