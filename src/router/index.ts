import { createRouter, createWebHistory } from 'vue-router'
import { hasAuthSession } from '@/lib/auth'
import DashboardPage from '@/pages/dashboard.vue'
import EmailConfirmationPage from '@/pages/email-confirmation.vue'
import HomePage from '@/pages/index.vue'
import LoginPage from '@/pages/loginPage.vue'
import SignupPage from '@/pages/signup.vue'
import StudyRoomPage from '@/pages/study-room.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/login', component: LoginPage },
    { path: '/loginPage', redirect: '/login' },
    { path: '/signup', component: SignupPage },
    { path: '/auth/confirm', component: EmailConfirmationPage },
    {
      path: '/study',
      component: StudyRoomPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async to => {
  const isAuthPage = to.path === '/login' || to.path === '/signup'

  try {
    const isSignedIn = await hasAuthSession()

    if (to.meta.requiresAuth && !isSignedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (isAuthPage && isSignedIn) {
      return '/dashboard'
    }
  } catch {
    if (to.meta.requiresAuth) {
      return { path: '/login', query: { authError: 'session-check' } }
    }
  }

  return true
})

export default router
