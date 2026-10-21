<template>
  <main class="confirmation-page">
    <header class="confirmation-header">
      <RouterLink aria-label="LASU Student Success Hub home" class="confirmation-brand" to="/">
        <img alt="" src="/academic-mark.svg">
        <strong>LASU Student Success Hub</strong>
      </RouterLink>

      <v-btn rounded="pill" to="/dashboard" variant="tonal">My dashboard</v-btn>

    </header>

    <v-card class="confirmation-card mx-auto" max-width="520" rounded="xl">
      <div class="confirmation-icon">
        <v-icon :color="confirmationError ? 'error' : 'success'" size="34">
          {{ confirmationError ? 'mdi-email-alert-outline' : 'mdi-email-check-outline' }}
        </v-icon>
      </div>

      <div class="confirmation-kicker">LASU STUDENT SUCCESS HUB</div>
      <h1>{{ heading }}</h1>
      <p>{{ message }}</p>

      <v-progress-circular
        v-if="checking"
        class="confirmation-progress"
        color="primary"
        indeterminate
        size="28"
      />

      <v-alert v-if="confirmationError" class="confirmation-alert" type="error" variant="tonal">
        {{ confirmationError }}
      </v-alert>

      <div v-if="!checking" class="confirmation-actions">
        <v-btn
          v-if="signedIn"
          color="primary"
          rounded="pill"
          @click="router.replace('/dashboard')"
        >
          Go to my dashboard
        </v-btn>

        <v-btn
          v-else
          color="primary"
          rounded="pill"
          to="/login"
        >
          Continue to log in
        </v-btn>

        <RouterLink class="confirmation-home-link" to="/">Back to home</RouterLink>
      </div>
    </v-card>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'

  const route = useRoute()
  const router = useRouter()
  const checking = ref(true)
  const signedIn = ref(false)
  const confirmationError = ref('')
  const confirmed = computed(() => route.query.confirmed === '1')
  const heading = computed(() => {
    if (confirmationError.value) return 'We could not confirm your email'
    if (!confirmed.value) return 'Check your confirmation email'
    return 'Your email is confirmed'
  })
  const message = computed(() => {
    if (confirmationError.value) {
      return 'The confirmation link may have expired or already been used. Request a new link or log in if your account is already confirmed.'
    }
    if (!confirmed.value) {
      return 'Use the confirmation link sent to your inbox to finish setting up your LASU Student Success Hub account.'
    }
    return signedIn.value
      ? 'Your LASU Student Success Hub account is ready. Continue to your dashboard.'
      : 'Your LASU Student Success Hub account is ready. Log in to continue to your dashboard.'
  })

  onMounted(async () => {
    const authError = route.query.error_description || route.query.error
    if (authError) {
      confirmationError.value = String(authError).replaceAll('+', ' ')
      checking.value = false
      return
    }

    if (!confirmed.value) {
      checking.value = false
      return
    }

    try {
      signedIn.value = Boolean(await getCurrentUser())
    } catch (error) {
      confirmationError.value = getErrorMessage(error)
    } finally {
      checking.value = false
    }
  })
</script>

<style scoped>
  .confirmation-page {
    display: grid;
    min-height: 100vh;
    padding: 24px clamp(20px, 6vw, 88px) 72px;
    align-content: start;
    background:
      radial-gradient(ellipse at 8% 12%, rgb(var(--v-theme-primary), 0.08), transparent 30rem),
      rgb(var(--v-theme-background));
  }

  .confirmation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1240px;
    width: 100%;
    margin-inline: auto;
  }

  .confirmation-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
  }

  .confirmation-brand img {
    width: 38px;
    height: 38px;
  }

  .confirmation-card {
    width: min(100%, 520px);
    margin-top: clamp(64px, 13vh, 130px);
    padding: clamp(28px, 6vw, 52px);
    border: 1px solid rgb(var(--v-theme-primary), 0.12);
    text-align: center;
  }

  .confirmation-icon {
    display: grid;
    width: 68px;
    height: 68px;
    margin: 0 auto 20px;
    place-items: center;
    border-radius: 22px;
    background: rgb(var(--v-theme-primary), 0.09);
  }

  .confirmation-kicker {
    color: rgb(var(--v-theme-secondary));
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h1 {
    margin-top: 12px;
    color: rgb(var(--v-theme-primary));
    font-size: clamp(1.8rem, 6vw, 2.35rem);
    line-height: 1.14;
  }

  .confirmation-card > p {
    margin-top: 13px;
    color: rgba(var(--v-theme-on-surface), 0.72);
    line-height: 1.7;
  }

  .confirmation-progress {
    margin-top: 24px;
  }

  .confirmation-alert {
    margin-top: 22px;
    text-align: left;
  }

  .confirmation-actions {
    display: grid;
    justify-items: center;
    gap: 17px;
    margin-top: 28px;
  }

  .confirmation-home-link {
    color: rgb(var(--v-theme-primary));
    font-size: 0.9rem;
    text-decoration: none;
  }
</style>
