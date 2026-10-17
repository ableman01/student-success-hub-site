import { getCourseAcademicLevel } from '@/lib/academics'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export type ResourceKind = 'class_material' | 'past_question'

export interface Resource {
  id: string
  title: string
  course: string
  description: string
  kind: ResourceKind
  academic_level: string | null
  file_name: string
  file_path: string
  uploaded_by: string
  created_at: string
  url: string
}

export interface NewResource {
  title: string
  course: string
  description: string
  kind: ResourceKind
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

function normalizeResource (
  row: Omit<Resource, 'url'>,
): Resource {
  const { data } = getSupabaseClient()
    .storage
    .from(bucketName)
    .getPublicUrl(row.file_path)

  return { ...row, url: data.publicUrl }
}

function validateResource (resource: NewResource) {
  if (!resource.title.trim()) {
    throw new Error('Add a title for this PDF.')
  }
  if (resource.file.type !== 'application/pdf' && !resource.file.name.toLowerCase().endsWith('.pdf')) {
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
        'The Supabase resources table needs the latest academic_level column. Re-run supabase/schema.sql in the Supabase SQL Editor, then reload this page.',
      )
    }

    throw new Error(getErrorMessage(error))
  }

  const resources = data.map(row => normalizeResource(row))

  return kind === 'class_material' && academicLevel
    ? resources.filter(resource => matchesAcademicLevel(resource, academicLevel))
    : resources
}

export async function uploadResource (input: NewResource) {
  validateResource(input)
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sign in before uploading a PDF.')
  }

  const fileName = input.file.name

  if (!isSupabaseConfigured) {
    const resource: Resource = {
      id: globalThis.crypto.randomUUID(),
      title: input.title.trim(),
      course: input.course.trim(),
      description: input.description.trim(),
      kind: input.kind,
      academic_level: input.academic_level || null,
      file_name: fileName,
      file_path: fileName,
      uploaded_by: user.id,
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
      academic_level: input.academic_level || null,
      file_name: fileName,
      file_path: filePath,
      uploaded_by: user.id,
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
