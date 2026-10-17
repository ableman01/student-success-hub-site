export const academicLevels = [
  { title: '100 Level', value: '100' },
  { title: '200 Level', value: '200' },
  { title: '300 Level', value: '300' },
  { title: '400 Level', value: '400' },
  { title: '500 Level', value: '500' },
  { title: '600 Level', value: '600' },
]

export type AcademicLevel = typeof academicLevels[number]['value']

export function getCourseAcademicLevel (course: string) {
  const courseCode = course.match(/(?:^|\D)([1-5]\d{2})(?!\d)/)
  if (!courseCode) {
    return null
  }

  const courseNumber = Number(courseCode[1])
  const levelStart = Math.floor(courseNumber / 100) * 100
  return courseNumber <= levelStart + 90 ? String(levelStart) : null
}

export function getAcademicLevelLabel (level: string | null | undefined) {
  return academicLevels.find(option => option.value === level)?.title || 'Level not set'
}
