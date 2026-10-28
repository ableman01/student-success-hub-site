<template>
  <main class="institution-news-page">
    <v-container class="institution-news-container">
      <div class="news-kicker"><v-icon size="17">mdi-newspaper-variant-outline</v-icon> {{ user?.institution || 'YOUR SCHOOL' }}</div>

      <div class="news-heading">
        <div>
          <h1>Institution news</h1>
          <p>Recent updates published on {{ user?.institution || 'your institution' }}’s official website.</p>
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

      <v-alert v-if="errorMessage" class="mb-5" type="info" variant="tonal">{{ errorMessage }}</v-alert>

      <v-alert v-else-if="!officialSite && !loading" class="mb-5" type="info" variant="tonal">
        We could not verify an official website for this institution in its education directory, so we are not showing third-party news.
      </v-alert>

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
          <span class="news-meta">{{ item.source }}<template v-if="item.published_at"> · {{ formatDate(item.published_at) }}</template></span>
          <strong>{{ item.title }}</strong>
          <p v-if="item.summary">{{ item.summary }}</p>
          <span class="news-link">Read story <v-icon size="14">mdi-open-in-new</v-icon></span>
        </a>
      </div>

      <div v-else-if="!loading && officialSite" class="news-state">
        <v-icon color="primary" size="34">mdi-newspaper-variant-outline</v-icon>
        <h2>No recent stories were found</h2>
        <p>No news posts were found on the official website. Try again later or visit the institution website directly.</p>
      </div>

      <p v-if="officialSite" class="news-attribution">News links come directly from the institution website. Confirm deadlines and important instructions on the official site.</p>
    </v-container>
  </main>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { type AppUser, getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'

  interface InstitutionNewsItem { title: string, url: string, source: string, published_at: string | null, summary?: string }
  const user = ref<AppUser | null>(null)
  const items = ref<InstitutionNewsItem[]>([])
  const officialSite = ref<string | null>(null)
  const loading = ref(true)
  const errorMessage = ref('')

  function formatDate (value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date)
  }

  async function loadNews () {
    if (!user.value?.institution) return
    loading.value = true
    errorMessage.value = ''
    try {
      const params = new URLSearchParams({ institution: user.value.institution, type: user.value.institutionType })
      const response = await fetch(`/api/institution-news?${params}`)
      const result = await response.json() as { items?: InstitutionNewsItem[], officialSite?: string | null, error?: string }
      if (!response.ok) throw new Error(result.error || 'Institution news is temporarily unavailable.')
      items.value = result.items || []
      officialSite.value = result.officialSite || null
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
  .institution-news-page { min-height: 100%; padding: 44px 0 72px; background: #f6f8f5; }
  .institution-news-container { max-width: 1060px; }
  .news-kicker { display: flex; align-items: center; gap: 8px; color: #4b7960; font-size: 11px; font-weight: 800; letter-spacing: .13em; }
  .news-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin: 12px 0 24px; }
  .news-heading h1 { margin: 0; color: #20394a; font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: -.04em; }
  .news-heading p { max-width: 650px; margin: 8px 0 0; color: #667781; line-height: 1.65; }
  .news-actions { display: flex; align-items: center; gap: 8px; }
  .news-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 14px; }
  .news-card { display: flex; flex-direction: column; gap: 12px; min-height: 190px; padding: 20px; border: 1px solid #e4eae4; border-radius: 18px; color: inherit; background: #fff; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease; }
  .news-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px #20394a12; }
  .news-meta, .news-attribution { color: #75858a; font-size: 12px; }
  .news-card strong { color: #263e4b; font-size: 17px; line-height: 1.5; }
  .news-card p { margin: 0; color: #667781; line-height: 1.55; }
  .news-link { display: flex; align-items: center; gap: 5px; margin-top: auto; color: #426b55; font-size: 12px; font-weight: 700; }
  .news-state { display: grid; justify-items: center; gap: 12px; padding: 48px 20px; color: #62757b; text-align: center; }
  .news-state h2 { margin: 0; color: #28404c; font-size: 19px; }
  .news-state p { max-width: 500px; margin: 0; line-height: 1.6; }
  .news-attribution { margin: 20px 0 0; }
  @media (max-width: 600px) { .institution-news-page { padding: 28px 0 52px; } .news-heading { align-items: flex-start; flex-direction: column; } }
</style>
