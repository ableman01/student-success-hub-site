<template>
<main class="about-me-page">
  <div class="about-container">
    <header class="about-header">
      <div>
        <div class="about-kicker">
          <v-icon size="16">mdi-account-outline</v-icon>
          ABOUT ME
        </div>
        <h1>About me</h1>
        <p>Your personal academic profile and study information.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-arrow-left" rounded="pill" to="/dashboard" variant="tonal">
        Back to dashboard
      </v-btn>
    </header>

    <v-alert v-if="aboutMessage" class="about-alert" closable density="compact" :text="aboutMessage" type="success" variant="tonal" @click:close="aboutMessage = ''" />
    <v-alert v-if="aboutError" class="about-alert" closable density="compact" :text="aboutError" type="error" variant="tonal" @click:close="aboutError = ''" />

    <v-card class="about-card" elevation="0" rounded="xl">
      <div class="about-card-header">
        <v-avatar size="96" class="about-avatar">
          <v-icon>mdi-account-circle</v-icon>
        </v-avatar>
        <div class="about-info">
          <h2>{{ user?.firstName || '' }} {{ user?.lastName || '' }}</h2>
          <p class="about-email">{{ user?.email }}</p>
        </div>
      </div>

      <div class="about-fields">
        <div class="about-field">
          <span class="about-label">Academic level</span>
          <span class="about-value">{{ user?.academicLevel ? getAcademicLevelLabel(user.academicLevel) : 'Not set' }}</span>
        </div>
        <div class="about-field">
          <span class="about-label">Programme / department</span>
          <span class="about-value">{{ user?.program || 'Not set' }}</span>
        </div>
        <div class="about-field">
          <span class="about-label">Member since</span>
          <span class="about-value">{{ user?.createdAt || 'Joined the hub' }}</span>
        </div>
      </div>

      <div class="about-actions">
        <v-btn color="primary" prepend-icon="mdi-pencil-outline" rounded="pill" to="/profile" variant="tonal">
          Edit profile details
        </v-btn>
      </div>
    </v-card>

    <div class="about-note">
      <p>Your personal page is visible only to you. Use it to keep track of your academic details and progress.</p>
    </div>
  </div>
</main>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppTheme } from '@/composables/useAppTheme'
  import { getAcademicLevelLabel } from '@/lib/academics'
  import { type AppUser, getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'

  const router = useRouter()
  const { toggleTheme, themeIcon, themeLabel } = useAppTheme()
  const user = ref<AppUser | null>(null)
  const aboutMessage = ref('')
  const aboutError = ref('')
  const loading = ref(false)

  onMounted(async () => {
    loading.value = true
    aboutError.value = ''
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        await router.replace('/login')
        return
      }
      user.value = currentUser
    } catch (error) {
      aboutError.value = getErrorMessage(error, 'Could not load your profile.')
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .about-me-page {
    min-height: 100vh;
    background: radial-gradient(ellipse at 4% 0%, rgb(223 236 226 / 55%), transparent 31rem), #f4f6f2;
  }
  .about-container {
    width: min(860px, calc(100% - 32px));
    margin: 0 auto;
    padding: 40px 0 80px;
  }
  .about-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;
  }
  .about-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4b7960;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }
  .about-header h1 {
    margin: 10px 0 6px;
    color: #1e3c2e;
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.045em;
  }
  .about-header p {
    margin: 0;
    color: #75847b;
  }
  .about-card {
    border: 1px solid #e3e9e2;
    overflow: hidden;
  }
  .about-card-header {
    display: flex;
    gap: 20px;
    padding: 32px 24px 20px;
    align-items: flex-start;
  }
  .about-avatar {
    background: #e8f3ea;
    color: #2d5f52;
  }
  .about-info h2 {
    margin: 0 0 4px;
    color: #1e3c2e;
    font-size: 24px;
  }
  .about-email {
    margin: 0;
    color: #75847b;
    font-size: 14px;
  }
  .about-fields {
    display: grid;
    gap: 14px;
    padding: 0 24px 28px;
  }
  .about-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #edf0eb;
  }
  .about-label {
    color: #75847b;
    font-size: 13px;
  }
  .about-value {
    color: #213a4a;
    font-weight: 600;
  }
  .about-actions {
    padding: 0 24px 28px;
  }
  .about-note {
    padding: 0 24px 20px;
    color: #83908a;
    font-size: 13px;
    text-align: center;
  }
  .about-alert {
    margin: 20px 24px 0;
  }
  @media (max-width: 600px) {
    .about-container { padding: 20px 0 60px; }
    .about-card-header { flex-direction: column; align-items: center; text-align: center; padding: 24px 16px 16px; }
    .about-info h2 { font-size: 20px; }
  }
</style>
