<template>
  <main class="signup-page">
    <header class="signup-header">
      <RouterLink aria-label="LASU Student Success Hub home" class="signup-brand" to="/">
        <img alt="" src="/academic-mark.svg">
        <strong>LASU Student Success Hub</strong>
      </RouterLink>

    </header>

    <v-card
      class="signup-card mx-auto my-6 pa-8"
      elevation="3"
      max-width="760"
      rounded="lg"
    >
      <v-card-title class="signup-card-title">Create your account</v-card-title>
      <v-card-subtitle>Sign up to open your dashboard.</v-card-subtitle>

      <v-form @submit.prevent="register">
        <v-card-text class="signup-fields">
          <v-row density="compact">
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

            <v-col cols="12" sm="6">
              <v-select
                v-model="academicLevel"
                color="primary"
                :items="academicLevels"
                label="Current academic level"
                prepend-inner-icon="mdi-school-outline"
                required
                :rules="[value => Boolean(value) || 'Choose your current level']"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="program"
                autocomplete="organization-title"
                color="primary"
                label="Programme or department (optional)"
                placeholder="e.g. Environmental Management"
                prepend-inner-icon="mdi-book-education-outline"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12">
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

            <v-col cols="12">
              <v-checkbox
                v-model="agreedToTerms"
                color="secondary"
                label="I agree to the site terms and conditions"
                :rules="[value => value || 'You must agree to continue']"
              />
            </v-col>

            <v-col v-if="errorMessage" cols="12">
              <v-alert
                class="mb-4"
                type="error"
                variant="tonal"
              >
                {{ errorMessage }}
              </v-alert>
            </v-col>

            <v-col v-if="successMessage" cols="12">
              <v-alert
                class="mb-4"
                type="success"
                variant="tonal"
              >
                {{ successMessage }}
              </v-alert>
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

      <v-card-text class="text-center">
        Already signed up?
        <RouterLink to="/login">Log in</RouterLink>
      </v-card-text>
    </v-card>
  </main>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { academicLevels } from '@/lib/academics'
  import { signUp } from '@/lib/auth'

  const router = useRouter()
  const firstName = ref('')
  const lastName = ref('')
  const dateOfBirth = ref('')
  const gender = ref('')
  const academicLevel = ref('')
  const program = ref('')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)
  const agreedToTerms = ref(false)
  const loading = ref(false)
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
    if (
      error instanceof Error
      && /error sending confirmation email|email_send_failed/i.test(error.message)
    ) {
      return 'The confirmation email was not delivered. The website redirect is configured, and email is sent through the external Resend SMTP provider. Check that mail2student.com is verified in Resend and review its delivery logs and SMTP credentials. Check Supabase Authentication → Users before retrying in case the account was created without the email being delivered.'
    }

    return error instanceof Error
      ? error.message
      : 'Registration failed. Please try again.'
  }

  async function register () {
    errorMessage.value = ''
    successMessage.value = ''

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

    if (!academicLevel.value) {
      errorMessage.value = 'Choose your current academic level.'
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
        program: program.value,
      })
      if (!user) {
        throw new Error('Supabase did not return a new account. Please try again.')
      }

      if (hasSession) {
        await router.replace('/dashboard')
      } else {
        successMessage.value
          = 'Account created. Check your inbox for the LASU Student Success Hub confirmation email, then return here to log in.'
      }
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      loading.value = false
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
    padding: 24px 24px 4px;
    color: #203a4a;
    font-size: clamp(1.5rem, 3vw, 1.9rem);
    font-weight: 750;
    letter-spacing: -0.04em;
  }

  .signup-fields {
    padding: 16px 24px 4px;
  }

  .signup-actions {
    padding: 0 24px;
  }

  @media (max-width: 600px) {
    .signup-page {
      padding-inline: 14px;
    }

    .signup-card {
      margin-block: 14px !important;
      padding: 18px !important;
    }

    .signup-card-title {
      padding-inline: 10px;
    }

    .signup-fields {
      padding-inline: 10px;
    }

    .signup-actions {
      padding-inline: 10px;
    }
  }

  :global(.v-theme--academicDark) .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, rgb(41 83 73 / 24%), transparent 28rem),
      radial-gradient(ellipse at 92% 85%, rgb(114 92 45 / 14%), transparent 26rem),
      #101a21;
  }

  :global(.v-theme--academicDark) .signup-brand {
    color: #e0eae8;
  }

  :global(.v-theme--academicDark) .signup-card {
    border-color: #30414a;
    background: #1b2932;
  }

  :global(.v-theme--campusGreen) .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #d3e6d8, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #e8e3c9, transparent 26rem),
      #edf4ee;
  }

  :global(.v-theme--libraryWarm) .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #eee0cc, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #eadcc7, transparent 26rem),
      #f7f0e6;
  }

  :global(.v-theme--libraryWarm) .signup-brand {
    color: #57412f;
  }

  :global(.v-theme--libraryWarm) .signup-card {
    border-color: #e9ddcd;
    background: #fffaf2;
  }

  :global(.v-theme--scholarBlue) .signup-page {
    background:
      radial-gradient(ellipse at 8% 20%, #d8e6f1, transparent 28rem),
      radial-gradient(ellipse at 92% 85%, #e6e9ef, transparent 26rem),
      #eef3f8;
  }

  :global(.v-theme--scholarBlue) .signup-brand {
    color: #294766;
  }

  :global(.v-theme--scholarBlue) .signup-card {
    border-color: #dbe5ee;
    background: #fbfdff;
  }
</style>
