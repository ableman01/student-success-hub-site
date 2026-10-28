export const academicLevels = [
  { title: '100 Level', value: '100' },
  { title: '200 Level', value: '200' },
  { title: '300 Level', value: '300' },
  { title: '400 Level', value: '400' },
  { title: '500 Level', value: '500' },
  { title: '600 Level', value: '600' },
  { title: '700 Level', value: '700' },
]

const diplomaLevels = [
  { title: 'ND 1', value: 'ND1' },
  { title: 'ND 2', value: 'ND2' },
  { title: 'HND 1', value: 'HND1' },
  { title: 'HND 2', value: 'HND2' },
]

const educationLevels = [
  { title: 'NCE 1', value: 'NCE1' },
  { title: 'NCE 2', value: 'NCE2' },
  { title: 'NCE 3', value: 'NCE3' },
  ...academicLevels.slice(0, 6),
]

export function getAcademicLevels (institutionType: string) {
  if (institutionType === 'polytechnic' || institutionType === 'monotechnic') {
    return diplomaLevels
  }
  if (institutionType === 'education') {
    return educationLevels
  }
  return academicLevels
}

export type AcademicLevel = typeof academicLevels[number]['value']

export function getCourseAcademicLevel (course: string) {
  const courseCode = course.match(/(?:^|\D)([1-7]\d{2})(?!\d)/)
  if (!courseCode) {
    return null
  }

  const courseNumber = Number(courseCode[1])
  const levelStart = Math.floor(courseNumber / 100) * 100
  return courseNumber <= levelStart + 90 ? String(levelStart) : null
}

export function getAcademicLevelLabel (level: string | null | undefined) {
  return [...academicLevels, ...diplomaLevels, ...educationLevels].find(option => option.value === level)?.title || 'Level not set'
}
