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
