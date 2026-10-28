import { institutionsByType } from './institution-data'

export const institutionTypes = [
  { title: 'University', value: 'university' },
  { title: 'Polytechnic', value: 'polytechnic' },
  { title: 'College of Education', value: 'education' },
  { title: 'Monotechnic', value: 'monotechnic' },
]
export const otherInstitutionValue = '__other__'

// LASU remains the default for existing LASU hub accounts with no saved institution.

export function getInstitutions (type: string) {
  const names = institutionsByType[type] || []
  return [
    ...names.filter(name => !/^Lagos State University, Ojo, Lagos$/i.test(name)).map(name => ({ title: name, value: name })),
    ...(type === 'university' ? [{ title: 'Lagos State University (LASU), Ojo', value: 'Lagos State University (LASU), Ojo' }] : []),
    { title: 'Other (enter institution name)', value: otherInstitutionValue },
  ]
}

export function getDefaultInstitution (type: string) {
  return type === 'university' ? 'Lagos State University (LASU), Ojo' : ''
}

export function getInstitutionKey (type: string, institution: string) {
  const normalizedType = type.trim().toLocaleLowerCase('en-US')
  const normalizedName = institution.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
  const canonicalName = normalizedType === 'university'
    && /^lagos state university(?: \(lasu\))?(?:, ojo(?:, lagos)?)?$/.test(normalizedName)
    ? 'lagos state university (lasu), ojo'
    : normalizedName
  return `${normalizedType}:${canonicalName}`
}

export function isLasuInstitution (type: string, institution: string) {
  return type.trim().toLocaleLowerCase('en-US') === 'university'
    && /^lagos state university(?: \(lasu\))?(?:, ojo(?:, lagos)?)?$/i.test(institution.trim().replace(/\s+/g, ' '))
}
