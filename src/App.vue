<template>
  <v-app :class="{ 'student-shell-authenticated': isAuthenticated }">
    <v-app-bar v-if="isAuthenticated" class="student-topbar" elevation="0">
      <v-app-bar-nav-icon
        :aria-label="drawerOpen ? 'Hide navigation' : 'Show navigation'"
        @click="toggleNavigation"
      />
      <RouterLink aria-label="LASU Student Success Hub home" class="student-site-brand" to="/">
        <img alt="" src="/academic-mark.svg">
        <span><strong>LASU Student Success Hub</strong><small>Your academic space</small></span>
      </RouterLink>
      <v-spacer />
      <v-btn
        :aria-label="unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'"
        class="global-notification-link"
        icon
        rounded="circle"
        variant="tonal"
        @click="openNotifications"
      >
        <v-badge v-if="unreadNotifications" color="error" :content="unreadNotifications" floating><v-icon>mdi-bell-outline</v-icon></v-badge>
        <v-icon v-else>mdi-bell-outline</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-if="isAuthenticated"
      v-model="drawerOpen"
      class="student-side-drawer"
      :temporary="isMobile"
      :width="264"
    >
      <div class="student-drawer-top">
        <div class="student-drawer-caption">STUDY SPACE</div>
        <v-btn
          aria-label="Hide navigation"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="drawerOpen = false"
        />
      </div>

      <v-list class="student-drawer-links" nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard-outline"
          rounded="lg"
          title="Dashboard"
          to="/dashboard"
          :active="route.path === '/dashboard' && !route.query.profile"
          @click="closeMobileDrawer"
        />
        <v-list-item
          :active="showNotifications"
          rounded="lg"
          title="Notifications"
          @click="openNotifications"
        >
          <template #prepend>
            <v-badge v-if="unreadNotifications" color="error" :content="unreadNotifications" dot>
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-bell-outline</v-icon>
          </template>
        </v-list-item>
        <v-list-item
          prepend-icon="mdi-account-group-outline"
          rounded="lg"
          title="Study together"
          to="/study"
          :active="route.path.startsWith('/study')"
          @click="closeMobileDrawer"
        />
        <v-list-item
          prepend-icon="mdi-file-question-outline"
          rounded="lg"
          title="Shared questions"
          to="/#past-questions"
          @click="closeMobileDrawer"
        />
        <v-list-item
          prepend-icon="mdi-bookmark-outline"
          rounded="lg"
          title="Saved materials"
          to="/saved-materials"
          :active="route.path === '/saved-materials'"
          @click="closeMobileDrawer"
        />
      </v-list>

      <v-divider class="student-drawer-divider" />
      <v-list class="student-drawer-links student-drawer-account" nav>
        <v-list-item
          prepend-icon="mdi-account-circle-outline"
          rounded="lg"
          title="My profile"
          to="/dashboard?profile=1"
          :active="route.path === '/dashboard' && Boolean(route.query.profile)"
          @click="closeMobileDrawer"
        />
        <v-list-item
          href="mailto:noreply@mail2student.com?subject=LASU%20Student%20Success%20Hub%20support"
          prepend-icon="mdi-lifebuoy"
          rounded="lg"
          title="Customer care"
        />
        <v-list-item
          :loading="signingOut"
          prepend-icon="mdi-logout"
          rounded="lg"
          title="Log out"
          @click="logout"
        />
      </v-list>
    </v-navigation-drawer>

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
  import { useDisplay } from 'vuetify'
  import { useRoute, useRouter } from 'vue-router'
  import { getErrorMessage } from '@/lib/errors'
  import { hasAuthSession, signOut } from '@/lib/auth'
  import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
  import { getNotifications, markNotificationsRead } from '@/services/resources'

  const route = useRoute()
  const router = useRouter()
  const { mobile: isMobile } = useDisplay()
  const isAuthenticated = ref(false)
  const drawerOpen = ref(false)
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

  function toggleNavigation () {
    drawerOpen.value = !drawerOpen.value
  }

  function closeMobileDrawer () {
    if (isMobile.value) drawerOpen.value = false
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
    closeMobileDrawer()
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

  watch(isAuthenticated, signedIn => {
    if (signedIn) drawerOpen.value = !isMobile.value
    else drawerOpen.value = false
  })

  watch(isMobile, mobile => {
    drawerOpen.value = !mobile && isAuthenticated.value
  })

  watch(() => route.fullPath, () => {
    void refreshSession()
    closeMobileDrawer()
  })

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
  .student-topbar { border-bottom: 1px solid #e5ebe5; background: rgb(255 255 255 / 96%); box-shadow: 0 5px 20px rgb(24 54 39 / 5%); backdrop-filter: blur(18px); }
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

  .student-side-drawer { border: 0 !important; background: #fff; }
  .student-drawer-top { display: flex; min-height: 64px; align-items: center; justify-content: space-between; padding: 8px 18px 4px 24px; }
  .student-drawer-caption { color: #819087; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
  .student-drawer-links { padding: 8px 12px; }
  .student-drawer-links .v-list-item { min-height: 48px; margin: 4px 0; color: #385247; font-size: 13px; font-weight: 650; }
  .student-drawer-links .v-list-item--active { color: #244f3a; background: #edf4ee; }
  .student-drawer-divider { margin: 8px 20px; border-color: #edf1ec; }
  .student-drawer-account { padding-top: 2px; }
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

  @media (max-width: 600px) {
    .student-site-brand { min-width: 0; gap: 8px; }
    .student-site-brand img { width: 34px; height: 34px; }
    .student-site-brand strong { font-size: 12px; }
    .student-site-brand small { font-size: 10px; }
    .student-topbar .v-toolbar__content { padding-inline: 4px 12px; }
    .global-notification-link { width: 40px !important; height: 40px !important; }
  }
</style>
