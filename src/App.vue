<template>
  <v-app :class="{ 'student-shell-authenticated': isAuthenticated }">
    <header v-if="isAuthenticated" class="student-site-header">
      <div class="student-site-header-inner">
        <RouterLink aria-label="LASU Student Success Hub home" class="student-site-brand" to="/">
          <img alt="" src="/academic-mark.svg">
          <span><strong>LASU Student Success Hub</strong><small>Your academic space</small></span>
        </RouterLink>

        <nav aria-label="Student account navigation" class="student-site-actions">
          <v-btn aria-label="Dashboard" class="global-dashboard-link" prepend-icon="mdi-view-dashboard-outline" rounded="pill" to="/dashboard" variant="text">Dashboard</v-btn>
          <v-btn :aria-label="unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'" class="global-notification-link" icon rounded="circle" variant="tonal" @click="openNotifications">
            <v-badge v-if="unreadNotifications" color="error" :content="unreadNotifications" floating><v-icon>mdi-bell-outline</v-icon></v-badge>
            <v-icon v-else>mdi-bell-outline</v-icon>
          </v-btn>
          <v-btn prepend-icon="mdi-account-group-outline" rounded="pill" to="/study" variant="text">Study together</v-btn>
          <v-btn prepend-icon="mdi-file-question-outline" rounded="pill" to="/#past-questions" variant="text">Shared questions</v-btn>
          <v-btn prepend-icon="mdi-account-circle-outline" rounded="pill" to="/dashboard?profile=1" variant="tonal">My profile</v-btn>
          <v-btn href="mailto:noreply@mail2student.com?subject=LASU%20Student%20Success%20Hub%20support" prepend-icon="mdi-lifebuoy" rounded="pill" variant="text">Customer care</v-btn>
          <v-btn :loading="signingOut" prepend-icon="mdi-logout" rounded="pill" variant="tonal" @click="logout">Log out</v-btn>
        </nav>
      </div>
    </header>

    <v-main>
      <router-view />
    </v-main>

    <v-dialog v-model="showNotifications" max-width="560" scrollable>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Notifications</span>
          <v-btn aria-label="Close notifications" icon="mdi-close" variant="text" @click="showNotifications = false" />
        </v-card-title>
        <v-card-text>
          <v-alert v-if="notificationError" class="mb-4" type="error" variant="tonal">{{ notificationError }}</v-alert>
          <v-progress-linear v-if="loadingNotifications" class="mb-4" color="primary" indeterminate rounded />
          <div v-if="notifications.length" class="global-notification-list">
            <article v-for="notification in notifications" :key="notification.id" class="global-notification-item" :class="{ 'global-notification-unread': !notification.is_read }">
              <v-icon :color="notification.type === 'resource_rejected' ? 'error' : notification.type === 'resource_approved' ? 'success' : 'primary'">
                {{ notification.type === 'resource_uploaded' ? 'mdi-file-upload-outline' : notification.type === 'resource_approved' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
              </v-icon>
              <div><p>{{ notification.message }}</p><small>{{ formatDate(notification.created_at) }}</small></div>
            </article>
          </div>
          <v-alert v-else-if="!loadingNotifications && !notificationError" type="info" variant="tonal">No notifications yet. Upload reviews and decisions will show here.</v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
  import type { AppNotification } from '@/services/resources'
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getErrorMessage } from '@/lib/errors'
  import { hasAuthSession, signOut } from '@/lib/auth'
  import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
  import { getNotifications, markNotificationsRead } from '@/services/resources'

  const route = useRoute()
  const router = useRouter()
  const isAuthenticated = ref(false)
  const signingOut = ref(false)
  const showNotifications = ref(false)
  const loadingNotifications = ref(false)
  const notifications = ref<AppNotification[]>([])
  const notificationError = ref('')
  const unreadNotifications = ref(0)
  let refreshTimer: ReturnType<typeof globalThis.setInterval> | null = null
  let authSubscription: { unsubscribe: () => void } | null = null

  async function refreshSession () {
    try {
      isAuthenticated.value = await hasAuthSession()
      if (isAuthenticated.value) await refreshNotificationCount()
    } catch {
      isAuthenticated.value = false
    }
  }

  async function refreshNotificationCount () {
    if (!isAuthenticated.value || !isSupabaseConfigured) {
      unreadNotifications.value = 0
      return
    }
    try {
      const items = await getNotifications()
      notifications.value = items
      unreadNotifications.value = items.filter(item => !item.is_read).length
    } catch {
      // Keep the shared navigation usable if notification storage is unavailable.
    }
  }

  async function openNotifications () {
    showNotifications.value = true
    loadingNotifications.value = true
    notificationError.value = ''
    try {
      notifications.value = isSupabaseConfigured ? await getNotifications() : []
      const unreadIds = notifications.value.filter(item => !item.is_read).map(item => item.id)
      if (unreadIds.length) await markNotificationsRead(unreadIds)
      notifications.value = notifications.value.map(item => unreadIds.includes(item.id) ? { ...item, is_read: true } : item)
      unreadNotifications.value = 0
    } catch (error) {
      notificationError.value = getErrorMessage(error, 'Could not load your notifications.')
    } finally {
      loadingNotifications.value = false
    }
  }

  function formatDate (date: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
  }

  async function logout () {
    signingOut.value = true
    try {
      await signOut()
      isAuthenticated.value = false
      await router.replace('/login')
    } catch (error) {
      notificationError.value = getErrorMessage(error, 'Could not sign out. Please try again.')
    } finally {
      signingOut.value = false
    }
  }

  watch(() => route.fullPath, () => { void refreshSession() })

  onMounted(async () => {
    await refreshSession()
    if (isSupabaseConfigured) {
      const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        isAuthenticated.value = Boolean(session)
        if (session) void refreshNotificationCount()
        else unreadNotifications.value = 0
      })
      authSubscription = data.subscription
      refreshTimer = globalThis.setInterval(() => { void refreshNotificationCount() }, 60_000)
    }
  })

  onBeforeUnmount(() => {
    authSubscription?.unsubscribe()
    if (refreshTimer !== null) globalThis.clearInterval(refreshTimer)
  })
</script>

<style>
  .student-site-header {
    position: sticky;
    z-index: 30;
    top: 0;
    border-bottom: 1px solid #e5ebe5;
    background: rgb(255 255 255 / 96%);
    box-shadow: 0 5px 20px rgb(24 54 39 / 5%);
    backdrop-filter: blur(18px);
  }

  .student-site-header-inner {
    display: flex;
    width: min(1600px, 100%);
    min-height: 76px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-inline: auto;
    padding: 10px clamp(16px, 3.5vw, 48px);
  }

  .student-site-brand {
    display: flex;
    min-width: 210px;
    align-items: center;
    gap: 11px;
    color: #203b31;
    text-decoration: none;
  }

  .student-site-brand img { width: 42px; height: 42px; }
  .student-site-brand span { display: grid; gap: 2px; }
  .student-site-brand strong { font-size: 14px; }
  .student-site-brand small { color: #7a8980; font-size: 11px; }

  .student-site-actions {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .student-site-actions::-webkit-scrollbar { display: none; }
  .student-site-actions .v-btn { flex: 0 0 auto; font-size: 13px; font-weight: 650; }
  .global-notification-link { width: 46px !important; height: 46px !important; background: #eef2f0 !important; }
  .global-notification-list { display: grid; gap: 8px; }
  .global-notification-item { display: flex; align-items: flex-start; gap: 12px; border: 1px solid #e5ebe5; border-radius: 14px; padding: 13px; }
  .global-notification-item p { margin: 0; color: #344a42; }
  .global-notification-item small { display: block; margin-top: 5px; color: #83908a; }
  .global-notification-unread { background: #f4f8f4; }

  .student-shell-authenticated .dashboard-header,
  .student-shell-authenticated .study-header,
  .student-shell-authenticated .page-header,
  .student-shell-authenticated .home-header { display: none !important; }

  @media (max-width: 980px) {
    .student-site-header-inner { align-items: flex-start; flex-direction: column; gap: 6px; padding-block: 9px; }
    .student-site-brand { min-width: 0; }
    .student-site-actions { width: 100%; justify-content: flex-start; }
  }

  @media (max-width: 600px) {
    .student-site-header-inner { gap: 4px; padding-inline: 10px; }
    .student-site-brand img { width: 34px; height: 34px; }
    .student-site-brand strong { font-size: 12px; }
    .student-site-brand small { font-size: 10px; }
    .student-site-actions { gap: 0; }
    .student-site-actions .v-btn { min-width: 40px; padding-inline: 9px; font-size: 11px; }
    .student-site-actions .v-btn { white-space: nowrap; }
  }
</style>
