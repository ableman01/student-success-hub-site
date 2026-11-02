<template>
  <main class="institution-news-page">
    <v-container class="institution-news-container">
      <div class="news-kicker"><v-icon size="17">mdi-newspaper-variant-outline</v-icon> {{ user?.institution || 'YOUR SCHOOL' }}</div>

      <div class="news-heading">
        <div>
          <h1>Institution news</h1>
          <p>Official updates when available, plus news search results for {{ user?.institution || 'your institution' }}.</p>
        </div>

        <div class="news-actions">
          <v-btn prepend-icon="mdi-view-dashboard-outline" rounded="pill" to="/dashboard" variant="text">Dashboard</v-btn>

          <v-btn
            :loading="loading"
            prepend-icon="mdi-refresh"
            rounded="pill"
            variant="tonal"
            @click="loadNews"
          >Refresh</v-btn>
        </div>
      </div>

      <v-alert v-if="errorMessage" class="mb-5" type="error" variant="tonal">{{ errorMessage }}</v-alert>

      <v-alert v-else-if="note" class="mb-5" type="info" variant="tonal">{{ note }}</v-alert>

      <v-alert
        v-else-if="officialSite"
        class="mb-5"
        density="compact"
        type="info"
        variant="tonal"
      >
        Source: <a :href="officialSite" rel="noopener noreferrer" target="_blank">{{ officialSite }}</a>
      </v-alert>

      <div v-if="loading && items.length === 0" class="news-state"><v-progress-circular color="primary" indeterminate /><span>Loading news for {{ user?.institution }}…</span></div>

      <div v-else-if="items.length > 0" class="news-grid">
        <a
          v-for="item in items"
          :key="item.url"
          class="news-card"
          :href="item.url"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span class="news-icon"><v-icon size="26">mdi-bullhorn-outline</v-icon></span>
          <span class="news-content">
          <span class="news-meta">{{ item.source }}<template v-if="item.published_at"> · {{ formatDate(item.published_at) }}</template></span>
          <strong>{{ item.title }}</strong>
          <p v-if="item.summary">{{ item.summary }}</p>
          <span class="news-link">Read story <v-icon size="14">mdi-open-in-new</v-icon></span>
          </span>
        </a>
      </div>

      <div v-else-if="!loading && officialSite" class="news-state">
        <v-icon color="primary" size="34">mdi-newspaper-variant-outline</v-icon>
        <h2>No recent stories were found</h2>
        <p>No news posts were found on the official website. Visit the institution website directly or check back later.</p>

        <div class="news-state-actions">
          <a class="news-state-button" :href="officialSite" rel="noopener noreferrer" target="_blank">Open {{ officialSiteHostname }}</a>

          <a
            v-if="directoryUrl"
            class="news-state-button"
            :href="directoryUrl"
            rel="noopener noreferrer"
            target="_blank"
          >Find your school in the directory</a>

          <a
            v-if="searchUrl"
            class="news-state-button"
            :href="searchUrl"
            rel="noopener noreferrer"
            target="_blank"
          >Search the news for your school</a>
        </div>
      </div>

      <div v-else-if="!loading && !officialSite && directoryUrl" class="news-state">
        <v-icon color="primary" size="34">mdi-newspaper-variant-outline</v-icon>
        <h2>No official website found</h2>
        <p>We couldn’t verify an official website for {{ user?.institution || 'your institution' }} yet. Check the regulator’s directory for your school’s official links.</p>

        <div class="news-state-actions">
          <a
            v-if="searchUrl"
            class="news-state-button"
            :href="searchUrl"
            rel="noopener noreferrer"
            target="_blank"
          >Search the news for your school</a>

          <a
            class="news-state-button"
            :href="directoryUrl"
            rel="noopener noreferrer"
            target="_blank"
          >Find your school in the regulator’s directory</a>
        </div>
      </div>

      <p v-if="items.length > 0" class="news-attribution">
        <template v-if="sourceType === 'official'">News links come directly from the institution website. Confirm deadlines and important instructions on the official site.</template>
        <template v-else>These are news search results, not official school notices, and may include unrelated coverage. Confirm deadlines and instructions with your school.</template>
      </p>
    </v-container>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { type AppUser, getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'

  interface InstitutionNewsItem { title: string, url: string, source: string, published_at: string | null, summary?: string }
  const user = ref<AppUser | null>(null)
  const items = ref<InstitutionNewsItem[]>([])
  const officialSite = ref<string | null>(null)
  const directoryUrl = ref<string | null>(null)
  const searchUrl = ref<string | null>(null)
  const sourceType = ref<'official' | 'search' | null>(null)
  const loading = ref(true)

  const officialSiteHostname = computed(() => {
    if (!officialSite.value) return ''
    try {
      return new URL(officialSite.value).hostname
    } catch {
      return ''
    }
  })
  const errorMessage = ref('')
  const note = ref<string>('')

  function formatDate (value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date)
  }

  async function loadNews () {
    if (!user.value?.institution) {
      loading.value = false
      return
    }
    loading.value = true
    errorMessage.value = ''
    note.value = ''
    try {
      const params = new URLSearchParams({ institution: user.value.institution, type: user.value.institutionType })
      const response = await fetch(`/api/institution-news?${params}`)
      const result = await response.json() as { items?: InstitutionNewsItem[], officialSite?: string | null, directoryUrl?: string | null, searchUrl?: string | null, sourceType?: 'official' | 'search' | null, note?: string, error?: string }
      if (!response.ok) throw new Error(result.error || 'Institution news is temporarily unavailable.')
      items.value = result.items || []
      officialSite.value = result.officialSite || null
      directoryUrl.value = result.directoryUrl || null
      searchUrl.value = result.searchUrl || null
      sourceType.value = result.sourceType || null
      note.value = result.note || ''
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Institution news is temporarily unavailable.')
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    user.value = await getCurrentUser()
    if (user.value) {
      await loadNews()
    } else {
      loading.value = false
    }
  })
</script>

<style scoped>
  .institution-news-page { min-height: 100%; padding: 44px 0 72px; color: rgb(var(--v-theme-on-background)); background: rgb(var(--v-theme-background)); }
  .institution-news-container { max-width: 1060px; }
  .news-kicker { display: flex; align-items: center; gap: 8px; color: rgb(var(--v-theme-secondary)); font-size: 11px; font-weight: 800; letter-spacing: .13em; }
  .news-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin: 12px 0 24px; }
  .news-heading h1 { margin: 0; color: rgb(var(--v-theme-on-background)); font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: -.04em; }
  .news-heading p { max-width: 650px; margin: 8px 0 0; color: rgb(var(--v-theme-on-background) / 0.72); line-height: 1.65; }
  .news-actions { display: flex; align-items: center; gap: 8px; }
  .news-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .news-card { display: flex; align-items: flex-start; gap: 26px; min-height: 0; padding: 28px 26px; border: 1px solid rgb(var(--v-theme-on-surface) / 0.1); border-radius: 28px; color: inherit; background: rgb(var(--v-theme-surface)); text-decoration: none; transition: box-shadow .18s ease; }
  .news-card:hover { box-shadow: 0 12px 28px #20394a12; }
  .news-icon { display: grid; flex: 0 0 68px; width: 68px; height: 68px; place-items: center; border-radius: 22px; color: rgb(var(--v-theme-secondary)); background: rgb(var(--v-theme-secondary) / .09); }
  .news-content { display: flex; flex: 1; flex-direction: column; align-items: flex-start; gap: 12px; min-width: 0; }
  .news-meta, .news-attribution { color: rgb(var(--v-theme-on-background) / 0.64); font-size: 14px; }
  .news-card strong { color: rgb(var(--v-theme-on-surface)); font-size: 22px; line-height: 1.45; }
  .news-card p { margin: 0; color: rgb(var(--v-theme-on-surface) / 0.72); font-size: 17px; line-height: 1.6; }
  .news-link { display: flex; align-items: center; gap: 5px; align-self: flex-end; margin-top: 8px; padding: 9px 16px; border-radius: 999px; color: rgb(var(--v-theme-primary)); background: rgb(var(--v-theme-secondary) / .1); font-size: 14px; font-weight: 700; }
  .news-state { display: grid; justify-items: center; gap: 12px; padding: 48px 20px; color: rgb(var(--v-theme-on-background) / 0.72); text-align: center; }
  .news-state h2 { margin: 0; color: rgb(var(--v-theme-on-background)); font-size: 19px; }
  .news-state p { max-width: 500px; margin: 0; line-height: 1.6; }
  .news-attribution { margin: 20px 0 0; }
  .directory-fallback-copy { margin: 0 0 10px; line-height: 1.6; }
  .directory-link { display: inline-flex; align-items: center; gap: 5px; color: rgb(var(--v-theme-primary)); font-weight: 700; text-decoration: none; }
  .directory-link:hover { text-decoration: underline; }
  @media (max-width: 600px) { .institution-news-page { padding: 28px 0 52px; } .news-heading { align-items: flex-start; flex-direction: column; } .news-card { gap: 14px; padding: 20px 16px; border-radius: 20px; } .news-icon { flex-basis: 44px; width: 44px; height: 44px; border-radius: 15px; } .news-card strong { font-size: 18px; } .news-card p { font-size: 15px; } .news-link { align-self: flex-start; } }
</style>
