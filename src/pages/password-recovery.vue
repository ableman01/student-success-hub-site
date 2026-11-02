<template>
  <main class="recovery-page">
    <v-card class="recovery-card pa-7 pa-sm-10" max-width="520" rounded="xl">
      <RouterLink aria-label="Student Success Hub home" class="recovery-brand" to="/">
        <img alt="" src="/academic-mark.svg">
        <strong>Student Success Hub</strong>
      </RouterLink>

      <div class="recovery-icon"><v-icon size="30">mdi-lock-reset</v-icon></div>
      <h1>Choose a new password</h1>
      <p>Set a new password for your student account.</p>
      <v-progress-circular v-if="checking" class="my-5" color="primary" indeterminate />
      <v-alert v-if="errorMessage" class="my-4" type="error" variant="tonal">{{ errorMessage }}</v-alert>

      <v-alert
        v-if="successMessage"
        class="my-4"
        role="status"
        type="success"
        variant="tonal"
      >{{ successMessage }}</v-alert>

      <v-form v-if="!checking && ready && !successMessage" @submit.prevent="savePassword">
        <v-text-field
          v-model="password"
          autocomplete="new-password"
          label="New password"
          minlength="8"
          required
          type="password"
          variant="outlined"
        />

        <v-text-field
          v-model="confirmation"
          autocomplete="new-password"
          label="Confirm new password"
          minlength="8"
          required
          type="password"
          variant="outlined"
        />

        <v-btn
          block
          color="primary"
          :loading="saving"
          rounded="pill"
          size="large"
          type="submit"
        >Update password</v-btn>
      </v-form>

      <v-btn
        v-if="successMessage || (!checking && !ready)"
        block
        class="mt-4"
        color="primary"
        rounded="pill"
        to="/login"
      >Continue to log in</v-btn>
    </v-card>
  </main>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { finishPasswordRecovery, getCurrentUser } from '@/lib/auth'

  const checking = ref(true)
  const ready = ref(false)
  const saving = ref(false)
  const password = ref('')
  const confirmation = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  onMounted(async () => {
    try {
      ready.value = Boolean(await getCurrentUser())
      if (!ready.value) errorMessage.value = 'This recovery link is invalid or has expired. Request a new link from the login page.'
    } catch {
      errorMessage.value = 'This recovery link is invalid or has expired. Request a new link from the login page.'
    } finally {
      checking.value = false
    }
  })

  async function savePassword () {
    errorMessage.value = ''
    if (password.value !== confirmation.value) {
      errorMessage.value = 'The passwords do not match.'
      return
    }
    saving.value = true
    try {
      await finishPasswordRecovery(password.value)
      successMessage.value = 'Your password has been updated. You can now log in with your new password.'
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Could not update your password. Request a new recovery link.'
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped>
  .recovery-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: rgb(var(--v-theme-background)); }
  .recovery-card { width: min(100%, 520px); }
  .recovery-brand { display: inline-flex; align-items: center; gap: 10px; color: rgb(var(--v-theme-primary)); text-decoration: none; }
  .recovery-brand img { width: 36px; height: 36px; }
  .recovery-icon { display: grid; width: 58px; height: 58px; margin-top: 35px; place-items: center; border-radius: 18px; color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .1); }
  h1 { margin-top: 20px; color: rgb(var(--v-theme-primary)); font-size: clamp(1.7rem, 6vw, 2.2rem); }
  p { margin: 10px 0 24px; color: rgba(var(--v-theme-on-surface), .72); }
</style>
