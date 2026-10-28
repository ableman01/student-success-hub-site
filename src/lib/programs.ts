// Searchable Nigerian undergraduate programme names. Students can also enter
// an institution-specific programme that is not in the suggestions.
export const programmeOptions = [
  'Accounting', 'Adult Education', 'Agricultural Economics', 'Agricultural Engineering', 'Agriculture',
  'Anatomy', 'Animal Science', 'Architecture', 'Banking and Finance', 'Biochemistry',
  'Biology', 'Biomedical Engineering', 'Botany', 'Building', 'Business Administration',
  'Chemical Engineering', 'Chemistry', 'Civil Engineering', 'Computer Engineering', 'Computer Science',
  'Criminology and Security Studies', 'Dentistry and Dental Surgery', 'Economics', 'Education and Biology',
  'Education and Chemistry', 'Education and English Language', 'Education and Mathematics', 'Education and Physics',
  'Education and Social Studies', 'Educational Administration', 'Electrical and Electronics Engineering', 'English Language',
  'Entrepreneurship', 'Estate Management', 'Fisheries', 'Food Science and Technology', 'Forestry and Wildlife Management',
  'French', 'Geography', 'Geology', 'Guidance and Counselling', 'History and International Studies',
  'Hospitality and Tourism Management', 'Human Anatomy', 'Industrial Chemistry', 'Industrial Design', 'Information Technology',
  'Insurance', 'International Relations', 'Law', 'Library and Information Science', 'Linguistics',
  'Marketing', 'Mass Communication', 'Mathematics', 'Mechanical Engineering', 'Medical Laboratory Science',
  'Medicine and Surgery', 'Microbiology', 'Nursing Science', 'Nutrition and Dietetics', 'Office Technology and Management',
  'Petroleum Engineering', 'Pharmacy', 'Philosophy', 'Physics', 'Physiology',
  'Political Science', 'Psychology', 'Public Administration', 'Quantity Surveying',
  'Radiography', 'Religious Studies', 'Science Laboratory Technology', 'Sociology', 'Software Engineering',
  'Statistics', 'Surveying and Geoinformatics', 'Theatre Arts', 'Urban and Regional Planning', 'Veterinary Medicine',
  'Zoology',
].toSorted((a, b) => a.localeCompare(b))

/**
 * Return programme suggestions for the selected school. Suggestions are
 * generated on demand so a newly added institution is immediately usable;
 * students can still enter an institution-specific programme not listed.
 */
export function getInstitutionProgrammes (institutionType: string, institution: string) {
  if (!institution.trim()) {
    return []
  }

  const name = institution.toLocaleLowerCase('en-US')
  let institutionSpecific: string[] = []
  if (name.includes('agriculture')) {
    institutionSpecific = ['Agriculture', 'Agricultural Economics', 'Agricultural Engineering', 'Animal Science', 'Food Science and Technology', 'Forestry and Wildlife Management']
  } else if (name.includes('technology') || name.includes('science')) {
    institutionSpecific = ['Biochemistry', 'Biology', 'Chemical Engineering', 'Chemistry', 'Computer Engineering', 'Computer Science', 'Electrical and Electronics Engineering', 'Information Technology', 'Mathematics', 'Microbiology', 'Physics', 'Software Engineering', 'Statistics']
  } else if (name.includes('education') || institutionType === 'education') {
    institutionSpecific = ['Adult Education', 'Education and Biology', 'Education and Chemistry', 'Education and English Language', 'Education and Mathematics', 'Education and Physics', 'Educational Administration', 'Guidance and Counselling']
  }

  // The full catalogue remains available for schools whose public programme
  // details are not represented by a specialised catalogue yet.
  return [...new Set([...institutionSpecific, ...programmeOptions])].toSorted((a, b) => a.localeCompare(b))
}
