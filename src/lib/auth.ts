import type { User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

const demoAccountKey = 'student-hub-demo-account'
const demoSignedInKey = 'student-hub-demo-signed-in'

export interface AppUser {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  academicLevel: string
  program: string
}

interface DemoAccount extends AppUser {
  lastName: string
  passwordHash: string
}

function toAppUser (user: User): AppUser {
  return {
    id: user.id,
    email: user.email || '',
    firstName: String(user.user_metadata.first_name || user.email || 'Student'),
    lastName: String(user.user_metadata.last_name || ''),
    dateOfBirth: String(user.user_metadata.date_of_birth || ''),
    gender: String(user.user_metadata.gender || ''),
    academicLevel: String(user.user_metadata.academic_level || ''),
    program: String(user.user_metadata.program || ''),
  }
}

function getDemoAccount (): DemoAccount | null {
  const savedAccount = sessionStorage.getItem(demoAccountKey)

  if (!savedAccount) {
    return null
  }

  try {
    return JSON.parse(savedAccount) as DemoAccount
  } catch {
    sessionStorage.removeItem(demoAccountKey)
    throw new Error('The local demo account is corrupted. Please sign up again.')
  }
}

async function hashPassword (password: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure browser storage is unavailable. Open the app at localhost.')
  }

  const bytes = new TextEncoder().encode(password)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function getCurrentUser (): Promise<AppUser | null> {
  if (!isSupabaseConfigured) {
    if (sessionStorage.getItem(demoSignedInKey) !== 'true') {
      return null
    }

    const account = getDemoAccount()
    return account
      ? {
          id: account.id,
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          dateOfBirth: account.dateOfBirth || '',
          gender: account.gender || '',
          academicLevel: account.academicLevel || '',
          program: account.program || '',
        }
      : null
  }

  const auth = getSupabaseClient().auth
  const { data: sessionData, error: sessionError } = await auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!sessionData.session) {
    return null
  }

  const { data, error } = await auth.getUser()
  if (error) {
    throw error
  }
  return data.user ? toAppUser(data.user) : null
}

export async function hasAuthSession () {
  if (!isSupabaseConfigured) {
    return sessionStorage.getItem(demoSignedInKey) === 'true'
      && getDemoAccount() !== null
  }

  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) {
    throw error
  }
  return Boolean(data.session)
}

export async function signUp (input: {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  email: string
  password: string
  academicLevel: string
  program: string
}) {
  const email = input.email.trim().toLowerCase()
  const profileMetadata = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    academic_level: input.academicLevel,
    program: input.program.trim(),
  }

  if (isSupabaseConfigured) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password: input.password,
      options: {
        data: profileMetadata,
        emailRedirectTo: `${window.location.origin}/auth/confirm?confirmed=1`,
      },
    })

    if (error) {
      if (
        error.code === 'user_already_exists'
        || /already registered|email.*already exists/i.test(error.message)
      ) {
        throw new Error('This email already has an account. Log in instead, or reset your password if needed.')
      }
      throw error
    }

    if (data.user?.identities?.length === 0) {
      throw new Error('This email already has an account. Log in instead, or reset your password if needed.')
    }

    return { user: data.user ? toAppUser(data.user) : null, hasSession: Boolean(data.session) }
  }

  const existingAccount = getDemoAccount()
  if (existingAccount) {
    if (existingAccount.email === email) {
      throw new Error('This email already has an account. Log in instead.')
    }

    throw new Error('Local test mode supports one account per browser tab. Clear this tab’s session before testing another email.')
  }

  const account: DemoAccount = {
    id: globalThis.crypto.randomUUID(),
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    academicLevel: input.academicLevel,
    program: input.program.trim(),
    passwordHash: await hashPassword(input.password),
  }

  sessionStorage.setItem(demoAccountKey, JSON.stringify(account))
  sessionStorage.setItem(demoSignedInKey, 'true')
  return {
    user: toDemoUser(account),
    hasSession: true,
  }
}

function toDemoUser (account: DemoAccount): AppUser {
  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    dateOfBirth: account.dateOfBirth || '',
    gender: account.gender || '',
    academicLevel: account.academicLevel || '',
    program: account.program || '',
  }
}

export async function signIn (email: string, password: string) {
  if (isSupabaseConfigured) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      throw error
    }
    return data.user ? toAppUser(data.user) : null
  }

  const account = getDemoAccount()
  if (!account || account.email !== email.trim().toLowerCase()) {
    throw new Error('No matching demo account was found in this browser tab. Please sign up first.')
  }

  if (account.passwordHash !== await hashPassword(password)) {
    throw new Error('The email or password is incorrect.')
  }

  sessionStorage.setItem(demoSignedInKey, 'true')
  return toDemoUser(account)
}

export async function updateProfile (input: {
  firstName: string
  lastName: string
  email: string
  academicLevel: string
  program: string
}) {
  const email = input.email.trim().toLowerCase()
  if (!email || !input.firstName.trim() || !input.lastName.trim() || !input.academicLevel) {
    throw new Error('Enter your first name, last name, email, and academic level.')
  }

  if (!isSupabaseConfigured) {
    const account = getDemoAccount()
    if (!account) {
      throw new Error('No local account was found.')
    }

    const updatedAccount: DemoAccount = {
      ...account,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      academicLevel: input.academicLevel,
      program: input.program.trim(),
    }
    sessionStorage.setItem(demoAccountKey, JSON.stringify(updatedAccount))
    return toDemoUser(updatedAccount)
  }

  const { data: currentData, error: currentError } = await getSupabaseClient().auth.getUser()
  if (currentError) {
    throw currentError
  }
  if (!currentData.user) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const metadata = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    date_of_birth: String(currentData.user.user_metadata.date_of_birth || ''),
    gender: String(currentData.user.user_metadata.gender || ''),
    academic_level: input.academicLevel,
    program: input.program.trim(),
  }
  const attributes: {
    email?: string
    data: typeof metadata
  } = { data: metadata }

  if (email !== (currentData.user.email || '').toLowerCase()) {
    attributes.email = email
  }

  const { data, error } = await getSupabaseClient().auth.updateUser(attributes)
  if (error) {
    throw error
  }
  if (!data.user) {
    throw new Error('Supabase did not return the updated profile.')
  }
  return toAppUser(data.user)
}

export async function changePassword (currentPassword: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('Use a new password of at least 8 characters.')
  }

  if (!isSupabaseConfigured) {
    const account = getDemoAccount()
    if (!account) {
      throw new Error('No local account was found.')
    }
    if (account.passwordHash !== await hashPassword(currentPassword)) {
      throw new Error('Your current password is incorrect.')
    }

    sessionStorage.setItem(demoAccountKey, JSON.stringify({
      ...account,
      passwordHash: await hashPassword(newPassword),
    }))
    return
  }

  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const { error: verificationError } = await getSupabaseClient().auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verificationError) {
    throw new Error('Your current password is incorrect.')
  }

  const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword })
  if (error) {
    throw error
  }
}

export async function signOut () {
  if (isSupabaseConfigured) {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) {
      throw error
    }
    return
  }

  sessionStorage.removeItem(demoSignedInKey)
}
