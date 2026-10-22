/**
 * Shared identity rules for assignments and class materials.
 *
 * The same handout can be posted as "BIO 201" + "Week 4 notes", as "BIO201" +
 * "BIO 201 Week 4 notes", or with no course at all. Every one of those has to
 * collapse onto a single key so the library never shows the same PDF twice.
 */

const courseCodePattern = /\b([a-z]{2,4})\s?-?\s?(\d{3})\b/g
const courseCodeOnlyPattern = /\b[a-z]{2,4}\s?-?\s?\d{3}\b/g

/** Normalises a course label so "SVG 202", "svg-202" and "SVG202" share a code. */
export function normalizeCourseLabel (course: string) {
  return course
    .toLowerCase()
    .replace(courseCodePattern, (_match, letters: string, digits: string) => `${letters} ${digits}`)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Every course code inside a string, de-duplicated and in a stable order. */
export function getCourseCodes (value: string) {
  const codes = new Set<string>()

  for (const match of value.toLowerCase().matchAll(courseCodePattern)) {
    codes.add(`${match[1]} ${match[2]}`)
  }

  return [...codes].toSorted()
}

/** A title without its file extension, punctuation or course codes. */
export function getTitleWithoutCodes (title: string) {
  return title
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .replace(courseCodeOnlyPattern, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Builds the identity of an assignment or material.
 *
 * Course codes are the strongest signal, so they are collected from both the
 * course field and the title and are only counted once. The remaining title
 * words make up the second half of the key. When no course code is present
 * the plain course label is used instead, so two courses never collapse.
 */
export function getResourceIdentityKey (course: string, title: string) {
  const courseCodes = getCourseCodes(`${course} ${title}`)
  const titleWithoutCodes = getTitleWithoutCodes(title)
  const courseWithoutCodes = getTitleWithoutCodes(course)
  const courseIdentity = courseCodes.length > 0 ? courseCodes.join(' ') : courseWithoutCodes

  return `${courseIdentity}::${titleWithoutCodes}`
}

/** Groups items that share the same identity key. */
export function groupByIdentityKey<T extends { course: string, title: string }> (items: T[]) {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const key = getResourceIdentityKey(item.course, item.title)
    const group = groups.get(key)
    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  return groups
}

/**
 * The redundant copies inside a list of items.
 * The best entry of every group is kept and the rest are reported, so the
 * visible list and the cleanup step always agree on what stays.
 */
export function findDuplicateIds<T extends { id: string }> (
  items: T[],
  keyOf: (item: T) => string,
  compare: (a: T, b: T) => number,
) {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  const duplicates: string[] = []

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue
    }
    duplicates.push(...group.toSorted(compare).slice(1).map(item => item.id))
  }

  return duplicates
}
