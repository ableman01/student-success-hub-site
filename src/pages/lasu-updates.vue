<template>
  <main class="updates-page">
    <v-container class="updates-container">
      <div class="updates-kicker"><v-icon size="17">mdi-check-decagram-outline</v-icon> OFFICIAL LASU SOURCES</div>
      <div class="updates-heading">
        <div>
          <h1>LASU updates</h1>
          <p>Important notices collected from the university’s official news board. Open the source link to confirm dates, requirements, and any later changes.</p>
          <p v-if="updates.length" class="last-checked">Latest source check: {{ formatDate(updates[0].last_seen_at) }}</p>
        </div>
        <div class="updates-heading-actions">
          <v-btn prepend-icon="mdi-home-outline" rounded="pill" to="/" variant="text">Home</v-btn>
          <v-btn
            :href="calendarUrl"
            append-icon="mdi-open-in-new"
            color="primary"
            rounded="pill"
            target="_blank"
            rel="noopener noreferrer"
            variant="tonal"
          >Academic calendar</v-btn>
        </div>
      </div>

      <v-alert class="source-note" type="info" variant="tonal">
        Updates are checked automatically. LASU’s official website remains the final source for current deadlines and instructions.
      </v-alert>

      <v-alert v-if="errorMessage" class="mb-5" type="error" variant="tonal">{{ errorMessage }}</v-alert>
      <div v-if="loading" class="updates-loading"><v-progress-circular color="primary" indeterminate /><span>Loading official updates…</span></div>

      <template v-else>
        <div class="updates-filters" role="group" aria-label="Filter LASU updates">
          <v-btn
            v-for="option in categories"
            :key="option.value"
            :aria-pressed="activeCategory === option.value"
            :color="activeCategory === option.value ? 'primary' : undefined"
            rounded="pill"
            size="small"
            :variant="activeCategory === option.value ? 'flat' : 'outlined'"
            @click="activeCategory = option.value"
          >{{ option.label }}</v-btn>
        </div>

        <div v-if="visibleUpdates.length" class="updates-list">
          <v-card v-for="update in visibleUpdates" :key="update.id" class="update-card" elevation="0" rounded="xl">
            <div class="update-icon" :class="`update-icon-${update.category}`">
              <v-icon>{{ categoryIcon(update.category) }}</v-icon>
            </div>
            <div class="update-content">
              <div class="update-meta">
                <v-chip :color="categoryColor(update.category)" size="x-small" variant="tonal">{{ categoryLabel(update.category) }}</v-chip>
                <span>{{ formatDate(update.published_at || update.first_seen_at) }}</span>
              </div>
              <h2>{{ update.title }}</h2>
              <p v-if="update.summary">{{ update.summary }}</p>
              <div class="update-footer">
                <span><v-icon size="15">mdi-check-decagram</v-icon>{{ update.source_label }}</span>
                <v-btn
                  :href="update.official_url"
                  append-icon="mdi-open-in-new"
                  color="primary"
                  rounded="pill"
                  size="small"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="tonal"
                >Read on LASU</v-btn>
              </div>
            </div>
          </v-card>
        </div>

        <div v-else class="updates-empty">
          <v-icon color="primary" size="34">mdi-bell-check-outline</v-icon>
          <h2>{{ updates.length ? 'No updates in this category' : 'No official updates have synced yet' }}</h2>
          <p>{{ updates.length ? 'Choose another category to see more LASU notices.' : 'The automatic checker will add notices as they appear on LASU’s official news page.' }}</p>
          <v-btn v-if="updates.length" rounded="pill" variant="tonal" @click="activeCategory = 'all'">Show all updates</v-btn>
        </div>
      </template>
    </v-container>
  </main>
</template>

<script setup lang="ts">
  import type { LasuOfficialUpdate, LasuUpdateCategory } from '@/services/lasu-updates'
  import { computed, onMounted, ref } from 'vue'
  import { getErrorMessage } from '@/lib/errors'
  import { getLasuOfficialUpdates } from '@/services/lasu-updates'

  const calendarUrl = 'https://www.lasu.edu.ng/home/pages/?id=calendar'
  const updates = ref<LasuOfficialUpdate[]>([])
  const loading = ref(true)
  const errorMessage = ref('')
  const activeCategory = ref<'all' | LasuUpdateCategory>('all')
  const categories: { value: 'all' | LasuUpdateCategory, label: string }[] = [
    { value: 'all', label: 'All updates' },
    { value: 'deadline', label: 'Deadlines' },
    { value: 'registration', label: 'Registration' },
    { value: 'academic', label: 'Academic' },
    { value: 'opportunity', label: 'Opportunities' },
    { value: 'announcement', label: 'Announcements' },
  ]

  const visibleUpdates = computed(() => activeCategory.value === 'all'
    ? updates.value
    : updates.value.filter(update => update.category === activeCategory.value))

  function categoryLabel (category: LasuUpdateCategory) {
    return ({ announcement: 'Announcement', deadline: 'Deadline', registration: 'Registration', academic: 'Academic update', opportunity: 'Opportunity' })[category]
  }

  function categoryIcon (category: LasuUpdateCategory) {
    return ({ announcement: 'mdi-bullhorn-outline', deadline: 'mdi-calendar-alert-outline', registration: 'mdi-clipboard-list-outline', academic: 'mdi-school-outline', opportunity: 'mdi-star-circle-outline' })[category]
  }

  function categoryColor (category: LasuUpdateCategory) {
    return ({ announcement: 'primary', deadline: 'error', registration: 'warning', academic: 'info', opportunity: 'success' })[category]
  }

  function formatDate (value: string | null) {
    if (!value) return 'Date not listed'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Date not listed' : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  onMounted(async () => {
    try {
      updates.value = await getLasuOfficialUpdates()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not load LASU updates right now.')
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .updates-page { min-height: 100%; padding: 44px 0 72px; background: #f6f8f5; }
  .updates-container { max-width: 1060px; }
  .updates-kicker { display: flex; align-items: center; gap: 8px; color: #4b7960; font-size: 11px; font-weight: 800; letter-spacing: .13em; }
  .updates-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin: 12px 0 24px; }
  .updates-heading-actions { display: flex; align-items: center; gap: 8px; }
  .updates-heading h1 { margin: 0; color: #20394a; font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: -.04em; }
  .updates-heading p { max-width: 650px; margin: 8px 0 0; color: #667781; line-height: 1.65; }
  .updates-heading p.last-checked { color: #71847a; font-size: 12px; }
  .source-note { margin-bottom: 25px; }
  .updates-filters { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 19px; }
  .updates-list { display: grid; gap: 13px; }
  .update-card { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 16px; border: 1px solid #e4eae4; padding: 20px; background: #fff; }
  .update-icon { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 15px; color: #426b55; background: #edf4ee; }
  .update-icon-deadline { color: #a2473e; background: #fff1ef; }
  .update-icon-registration { color: #88642d; background: #fff7e7; }
  .update-icon-academic { color: #386c88; background: #eef7fb; }
  .update-icon-opportunity { color: #477251; background: #edf7ee; }
  .update-meta { display: flex; align-items: center; gap: 10px; color: #75858a; font-size: 12px; }
  .update-content h2 { margin: 11px 0 6px; color: #263e4b; font-size: 18px; line-height: 1.45; }
  .update-content p { margin: 0; color: #667781; line-height: 1.55; }
  .update-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 15px; }
  .update-footer > span { display: flex; align-items: center; gap: 6px; color: #4f7761; font-size: 12px; font-weight: 650; }
  .updates-loading, .updates-empty { display: grid; justify-items: center; gap: 12px; padding: 48px 20px; color: #62757b; text-align: center; }
  .updates-empty h2 { margin: 0; color: #28404c; font-size: 19px; }
  .updates-empty p { max-width: 500px; margin: 0; line-height: 1.6; }
  @media (max-width: 600px) {
    .updates-page { padding: 28px 0 52px; }
    .updates-heading { align-items: flex-start; flex-direction: column; }
    .updates-heading-actions { flex-wrap: wrap; }
    .update-card { grid-template-columns: 38px minmax(0, 1fr); gap: 12px; padding: 15px; }
    .update-icon { width: 38px; height: 38px; border-radius: 12px; }
    .update-content h2 { font-size: 16px; }
    .update-footer { align-items: flex-start; flex-direction: column; }
  }
</style>
