<template>
  <main class="saved-page">
    <v-container class="saved-container">
      <div class="saved-eyebrow"><v-icon size="17">mdi-bookmark-check-outline</v-icon> YOUR PERSONAL LIBRARY</div>
      <div class="saved-heading-row">
        <div>
          <h1>Saved materials</h1>
          <p>Keep the questions and course resources you want close at hand.</p>
        </div>
        <v-chip color="primary" prepend-icon="mdi-bookmark" size="large" variant="tonal">
          {{ visibleMaterials.length }} {{ visibleMaterials.length === 1 ? 'item' : 'items' }}
        </v-chip>
      </div>

      <v-card class="saved-library" elevation="0" rounded="xl">
        <div class="saved-toolbar">
          <v-text-field
            v-model="search"
            aria-label="Search saved materials"
            class="saved-search"
            clearable
            density="comfortable"
            hide-details
            prepend-inner-icon="mdi-magnify"
            placeholder="Search title, course or description"
            rounded="lg"
            variant="outlined"
          />
          <v-select
            v-model="kindFilter"
            aria-label="Filter saved materials"
            class="saved-filter"
            density="comfortable"
            hide-details
            :items="kindOptions"
            rounded="lg"
            variant="outlined"
          />
        </div>

        <v-alert v-if="errorMessage" class="ma-5" type="error" variant="tonal">{{ errorMessage }}</v-alert>
        <div v-if="loading" class="saved-loading"><v-progress-circular color="primary" indeterminate /><span>Loading your saved materials…</span></div>

        <div v-else-if="visibleMaterials.length" class="saved-grid">
          <v-card v-for="resource in visibleMaterials" :key="resource.id" class="saved-card" elevation="0" rounded="lg">
            <div class="saved-card-top">
              <div class="saved-file-icon"><v-icon color="error" size="27">mdi-file-pdf-box</v-icon></div>
              <v-btn
                :aria-label="`Remove ${resource.title} from saved materials`"
                :loading="savingResourceId === resource.id"
                color="primary"
                icon="mdi-bookmark-remove-outline"
                size="small"
                variant="text"
                @click="removeSaved(resource)"
              />
            </div>
            <div class="saved-card-content">
              <div class="saved-chip-row">
                <v-chip color="primary" size="x-small" variant="tonal">{{ resource.kind === 'past_question' ? 'Past question' : getResourceCategoryLabel(resource.category) }}</v-chip>
                <span>{{ formatDate(resource.created_at) }}</span>
              </div>
              <h2>{{ resource.title }}</h2>
              <p class="saved-course">{{ resource.course || 'Course not specified' }}</p>
              <p v-if="resource.description" class="saved-description">{{ resource.description }}</p>
              <div class="saved-card-footer">
                <span><v-icon size="15">mdi-account-outline</v-icon>{{ resource.uploaded_by_name || 'LASU student' }}</span>
                <v-btn
                  :href="resource.url"
                  color="primary"
                  append-icon="mdi-open-in-new"
                  rounded="pill"
                  size="small"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="tonal"
                >Open PDF</v-btn>
              </div>
            </div>
          </v-card>
        </div>

        <div v-else-if="savedResources.length" class="saved-empty">
          <div class="saved-empty-icon"><v-icon size="30">mdi-magnify</v-icon></div>
          <h2>No matching materials</h2>
          <p>Try another search or filter to find a saved resource.</p>
          <v-btn rounded="pill" variant="tonal" @click="search = ''; kindFilter = 'all'">Clear filters</v-btn>
        </div>
        <div v-else-if="!errorMessage" class="saved-empty">
          <div class="saved-empty-icon"><v-icon size="30">mdi-bookmark-outline</v-icon></div>
          <h2>Your study library starts here</h2>
          <p>Bookmark a past question or class material, and it will be waiting here whenever you need it.</p>
          <div class="saved-empty-actions">
            <v-btn color="primary" prepend-icon="mdi-file-question-outline" rounded="pill" to="/#past-questions">Browse questions</v-btn>
            <v-btn prepend-icon="mdi-view-dashboard-outline" rounded="pill" to="/dashboard" variant="tonal">Browse class materials</v-btn>
          </div>
        </div>
      </v-card>
    </v-container>
    <v-snackbar v-model="successSnackbar" color="success" timeout="2600">{{ successMessage }}</v-snackbar>
  </main>
</template>

<script setup lang="ts">
  import type { AppUser } from '@/lib/auth'
  import type { Resource } from '@/services/resources'
  import { computed, onMounted, ref } from 'vue'
  import { getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'
  import { getResourceCategoryLabel, getResources, getSavedResourceIds, setResourceSaved } from '@/services/resources'

  const user = ref<AppUser | null>(null)
  const resources = ref<Resource[]>([])
  const savedIds = ref<string[]>([])
  const loading = ref(true)
  const errorMessage = ref('')
  const search = ref('')
  const kindFilter = ref<'all' | 'past_question' | 'class_material'>('all')
  const savingResourceId = ref('')
  const successSnackbar = ref(false)
  const successMessage = ref('')
  const kindOptions = [
    { title: 'All saved materials', value: 'all' },
    { title: 'Past questions', value: 'past_question' },
    { title: 'Class materials', value: 'class_material' },
  ]
  const savedResources = computed(() => {
    const saved = new Set(savedIds.value)
    return resources.value
      .filter(resource => saved.has(resource.id) && resource.status === 'approved')
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
  })
  const visibleMaterials = computed(() => {
    const query = search.value.trim().toLocaleLowerCase()
    return savedResources.value.filter(resource => kindFilter.value === 'all' || resource.kind === kindFilter.value)
      .filter(resource => !query || `${resource.title} ${resource.course} ${resource.description} ${getResourceCategoryLabel(resource.category)}`.toLocaleLowerCase().includes(query))
  })

  async function loadSavedMaterials () {
    loading.value = true
    errorMessage.value = ''
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) throw new Error('Sign in to view your saved materials.')
      user.value = currentUser
      const [questions, classMaterials, ids] = await Promise.all([
        getResources('past_question'),
        getResources('class_material', currentUser.academicLevel),
        getSavedResourceIds(),
      ])
      resources.value = [...questions, ...classMaterials]
      savedIds.value = ids
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not load your saved materials.')
    } finally {
      loading.value = false
    }
  }

  async function removeSaved (resource: Resource) {
    savingResourceId.value = resource.id
    errorMessage.value = ''
    try {
      await setResourceSaved(resource.id, false)
      savedIds.value = savedIds.value.filter(id => id !== resource.id)
      successMessage.value = 'Removed from your saved materials.'
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not update your saved materials.')
    } finally {
      savingResourceId.value = ''
    }
  }

  function formatDate (date: string) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
  }

  onMounted(() => { void loadSavedMaterials() })
</script>

<style scoped>
  .saved-page { min-height: calc(100vh - 76px); background: #f5f7f4; padding: clamp(28px, 5vw, 58px) 0 72px; }
  .saved-container { max-width: 1180px; }
  .saved-eyebrow { display: flex; align-items: center; gap: 8px; color: #648072; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
  .saved-heading-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin: 12px 0 27px; }
  .saved-heading-row h1 { margin: 0; color: #203b31; font-size: clamp(28px, 4vw, 40px); font-weight: 760; letter-spacing: -.035em; }
  .saved-heading-row p { margin: 8px 0 0; color: #738279; font-size: 15px; }
  .saved-library { overflow: hidden; border: 1px solid #e4ebe4; background: #fff; }
  .saved-toolbar { display: flex; gap: 14px; border-bottom: 1px solid #edf1ec; padding: 20px; }
  .saved-search { flex: 1; }
  .saved-filter { max-width: 230px; }
  .saved-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; padding: 22px; }
  .saved-card { border: 1px solid #e7ede7; background: linear-gradient(180deg, #fff 0%, #fcfdfb 100%); padding: 17px; transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease; }
  .saved-card:hover { transform: translateY(-2px); border-color: #cbd9ce; box-shadow: 0 12px 25px rgb(32 59 49 / 7%); }
  .saved-card-top { display: flex; align-items: center; justify-content: space-between; }
  .saved-file-icon, .saved-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 15px; background: #f3f6f2; }
  .saved-card-content { display: grid; gap: 9px; padding-top: 10px; }
  .saved-chip-row { display: flex; min-height: 24px; align-items: center; justify-content: space-between; gap: 8px; color: #909b94; font-size: 11px; }
  .saved-card h2 { display: -webkit-box; overflow: hidden; margin: 0; color: #243c32; font-size: 17px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .saved-course { margin: 0; color: #668072; font-size: 13px; font-weight: 700; }
  .saved-description { display: -webkit-box; overflow: hidden; min-height: 34px; margin: 0; color: #7e8b83; font-size: 12px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .saved-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; border-top: 1px solid #edf1ec; padding-top: 13px; }
  .saved-card-footer > span { display: flex; min-width: 0; align-items: center; gap: 5px; overflow: hidden; color: #849188; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .saved-empty, .saved-loading { display: grid; min-height: 300px; align-content: center; justify-items: center; gap: 12px; padding: 34px; text-align: center; }
  .saved-empty-icon { width: 60px; height: 60px; color: #648072; }
  .saved-empty h2 { margin: 4px 0 0; color: #294338; font-size: 20px; }
  .saved-empty p { max-width: 430px; margin: 0; color: #77847c; font-size: 14px; line-height: 1.6; }
  .saved-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 7px; }
  .saved-loading { display: flex; min-height: 260px; align-items: center; justify-content: center; color: #728078; }
  @media (max-width: 600px) {
    .saved-page { padding-top: 25px; }
    .saved-heading-row { align-items: flex-start; }
    .saved-heading-row :deep(.v-chip) { font-size: 11px; }
    .saved-toolbar { flex-direction: column; padding: 14px; }
    .saved-filter { max-width: none; }
    .saved-grid { grid-template-columns: 1fr; padding: 14px; }
  }
</style>
