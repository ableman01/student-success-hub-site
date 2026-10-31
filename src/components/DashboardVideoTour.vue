<template>
  <section ref="tourRoot" aria-labelledby="dashboard-tour-heading" class="tour-section">
    <div class="tour-heading">
      <div>
        <div class="tour-kicker"><v-icon size="15">mdi-play-circle-outline</v-icon> A QUICK LOOK INSIDE</div>
        <h2 id="dashboard-tour-heading">See how Student Success Hub fits your week.</h2>
        <p>A short, self-playing tour of the tools students use to plan, learn, and stay connected.</p>
      </div>

      
    </div>

    <div class="tour-player" :class="{ 'tour-paused': !isPlaying }">
      <div class="tour-screen">
        <div class="screen-topbar">
          <div class="screen-brand"><img alt="" src="/academic-mark.svg"><strong>Student Success Hub</strong></div>
          <span class="screen-tag"><v-icon size="14">mdi-eye-outline</v-icon> SAMPLE DASHBOARD</span>
        </div>

        <Transition mode="out-in" name="tour-scene">
          <div :key="scene.type" class="screen-scene">
            <template v-if="scene.type === 'overview'">
              <div class="screen-welcome"><span>MONDAY, 2 NOVEMBER</span><strong>Welcome back, Amara.</strong><small>Your academic week, all in one place.</small></div>
              <div class="screen-stat-row"><div><small>Open tasks</small><strong>3</strong></div><div><small>Completed</small><strong>8</strong></div><div><small>Course resources</small><strong>12</strong></div></div>
              <div class="screen-highlight"><v-icon>mdi-calendar-alert-outline</v-icon><span><strong>Coming up</strong><small>CSC 201 assignment · Due Wednesday</small></span><v-icon class="screen-arrow">mdi-arrow-right</v-icon></div>
            </template>

            <template v-else-if="scene.type === 'assignments'">
              <div class="screen-section-title"><span>PLAN YOUR WORK</span><strong>Assignments</strong></div>
              <div class="screen-list-row"><v-icon color="warning">mdi-checkbox-blank-circle-outline</v-icon><span><strong>Submit data structures problem set</strong><small>CSC 201 · Due Wednesday</small></span><v-chip color="error" size="x-small" variant="tonal">High</v-chip></div>
              <div class="screen-list-row"><v-icon color="success">mdi-check-circle-outline</v-icon><span><strong>Review calculus practice questions</strong><small>MTH 201 · Completed</small></span></div>
              <div class="screen-progress"><span>Weekly progress</span><strong>8 of 11 complete</strong><v-progress-linear color="success" height="7" model-value="73" rounded /></div>
            </template>

            <template v-else-if="scene.type === 'materials'">
              <div class="screen-section-title"><span>LEARN TOGETHER</span><strong>Course materials</strong></div>
              <div class="screen-material"><span><v-icon>mdi-file-pdf-box</v-icon></span><div><strong>Data Structures: lecture notes</strong><small>CSC 201 · 200 Level</small></div><v-icon>mdi-bookmark-outline</v-icon></div>
              <div class="screen-material"><span><v-icon>mdi-file-question-outline</v-icon></span><div><strong>Cell Biology past questions</strong><small>BIO 202 · 200 Level</small></div><v-icon>mdi-bookmark</v-icon></div>
              <div class="screen-material"><span><v-icon>mdi-book-open-page-variant-outline</v-icon></span><div><strong>GST 103 revision guide</strong><small>GST 103 · 100 Level</small></div><v-icon>mdi-bookmark-outline</v-icon></div>
            </template>

            <template v-else-if="scene.type === 'community'">
              <div class="screen-section-title"><span>STUDY BETTER, TOGETHER</span><strong>Your course community</strong></div>
              <div class="screen-group-card"><div class="screen-group-icon"><v-icon size="28">mdi-account-group-outline</v-icon></div><div><strong>CSC 201 revision</strong><small>12 students · Course study group</small><span><v-icon size="14">mdi-calendar-clock-outline</v-icon> Next session Monday at 4:00 PM</span></div></div>
              <div class="screen-group-footer"><v-icon color="success">mdi-account-multiple-check-outline</v-icon> Share questions and learn with classmates.</div>
            </template>

            <template v-else>
              <div class="screen-section-title"><span>OFFICIAL INSTITUTION NEWS</span><strong>LASU updates</strong></div>
              <div class="screen-notice"><span>29 OCT · LASU OFFICIAL WEBSITE</span><strong>Prof. Badejo Holds Inaugural Senate Meeting</strong><small>Important notices from the university, collected in one place.</small><v-icon size="15">mdi-open-in-new</v-icon></div>
              <div class="screen-notice"><span>23 OCT · LASU OFFICIAL WEBSITE</span><strong>Certificate and Diploma Programme Advertisements</strong><small>Open the source to confirm dates and requirements.</small><v-icon size="15">mdi-open-in-new</v-icon></div>
            </template>
          </div>
        </Transition>

        <div class="screen-watermark"><v-icon size="14">mdi-play-circle-outline</v-icon> PRODUCT TOUR · EXAMPLE DATA</div>
      </div>

      <div class="tour-caption">
        <div class="tour-caption-copy"><span>{{ String(currentStep + 1).padStart(2, '0') }} / {{ scenes.length }} · {{ scene.label }}</span><h3>{{ scene.title }}</h3><p>{{ scene.description }}</p></div>

        <div aria-label="Product tour controls" class="tour-controls">
          <v-btn
            aria-label="Previous tour scene"
            icon="mdi-skip-previous"
            size="small"
            variant="tonal"
            @click="previousScene"
          />

          <v-btn
            :aria-label="isPlaying ? 'Pause product tour' : 'Play product tour'"
            color="primary"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            size="large"
            variant="flat"
            @click="togglePlayback"
          />

          <v-btn
            aria-label="Next tour scene"
            icon="mdi-skip-next"
            size="small"
            variant="tonal"
            @click="nextScene"
          />
        </div>

        <div class="tour-progress"><v-progress-linear color="primary" height="5" :model-value="((currentStep + 1) / scenes.length) * 100" rounded /><span>{{ isPlaying ? 'Playing' : 'Paused' }}</span></div>
      </div>
    </div>

    <p class="tour-disclosure"><v-icon size="15">mdi-information-outline</v-icon>This walkthrough uses example student information. Official LASU notices link to the university’s source.</p>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

  const scenes = [
    { type: 'overview', label: 'DASHBOARD', title: 'Start with a clear picture of your week.', description: 'See deadlines, completed work, and course resources as soon as you open your study space.' },
    { type: 'assignments', label: 'ASSIGNMENTS', title: 'Keep every deadline in view.', description: 'Add coursework, set priorities, and mark tasks complete as you make progress.' },
    { type: 'materials', label: 'COURSE MATERIALS', title: 'Find notes and past questions by course.', description: 'Browse shared lecture materials, save useful resources, and return to them when you study.' },
    { type: 'community', label: 'STUDY GROUPS', title: 'Make studying a team effort.', description: 'Meet classmates in course groups, share questions, and plan your next study session.' },
    { type: 'updates', label: 'LASU UPDATES', title: 'Keep important university notices close.', description: 'See LASU announcements and open official sources to confirm dates and requirements.' },
  ]

  const currentStep = ref(0)
  const isPlaying = ref(false)
  const tourRoot = ref<HTMLElement | null>(null)
  const scene = computed(() => scenes[currentStep.value])
  let playbackTimer: ReturnType<typeof globalThis.setInterval> | null = null
  let visibilityObserver: IntersectionObserver | null = null
  let userPaused = false
  let reducedMotion = false

  function clearPlaybackTimer () {
    if (playbackTimer !== null) globalThis.clearInterval(playbackTimer)
    playbackTimer = null
  }

  function startPlayback () {
    clearPlaybackTimer()
    isPlaying.value = true
    playbackTimer = globalThis.setInterval(() => {
      currentStep.value = (currentStep.value + 1) % scenes.length
    }, 5200)
  }

  function pausePlayback () {
    clearPlaybackTimer()
    isPlaying.value = false
  }

  function togglePlayback () {
    if (isPlaying.value) pausePlayback()
    else {
      userPaused = false
      startPlayback()
    }
  }

  function nextScene () {
    currentStep.value = (currentStep.value + 1) % scenes.length
  }

  function previousScene () {
    currentStep.value = (currentStep.value - 1 + scenes.length) % scenes.length
  }

  onMounted(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!('IntersectionObserver' in window) || !tourRoot.value) {
      if (!reducedMotion) startPlayback()
      return
    }

    visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reducedMotion && !userPaused) startPlayback()
      else if (!entry.isIntersecting) pausePlayback()
    }, { threshold: 0.2 })
    visibilityObserver.observe(tourRoot.value)
  })

  onBeforeUnmount(() => {
    clearPlaybackTimer()
    visibilityObserver?.disconnect()
  })
</script>

<style scoped>
  .tour-section { margin: 6px 0 72px; }
  .tour-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
  .tour-kicker { display: flex; align-items: center; gap: 6px; color: #638673; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
  .tour-heading h2 { max-width: 690px; margin: 8px 0 5px; color: #203b4a; font-size: clamp(1.6rem, 3.4vw, 2.35rem); font-weight: 760; letter-spacing: -.045em; }
  .tour-heading p { margin: 0; color: #73827f; font-size: 13px; }
  .tour-player { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); overflow: hidden; border: 1px solid #e0e8df; border-radius: 24px; background: #fff; box-shadow: 0 18px 42px rgb(29 59 47 / 8%); }
  .tour-screen { position: relative; display: flex; min-height: 390px; flex-direction: column; overflow: hidden; padding: 20px 24px 40px; color: #edf4ee; background: radial-gradient(ellipse at 80% 0%, rgb(111 159 120 / 20%), transparent 26rem), linear-gradient(145deg, #142c38, #1b3e42); }
  .screen-topbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid rgb(255 255 255 / 10%); padding-bottom: 13px; }
  .screen-brand { display: flex; align-items: center; gap: 8px; color: #e7efe9; font-size: 11px; }
  .screen-brand img { width: 28px; height: 28px; }
  .screen-tag { display: flex; align-items: center; gap: 5px; border: 1px solid rgb(255 255 255 / 16%); border-radius: 99px; padding: 5px 9px; color: #c7d8ce; font-size: 8px; font-weight: 750; letter-spacing: .1em; }
  .screen-scene { display: grid; flex: 1; align-content: center; gap: 13px; padding: 19px 5px 9px; }
  .screen-welcome { display: grid; gap: 4px; }
  .screen-welcome > span, .screen-section-title > span { color: #a9c6a8; font-size: 8px; font-weight: 800; letter-spacing: .13em; }
  .screen-welcome > strong { color: #f2f6f2; font-size: clamp(17px, 2vw, 23px); letter-spacing: -.035em; }
  .screen-welcome > small { color: #b6c5c1; font-size: 10px; }
  .screen-stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .screen-stat-row > div { display: grid; gap: 6px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 12px; padding: 11px; background: rgb(255 255 255 / 6%); }
  .screen-stat-row small { color: #b8c9c0; font-size: 9px; }
  .screen-stat-row strong { color: #f4f6ed; font-size: 22px; }
  .screen-highlight { display: flex; align-items: center; gap: 10px; border: 1px solid rgb(232 212 152 / 22%); border-radius: 12px; padding: 11px; color: #e4d29a; background: rgb(232 212 152 / 7%); }
  .screen-highlight > span { display: grid; flex: 1; gap: 3px; }
  .screen-highlight strong { color: #f1ead0; font-size: 10px; }
  .screen-highlight small { color: #c5c6b5; font-size: 9px; }
  .screen-arrow { color: #d6d0b1; font-size: 17px; }
  .screen-section-title { display: grid; gap: 4px; margin-bottom: 1px; }
  .screen-section-title > strong { color: #f2f6f2; font-size: 18px; letter-spacing: -.025em; }
  .screen-list-row { display: flex; align-items: center; gap: 9px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 11px; padding: 10px; background: rgb(255 255 255 / 5%); }
  .screen-list-row > span { display: grid; flex: 1; gap: 4px; min-width: 0; }
  .screen-list-row strong { color: #e7eee9; font-size: 10px; }
  .screen-list-row small { color: #adbfba; font-size: 9px; }
  .screen-progress { display: grid; grid-template-columns: 1fr auto; gap: 7px 10px; color: #b8c9c0; font-size: 9px; }
  .screen-progress strong { color: #d4e5d1; }
  .screen-progress .v-progress-linear { grid-column: 1 / -1; }
  .screen-material { display: flex; align-items: center; gap: 9px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 11px; padding: 9px; background: rgb(255 255 255 / 5%); }
  .screen-material > span { display: grid; width: 33px; height: 33px; place-items: center; border-radius: 9px; color: #b8d8c2; background: rgb(122 169 132 / 15%); }
  .screen-material > div { display: grid; flex: 1; gap: 3px; min-width: 0; }
  .screen-material > div > strong { color: #e7eee9; font-size: 10px; }
  .screen-material > div > small { color: #adbfba; font-size: 9px; }
  .screen-material > .v-icon { color: #a7bcb0; font-size: 16px; }
  .screen-group-card { display: flex; align-items: center; gap: 12px; border: 1px solid rgb(255 255 255 / 12%); border-radius: 15px; padding: 15px; background: rgb(255 255 255 / 6%); }
  .screen-group-icon { display: grid; width: 50px; height: 50px; flex: 0 0 auto; place-items: center; border-radius: 13px; color: #d6d09e; background: rgb(224 210 158 / 12%); }
  .screen-group-card > div:last-child { display: grid; gap: 5px; }
  .screen-group-card strong { color: #eff4ee; font-size: 14px; }
  .screen-group-card small, .screen-group-card span { color: #b7c7bf; font-size: 9px; }
  .screen-group-card span { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .screen-group-footer { display: flex; align-items: center; gap: 7px; color: #b9c9bf; font-size: 9px; }
  .screen-notice { position: relative; display: grid; gap: 5px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 11px; padding: 10px 29px 10px 11px; background: rgb(255 255 255 / 5%); }
  .screen-notice > span { color: #a9c6a8; font-size: 7px; font-weight: 750; letter-spacing: .1em; }
  .screen-notice > strong { color: #edf2ed; font-size: 10px; line-height: 1.4; }
  .screen-notice > small { color: #b4c3bd; font-size: 8px; }
  .screen-notice > .v-icon { position: absolute; top: 12px; right: 11px; color: #c5d2c9; }
  .screen-watermark { position: absolute; right: 16px; bottom: 13px; display: flex; align-items: center; gap: 4px; color: rgb(221 233 224 / 55%); font-size: 8px; font-weight: 700; letter-spacing: .08em; }
  .tour-caption { display: flex; flex-direction: column; justify-content: center; padding: 28px; }
  .tour-caption-copy > span { color: #668a73; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
  .tour-caption-copy h3 { margin: 10px 0 8px; color: #263f4a; font-size: clamp(1.3rem, 2.1vw, 1.75rem); font-weight: 750; letter-spacing: -.035em; line-height: 1.18; }
  .tour-caption-copy p { margin: 0; color: #768580; font-size: 12px; line-height: 1.65; }
  .tour-controls { display: flex; align-items: center; gap: 9px; margin-top: 26px; }
  .tour-controls .v-btn:nth-child(2) { width: 46px; height: 46px; }
  .tour-progress { display: flex; align-items: center; gap: 10px; margin-top: 15px; color: #829089; font-size: 9px; }
  .tour-progress .v-progress-linear { flex: 1; }
  .tour-disclosure { display: flex; align-items: center; gap: 5px; margin: 10px 2px 0; color: #788781; font-size: 10px; }
  .tour-disclosure .v-icon { color: #62866e; }
  .tour-scene-enter-active, .tour-scene-leave-active { transition: opacity 220ms ease, transform 220ms ease; }
  .tour-scene-enter-from { transform: translateY(8px); opacity: 0; }
  .tour-scene-leave-to { transform: translateY(-8px); opacity: 0; }

  .v-theme--academicDark .tour-heading h2, .v-theme--academicDark .tour-caption-copy h3 { color: #e2ebe9; }
  .v-theme--academicDark .tour-heading p, .v-theme--academicDark .tour-caption-copy p, .v-theme--academicDark .tour-disclosure { color: #a3b1b4; }
  .v-theme--academicDark .tour-player { border-color: #30414a; background: #1b2932; }

  @media (max-width: 800px) {
    .tour-player { grid-template-columns: 1fr; }
    .tour-screen { min-height: 360px; }
    .tour-caption { padding: 20px 22px 24px; }
    .tour-controls { margin-top: 17px; }
  }
  @media (max-width: 600px) {
    .tour-section { margin-bottom: 54px; }
    .tour-heading { align-items: flex-start; flex-direction: column; gap: 14px; }
    .tour-heading .v-btn { width: 100%; }
    .tour-screen { min-height: 340px; padding: 15px 14px 38px; }
    .screen-tag { font-size: 7px; }
    .screen-stat-row { gap: 5px; }
    .screen-stat-row > div { padding: 8px; }
    .screen-stat-row small { font-size: 8px; }
    .screen-stat-row strong { font-size: 19px; }
    .screen-list-row strong, .screen-material > div > strong { font-size: 9px; }
    .tour-caption { padding-inline: 17px; }
    .tour-disclosure { align-items: flex-start; line-height: 1.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    .tour-scene-enter-active, .tour-scene-leave-active { transition: none; }
  }
</style>
