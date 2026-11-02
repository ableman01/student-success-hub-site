import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, hasAuthSession } from '@/lib/auth'
import { isLasuInstitution } from '@/lib/institutions'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/pages/index.vue') },
    { path: '/login', component: () => import('@/pages/loginPage.vue') },
    { path: '/loginPage', redirect: '/login' },
    { path: '/signup', component: () => import('@/pages/signup.vue') },
    { path: '/auth/confirm', component: () => import('@/pages/email-confirmation.vue') },
    { path: '/lasu-updates', component: () => import('@/pages/lasu-updates.vue'), meta: { requiresAuth: true } },
    { path: '/institution-news', component: () => import('@/pages/institution-news.vue'), meta: { requiresAuth: true } },
    { path: '/about-us', component: () => import('@/pages/about-us.vue') },
    { path: '/about-me', component: () => import('@/pages/about-me.vue'), meta: { requiresAuth: true } },
    { path: '/timetable', component: () => import('@/pages/timetable.vue'), meta: { requiresAuth: true } },
    { path: '/preview', component: () => import('@/pages/preview.vue') },
    {
      path: '/study',
      component: () => import('@/pages/study-room.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/study-groups',
      component: () => import('@/pages/study-groups.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      component: () => import('@/pages/dashboard.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/saved-materials',
      component: () => import('@/pages/saved-materials.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      component: () => import('@/pages/profile.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async to => {
  const isAuthPage = to.path === '/login' || to.path === '/signup'

  if (to.path === '/study' && typeof to.query.invite === 'string') {
    return { path: '/study-groups', query: { ...to.query, invite: to.query.invite } }
  }

  try {
    const isSignedIn = await hasAuthSession()

    if (to.meta.requiresAuth && !isSignedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.path === '/lasu-updates' && isSignedIn) {
      const currentUser = await getCurrentUser()
      if (!currentUser || !isLasuInstitution(currentUser.institutionType, currentUser.institution)) {
        return '/institution-news'
      }
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
