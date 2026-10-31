<template>
  <div class="dashboard-preview-demo" :class="{ 'demo-compact': props.compact }">
    <section class="preview-welcome">
      <div>
        <div class="preview-eyebrow"><v-icon size="16">mdi-school-outline</v-icon> LAGOS STATE UNIVERSITY (LASU)</div>
        <h1>Welcome, Amara.</h1>
        <p>Here’s your academic week, all in one place.</p>
      </div>

      <div class="preview-date"><v-icon size="18">mdi-calendar-month-outline</v-icon>{{ todayLabel }}</div>
    </section>

    <section aria-label="Sample academic overview" class="preview-stats">
      <article class="preview-stat">
        <span class="stat-icon stat-deadline"><v-icon>mdi-calendar-alert-outline</v-icon></span>
        <span><small>Open assignments</small><strong>{{ openTasks }}</strong><em>{{ dueSoonCount }} due this week</em></span>
      </article>

      <article class="preview-stat">
        <span class="stat-icon stat-progress"><v-icon>mdi-check-decagram-outline</v-icon></span>
        <span><small>Completed</small><strong>{{ completedTasks }}</strong><em>Keep up the momentum</em></span>
      </article>

      <article class="preview-stat">
        <span class="stat-icon stat-library"><v-icon>mdi-bookshelf</v-icon></span>
        <span><small>Course resources</small><strong>12</strong><em>Notes and past questions</em></span>
      </article>
    </section>

    <section class="preview-feature">
      <div class="preview-feature-copy">
        <span>STUDY BETTER, TOGETHER</span>
        <h2>Your next study session is easier to plan.</h2>
        <p>Find your course group, share resources, and work through difficult topics with classmates.</p>
        <v-btn color="white" rounded="pill" to="/signup">Explore study groups <v-icon end>mdi-arrow-right</v-icon></v-btn>
      </div>

      <img alt="Students working together around a table" src="/study-dashboard.svg">
    </section>

    <div class="preview-main-grid">
      <section id="sample-tasks" aria-labelledby="sample-tasks-heading" class="preview-panel">
        <div class="panel-heading">
          <div><span class="panel-kicker">PLAN YOUR WORK</span><h2 id="sample-tasks-heading">Your assignments</h2><p>Check off a task to see your progress update.</p></div>

          <v-btn
            aria-label="Reset sample progress"
            icon="mdi-refresh"
            size="small"
            :title="'Reset sample progress'"
            variant="text"
            @click="resetTasks"
          />
        </div>

        <div class="sample-task-list">
          <article v-for="task in tasks" :key="task.id" class="sample-task" :class="{ 'sample-task-done': task.done }">
            <v-checkbox-btn v-model="task.done" aria-label="Mark assignment complete" color="success" />

            <div class="sample-task-copy">
              <div class="sample-task-title"><strong>{{ task.title }}</strong><v-chip :color="priorityColor(task.priority)" size="x-small" variant="tonal">{{ task.priority }} priority</v-chip></div>
              <p>{{ task.description }}</p>
              <div class="sample-task-meta"><span><v-icon size="15">mdi-book-outline</v-icon>{{ task.course }}</span><span :class="{ 'sample-due-soon': task.daysUntilDue <= 3 }"><v-icon size="15">mdi-calendar-clock-outline</v-icon>{{ dueLabel(task.daysUntilDue) }}</span></div>
            </div>
          </article>
        </div>

        <div class="progress-summary">
          <div class="progress-summary-label"><span>Weekly progress</span><strong>{{ completedTasks }} of {{ tasks.length }} complete</strong></div>
          <v-progress-linear color="success" height="9" :model-value="completionPercent" rounded />
        </div>
      </section>

      <aside class="preview-panel week-panel">
        <div class="panel-heading"><div><span class="panel-kicker">COMING UP</span><h2>This week</h2><p>Your next classes and study time.</p></div><v-icon color="secondary">mdi-calendar-week-outline</v-icon></div>

        <div class="week-list">
          <article v-for="item in schedule" :key="item.course" class="week-item">
            <div class="week-date"><strong>{{ item.day }}</strong><span>{{ item.date }}</span></div>
            <div><strong>{{ item.course }}</strong><span>{{ item.title }}</span><small><v-icon size="14">mdi-clock-outline</v-icon>{{ item.time }} · {{ item.location }}</small></div>
          </article>
        </div>

        <v-btn
          block
          class="week-action"
          rounded="pill"
          to="/signup"
          variant="tonal"
        >See your full timetable <v-icon end>mdi-arrow-right</v-icon></v-btn>
      </aside>
    </div>

    <section id="sample-resources" aria-labelledby="sample-resources-heading" class="preview-panel resources-panel">
      <div class="panel-heading resources-heading">
        <div><span class="panel-kicker">LEARN TOGETHER</span><h2 id="sample-resources-heading">Class materials</h2><p>Example resources organized by course.</p></div>

        <v-select
          v-model="selectedCategory"
          aria-label="Filter sample materials"
          class="category-select"
          density="compact"
          hide-details
          :items="categories"
          variant="outlined"
        />
      </div>

      <div class="sample-resources-grid">
        <article v-for="material in filteredMaterials" :key="material.title" class="sample-material">
          <span class="material-icon"><v-icon>{{ material.icon }}</v-icon></span>
          <div><v-chip color="secondary" size="x-small" variant="tonal">{{ material.category }}</v-chip><h3>{{ material.title }}</h3><p>{{ material.course }} <span>·</span> {{ material.level }}</p></div>
          <v-icon class="material-arrow" size="18">mdi-arrow-up-right</v-icon>
        </article>

        <div v-if="filteredMaterials.length === 0" class="no-materials">No sample materials in this category.</div>
      </div>

      <div class="sample-data-footnote"><v-icon size="15">mdi-shield-check-outline</v-icon>These are examples only. Sign in to browse approved materials from your courses.</div>
    </section>

    <section aria-labelledby="sample-updates-heading" class="preview-panel updates-panel">
      <div class="panel-heading"><div><span class="panel-kicker">OFFICIAL INSTITUTION NEWS</span><h2 id="sample-updates-heading">LASU updates</h2><p>Example notices from the university’s official news board.</p></div><v-btn rounded="pill" to="/signup" variant="tonal">See updates <v-icon end>mdi-arrow-right</v-icon></v-btn></div>

      <div class="sample-updates-grid">
        <a
          v-for="item in sampleUpdates"
          :key="item.title"
          class="sample-update"
          :href="item.url"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span>{{ item.date }} · SAMPLE UPDATE</span><strong>{{ item.title }}</strong><em>Read on the LASU website <v-icon size="14">mdi-open-in-new</v-icon></em>
        </a>
      </div>
    </section>

    <section class="preview-community">
      <div class="community-icon"><v-icon size="24">mdi-account-group-outline</v-icon></div>
      <div><span class="panel-kicker">YOUR COURSE COMMUNITY</span><h2>Study group: CSC 201 revision</h2><p>12 students · Next session Monday at 4:00 PM · Bring your questions and learn together.</p></div>
      <v-btn color="primary" rounded="pill" to="/signup">Join the community <v-icon end>mdi-arrow-right</v-icon></v-btn>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  const props = defineProps<{ compact?: boolean }>()
  const selectedCategory = ref('All materials')
  const tasks = ref([
    { id: 1, title: 'Submit data structures problem set', description: 'Complete questions 1–5 and upload your solutions.', course: 'CSC 201', priority: 'high' as const, daysUntilDue: 2, done: false },
    { id: 2, title: 'Read chapter four: cellular biology', description: 'Review the lecture notes and prepare three questions.', course: 'BIO 202', priority: 'medium' as const, daysUntilDue: 4, done: false },
    { id: 3, title: 'Prepare GST 103 group presentation', description: 'Share your outline with the group before the meeting.', course: 'GST 103', priority: 'medium' as const, daysUntilDue: 6, done: false },
    { id: 4, title: 'Revise calculus practice questions', description: 'Review limits and differentiation from last week.', course: 'MTH 201', priority: 'low' as const, daysUntilDue: 8, done: true },
  ])

  const materials = [
    { title: 'Data Structures: lecture notes', course: 'CSC 201', level: '200 Level', category: 'Lecture notes', icon: 'mdi-notebook-outline' },
    { title: 'Cell Biology past questions', course: 'BIO 202', level: '200 Level', category: 'Past questions', icon: 'mdi-file-question-outline' },
    { title: 'GST 103 revision guide', course: 'GST 103', level: '100 Level', category: 'Study guides', icon: 'mdi-book-open-page-variant-outline' },
  ]
  const categories = ['All materials', 'Lecture notes', 'Past questions', 'Study guides']
  const sampleUpdates = [
    { title: 'Prof. Badejo Holds Inaugural Senate Meeting, Charges LASU to Become Africa’s Most Consequential City University', date: '29 Oct 2026', url: 'https://www.lasu.edu.ng/home/news/read.php?id=678' },
    { title: 'LASU Consult Limited Advertisement for Certificate and Diploma Programmes', date: '23 Oct 2026', url: 'https://www.lasu.edu.ng/home/news/read.php?id=677' },
  ]
  const filteredMaterials = computed(() => selectedCategory.value === 'All materials' ? materials : materials.filter(item => item.category === selectedCategory.value))
  const openTasks = computed(() => tasks.value.filter(task => !task.done).length)
  const completedTasks = computed(() => tasks.value.filter(task => task.done).length)
  const dueSoonCount = computed(() => tasks.value.filter(task => !task.done && task.daysUntilDue <= 7).length)
  const completionPercent = computed(() => tasks.value.length > 0 ? (completedTasks.value / tasks.value.length) * 100 : 0)

  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const schedule = [
    { weekday: 1, course: 'CSC 201', title: 'Data Structures', time: '10:00 AM', location: 'Lecture Hall B' },
    { weekday: 2, course: 'BIO 202', title: 'Cell Biology', time: '1:00 PM', location: 'Science Block 2' },
    { weekday: 3, course: 'GST 103', title: 'Communication Skills', time: '9:00 AM', location: 'Arts Theatre' },
  ].map(item => {
    const date = new Date()
    const daysUntilClass = (item.weekday - date.getDay() + 7) % 7 || 7
    date.setDate(date.getDate() + daysUntilClass)
    return { ...item, day: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date), date: new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date) }
  })

  function dueLabel (days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    const label = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
    return days === 0 ? 'Due today' : (days === 1 ? 'Due tomorrow' : `Due ${label}`)
  }

  function priorityColor (priority: 'low' | 'medium' | 'high') {
    return priority === 'high' ? 'error' : (priority === 'low' ? 'info' : 'warning')
  }

  function resetTasks () {
    for (const task of tasks.value) {
      task.done = task.id === 4
    }
  }
</script>

<style scoped>
  .dashboard-preview-demo.demo-compact .preview-feature,
  .dashboard-preview-demo.demo-compact .resources-panel,
  .dashboard-preview-demo.demo-compact .updates-panel,
  .dashboard-preview-demo.demo-compact .preview-community { display: none; }

  .preview-welcome { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin: 30px 0 22px; }
  .preview-eyebrow, .panel-kicker { display: flex; align-items: center; gap: 7px; color: #638673; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
  .preview-welcome h1 { margin: 8px 0 4px; color: #203b4a; font-size: clamp(1.9rem, 4vw, 2.65rem); font-weight: 760; letter-spacing: -.045em; }
  .preview-welcome p { margin: 0; color: #728187; font-size: 14px; }
  .preview-date { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; border: 1px solid #dfe7df; border-radius: 99px; padding: 10px 14px; color: #547060; background: rgb(255 255 255 / 80%); font-size: 12px; font-weight: 650; }
  .preview-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
  .preview-stat { display: flex; min-height: 112px; align-items: center; gap: 15px; border: 1px solid #e2e9e1; border-radius: 18px; padding: 18px; background: #fff; box-shadow: 0 8px 22px rgb(29 59 47 / 4%); }
  .preview-stat > span:last-child { display: grid; gap: 3px; }
  .stat-icon { display: grid; width: 46px; height: 46px; flex: 0 0 auto; place-items: center; border-radius: 14px; font-size: 21px; }
  .stat-deadline { color: #9c7433; background: #f6efdf; }
  .stat-progress { color: #4c8064; background: #e9f2eb; }
  .stat-library { color: #4e7c90; background: #e9f1f4; }
  .preview-stat small { color: #687b76; font-size: 12px; }
  .preview-stat strong { color: #243d47; font-size: 27px; line-height: 1.05; }
  .preview-stat em { color: #89958f; font-size: 11px; font-style: normal; }
  .preview-feature { position: relative; display: grid; min-height: 222px; grid-template-columns: minmax(0, 1fr) minmax(190px, .55fr); align-items: center; overflow: hidden; margin-bottom: 20px; border-radius: 22px; padding: 26px 34px; color: white; background: radial-gradient(ellipse at 83% 10%, rgb(214 235 213 / 22%), transparent 23rem), linear-gradient(115deg, #1b4551, #477762); box-shadow: 0 16px 32px rgb(32 69 59 / 13%); }
  .preview-feature-copy { position: relative; z-index: 1; max-width: 580px; }
  .preview-feature-copy > span { color: #e7d79d; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
  .preview-feature h2 { margin: 8px 0 5px; font-size: clamp(1.35rem, 2.6vw, 1.9rem); font-weight: 750; letter-spacing: -.035em; }
  .preview-feature p { max-width: 490px; margin: 0 0 15px; color: rgb(255 255 255 / 78%); font-size: 13px; line-height: 1.6; }
  .preview-feature .v-btn { color: #285443 !important; font-weight: 700; }
  .preview-feature img { width: 100%; max-height: 190px; object-fit: contain; filter: drop-shadow(0 12px 16px rgb(12 34 31 / 15%)); }
  .preview-main-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .9fr); align-items: start; gap: 18px; margin-bottom: 18px; }
  .preview-panel { min-width: 0; border: 1px solid #e1e8e0; border-radius: 20px; padding: 22px; background: #fff; box-shadow: 0 8px 24px rgb(29 59 47 / 4%); }
  .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
  .panel-heading h2 { margin: 6px 0 3px; color: #294452; font-size: 20px; font-weight: 730; letter-spacing: -.025em; }
  .panel-heading p { margin: 0; color: #7b8987; font-size: 12px; }
  .sample-task-list { display: grid; gap: 9px; }
  .sample-task { display: flex; align-items: flex-start; gap: 9px; border: 1px solid #e8ede7; border-radius: 15px; padding: 12px 10px; background: #fff; transition: background-color .16s ease, border-color .16s ease; }
  .sample-task-done { border-color: #dce9dd; background: #f7faf6; }
  .sample-task-copy { min-width: 0; flex: 1; padding-top: 3px; }
  .sample-task-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .sample-task-title strong { color: #304852; font-size: 13px; }
  .sample-task-done .sample-task-title strong { color: #7d8c84; text-decoration: line-through; }
  .sample-task-copy > p { margin: 5px 0 9px; color: #7d8b88; font-size: 11px; line-height: 1.45; }
  .sample-task-meta { display: flex; flex-wrap: wrap; gap: 12px; color: #72827c; font-size: 10px; }
  .sample-task-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .sample-task-meta .sample-due-soon { color: #9a6d2d; font-weight: 700; }
  .progress-summary { display: grid; gap: 9px; margin-top: 18px; border-top: 1px solid #edf0ec; padding-top: 15px; }
  .progress-summary-label { display: flex; justify-content: space-between; gap: 8px; color: #75847e; font-size: 11px; }
  .progress-summary-label strong { color: #446e55; }
  .week-panel { padding-bottom: 18px; }
  .week-list { display: grid; }
  .week-item { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 12px; border-top: 1px solid #edf0ec; padding: 13px 0; }
  .week-date { display: grid; align-content: start; justify-items: center; gap: 2px; border-radius: 11px; padding: 7px 4px; color: #37664e; background: #edf4ed; }
  .week-date strong { font-size: 11px; }
  .week-date span { color: #71827a; font-size: 10px; }
  .week-item > div:last-child { display: grid; align-content: center; gap: 3px; min-width: 0; }
  .week-item > div:last-child > strong { color: #354e56; font-size: 12px; }
  .week-item > div:last-child > span { color: #71817e; font-size: 11px; }
  .week-item small { display: flex; align-items: center; gap: 4px; margin-top: 3px; color: #87938e; font-size: 10px; }
  .week-action { margin-top: 8px; }
  .resources-panel { margin-bottom: 18px; }
  .resources-heading { align-items: center; }
  .category-select { width: min(210px, 44%); }
  .sample-resources-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; }
  .sample-material { display: flex; min-width: 0; align-items: flex-start; gap: 11px; border: 1px solid #e8ede7; border-radius: 15px; padding: 14px; background: #fcfdfb; }
  .material-icon { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border-radius: 12px; color: #4b7860; background: #eaf2eb; }
  .sample-material > div { min-width: 0; flex: 1; }
  .sample-material h3 { margin: 8px 0 4px; color: #344c55; font-size: 12px; line-height: 1.4; }
  .sample-material p { margin: 0; color: #7d8a86; font-size: 10px; }
  .sample-material p span { padding-inline: 3px; }
  .material-arrow { flex: 0 0 auto; color: #96a49d; }
  .no-materials { grid-column: 1 / -1; color: #768680; font-size: 12px; }
  .sample-data-footnote { display: flex; align-items: center; gap: 6px; margin-top: 16px; color: #71817b; font-size: 11px; }
  .sample-data-footnote .v-icon { color: #59836c; }
  .updates-panel { margin-bottom: 18px; }
  .sample-updates-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
  .sample-update { display: flex; min-height: 142px; flex-direction: column; gap: 10px; border: 1px solid #e8ede7; border-radius: 15px; padding: 15px; color: inherit; background: #fcfdfb; text-decoration: none; transition: border-color .16s ease, transform .16s ease; }
  .sample-update:hover, .sample-update:focus-visible { transform: translateY(-2px); border-color: #9ab9a1; }
  .sample-update > span { color: #74877d; font-size: 10px; font-weight: 700; letter-spacing: .06em; }
  .sample-update > strong { color: #344c55; font-size: 13px; line-height: 1.45; }
  .sample-update > em { display: flex; align-items: center; gap: 3px; margin-top: auto; color: #4b795d; font-size: 11px; font-style: normal; font-weight: 700; }
  .preview-community { display: flex; align-items: center; gap: 15px; border: 1px solid #e0e9e0; border-radius: 18px; padding: 18px 20px; background: linear-gradient(110deg, #f8fbf7, #fff); }
  .community-icon { display: grid; width: 46px; height: 46px; flex: 0 0 auto; place-items: center; border-radius: 14px; color: #44705a; background: #e8f1e9; }
  .preview-community > div:nth-child(2) { flex: 1; }
  .preview-community h2 { margin: 5px 0 3px; color: #304a53; font-size: 15px; }
  .preview-community p { margin: 0; color: #778681; font-size: 11px; }
  .preview-footer { display: flex; justify-content: space-between; gap: 14px; margin-top: 26px; border-top: 1px solid #e1e8e0; padding-top: 16px; color: #88948f; font-size: 11px; }
  .preview-footer a { color: #527a62; font-weight: 700; text-decoration: none; }

  .v-theme--academicDark .preview-page { color: #e0eae8; background: radial-gradient(ellipse at 5% 0%, rgb(40 78 69 / 24%), transparent 34rem), #101a21; }
  .v-theme--academicDark .preview-brand, .v-theme--academicDark .preview-welcome h1, .v-theme--academicDark .preview-stat strong, .v-theme--academicDark .panel-heading h2, .v-theme--academicDark .sample-task-title strong, .v-theme--academicDark .week-item > div:last-child > strong, .v-theme--academicDark .sample-material h3, .v-theme--academicDark .preview-community h2 { color: #e0eae8; }
  .v-theme--academicDark .preview-brand small, .v-theme--academicDark .preview-welcome p, .v-theme--academicDark .preview-stat small, .v-theme--academicDark .preview-stat em, .v-theme--academicDark .panel-heading p, .v-theme--academicDark .sample-task-copy > p, .v-theme--academicDark .sample-task-meta, .v-theme--academicDark .week-item > div:last-child > span, .v-theme--academicDark .sample-material p, .v-theme--academicDark .preview-community p { color: #a3b1b4; }
  .v-theme--academicDark .preview-stat, .v-theme--academicDark .preview-panel, .v-theme--academicDark .sample-task, .v-theme--academicDark .sample-material, .v-theme--academicDark .preview-date, .v-theme--academicDark .preview-community { border-color: #30414a; background-color: #1b2932; }
  .v-theme--academicDark .sample-task-done { background: #17242b; }
  .v-theme--academicDark .sample-update { border-color: #30414a; background: #17242b; }
  .v-theme--academicDark .sample-update > strong { color: #e0eae8; }
  .v-theme--academicDark .week-item, .v-theme--academicDark .progress-summary { border-color: #30414a; }
  .v-theme--academicDark .preview-footer { border-color: #30414a; }

  @media (max-width: 850px) {
    .preview-main-grid { grid-template-columns: 1fr; }
    .sample-resources-grid { grid-template-columns: 1fr; }
    .sample-updates-grid { grid-template-columns: 1fr; }
    .preview-feature { grid-template-columns: minmax(0, 1fr) minmax(140px, .48fr); padding-inline: 26px; }
  }
  @media (max-width: 600px) {
    .preview-header { align-items: flex-start; flex-wrap: wrap; }
    .preview-header-actions { width: 100%; justify-content: space-between; gap: 7px; }
    .preview-header-actions .v-btn { font-size: 12px; }
    .preview-welcome { align-items: flex-start; flex-direction: column; gap: 12px; margin-top: 22px; }
    .preview-stats { grid-template-columns: 1fr; gap: 9px; }
    .preview-stat { min-height: 86px; }
    .preview-feature { grid-template-columns: 1fr; gap: 8px; padding: 22px; }
    .preview-feature img { width: min(100%, 250px); justify-self: center; }
    .preview-panel { padding: 17px 14px; }
    .resources-heading { align-items: flex-start; flex-direction: column; }
    .category-select { width: 100%; }
    .preview-community { align-items: flex-start; flex-wrap: wrap; padding: 16px; }
    .preview-community > div:nth-child(2) { min-width: calc(100% - 64px); }
    .preview-community > .v-btn { width: 100%; }
    .preview-footer { flex-wrap: wrap; }
  }

</style>
