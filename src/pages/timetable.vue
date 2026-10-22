<template>
  <main class="timetable-page">
    <v-container class="timetable-container py-6 py-md-10">
      <header class="timetable-heading">
        <div>
          <div class="timetable-eyebrow"><v-icon size="17">mdi-calendar-clock-outline</v-icon> YOUR STUDY WEEK</div>
          <h1>My timetable</h1>
          <p>Plan your classes and study sessions, then add them to your calendar.</p>
        </div>

        <div class="heading-actions">
          <v-btn
            color="primary"
            :disabled="entries.length === 0"
            prepend-icon="mdi-calendar-export"
            rounded="pill"
            variant="tonal"
            @click="exportCalendar"
          >
            Add to calendar
          </v-btn>

          <v-btn color="primary" prepend-icon="mdi-plus" rounded="pill" @click="openCreateDialog">
            Add to timetable
          </v-btn>
        </div>
      </header>

      <v-alert v-if="errorMessage" class="mb-5" type="error" variant="tonal">{{ errorMessage }}</v-alert>

      <v-card class="week-toolbar" elevation="0" rounded="xl">
        <div class="week-navigation">
          <v-btn aria-label="Previous week" icon="mdi-chevron-left" variant="text" @click="moveWeek(-1)" />
          <div><strong>{{ weekRange }}</strong><span>{{ isCurrentWeek ? 'This week' : 'Weekly view' }}</span></div>
          <v-btn aria-label="Next week" icon="mdi-chevron-right" variant="text" @click="moveWeek(1)" />
        </div>

        <v-btn rounded="pill" variant="text" @click="goToCurrentWeek">Today</v-btn>
      </v-card>

      <div v-if="loading" class="timetable-loading"><v-progress-circular color="primary" indeterminate /><span>Loading your timetable…</span></div>

      <section v-else aria-label="Weekly timetable" class="week-grid">
        <article v-for="day in weekDays" :key="day.dateKey" class="day-column" :class="{ 'day-column-today': day.isToday }">
          <header class="day-heading">
            <span>{{ day.label }}</span>
            <strong>{{ day.dateLabel }}</strong>
          </header>

          <div v-if="day.entries.length > 0" class="day-entries">
            <article v-for="entry in day.entries" :key="entry.id" class="schedule-entry">
              <div class="entry-time">{{ formatTime(entry.start_time) }} – {{ formatTime(entry.end_time) }}</div>
              <strong>{{ entry.title }}</strong>
              <span v-if="entry.course" class="entry-detail">{{ entry.course }}</span>
              <span v-if="entry.location" class="entry-detail"><v-icon size="14">mdi-map-marker-outline</v-icon> {{ entry.location }}</span>
              <span v-if="entry.notes" class="entry-notes">{{ entry.notes }}</span>

              <v-chip
                v-if="entry.repeats_weekly"
                class="weekly-chip"
                color="primary"
                size="x-small"
                variant="tonal"
              >Weekly</v-chip>

              <div class="entry-actions">
                <v-btn
                  :aria-label="`Edit ${entry.title}`"
                  icon="mdi-pencil-outline"
                  size="x-small"
                  variant="text"
                  @click="openEditDialog(entry)"
                />

                <v-btn
                  :aria-label="`Delete ${entry.title}`"
                  color="error"
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  @click="removeEntry(entry)"
                />
              </div>
            </article>
          </div>

          <button v-else class="day-empty" type="button" @click="openCreateDialog(day.weekday, day.dateKey)">
            <v-icon size="20">mdi-plus</v-icon>
            <span>Add an item</span>
          </button>
        </article>
      </section>

      <div v-if="!loading && entries.length === 0" class="planner-hint">
        <v-icon color="primary">mdi-lightbulb-outline</v-icon>
        <span>Start with your lectures, then add focused study blocks and deadlines you want to remember.</span>
      </div>

      <div class="timetable-footnote"><v-icon size="16">mdi-lock-outline</v-icon> Your timetable is private to your account.</div>
    </v-container>

    <v-dialog v-model="dialogOpen" max-width="560" persistent>
      <v-card class="entry-dialog" rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between pa-5">
          <span>{{ editingEntry ? 'Edit timetable item' : 'Add to your timetable' }}</span>
          <v-btn aria-label="Close" icon="mdi-close" variant="text" @click="dialogOpen = false" />
        </v-card-title>

        <v-card-text class="px-5 pb-2">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">{{ formError }}</v-alert>

          <v-text-field
            v-model="form.title"
            autofocus
            label="What are you planning?"
            placeholder="e.g. MTH 101 lecture"
            variant="outlined"
          />

          <v-row dense>
            <v-col cols="12" sm="6"><v-text-field v-model="form.course" label="Course or category" placeholder="e.g. MTH 101" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="form.location" label="Location" placeholder="e.g. Lecture hall" variant="outlined" /></v-col>
          </v-row>

          <v-select
            v-model="form.scheduleType"
            item-title="title"
            item-value="value"
            :items="scheduleTypes"
            label="Repeat"
            variant="outlined"
          />

          <v-select
            v-if="form.scheduleType === 'weekly'"
            v-model="form.dayOfWeek"
            item-title="title"
            item-value="value"
            :items="weekdayOptions"
            label="Day of the week"
            variant="outlined"
          />

          <v-text-field
            v-else
            v-model="form.eventDate"
            label="Date"
            type="date"
            variant="outlined"
          />

          <v-row dense>
            <v-col cols="12" sm="6"><v-text-field v-model="form.startTime" label="Start time" type="time" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="form.endTime" label="End time" type="time" variant="outlined" /></v-col>
          </v-row>

          <v-textarea
            v-model="form.notes"
            auto-grow
            label="Notes (optional)"
            rows="2"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions class="pa-5 pt-2">
          <v-spacer />
          <v-btn rounded="pill" variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" rounded="pill" @click="saveEntry">{{ editingEntry ? 'Save changes' : 'Add to timetable' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { createTimetableEntry, deleteTimetableEntry, getTimetableEntries, type TimetableEntry, type TimetableEntryInput, updateTimetableEntry } from '@/services/timetable'

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const icalWeekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  const weekdayOptions = weekdayNames.map((title, value) => ({ title, value }))
  const scheduleTypes = [{ title: 'Every week', value: 'weekly' }, { title: 'One time', value: 'once' }]
  const entries = ref<TimetableEntry[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const dialogOpen = ref(false)
  const errorMessage = ref('')
  const formError = ref('')
  const editingEntry = ref<TimetableEntry | null>(null)
  const selectedWeek = ref(startOfWeek(new Date()))
  const form = reactive({ title: '', course: '', location: '', notes: '', scheduleType: 'weekly' as 'weekly' | 'once', dayOfWeek: 1, eventDate: '', startTime: '09:00', endTime: '10:00' })

  function startOfWeek (date: Date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
    return result
  }

  function dateKey (date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isCurrentWeek = computed(() => dateKey(selectedWeek.value) === dateKey(startOfWeek(new Date())))
  const weekRange = computed(() => {
    const end = new Date(selectedWeek.value)
    end.setDate(end.getDate() + 6)
    const startText = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(selectedWeek.value)
    const endText = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)
    return `${startText} – ${endText}`
  })

  const weekDays = computed(() => Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(selectedWeek.value)
    date.setDate(date.getDate() + offset)
    const key = dateKey(date)
    const weekday = date.getDay()
    const dayEntries = entries.value.filter(entry => entry.repeats_weekly
      ? entry.day_of_week === weekday
      : entry.event_date === key).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return {
      dateKey: key,
      weekday,
      label: weekdayNames[weekday],
      dateLabel: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date),
      isToday: key === dateKey(new Date()),
      entries: dayEntries,
    }
  }))

  function moveWeek (amount: number) {
    const next = new Date(selectedWeek.value)
    next.setDate(next.getDate() + (amount * 7))
    selectedWeek.value = next
  }

  function goToCurrentWeek () {
    selectedWeek.value = startOfWeek(new Date())
  }

  function formatTime (time: string) {
    const [hourText = '0', minute = '00'] = time.split(':')
    const hour = Number(hourText)
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, Number(minute)))
  }

  function resetForm (weekday = 1, date = dateKey(new Date())) {
    form.title = ''
    form.course = ''
    form.location = ''
    form.notes = ''
    form.scheduleType = 'weekly'
    form.dayOfWeek = weekday
    form.eventDate = date
    form.startTime = '09:00'
    form.endTime = '10:00'
    formError.value = ''
  }

  function openCreateDialog (weekday = 1, date = dateKey(new Date())) {
    editingEntry.value = null
    resetForm(weekday, date)
    dialogOpen.value = true
  }

  function openEditDialog (entry: TimetableEntry) {
    editingEntry.value = entry
    form.title = entry.title
    form.course = entry.course
    form.location = entry.location
    form.notes = entry.notes
    form.scheduleType = entry.repeats_weekly ? 'weekly' : 'once'
    form.dayOfWeek = entry.day_of_week ?? 1
    form.eventDate = entry.event_date || dateKey(new Date())
    form.startTime = entry.start_time.slice(0, 5)
    form.endTime = entry.end_time.slice(0, 5)
    formError.value = ''
    dialogOpen.value = true
  }

  async function refreshEntries () {
    loading.value = true
    errorMessage.value = ''
    try {
      entries.value = await getTimetableEntries()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Your timetable could not be loaded.'
    } finally {
      loading.value = false
    }
  }

  async function saveEntry () {
    if (!form.title.trim()) {
      formError.value = 'Add a name for this timetable item.'; return
    }
    if (form.endTime <= form.startTime) {
      formError.value = 'End time must be later than start time.'; return
    }
    if (form.scheduleType === 'once' && !form.eventDate) {
      formError.value = 'Choose a date for this item.'; return
    }

    const input: TimetableEntryInput = {
      title: form.title.trim(),
      course: form.course.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      repeats_weekly: form.scheduleType === 'weekly',
      day_of_week: form.scheduleType === 'weekly' ? form.dayOfWeek : null,
      event_date: form.scheduleType === 'once' ? form.eventDate : null,
      start_time: form.startTime,
      end_time: form.endTime,
    }

    saving.value = true
    formError.value = ''
    try {
      await (editingEntry.value ? updateTimetableEntry(editingEntry.value.id, input) : createTimetableEntry(input))
      dialogOpen.value = false
      await refreshEntries()
    } catch (error) {
      formError.value = error instanceof Error ? error.message : 'Your timetable item could not be saved.'
    } finally {
      saving.value = false
    }
  }

  async function removeEntry (entry: TimetableEntry) {
    if (!window.confirm(`Remove “${entry.title}” from your timetable?`)) return
    try {
      await deleteTimetableEntry(entry.id)
      entries.value = entries.value.filter(item => item.id !== entry.id)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'The timetable item could not be removed.'
    }
  }

  function toUtcCalendarDate (date: string, time: string) {
    const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
    const [hour = 0, minute = 0] = time.split(':').map(Number)
    return new Date(Date.UTC(year, month - 1, day, hour - 1, minute)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  }

  function escapeIcs (value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, String.raw`\n`).replace(/,/g, String.raw`\,`).replace(/;/g, String.raw`\;`)
  }

  function exportCalendar () {
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const events = entries.value.map(entry => {
      const startDate = entry.repeats_weekly ? new Date(2026, 0, 4 + (entry.day_of_week ?? 1)) : new Date(`${entry.event_date}T12:00:00`)
      const eventDate = dateKey(startDate)
      const details = [entry.course, entry.location, entry.notes].filter(Boolean).join(' · ')
      return [
        'BEGIN:VEVENT', `UID:${entry.id}@lasu-student-success-hub`, `DTSTAMP:${now}`,
        `DTSTART:${toUtcCalendarDate(eventDate, entry.start_time)}`,
        `DTEND:${toUtcCalendarDate(eventDate, entry.end_time)}`,
        `SUMMARY:${escapeIcs(entry.title)}`,
        ...(details ? [`DESCRIPTION:${escapeIcs(details)}`] : []),
        ...(entry.repeats_weekly ? [`RRULE:FREQ=WEEKLY;BYDAY=${icalWeekdays[entry.day_of_week ?? 1]}`] : []),
        'END:VEVENT',
      ].join('\r\n')
    })
    const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LASU Student Success Hub//Timetable//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lasu-study-timetable.ics'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  onMounted(() => {
    void refreshEntries()
  })
</script>

<style scoped>
.timetable-page { min-height: 100vh; background: #f5f7f4; color: #263c34; }
.timetable-container { max-width: 1440px; }
.timetable-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.timetable-eyebrow { display: flex; align-items: center; gap: 7px; color: #5d7a68; font-size: 11px; font-weight: 800; letter-spacing: .13em; }
h1 { margin: 9px 0 6px; color: #1e3c2e; font-size: clamp(2rem, 4vw, 2.8rem); letter-spacing: -.045em; }
.timetable-heading p { margin: 0; color: #75847b; }
.heading-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.week-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border: 1px solid #e3e9e2; padding: 8px 14px; background: #fff; }
.week-navigation { display: flex; align-items: center; gap: 10px; }
.week-navigation > div { display: grid; min-width: 172px; gap: 2px; text-align: center; }
.week-navigation strong { color: #294739; font-size: 15px; }
.week-navigation span { color: #87938b; font-size: 11px; }
.week-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; align-items: start; }
.day-column { min-height: 280px; overflow: hidden; border: 1px solid #e3e9e2; border-radius: 18px; background: #fff; }
.day-column-today { border-color: #b4cdbb; box-shadow: 0 0 0 2px rgb(84 134 97 / 8%); }
.day-heading { display: grid; gap: 3px; border-bottom: 1px solid #edf0ec; padding: 14px 12px 12px; color: #66766d; font-size: 12px; }
.day-heading strong { color: #294739; font-size: 16px; }
.day-column-today .day-heading { background: #f0f6ef; }
.day-entries { display: grid; gap: 9px; padding: 10px; }
.schedule-entry { position: relative; display: grid; gap: 5px; border-left: 3px solid #5b9470; border-radius: 10px; padding: 10px 9px; background: #f4f8f4; }
.entry-time { color: #568063; font-size: 10px; font-weight: 750; }
.schedule-entry > strong { padding-right: 16px; color: #2f453a; font-size: 12px; line-height: 1.4; }
.entry-detail { color: #75837a; font-size: 10px; line-height: 1.4; }
.entry-notes { color: #718078; font-size: 10px; line-height: 1.45; }
.entry-detail :deep(.v-icon) { vertical-align: -2px; }
.weekly-chip { justify-self: start; margin-top: 1px; }
.entry-actions { position: absolute; top: 4px; right: 4px; display: flex; }
.day-empty { display: grid; width: calc(100% - 20px); min-height: 70px; place-content: center; gap: 5px; margin: 10px; border: 1px dashed #dfe7de; border-radius: 12px; background: #fbfcfa; color: #829087; font-size: 11px; cursor: pointer; }
.day-empty:hover { border-color: #98b49f; background: #f5f8f4; color: #45694f; }
.planner-hint,.timetable-footnote { display: flex; align-items: center; gap: 9px; color: #78877e; font-size: 13px; }
.planner-hint { margin-top: 20px; border: 1px solid #e5ebe4; border-radius: 14px; padding: 14px 16px; background: #fff; }
.timetable-footnote { justify-content: center; margin-top: 18px; font-size: 11px; }
.timetable-loading { display: flex; min-height: 280px; align-items: center; justify-content: center; gap: 12px; color: #6c7a71; }
.entry-dialog :deep(.v-field__input) { min-height: 48px; }
@media (max-width: 1100px) { .week-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 700px) {
  .timetable-heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { width: 100%; }
  .heading-actions .v-btn { flex: 1; }
  .week-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .day-column { min-height: 220px; }
  .week-navigation > div { min-width: 145px; }
  .week-toolbar { padding-inline: 7px; }
}
@media (max-width: 400px) { .week-grid { grid-template-columns: 1fr; } .day-column { min-height: 130px; } }

.v-theme--academicDark .timetable-page {
  color: #e2ebeb;
  background:
    radial-gradient(ellipse at 4% 0%, rgb(40 78 69 / 24%), transparent 31rem),
    #101a21;
}

.v-theme--academicDark h1,
.v-theme--academicDark .week-navigation strong,
.v-theme--academicDark .day-heading strong,
.v-theme--academicDark .schedule-entry > strong {
  color: #e0eae8;
}

.v-theme--academicDark .timetable-heading p,
.v-theme--academicDark .week-navigation span,
.v-theme--academicDark .day-heading,
.v-theme--academicDark .entry-detail,
.v-theme--academicDark .entry-notes,
.v-theme--academicDark .planner-hint,
.v-theme--academicDark .timetable-footnote,
.v-theme--academicDark .timetable-loading {
  color: #a3b1b4;
}

.v-theme--academicDark .timetable-eyebrow,
.v-theme--academicDark .entry-time {
  color: #9bc9ad;
}

.v-theme--academicDark .week-toolbar,
.v-theme--academicDark .day-column,
.v-theme--academicDark .planner-hint {
  border-color: #30414a;
  background: #1b2932;
}

.v-theme--academicDark .day-heading {
  border-bottom-color: #30414a;
}

.v-theme--academicDark .day-column-today {
  border-color: #4a6558;
}

.v-theme--academicDark .day-column-today .day-heading {
  background: #23352f;
}

.v-theme--academicDark .schedule-entry {
  background: #17242b;
}

.v-theme--academicDark .day-empty {
  border-color: #2f4049;
  background: #151f26;
  color: #8b9a9d;
}

.v-theme--academicDark .day-empty:hover {
  border-color: #4a6558;
  background: #1b2932;
  color: #cfe3d8;
}
</style>
