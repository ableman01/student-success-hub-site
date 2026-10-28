<template>
  <main class="signup-page">
    <header class="signup-header">
      <RouterLink aria-label="LASU Student Success Hub home" class="signup-brand" to="/">
        <img alt="" src="/academic-mark.svg">
        <strong>LASU Student Success Hub</strong>
      </RouterLink>

      <div class="signup-header-actions">
        <v-btn
          :aria-label="themeLabel"
          class="signup-theme-toggle"
          icon
          rounded="circle"
          :title="themeLabel"
          variant="tonal"
          @click="toggleTheme"
        >
          <v-icon>{{ themeIcon }}</v-icon>
        </v-btn>

        <v-btn rounded="pill" to="/dashboard" variant="tonal">My dashboard</v-btn>
        <v-btn class="signup-login-link" rounded="pill" to="/login" variant="text">Already a member? Log in</v-btn>
      </div>
    </header>

    <v-card
      class="signup-card mx-auto my-6 pa-8"
      elevation="3"
      max-width="760"
      rounded="lg"
    >
      <div class="signup-card-heading">
        <div class="signup-kicker"><v-icon size="16">mdi-school-outline</v-icon> YOUR ACADEMIC SPACE</div>
        <v-card-title class="signup-card-title">Join the student community</v-card-title>
        <v-card-subtitle>Set up your profile to plan coursework, share resources, and study with classmates.</v-card-subtitle>

        <div aria-label="Three signup steps" class="signup-steps">
          <span><b>1</b> About you</span><span><b>2</b> Your studies</span><span><b>3</b> Account</span>
        </div>
      </div>

      <v-form @submit.prevent="register">
        <v-card-text class="signup-fields">
          <v-row density="compact">
            <v-col class="signup-full-row" cols="12"><div class="signup-section-title"><strong>About you</strong><span>Your name and profile details</span></div></v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="institutionType"
                color="primary"
                :items="institutionTypes"
                label="Institution category"
                prepend-inner-icon="mdi-domain"
                required
                :rules="[value => Boolean(value) || 'Choose your institution category']"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="institution"
                color="primary"
                :disabled="!institutionType"
                :items="institutionOptions"
                label="Institution name"
                prepend-inner-icon="mdi-school"
                required
                :rules="[value => Boolean(value) || 'Choose your institution']"
                variant="outlined"
              />
            </v-col>

            <v-col v-if="institution === otherInstitutionValue" cols="12" sm="6">
              <v-text-field
                v-model="otherInstitution"
                color="primary"
                label="Enter your institution name"
                maxlength="180"
                placeholder="Use the official institution name"
                required
                :rules="[
                  value => Boolean(value?.trim()) || 'Enter your institution name',
                  value => !value || value.trim().length <= 180 || 'Institution names must be 180 characters or fewer',
                ]"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="firstName"
                autocomplete="given-name"
                color="primary"
                label="First name"
                required
                :rules="[value => Boolean(value?.trim()) || 'First name is required']"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="lastName"
                autocomplete="family-name"
                color="primary"
                label="Last name"
                required
                :rules="[value => Boolean(value?.trim()) || 'Last name is required']"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="dateOfBirth"
                autocomplete="bday"
                color="primary"
                label="Date of birth"
                :max="latestDateOfBirth"
                required
                :rules="[
                  value => Boolean(value) || 'Date of birth is required',
                  value => !value || value <= latestDateOfBirth || 'Date of birth cannot be in the future',
                ]"
                type="date"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="gender"
                color="primary"
                :items="genderOptions"
                label="Sex"
                prepend-inner-icon="mdi-account-outline"
                required
                :rules="[value => Boolean(value) || 'Choose male or female']"
                variant="outlined"
              />
            </v-col>

            <v-col class="signup-full-row" cols="12"><div class="signup-section-title"><strong>Your studies</strong><span>Help us organise your academic space</span></div></v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="academicLevel"
                color="primary"
                :items="levelOptions"
                label="Current academic level"
                prepend-inner-icon="mdi-school-outline"
                required
                :rules="[value => Boolean(value) || 'Choose your current level']"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-combobox
                v-model="program"
                autocomplete="organization-title"
                color="primary"
                :items="programmeOptions"
                label="Programme or department"
                placeholder="Choose a suggestion or type your programme"
                prepend-inner-icon="mdi-book-education-outline"
                required
                :rules="[value => Boolean(value?.trim()) || 'Choose or enter your programme']"
                variant="outlined"
              />
            </v-col>

            <v-col class="signup-full-row" cols="12"><div class="signup-section-title"><strong>Account details</strong><span>Use an email address you can access</span></div></v-col>

            <v-col class="signup-full-row" cols="12">
              <v-text-field
                v-model="email"
                autocomplete="email"
                color="primary"
                hint="Each email can register once. If you already have an account, log in instead."
                label="Email"
                persistent-hint
                required
                :rules="emailRules"
                type="email"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                autocomplete="new-password"
                color="primary"
                label="Password (at least 8 characters)"
                required
                :rules="[value => (value?.length || 0) >= 8 || 'Use at least 8 characters']"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="confirmPassword"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                autocomplete="new-password"
                color="primary"
                label="Confirm password"
                required
                :rules="[
                  value => Boolean(value) || 'Confirm your password',
                  value => value === password || 'Passwords do not match',
                ]"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />
            </v-col>

            <v-col class="signup-full-row" cols="12">
              <v-expansion-panels class="mb-2">
                <v-expansion-panel title="Read the site terms and conditions">
                  <v-expansion-panel-text>
                    <ul class="signup-terms">
                      <li>Provide accurate account, identity, and academic information. Do not impersonate another person.</li>
                      <li>Upload only honest, relevant study materials that you have the right to share. Do not upload altered, misleading, private, or copyrighted material without permission.</li>
                      <li>Use respectful language and do not harass, threaten, spam, or share another person’s personal information.</li>
                      <li>Do not use the site to cheat, distribute live examination content, or break university rules or applicable law.</li>
                      <li>Keep your password private and tell the site team if you believe your account has been accessed without permission.</li>
                      <li>Shared uploads may be reviewed, hidden, or removed when they violate these terms. You remain responsible for the content you submit.</li>
                      <li>The hub is a student resource and does not guarantee that shared information is complete, correct, or an official university notice.</li>
                    </ul>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <v-checkbox
                v-model="agreedToTerms"
                color="secondary"
                label="I agree to the site terms and conditions"
                :rules="[value => value || 'You must agree to continue']"
              />
            </v-col>

            <v-col v-if="errorMessage" class="signup-full-row" cols="12">
              <v-alert
                class="mb-4"
                type="error"
                variant="tonal"
              >
                {{ errorMessage }}
              </v-alert>
            </v-col>

            <v-col v-if="successMessage" class="signup-full-row" cols="12">
              <v-alert
                class="mb-4"
                type="success"
                variant="tonal"
              >
                {{ successMessage }}
              </v-alert>
            </v-col>

            <v-col v-if="canResendConfirmation" class="signup-full-row pt-0" cols="12">
              <v-btn
                :loading="resendingConfirmation"
                prepend-icon="mdi-email-sync-outline"
                rounded="pill"
                variant="tonal"
                @click="resendConfirmation"
              >Resend confirmation email</v-btn>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="signup-actions px-4">
          <v-btn
            block
            color="primary"
            :loading="loading"
            size="large"
            type="submit"
          >
            Create account
          </v-btn>
        </v-card-actions>
      </v-form>

    </v-card>
  </main>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppTheme } from '@/composables/useAppTheme'
  import { getAcademicLevels } from '@/lib/academics'
  import { programmeOptions } from '@/lib/programs'
  import { getDefaultInstitution, getInstitutions, institutionTypes, otherInstitutionValue } from '@/lib/institutions'
  import { resendSignUpConfirmation, signUp } from '@/lib/auth'

  const router = useRouter()
  const { toggleTheme, themeIcon, themeLabel } = useAppTheme()
  const firstName = ref('')
  const lastName = ref('')
  const dateOfBirth = ref('')
  const gender = ref('')
  const academicLevel = ref('')
  const institutionType = ref('')
  const institution = ref('')
  const otherInstitution = ref('')
  const institutionOptions = computed(() => getInstitutions(institutionType.value))
  const levelOptions = computed(() => getAcademicLevels(institutionType.value))
  const selectedInstitution = computed(() => institution.value === otherInstitutionValue ? otherInstitution.value.trim() : institution.value)
  watch(institutionType, (type, previousType) => {
    if (previousType && previousType !== type) {
      institution.value = getDefaultInstitution(type)
      otherInstitution.value = ''
      academicLevel.value = ''
      program.value = ''
    } else if (!getInstitutions(type).some(option => option.value === institution.value)) {
      institution.value = getDefaultInstitution(type)
    }
  })
  const program = ref('')
  watch(institution, (next, previous) => {
    if (previous && next !== previous) program.value = ''
  })
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)
  const agreedToTerms = ref(false)
  const loading = ref(false)
  const resendingConfirmation = ref(false)
  const canResendConfirmation = ref(false)
  const successMessage = ref('')
  const errorMessage = ref('')
  const genders = new Set(['Female', 'Male'])
  const genderOptions = [...genders]
  const latestDateOfBirth = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000,
  ).toISOString().slice(0, 10)
  const emailRules = [
    (value: string) => Boolean(value?.trim()) || 'Email is required',
    (value: string) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value || '')
      || 'Enter a valid email address',
  ]
  function getErrorMessage (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (/error sending confirmation email|email_send_failed/i.test(message)) {
      return 'Your account may have been created, but Supabase could not send the confirmation email. Check your inbox and spam folder, then use Resend confirmation email. If delivery keeps failing, the project owner needs to check Supabase Auth SMTP settings.'
    }
    if (/redirect.*(not allowed|allowlist)|email_redirect/i.test(message)) {
      return 'Supabase rejected the confirmation link address. Add this site URL and /auth/confirm to the Supabase Auth redirect URL allowlist, then try again.'
    }
    if (/rate limit|too many requests/i.test(message)) {
      return 'Too many signup or email requests were made. Wait a few minutes, then try again.'
    }
    if (/password.*(weak|characters|at least)/i.test(message)) {
      return 'Choose a stronger password with at least 8 characters, then try again.'
    }
    return message || 'Registration failed. Please check your details and try again.'
  }

  async function register () {
    errorMessage.value = ''
    successMessage.value = ''
    canResendConfirmation.value = false

    if (!firstName.value.trim() || !lastName.value.trim()) {
      errorMessage.value = 'Enter your first and last name.'
      return
    }

    if (!dateOfBirth.value || dateOfBirth.value > latestDateOfBirth) {
      errorMessage.value = 'Enter a valid date of birth that is not in the future.'
      return
    }

    if (!genders.has(gender.value)) {
      errorMessage.value = 'Choose male or female.'
      return
    }

    const emailParts = email.value.trim().split('@')
    const emailDomain = emailParts[1] || ''
    if (
      emailParts.length !== 2
      || !emailParts[0]
      || !emailDomain.includes('.')
      || emailDomain.startsWith('.')
      || emailDomain.endsWith('.')
      || /\s/.test(email.value)
    ) {
      errorMessage.value = 'Enter a valid email address.'
      return
    }

    if (!academicLevel.value) {
      errorMessage.value = 'Choose your current academic level.'
      return
    }

    if (!program.value.trim()) {
      errorMessage.value = 'Choose or enter your programme or department.'
      return
    }

    if (!institutionType.value || !selectedInstitution.value) {
      errorMessage.value = 'Choose your institution category and institution.'
      return
    }

    if (password.value.length < 8) {
      errorMessage.value = 'Use a password of at least 8 characters.'
      return
    }

    if (confirmPassword.value !== password.value) {
      errorMessage.value = 'The passwords do not match.'
      return
    }

    if (!agreedToTerms.value) {
      errorMessage.value = 'Please agree to the terms and conditions.'
      return
    }

    loading.value = true

    try {
      const { user, hasSession } = await signUp({
        email: email.value.trim().toLowerCase(),
        password: password.value,
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        dateOfBirth: dateOfBirth.value,
        gender: gender.value,
        academicLevel: academicLevel.value,
        institutionType: institutionType.value,
        institution: selectedInstitution.value,
        program: program.value,
      })
      if (!user) {
        throw new Error('Supabase did not return a new account. Please try again.')
      }

      if (hasSession) {
        await router.replace('/dashboard')
      } else {
        canResendConfirmation.value = true
        await router.replace({
          path: '/login',
          query: { signup: 'confirmation-sent' },
        })
      }
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      if (/already (has an account|registered)|already exists|error sending confirmation email|email_send_failed/i.test(error instanceof Error ? error.message : '')) canResendConfirmation.value = true
    } finally {
      loading.value = false
    }
  }

  async function resendConfirmation () {
    errorMessage.value = ''
    successMessage.value = ''
    resendingConfirmation.value = true
    try {
      await resendSignUpConfirmation(email.value)
      successMessage.value = 'A new confirmation link was sent if this email has an unconfirmed account. Check your inbox and spam folder.'
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      resendingConfirmation.value = false
    }
  }
</script>

<style scoped>
  .signup-page {
    min-height: 100vh;
    padding: 0 24px 35px;
    background:
      radial-gradient(ellipse at 8% 20%, rgb(218 235 224 / 55%), transparent 28rem),
      radial-gradient(ellipse at 92% 85%, rgb(241 229 201 / 42%), transparent 26rem),
      #f4f6f2;
  }

  .signup-header {
    display: flex;
    width: min(100%, 1000px);
    min-height: 78px;
    align-items: center;
    justify-content: space-between;
    margin-inline: auto;
  }

  .signup-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .signup-theme-toggle {
    width: 42px !important;
    height: 42px !important;
    background: #eef2f0 !important;
  }

  .signup-login-link {
    color: #5146ea;
    font-size: 0.8rem;
  }

  .signup-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #19394c;
    font-size: 13px;
    text-decoration: none;
  }

  .signup-brand img {
    width: 40px;
    height: 40px;
  }

  .signup-card {
    border: 1px solid #e4e9e1;
    background: #fffefa;
    box-shadow: 0 20px 55px rgb(28 55 57 / 9%);
  }

  .signup-card-title {
    padding: 10px 0 4px;
    color: #203a4a;
    font-size: clamp(1.5rem, 3vw, 1.9rem);
    font-weight: 750;
    letter-spacing: -0.04em;
  }

  .signup-card-heading {
    padding: 24px 32px 0;
  }

  .signup-kicker {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #5146ea;
    font-size: 0.68rem;
    font-weight: 750;
    letter-spacing: 0.09em;
  }

  .signup-card-heading :deep(.v-card-subtitle) {
    max-width: 550px;
    padding: 0;
    color: #718085;
    line-height: 1.55;
    white-space: normal;
  }

  .signup-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 19px;
  }

  .signup-steps span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #e6e9f2;
    border-radius: 999px;
    padding: 5px 10px;
    color: #68746f;
    font-size: 0.7rem;
    font-weight: 650;
  }

  .signup-steps b {
    display: grid;
    width: 18px;
    height: 18px;
    place-items: center;
    border-radius: 50%;
    background: #eeedff;
    color: #5146ea;
    font-size: 0.65rem;
  }

  .signup-fields {
    padding: 18px 24px 4px;
  }

  .signup-fields :deep(.v-row) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 20px;
    margin: 0;
  }

  .signup-fields :deep(.v-col) {
    width: auto;
    max-width: none;
    flex: initial;
    padding: 7px 0;
  }

  .signup-fields :deep(.v-col-12) {
    grid-column: 1 / -1;
  }

  .signup-fields :deep(.signup-full-row) {
    grid-column: 1 / -1;
    width: 100%;
  }

  .signup-section-title {
    display: grid;
    gap: 2px;
    border-bottom: 1px solid #edf0eb;
    padding: 5px 0 9px;
  }

  .signup-section-title strong {
    color: #203a4a;
    font-size: 0.9rem;
  }

  .signup-section-title span {
    color: #83908a;
    font-size: 0.72rem;
  }

  .signup-actions {
    padding: 0 24px;
  }

  @media (max-width: 600px) {
    .signup-page {
      padding: 0 12px 20px;
    }

    .signup-header {
      min-height: 64px;
      gap: 6px;
    }

    .signup-brand {
      min-width: 0;
      gap: 7px;
      font-size: 0.68rem;
    }

    .signup-brand img {
      width: 34px;
      height: 34px;
    }

    .signup-login-link {
      padding-inline: 8px;
      font-size: 0.68rem;
    }

    .signup-card {
      margin-block: 14px !important;
      padding: 18px !important;
    }

    .signup-card-title {
      font-size: 1.55rem;
    }

    .signup-card-heading {
      padding: 18px 18px 0;
    }

    .signup-steps {
      gap: 5px;
    }

    .signup-steps span {
      padding-inline: 8px;
      font-size: 0.65rem;
    }

    .signup-fields {
      padding-inline: 10px;
    }

    .signup-fields :deep(.v-row) {
      grid-template-columns: minmax(0, 1fr);
    }

    .signup-fields :deep(.v-col) {
      grid-column: 1 / -1;
    }

    .signup-actions {
      padding-inline: 10px;
    }
  }

  .v-theme--academicDark .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, rgb(41 83 73 / 24%), transparent 28rem),
      radial-gradient(ellipse at 92% 85%, rgb(114 92 45 / 14%), transparent 26rem),
      #101a21;
  }

  .v-theme--academicDark .signup-brand {
    color: #e0eae8;
  }

  .v-theme--academicDark .signup-theme-toggle {
    background: #24343c !important;
  }

  .v-theme--academicDark .signup-card {
    border-color: #30414a;
    background: #1b2932;
  }

  .v-theme--campusGreen .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #d3e6d8, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #e8e3c9, transparent 26rem),
      #edf4ee;
  }

  .v-theme--libraryWarm .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #eee0cc, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #eadcc7, transparent 26rem),
      #f7f0e6;
  }

  .v-theme--libraryWarm .signup-brand {
    color: #57412f;
  }

  .v-theme--libraryWarm .signup-card {
    border-color: #e9ddcd;
    background: #fffaf2;
  }

  .v-theme--scholarBlue .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #d8e6f1, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #e6e9ef, transparent 26rem),
      #eef3f8;
  }

  .v-theme--scholarBlue .signup-brand {
    color: #294766;
  }

  .v-theme--scholarBlue .signup-card {
    border-color: #dbe5ee;
    background: #fbfdff;
  }
</style>
