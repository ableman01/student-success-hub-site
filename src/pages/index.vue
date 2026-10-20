<template>
  <main class="home-page">
    <div class="home-width">
      <header class="home-header">
        <RouterLink aria-label="LASU Student Success Hub home" class="brand" to="/">
          <img alt="" class="brand-mark" src="/academic-mark.svg">

          <span class="brand-copy">
            <strong>LASU Student Success Hub</strong>
            <span>Learn together. Go further.</span>
          </span>
        </RouterLink>

        <nav aria-label="Main navigation" class="header-actions">
          <a class="header-link" href="#past-questions">Explore resources</a>
          <a class="header-link" href="#about-app">About</a>
          <RouterLink class="header-link" to="/study">Study together</RouterLink>
          <a class="header-link" :href="customerCareWhatsAppUrl" target="_blank" rel="noopener noreferrer">WhatsApp support</a>

          <v-btn
            v-if="currentUser"
            color="primary"
            rounded="pill"
            to="/dashboard"
          >
            My dashboard
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <template v-else>
            <v-btn class="login-button" rounded="pill" to="/login" variant="text">
              Log in
            </v-btn>

            <v-btn color="primary" rounded="pill" to="/signup">
              Join the community
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </template>
        </nav>
      </header>

      <section class="hero-panel">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot" />
            BUILT FOR LASU STUDENTS
          </div>

          <h1>
            Your next big
            <span>academic win</span>
            starts here.
          </h1>

          <p class="hero-description">
            Find the resources you need, stay on top of assignments, and make
            your study time count — all in one welcoming student space.
          </p>

          <div class="hero-actions">
            <v-btn
              v-if="currentUser"
              class="hero-primary"
              color="white"
              rounded="pill"
              size="large"
              to="/dashboard"
            >
              Go to my dashboard
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>

            <template v-else>
              <v-btn
                class="hero-primary"
                color="white"
                rounded="pill"
                size="large"
                to="/signup"
              >
                Get started for free
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>

              <a class="hero-secondary" href="#past-questions">
                Explore shared resources
                <v-icon end size="18">mdi-chevron-down</v-icon>
              </a>
            </template>

            <RouterLink class="hero-secondary" to="/study">
              Join a live study room
              <v-icon end size="18">mdi-account-group-outline</v-icon>
            </RouterLink>
          </div>

          <div class="hero-proof">
            <v-icon color="secondary" size="18">mdi-check-decagram</v-icon>
            <span>One welcoming space to study, share, and grow.</span>
          </div>
        </div>

        <div aria-hidden="true" class="hero-art">
          <img alt="" class="hero-illustration" src="/study-together.svg">
        </div>
      </section>

      <section aria-label="What you can do" class="feature-strip">
        <article class="feature-item">
          <span class="feature-icon feature-icon-blue"><v-icon>mdi-book-open-variant</v-icon></span>

          <div>
            <h2>Learn together</h2>
            <p>Share notes and class materials</p>
          </div>
        </article>

        <article class="feature-item">
          <span class="feature-icon feature-icon-gold"><v-icon>mdi-file-question-outline</v-icon></span>

          <div>
            <h2>Practice with purpose</h2>
            <p>Explore past questions by course</p>
          </div>
        </article>

        <article class="feature-item">
          <span class="feature-icon feature-icon-green"><v-icon>mdi-calendar-check-outline</v-icon></span>

          <div>
            <h2>Feel in control</h2>
            <p>Keep assignments and deadlines in view</p>
          </div>
        </article>
      </section>

      <section id="past-questions" class="resources-section">
        <div class="section-heading">
          <div>
            <div class="section-kicker">STUDENT-SHARED LIBRARY</div>
            <h2>Give your next exam a head start.</h2>
            <p>Find questions by course and level. Every upload shows the student who shared it.</p>
          </div>

          <v-btn
            v-if="currentUser"
            color="primary"
            prepend-icon="mdi-upload"
            rounded="pill"
            variant="tonal"
            @click="showUpload = !showUpload"
          >
            Share a past question
          </v-btn>

          <v-btn
            v-else
            color="primary"
            prepend-icon="mdi-upload"
            rounded="pill"
            to="/signup"
            variant="tonal"
          >
            Sign in to share
          </v-btn>
        </div>

        <div class="question-tools">
          <v-text-field
            v-model="questionSearch"
            clearable
            density="comfortable"
            hide-details
            label="Search by course, title, or keyword"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            @click:clear="questionSearch = ''"
            @keydown.enter.prevent="applyQuestionSearch"
          >
            <template #append-inner>
              <v-btn
                aria-label="Search past questions"
                color="primary"
                icon="mdi-arrow-right"
                size="small"
                variant="tonal"
                @click="applyQuestionSearch"
              />
            </template>
          </v-text-field>

          <v-select
            v-model="questionCourse"
            clearable
            density="comfortable"
            hide-details
            item-title="title"
            item-value="value"
            :items="questionCourses"
            label="Filter by course"
            prepend-inner-icon="mdi-book-open-outline"
            variant="outlined"
          />

          <v-select
            v-model="questionLevel"
            density="comfortable"
            hide-details
            :items="questionLevels"
            label="Filter by level"
            prepend-inner-icon="mdi-account-school-outline"
            variant="outlined"
          />

          <v-select
            v-if="currentUser"
            v-model="savedResourceView"
            density="comfortable"
            hide-details
            item-title="title"
            item-value="value"
            :items="savedResourceViewOptions"
            label="Show materials"
            prepend-inner-icon="mdi-bookmark-outline"
            variant="outlined"
          />
        </div>

        <v-alert
          v-if="errorMessage"
          class="mb-5"
          type="error"
          variant="tonal"
        >
          {{ errorMessage }}
        </v-alert>

        <v-card
          v-if="showUpload && currentUser"
          class="upload-card pa-5 mb-6"
          rounded="xl"
        >
          <div class="d-flex align-center ga-3 mb-4">
            <span class="feature-icon feature-icon-gold"><v-icon>mdi-file-upload-outline</v-icon></span>

            <div>
              <h3 class="text-h6 font-weight-bold">Share a past question</h3>
              <p class="text-body-2 text-medium-emphasis">Help another student feel prepared.</p>
            </div>
          </div>

          <v-form @submit.prevent="sharePastQuestion">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="resourceTitle"
                  label="Title"
                  placeholder="e.g. 2024 final examination"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="resourceCourse"
                  label="Course"
                  placeholder="e.g. BIO 201"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="resourceAcademicLevel"
                  clearable
                  item-title="title"
                  item-value="value"
                  :items="academicLevels"
                  label="Academic level"
                  prepend-inner-icon="mdi-account-school-outline"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="resourceDescription"
                  auto-grow
                  label="Description"
                  placeholder="Add the year, semester, instructor, or other useful details."
                  rows="2"
                />
              </v-col>

              <v-col cols="12" md="8">
                <v-file-input
                  v-model="resourceFile"
                  accept="application/pdf,.pdf"
                  label="Choose a PDF (max 20 MB)"
                  prepend-icon="mdi-file-pdf-box"
                  required
                  show-size
                />
              </v-col>

              <v-col class="d-flex align-center" cols="12" md="4">
                <v-btn
                  block
                  color="primary"
                  :loading="uploading"
                  rounded="pill"
                  type="submit"
                >
                  Upload and share
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card>

        <v-progress-linear
          v-if="loading"
          class="mb-5"
          color="primary"
          indeterminate
          rounded
        />

        <div v-else-if="!errorMessage && pastQuestions.length === 0" class="empty-library">
          <div class="empty-icon"><v-icon size="30">mdi-bookshelf</v-icon></div>

          <div>
            <h3>The library is ready for its first resource.</h3>
            <p>Be the first to share a past question and help your classmates prepare.</p>
          </div>

          <v-btn
            v-if="currentUser"
            color="primary"
            rounded="pill"
            @click="showUpload = true"
          >
            Share the first one
          </v-btn>

          <v-btn v-else color="primary" rounded="pill" to="/signup">
            Join and share
          </v-btn>
        </div>

        <div v-else-if="filteredPastQuestions.length === 0" class="empty-library">
          <div class="empty-icon"><v-icon size="30">mdi-text-search</v-icon></div>

          <div>
            <h3>{{ savedResourceView === 'saved-only' ? 'You have no saved past questions yet.' : 'No past questions match your search.' }}</h3>
            <p>{{ savedResourceView === 'saved-only' ? 'Bookmark a useful question and it will appear in Saved materials on your profile.' : 'Try a different title, course, or description.' }}</p>
          </div>
        </div>

        <v-row v-else class="past-question-grid">
          <v-col
            v-for="resource in filteredPastQuestions"
            :key="resource.id"
            cols="12"
            lg="4"
            md="6"
          >
            <v-card class="resource-card fill-height pa-5" rounded="xl">
              <div class="d-flex align-start ga-3">
                <span class="resource-icon"><v-icon color="error">mdi-file-pdf-box</v-icon></span>

                <div class="min-width-0">
                  <h3 class="text-h6 font-weight-bold">{{ resource.title }}</h3>

                  <p class="text-caption text-medium-emphasis mt-1">
                    {{ resource.course || 'Course not specified' }}
                    ·
                    {{ formatDate(resource.created_at) }}
                  </p>

                  <div class="resource-attribution">
                    <v-chip color="primary" size="x-small" variant="tonal">Past question</v-chip>
                    <v-chip
                      v-if="resource.status !== 'approved' && currentUser?.id === resource.uploaded_by"
                      :color="resource.status === 'pending' ? 'warning' : 'error'"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ resource.status === 'pending' ? 'Awaiting approval' : 'Not approved · see notifications' }}
                    </v-chip>
                    <span>Shared by <strong>{{ resource.uploaded_by_name || 'LASU student' }}</strong></span>
                    <v-chip v-if="getQuestionLevel(resource)" color="secondary" size="x-small" variant="tonal">
                      {{ getAcademicLevelLabel(getQuestionLevel(resource)) }}
                    </v-chip>
                  </div>
                </div>
                <v-btn
                  v-if="currentUser && resource.status === 'approved'"
                  :aria-label="savedResourceIds.includes(resource.id) ? `Remove ${resource.title} from saved materials` : `Save ${resource.title} to your profile`"
                  :color="savedResourceIds.includes(resource.id) ? 'primary' : 'secondary'"
                  :icon="savedResourceIds.includes(resource.id) ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
                  :loading="savingResourceId === resource.id"
                  size="small"
                  variant="tonal"
                  @click="toggleSavedResource(resource)"
                />
              </div>

              <p v-if="resource.description" class="resource-description my-4 text-body-2">
                {{ resource.description }}
              </p>

              <v-btn
                block
                class="mt-auto"
                color="primary"
                :href="resource.url"
                rel="noopener noreferrer"
                rounded="pill"
                target="_blank"
                variant="tonal"
              >
                Read past question
                <v-icon end>mdi-open-in-new</v-icon>
              </v-btn>

              <v-btn
                block
                class="mt-3"
                color="secondary"
                rounded="pill"
                :to="{ path: '/study', query: { course: resource.course || '' } }"
                variant="text"
              >
                Discuss with classmates
                <v-icon end>mdi-forum-outline</v-icon>
              </v-btn>

              <v-btn
                v-if="isResourceModerator"
                block
                class="mt-2"
                color="error"
                rounded="pill"
                variant="text"
                @click="resourceToDelete = resource"
              >
                Delete resource
                <v-icon end>mdi-delete-outline</v-icon>
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <section id="about-app" aria-labelledby="about-app-heading" class="about-app-section">
        <div class="about-app-heading">
          <span class="section-eyebrow">A better way to study</span>
          <h2 id="about-app-heading">About LASU Student Success Hub</h2>
          <p>
            A shared academic space that helps LASU students keep study plans,
            course resources, and conversations together.
          </p>
        </div>

        <div class="about-app-grid">
          <article class="about-app-card">
            <v-icon color="primary" size="25">mdi-calendar-check-outline</v-icon>
            <h3>Stay organized</h3>
            <p>Track assignments and deadlines in one place, so it is easier to decide what to work on next.</p>
          </article>
          <article class="about-app-card">
            <v-icon color="primary" size="25">mdi-book-open-page-variant-outline</v-icon>
            <h3>Find course materials</h3>
            <p>Browse shared lecture notes and past questions by course and level when you are ready to revise.</p>
          </article>
          <article class="about-app-card">
            <v-icon color="primary" size="25">mdi-account-group-outline</v-icon>
            <h3>Learn with classmates</h3>
            <p>Join study rooms and course discussions to ask questions, exchange ideas, and keep each other motivated.</p>
          </article>
        </div>
      </section>

      <section class="closing-banner">
        <div class="closing-icon"><v-icon size="30">mdi-school-outline</v-icon></div>

        <div class="closing-copy">
          <h2>Your goals deserve a good plan.</h2>
          <p>Make a study space that works for you: organize assignments, save class PDFs, and keep moving forward.</p>
        </div>

        <v-btn
          color="white"
          rounded="pill"
          :to="currentUser ? '/dashboard' : '/signup'"
        >
          {{ currentUser ? 'Open my dashboard' : 'Create your free account' }}
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
      </section>

      <footer class="home-footer">
        <RouterLink aria-label="LASU Student Success Hub home" class="brand footer-brand" to="/">
          <img alt="" class="brand-mark brand-mark-small" src="/academic-mark.svg">
          <strong>LASU Student Success Hub</strong>
        </RouterLink>

        <span class="footer-links">
          <a href="#about-app">About this app</a>
          <a :href="customerCareWhatsAppUrl" target="_blank" rel="noopener noreferrer">Questions? DM our customer care representative on WhatsApp.</a>
        </span>
      </footer>
    </div>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>

    <v-dialog v-model="showDeleteConfirmation" max-width="440">
      <v-card class="pa-2" rounded="xl">
        <v-card-title class="text-h6 font-weight-bold">Delete this shared resource?</v-card-title>
        <v-card-text>
          “{{ resourceToDelete?.title }}” and its PDF will be removed from the shared library. This cannot be undone.
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn rounded="pill" variant="text" @click="resourceToDelete = null">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" rounded="pill" @click="confirmDeleteResource">
            Delete resource
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup lang="ts">
  import { getCurrentUser, type AppUser } from '@/lib/auth'
  import type { Resource } from '@/services/resources'
  import { computed, onMounted, ref } from 'vue'
  import { academicLevels, getAcademicLevelLabel, getCourseAcademicLevel } from '@/lib/academics'
  import { getErrorMessage } from '@/lib/errors'
  import { isSupabaseConfigured } from '@/lib/supabase'
  import { deleteResource, getResources, getSavedResourceIds, isResourceModerator as checkResourceModerator, setResourceSaved, uploadResource } from '@/services/resources'

  import { customerCareWhatsAppUrl } from '@/lib/support'
  const currentUser = ref<AppUser | null>(null)
  const isResourceModerator = ref(false)
  const pastQuestions = ref<Resource[]>([])
  const resourceTitle = ref('')
  const resourceCourse = ref('')
  const resourceAcademicLevel = ref<string | null>(null)
  const resourceDescription = ref('')
  const resourceFile = ref<File | File[] | null>(null)
  const loading = ref(false)
  const uploading = ref(false)
  const showUpload = ref(false)
  const successSnackbar = ref(false)
  const successMessage = ref('Past question uploaded and shared.')
  const resourceToDelete = ref<Resource | null>(null)
  const deleting = ref(false)
  const savedResourceIds = ref<string[]>([])
  const savingResourceId = ref('')
  const savedResourceView = ref<'all' | 'saved-only'>('all')
  const savedResourceViewOptions = [
    { title: 'All materials', value: 'all' },
    { title: 'Saved only', value: 'saved-only' },
  ]
  const showDeleteConfirmation = computed({
    get: () => resourceToDelete.value !== null,
    set: (value: boolean) => {
      if (!value && !deleting.value) resourceToDelete.value = null
    },
  })
  const errorMessage = ref('')
  const questionSearch = ref('')
  const questionCourse = ref<string | null>(null)
  const questionLevel = ref<string | null>(null)
  const questionLevels = computed(() => [
    { title: 'All levels', value: null },
    ...academicLevels.map(level => ({ title: level.title, value: level.value })),
  ])
  function getQuestionLevel (resource: Resource) {
    return getCourseAcademicLevel(resource.course) || resource.academic_level
  }
  const questionCourses = computed(() =>
    [...new Set(pastQuestions.value.map(resource => resource.course.trim()).filter(Boolean))]
      .toSorted((a, b) => a.localeCompare(b))
      .map(course => ({ title: course, value: course })),
  )
  const filteredPastQuestions = computed(() => {
    const query = questionSearch.value.trim().toLocaleLowerCase()

    return pastQuestions.value
      .filter(resource =>
        !questionCourse.value
        || resource.course.trim().toLocaleLowerCase() === questionCourse.value.toLocaleLowerCase(),
      )
      .filter(resource => !questionLevel.value || getQuestionLevel(resource) === questionLevel.value)
      .filter(resource => !query || [
        resource.title,
        resource.course,
        resource.description,
        resource.uploaded_by_name || '',
      ].some(value => value.toLocaleLowerCase().includes(query)))
      .toSorted((a, b) =>
        (Number(savedResourceIds.value.includes(b.id)) - Number(savedResourceIds.value.includes(a.id)))
        || a.course.localeCompare(b.course, undefined, { sensitivity: 'base' })
        || b.created_at.localeCompare(a.created_at)
        || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      )
      .filter(resource => savedResourceView.value !== 'saved-only' || savedResourceIds.value.includes(resource.id))
  })

  function applyQuestionSearch () {
    questionSearch.value = questionSearch.value.trim()
  }

  async function loadPastQuestions () {
    loading.value = true
    errorMessage.value = ''

    try {
      const [user, resources] = await Promise.all([
        getCurrentUser(),
        getResources('past_question'),
      ])
      currentUser.value = user
      isResourceModerator.value = user ? await checkResourceModerator(user.id) : false
      savedResourceIds.value = user ? await getSavedResourceIds() : []
      pastQuestions.value = resources
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not load past questions.')
    } finally {
      loading.value = false
    }
  }

  async function toggleSavedResource (resource: Resource) {
    const isSaved = savedResourceIds.value.includes(resource.id)
    savingResourceId.value = resource.id
    errorMessage.value = ''
    try {
      await setResourceSaved(resource.id, !isSaved)
      savedResourceIds.value = isSaved
        ? savedResourceIds.value.filter(id => id !== resource.id)
        : [resource.id, ...savedResourceIds.value]
      successMessage.value = isSaved ? 'Removed from your saved materials.' : 'Saved to your personal study library.'
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not update your saved materials.')
    } finally {
      savingResourceId.value = ''
    }
  }

  async function sharePastQuestion () {
    errorMessage.value = ''
    const file = Array.isArray(resourceFile.value)
      ? resourceFile.value[0]
      : resourceFile.value

    if (!file) {
      errorMessage.value = 'Choose a PDF file to upload.'
      return
    }

    uploading.value = true
    try {
      const resource = await uploadResource({
        title: resourceTitle.value,
        course: resourceCourse.value,
        description: resourceDescription.value,
        kind: 'past_question',
        academic_level: getCourseAcademicLevel(resourceCourse.value) || resourceAcademicLevel.value,
        file,
      })
      pastQuestions.value.unshift(resource)
      resourceTitle.value = ''
      resourceCourse.value = ''
      resourceAcademicLevel.value = null
      resourceDescription.value = ''
      resourceFile.value = null
      showUpload.value = false
      successMessage.value = isSupabaseConfigured
        ? 'Past question uploaded. It is awaiting creator approval.'
        : 'Past question uploaded and shared.'
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not upload this past question.')
    } finally {
      uploading.value = false
    }
  }

  async function confirmDeleteResource () {
    const resource = resourceToDelete.value
    if (!resource) return

    deleting.value = true
    errorMessage.value = ''
    try {
      await deleteResource(resource)
      pastQuestions.value = pastQuestions.value.filter(item => item.id !== resource.id)
      resourceToDelete.value = null
      successMessage.value = 'Past question deleted.'
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not delete this past question.')
    } finally {
      deleting.value = false
    }
  }

  function formatDate (date: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date))
  }

  onMounted(loadPastQuestions)
</script>

<style scoped>
  .home-page {
    min-height: 100vh;
    overflow: hidden;
    padding: 0 24px 32px;
    color: #172d43;
    background:
      radial-gradient(ellipse at 6% 8%, rgb(221 238 231 / 52%), transparent 32rem),
      radial-gradient(ellipse at 95% 27%, rgb(244 232 203 / 48%), transparent 28rem),
      #f7f7f2;
  }

  .home-width {
    width: min(100%, 1280px);
    margin-inline: auto;
  }

  .home-header {
    display: flex;
    min-height: 88px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: #17324a;
    text-decoration: none;
  }

  .brand-mark {
    width: 48px;
    height: 48px;
  }

  .brand-copy {
    display: grid;
    gap: 2px;
  }

  .brand-copy strong,
  .footer-brand strong {
    font-size: 15px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  .brand-copy > span {
    color: #6a7b84;
    font-size: 12px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-link {
    margin-right: 10px;
    color: #526878;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
  }

  .header-link:hover,
  .hero-secondary:hover {
    color: #b9d9c9;
  }

  .hero-panel {
    position: relative;
    display: grid;
    min-height: 492px;
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    overflow: hidden;
    border-radius: 30px;
    padding: 58px 72px;
    color: #fff;
    background:
      radial-gradient(ellipse at 82% 15%, rgb(75 132 132 / 44%), transparent 30rem),
      linear-gradient(120deg, #15344c 0%, #1e4657 58%, #28615e 100%);
    box-shadow: 0 26px 60px rgb(29 57 66 / 14%);
  }

  .hero-panel::before {
    position: absolute;
    z-index: 0;
    top: -125px;
    right: -110px;
    width: 480px;
    height: 480px;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 50%;
    content: '';
  }

  .hero-panel::after {
    position: absolute;
    z-index: 0;
    top: -52px;
    right: -35px;
    width: 330px;
    height: 330px;
    border: 1px solid rgb(255 255 255 / 9%);
    border-radius: 50%;
    content: '';
  }

  .hero-copy,
  .hero-art {
    position: relative;
    z-index: 1;
  }

  .hero-copy {
    max-width: 570px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 22px;
    color: #d7e9dc;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .eyebrow-dot,
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d4b66e;
    box-shadow: 0 0 0 5px rgb(212 182 110 / 16%);
  }

  h1 {
    max-width: 580px;
    margin: 0;
    font-size: clamp(2.65rem, 5.1vw, 4.5rem);
    font-weight: 750;
    letter-spacing: -0.06em;
    line-height: 1.03;
  }

  h1 span {
    display: block;
    color: #d7bd7b;
  }

  .hero-description {
    max-width: 480px;
    margin: 22px 0 28px;
    color: rgb(255 255 255 / 76%);
    font-size: 16px;
    line-height: 1.75;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;
  }

  .hero-primary {
    color: #173b4d !important;
    font-weight: 700;
  }

  .hero-secondary {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: color 160ms ease;
  }

  .hero-proof {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 25px;
    color: rgb(255 255 255 / 73%);
    font-size: 12px;
  }

  .hero-art {
    display: flex;
    min-height: 350px;
    align-items: center;
    justify-content: center;
  }

  .hero-illustration {
    width: min(100%, 570px);
    height: auto;
    filter: drop-shadow(0 18px 28px rgb(5 23 28 / 20%));
  }

  .art-glow {
    position: absolute;
    width: 310px;
    height: 310px;
    border-radius: 50%;
    background: rgb(202 221 194 / 13%);
    filter: blur(1px);
  }

  .study-card {
    position: relative;
    z-index: 1;
    width: 258px;
    min-height: 304px;
    border: 1px solid rgb(255 255 255 / 65%);
    border-radius: 23px;
    padding: 23px;
    color: #17334a;
    background: linear-gradient(155deg, #fffdf7 0%, #f2eee2 100%);
    box-shadow: 0 28px 60px rgb(6 20 34 / 29%);
    transform: rotate(3deg);
  }

  .study-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mini-label {
    color: #74828a;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .status-dot {
    background: #6b9c7d;
    box-shadow: 0 0 0 4px rgb(107 156 125 / 13%);
  }

  .book-emblem {
    display: grid;
    width: 86px;
    height: 86px;
    place-items: center;
    margin: 24px auto 14px;
    border-radius: 25px;
    color: #e9d49c;
    background: linear-gradient(145deg, #214b5a, #386d66);
    box-shadow: 0 12px 20px rgb(25 61 70 / 18%);
  }

  .study-card-title {
    text-align: center;
    font-size: 20px;
    font-weight: 750;
    letter-spacing: -0.045em;
    line-height: 1.15;
  }

  .progress-caption {
    display: flex;
    justify-content: space-between;
    margin-top: 22px;
    color: #718088;
    font-size: 10px;
    font-weight: 650;
  }

  .progress-caption span:last-child {
    color: #be9e53;
  }

  .progress-track {
    height: 6px;
    overflow: hidden;
    margin-top: 8px;
    border-radius: 99px;
    background: #e2e3dc;
  }

  .progress-track span {
    display: block;
    width: 68%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #559178, #91b48c);
  }

  .floating-note {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 15px;
    padding: 10px 14px;
    color: #1e394b;
    background: #fffefa;
    box-shadow: 0 13px 28px rgb(6 20 34 / 22%);
  }

  .floating-note strong,
  .floating-note small {
    display: block;
  }

  .floating-note strong {
    font-size: 11px;
  }

  .floating-note small {
    margin-top: 2px;
    color: #74818a;
    font-size: 9px;
  }

  .note-top {
    top: 44px;
    right: 0;
    transform: rotate(4deg);
  }

  .note-bottom {
    bottom: 34px;
    left: 0;
    transform: rotate(-4deg);
  }

  .note-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
  }

  .note-icon-gold {
    color: #a9873d;
    background: #f5eedb;
  }

  .note-icon-green {
    color: #4e8168;
    background: #e4efe6;
  }

  .art-orbit {
    position: absolute;
    width: 9px;
    height: 9px;
    border: 2px solid #d4b66e;
    border-radius: 50%;
  }

  .orbit-one {
    top: 65px;
    left: 15%;
  }

  .orbit-two {
    right: 10%;
    bottom: 48px;
    width: 6px;
    height: 6px;
    border-color: #c6ddc7;
  }

  .feature-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 22px 0 74px;
    border: 1px solid #e6e8df;
    border-radius: 20px;
    padding: 20px 26px;
    background: rgb(255 255 252 / 84%);
    box-shadow: 0 8px 28px rgb(30 53 54 / 4%);
  }

  .about-app-section {
    scroll-margin-top: 24px;
    margin: 0 0 70px;
  }

  .about-app-heading {
    max-width: 700px;
    margin-bottom: 22px;
  }

  .about-app-heading h2 {
    margin: 7px 0 8px;
    color: #20394a;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    letter-spacing: -0.04em;
  }

  .about-app-heading p,
  .about-app-card p {
    margin: 0;
    color: #718087;
    line-height: 1.65;
  }

  .section-eyebrow {
    color: #56816e;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .about-app-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .about-app-card {
    border: 1px solid #e4e9e1;
    border-radius: 20px;
    padding: 22px;
    background: #fffefa;
  }

  .about-app-card h3 {
    margin: 12px 0 7px;
    color: #20394a;
    font-size: 17px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 3px 10px;
  }

  .feature-icon {
    display: grid;
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 15px;
  }

  .feature-icon-blue {
    color: #436e7b;
    background: #e7f0ef;
  }

  .feature-icon-gold {
    color: #a78642;
    background: #f5efdd;
  }

  .feature-icon-green {
    color: #4d836a;
    background: #e7f0e7;
  }

  .feature-item h2 {
    margin: 0;
    color: #213a4b;
    font-size: 14px;
    font-weight: 750;
  }

  .feature-item p {
    margin: 4px 0 0;
    color: #7a878b;
    font-size: 12px;
  }

  .resources-section {
    scroll-margin-top: 24px;
    margin-bottom: 70px;
  }

  .question-tools {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 2fr) repeat(3, minmax(190px, 0.8fr));
    gap: 14px;
    margin: 22px 0;
  }

  .resource-attribution {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    color: #77868a;
    font-size: 0.76rem;
  }

  .resource-attribution strong {
    color: #294453;
    font-weight: 700;
  }

  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 25px;
  }

  .section-kicker {
    margin-bottom: 9px;
    color: #688f78;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  .section-heading h2 {
    margin: 0;
    color: #20394a;
    font-size: clamp(1.6rem, 3vw, 2.15rem);
    font-weight: 750;
    letter-spacing: -0.045em;
  }

  .section-heading p {
    margin: 8px 0 0;
    color: #748187;
    font-size: 14px;
  }

  .upload-card,
  .resource-card {
    border: 1px solid #e7e9e1;
    background: #fffefa;
    box-shadow: 0 10px 30px rgb(24 49 57 / 5%);
  }

  .upload-card > .v-row {
    margin: 0 -12px;
  }

  .upload-card h3 {
    color: #233e50;
  }

  .resource-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .resource-card:hover {
    box-shadow: 0 16px 36px rgb(24 49 57 / 10%);
    transform: translateY(-3px);
  }

  .resource-icon {
    display: grid;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 14px;
    background: #f9e9e5;
  }

  .resource-description {
    color: #687983;
    line-height: 1.6;
  }

  .min-width-0 {
    min-width: 0;
  }

  .empty-library {
    display: flex;
    min-height: 150px;
    align-items: center;
    gap: 18px;
    border: 1px dashed #cfd8ce;
    border-radius: 20px;
    padding: 26px 30px;
    background: rgb(255 255 252 / 72%);
  }

  .empty-icon,
  .closing-icon {
    display: grid;
    width: 54px;
    height: 54px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 17px;
  }

  .empty-icon {
    color: #56816e;
    background: #e8f0e8;
  }

  .empty-library > div:nth-child(2) {
    flex: 1;
  }

  .empty-library h3 {
    margin: 0;
    color: #233e50;
    font-size: 16px;
  }

  .empty-library p {
    margin: 5px 0 0;
    color: #77858a;
    font-size: 13px;
  }

  .closing-banner {
    display: flex;
    align-items: center;
    gap: 19px;
    border-radius: 23px;
    padding: 27px 34px;
    color: #fff;
    background: linear-gradient(110deg, #386653, #527c63);
    box-shadow: 0 16px 32px rgb(44 91 66 / 13%);
  }

  .closing-icon {
    color: #ecdda9;
    background: rgb(255 255 255 / 12%);
  }

  .closing-copy {
    flex: 1;
  }

  .closing-copy h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 750;
    letter-spacing: -0.025em;
  }

  .closing-copy p {
    max-width: 650px;
    margin: 5px 0 0;
    color: rgb(255 255 255 / 77%);
    font-size: 13px;
    line-height: 1.55;
  }

  .closing-banner .v-btn {
    flex: 0 0 auto;
    color: #315643 !important;
    font-weight: 700;
  }

  .home-footer {
    display: flex;
    min-height: 80px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    color: #879294;
    font-size: 11px;
  }

  .footer-links {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .footer-links a {
    color: inherit;
    font-weight: 650;
    text-decoration: none;
  }

  .footer-brand {
    gap: 9px;
    color: #516976;
  }

  .brand-mark-small {
    width: 29px;
    height: 29px;
  }

  .footer-brand strong {
    font-size: 12px;
  }

  :global(.v-theme--academicDark) .home-page {
    color: #e0e9e7;
    background:
      radial-gradient(ellipse at 6% 8%, rgb(41 83 73 / 24%), transparent 32rem),
      radial-gradient(ellipse at 95% 27%, rgb(114 92 45 / 15%), transparent 28rem),
      #101a21;
  }

  :global(.v-theme--academicDark) .brand,
  :global(.v-theme--academicDark) .feature-item h2,
  :global(.v-theme--academicDark) .section-heading h2,
  :global(.v-theme--academicDark) .empty-library h3,
  :global(.v-theme--academicDark) .resource-card h3 {
    color: #e0eae8;
  }

  :global(.v-theme--academicDark) .brand-copy > span,
  :global(.v-theme--academicDark) .header-link,
  :global(.v-theme--academicDark) .feature-item p,
  :global(.v-theme--academicDark) .section-heading p,
  :global(.v-theme--academicDark) .empty-library p,
  :global(.v-theme--academicDark) .resource-card .text-medium-emphasis,
  :global(.v-theme--academicDark) .resource-description,
  :global(.v-theme--academicDark) .home-footer {
    color: #a5b3b4;
  }

  :global(.v-theme--academicDark) .feature-strip,
  :global(.v-theme--academicDark) .upload-card,
  :global(.v-theme--academicDark) .resource-card,
  :global(.v-theme--academicDark) .empty-library {
    border-color: #30414a;
    background: #1b2932;
  }

  :global(.v-theme--academicDark) .footer-brand {
    color: #adc0bb;
  }

  :global(.v-theme--campusGreen) .home-page {
    background:
      radial-gradient(ellipse at 6% 8%, #d8e9dc, transparent 32rem),
      radial-gradient(ellipse at 95% 27%, #e7e9d5, transparent 28rem),
      #edf4ee;
  }

  :global(.v-theme--libraryWarm) .home-page {
    color: #49382b;
    background:
      radial-gradient(ellipse at 6% 8%, #eee0cc, transparent 32rem),
      radial-gradient(ellipse at 95% 27%, #eadcc7, transparent 28rem),
      #f7f0e6;
  }

  :global(.v-theme--libraryWarm) .brand,
  :global(.v-theme--libraryWarm) .feature-item h2,
  :global(.v-theme--libraryWarm) .section-heading h2,
  :global(.v-theme--libraryWarm) .empty-library h3,
  :global(.v-theme--libraryWarm) .resource-card h3 {
    color: #57412f;
  }

  :global(.v-theme--libraryWarm) .feature-strip,
  :global(.v-theme--libraryWarm) .upload-card,
  :global(.v-theme--libraryWarm) .resource-card,
  :global(.v-theme--libraryWarm) .empty-library {
    border-color: #e9ddcd;
    background: #fffaf2;
  }

  :global(.v-theme--scholarBlue) .home-page {
    background:
      radial-gradient(ellipse at 6% 8%, #d8e6f1, transparent 32rem),
      radial-gradient(ellipse at 95% 27%, #e6e9ef, transparent 28rem),
      #eef3f8;
  }

  :global(.v-theme--scholarBlue) .brand,
  :global(.v-theme--scholarBlue) .feature-item h2,
  :global(.v-theme--scholarBlue) .section-heading h2,
  :global(.v-theme--scholarBlue) .empty-library h3,
  :global(.v-theme--scholarBlue) .resource-card h3 {
    color: #294766;
  }

  :global(.v-theme--scholarBlue) .feature-strip,
  :global(.v-theme--scholarBlue) .upload-card,
  :global(.v-theme--scholarBlue) .resource-card,
  :global(.v-theme--scholarBlue) .empty-library {
    border-color: #dbe5ee;
    background: #fbfdff;
  }

  @media (max-width: 1279px) {
    .past-question-grid > .v-col {
      flex: 0 0 100% !important;
      max-width: 100% !important;
    }

    .resource-card h3,
    .resource-card p,
    .resource-attribution {
      overflow-wrap: anywhere;
      word-break: normal;
    }

  }

  @media (max-width: 900px) {
    .about-app-grid {
      grid-template-columns: 1fr;
    }

    .question-tools {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .question-tools > :first-child {
      grid-column: 1 / -1;
    }

    .hero-panel {
      grid-template-columns: 1fr 0.8fr;
      padding: 48px 42px;
    }

    .feature-strip {
      padding: 18px 14px;
    }

    .feature-item {
      align-items: flex-start;
      gap: 9px;
      padding-inline: 4px;
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 13px;
    }
  }

  @media (max-width: 680px) {
    .home-page {
      padding: 0 15px 20px;
    }

    .home-header {
      min-height: 72px;
    }

    .brand-mark {
      width: 40px;
      height: 40px;
    }

    .brand-copy strong {
      font-size: 13px;
    }

    .brand-copy > span,
    .header-link,
    .login-button {
      display: none;
    }

    .header-actions {
      gap: 5px;
    }

    .header-actions .v-btn {
      padding-inline: 13px;
      font-size: 11px;
    }

    .hero-panel {
      grid-template-columns: 1fr;
      gap: 10px;
      min-height: auto;
      border-radius: 23px;
      padding: 38px 25px 18px;
    }

    .hero-copy {
      max-width: none;
    }

    .eyebrow {
      margin-bottom: 17px;
      font-size: 10px;
    }

    h1 {
      font-size: clamp(2.5rem, 12vw, 3.65rem);
    }

    .hero-description {
      margin: 17px 0 22px;
      font-size: 14px;
    }

    .hero-actions {
      gap: 14px;
    }

    .hero-art {
      min-height: 270px;
      margin-top: -6px;
    }

    .note-top {
      right: -8px;
    }

    .note-bottom {
      left: -7px;
    }

    .feature-strip {
      grid-template-columns: 1fr;
      gap: 14px;
      margin: 15px 0 52px;
      padding: 17px;
    }

    .feature-item {
      align-items: center;
      gap: 12px;
      padding: 0;
    }

    .feature-item h2 {
      font-size: 13px;
    }

    .feature-item p {
      font-size: 11px;
    }

    .section-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 16px;
    }

    .section-heading h2 {
      font-size: 1.7rem;
    }

    .resources-section {
      margin-bottom: 48px;
    }

    .question-tools {
      grid-template-columns: minmax(0, 1fr);
    }

    .question-tools > :first-child {
      grid-column: auto;
    }

    .empty-library {
      align-items: flex-start;
      flex-direction: column;
      padding: 22px;
    }

    .closing-banner {
      align-items: flex-start;
      flex-direction: column;
      padding: 24px;
    }

    .closing-banner .v-btn {
      width: 100%;
    }

    .home-footer {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      gap: 9px;
      padding: 18px 0;
    }
  }
</style>
