import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, hasAuthSession } from '@/lib/auth'
import { isLasuInstitution } from '@/lib/institutions'
import AboutMePage from '@/pages/about-me.vue'
import AboutUsPage from '@/pages/about-us.vue'
import DashboardPage from '@/pages/dashboard.vue'
import EmailConfirmationPage from '@/pages/email-confirmation.vue'
import HomePage from '@/pages/index.vue'
import InstitutionNewsPage from '@/pages/institution-news.vue'
import LasuUpdatesPage from '@/pages/lasu-updates.vue'
import LoginPage from '@/pages/loginPage.vue'; import PreviewPage from '@/pages/preview.vue'
import ProfilePage from '@/pages/profile.vue'
import SavedMaterialsPage from '@/pages/saved-materials.vue'
import SignupPage from '@/pages/signup.vue'
import StudyGroupsPage from '@/pages/study-groups.vue'
import StudyRoomPage from '@/pages/study-room.vue'
import TimetablePage from '@/pages/timetable.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/login', component: LoginPage },
    { path: '/loginPage', redirect: '/login' },
    { path: '/signup', component: SignupPage },
    { path: '/auth/confirm', component: EmailConfirmationPage },
    { path: '/lasu-updates', component: LasuUpdatesPage, meta: { requiresAuth: true } },
    { path: '/institution-news', component: InstitutionNewsPage, meta: { requiresAuth: true } },
    { path: '/about-me', component: AboutMePage, meta: { requiresAuth: true } },
    { path: '/about-us', component: AboutUsPage }, { path: '/preview', component: PreviewPage },
    { path: '/timetable', component: TimetablePage, meta: { requiresAuth: true } },
    {
      path: '/study',
      component: StudyRoomPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/study-groups',
      component: StudyGroupsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true },
    },

    {
      path: '/saved-materials',
      component: SavedMaterialsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      component: ProfilePage,
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
