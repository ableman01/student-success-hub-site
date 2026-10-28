export const institutionTypes = [
  { title: 'University', value: 'university' },
  { title: 'Polytechnic', value: 'polytechnic' },
  { title: 'College of Education', value: 'education' },
  { title: 'Monotechnic', value: 'monotechnic' },
]

// Names are kept in one place so signup and profile editing always use the same options.
// LASU remains the default for existing LASU hub accounts with no saved institution.
const institutionsByType: Record<string, string[]> = {
  university: [
    'Abia State University, Uturu', 'Abubakar Tafawa Balewa University, Bauchi', 'Adekunle Ajasin University, Akungba-Akoko', 'Ahmadu Bello University, Zaria', 'Ambrose Alli University, Ekpoma', 'American University of Nigeria, Yola', 'Babcock University, Ilishan-Remo', 'Bayero University, Kano', 'Benue State University, Makurdi', 'Bells University of Technology, Ota', 'Bingham University, Karu', 'Bowen University, Iwo', 'Caleb University, Lagos', 'Chukwuemeka Odumegwu Ojukwu University, Uli', 'Covenant University, Ota', 'Crawford University, Igbesa', 'Delta State University, Abraka', 'Ebonyi State University, Abakaliki', 'Edo State University, Uzairue', 'Ekiti State University, Ado-Ekiti', 'Elizade University, Ilara-Mokin', 'Enugu State University of Science and Technology, Enugu', 'Federal University of Agriculture, Abeokuta', 'Federal University of Technology, Akure', 'Federal University of Technology, Minna', 'Federal University of Technology, Owerri', 'Federal University, Oye-Ekiti', 'Federal University, Dutse', 'Federal University, Kashere', 'Federal University, Lokoja', 'Federal University, Ndufu-Alike', 'Federal University, Otuoke', 'Federal University, Wukari', 'Godfrey Okoye University, Enugu', 'Ibrahim Badamasi Babangida University, Lapai', 'Imo State University, Owerri', 'Kaduna State University, Kaduna', 'Kano University of Science and Technology, Wudil', 'Kebbi State University of Science and Technology, Aliero', 'Kogi State University, Anyigba', 'Kwara State University, Malete', 'Lagos State University (LASU), Ojo', 'Lagos State University of Education, Oto/Ijanikin', 'Lagos State University of Science and Technology, Ikorodu', 'Ladoke Akintola University of Technology, Ogbomoso', 'Landmark University, Omu-Aran', 'Lead City University, Ibadan', 'Madonna University, Okija', 'Nasarawa State University, Keffi', 'National Open University of Nigeria', 'Niger Delta University, Wilberforce Island', 'Nigerian Defence Academy, Kaduna', 'Nnamdi Azikiwe University, Awka', 'Obafemi Awolowo University, Ile-Ife', 'Olabisi Onabanjo University, Ago-Iwoye', 'Osun State University, Osogbo', 'Pan-Atlantic University, Lagos', 'River State University, Port Harcourt', 'University of Abuja', 'University of Benin', 'University of Calabar', 'University of Ibadan', 'University of Ilorin', 'University of Jos', 'University of Lagos (UNILAG), Akoka', 'University of Maiduguri', 'University of Nigeria, Nsukka', 'University of Port Harcourt', 'University of Uyo', 'Usmanu Danfodiyo University, Sokoto', 'Other Nigerian university',
  ],
  polytechnic: [
    'Abia State Polytechnic, Aba', 'Abubakar Tatari Ali Polytechnic, Bauchi', 'Auchi Polytechnic, Auchi', 'Federal Polytechnic, Ado-Ekiti', 'Federal Polytechnic, Bida', 'Federal Polytechnic, Ilaro', 'Federal Polytechnic, Nekede', 'Federal Polytechnic, Oko', 'Hussaini Adamu Federal Polytechnic, Kazaure', 'Institute of Management and Technology, Enugu', 'Kaduna Polytechnic, Kaduna', 'Kano State Polytechnic, Kano', 'Lagos State Polytechnic / Lagos State University of Science and Technology, Ikorodu', 'Moshood Abiola Polytechnic, Abeokuta', 'Nasarawa State Polytechnic, Lafia', 'Niger State Polytechnic, Zungeru', 'The Polytechnic, Ibadan', 'Yaba College of Technology, Lagos', 'Other Nigerian polytechnic',
  ],
  education: [
    'Adeyemi Federal University of Education, Ondo', 'Alvan Ikoku Federal University of Education, Owerri', 'Federal College of Education, Abeokuta', 'Federal College of Education (Technical), Akoka, Lagos', 'Federal College of Education (Technical), Asaba', 'Federal College of Education (Technical), Gusau', 'Federal College of Education (Technical), Omoku', 'Federal College of Education, Kano', 'Federal College of Education, Kontagora', 'Federal College of Education, Okene', 'Federal College of Education, Pankshin', 'Federal College of Education, Yola', 'Kwara State College of Education, Ilorin', 'Lagos State College of Education, Oto/Ijanikin', 'Nwafor Orizu College of Education, Nsugbe', 'Tai Solarin Federal University of Education, Ijagun', 'Other Nigerian college of education',
  ],
  monotechnic: [
    'Air Force Institute of Technology, Kaduna', 'Federal College of Agriculture, Akure', 'Federal College of Fisheries and Marine Technology, Lagos', 'Federal College of Forestry, Ibadan', 'Federal College of Wildlife Management, New Bussa', 'Nigerian College of Aviation Technology, Zaria', 'Nigerian Institute of Leather and Science Technology, Zaria', 'Nigerian Institute of Transport Technology, Zaria', 'Nigerian Maritime University, Okerenkoko', 'Other Nigerian monotechnic',
  ],
}

export function getInstitutions (type: string) {
  return (institutionsByType[type] || []).map(name => ({ title: name, value: name }))
}

export function getDefaultInstitution (type: string) {
  return type === 'university' ? 'Lagos State University (LASU), Ojo' : ''
}
