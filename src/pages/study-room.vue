<template>
  <main class="study-page">
    <v-container class="study-width py-5 py-md-8" fluid>
      <header class="study-header">
        <RouterLink aria-label="Student Success Hub home" class="study-brand" to="/">
          <img alt="" src="/academic-mark.svg">
          <span><strong>Student Success Hub</strong><small>Learn together. Go further.</small></span>
        </RouterLink>

        <nav aria-label="Study room navigation" class="study-header-actions">
          <v-btn rounded="pill" to="/dashboard" variant="text">My dashboard</v-btn>

          <v-btn
            href="mailto:noreply@mail2student.com?subject=Student%20Success%20Hub%20support"
            prepend-icon="mdi-lifebuoy"
            rounded="pill"
            variant="tonal"
          >
            Customer care
          </v-btn>
        </nav>
      </header>

      <section class="study-intro">
        <div class="section-kicker">STUDENT COMMUNITY</div>
        <h1>Study together, course by course.</h1>
        <p>Join classmates to discuss questions, share assignment prompts, and read course PDFs together.</p>
      </section>

      <v-alert
        v-if="roomError"
        class="mb-5"
        title="We couldn't connect to this course room"
        type="error"
        variant="tonal"
      >
        {{ roomError }}
      </v-alert>

      <v-alert
        v-if="resourceError"
        class="mb-5"
        title="Shared resources couldn't be loaded"
        type="error"
        variant="tonal"
      >
        {{ resourceError }}
      </v-alert>

      <v-row align="start">
        <v-col cols="12" lg="8">
          <v-card class="room-card pa-4 pa-md-6" rounded="xl">
            <div class="room-toolbar">
              <div>
                <div class="section-kicker">LIVE COURSE ROOM</div>
                <h2>{{ activeCourse || 'Choose a course' }}</h2>

                <v-chip class="presence-summary" color="success" size="small" variant="tonal">
                  <v-icon class="mr-1" color="success" size="16">mdi-circle</v-icon>
                  {{ onlineCount }} {{ onlineCount === 1 ? 'student' : 'students' }} here now
                </v-chip>
              </div>

              <v-combobox
                v-model="activeCourse"
                class="course-picker"
                hide-details
                :items="courseOptions"
                label="Choose or enter a course"
                maxlength="80"
                prepend-inner-icon="mdi-book-open-variant"
                variant="outlined"
              />
            </div>

            <v-divider class="my-4" />

            <v-progress-linear
              v-if="loadingMessages"
              class="mb-4"
              color="primary"
              indeterminate
              rounded
            />

            <div v-else aria-live="polite" class="message-list">
              <div v-if="messages.length === 0" class="room-empty">
                <v-icon size="32">mdi-forum-outline</v-icon>
                <strong>Start the discussion</strong>
                <span>Ask a question or share an assignment prompt with classmates in this course.</span>
              </div>

              <article
                v-for="message in messages"
                :key="message.id"
                class="study-message"
                :class="{ 'assignment-message': message.message_type === 'assignment' }"
              >
                <div class="message-topline">
                  <strong>{{ message.sender_name }}</strong>

                  <v-chip
                    v-if="message.message_type === 'assignment'"
                    color="warning"
                    size="x-small"
                    variant="tonal"
                  >
                    Assignment question
                  </v-chip>

                  <time :datetime="message.created_at">{{ formatTime(message.created_at) }}</time>
                </div>

                <p>{{ message.content }}</p>
              </article>

              <div ref="messageEnd" />
            </div>

            <v-divider class="my-4" />

            <v-form class="message-form" @submit.prevent="postMessage">
              <v-select
                v-model="messageType"
                class="message-type"
                hide-details
                :items="[
                  { title: 'Discussion comment', value: 'discussion' },
                  { title: 'Assignment question', value: 'assignment' },
                ]"
                label="Post type"
                variant="outlined"
              />

              <v-textarea
                v-model="messageText"
                auto-grow
                class="message-input"
                :counter="2000"
                hide-details
                label="Write a comment or assignment question"
                maxlength="2000"
                rows="2"
              />

              <v-btn
                color="primary"
                :disabled="!activeCourse.trim() || !messageText.trim()"
                :loading="sending"
                prepend-icon="mdi-send"
                rounded="pill"
                type="submit"
              >
                Post
              </v-btn>
            </v-form>

            <p class="room-guideline">Keep the room welcoming. Don’t post private information or content you don’t have permission to share.</p>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="reading-card pa-5" rounded="xl">
            <div class="section-kicker">READ TOGETHER</div>
            <h2 class="mt-1">Course PDFs</h2>
            <p class="text-body-2 text-medium-emphasis">Open a shared resource while you discuss it in the room.</p>

            <v-progress-linear
              v-if="loadingResources"
              class="my-4"
              color="primary"
              indeterminate
              rounded
            />

            <div v-else-if="roomResources.length > 0" class="room-resources">
              <article v-for="resource in roomResources" :key="resource.id" class="room-resource">
                <v-icon color="error">mdi-file-pdf-box</v-icon>

                <div class="room-resource-copy">
                  <strong>{{ resource.title }}</strong>
                  <small>{{ resource.course || 'Course not specified' }}</small>
                </div>

                <v-btn
                  :aria-label="`Read ${resource.title}`"
                  :href="resource.url"
                  icon="mdi-open-in-new"
                  rel="noopener noreferrer"
                  target="_blank"
                  variant="text"
                />
              </article>
            </div>

            <div v-else class="room-empty compact-room-empty">
              <v-icon>mdi-bookshelf</v-icon>
              <span>No PDFs for this course yet. Browse and share resources from the library.</span>
            </div>

            <v-btn
              block
              class="mt-4"
              color="primary"
              rounded="pill"
              to="/#past-questions"
              variant="tonal"
            >
              Browse shared questions
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>

          <v-card class="community-note mt-5 pa-5" rounded="xl">
            <v-icon color="secondary" size="26">mdi-account-group-outline</v-icon>
            <h3 class="mt-2">Practice as a group</h3>
            <p>Post a problem as an assignment question, then use discussion comments to compare ideas and explain solutions.</p>
          </v-card>
        </v-col>
      </v-row>

    </v-container>
  </main>
</template>

<script setup lang="ts">
  import type { Resource } from '@/services/resources'
  import type { StudyMessage, StudyMessageType } from '@/services/study'
  import type { RealtimeChannel } from '@supabase/supabase-js'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { getErrorMessage } from '@/lib/errors'
  import { getResources } from '@/services/resources'
  import { getStudyMessages, leaveStudyRoom, sendStudyMessage, subscribeToStudyRoom } from '@/services/study'

  const route = useRoute()
  const activeCourse = ref(typeof route.query.course === 'string' ? route.query.course.trim().slice(0, 80) : '')
  const courseResources = ref<Resource[]>([])
  const messages = ref<StudyMessage[]>([])
  const messageText = ref('')
  const messageType = ref<StudyMessageType>('discussion')
  const onlineCount = ref(0)
  const loadingMessages = ref(false)
  const loadingResources = ref(false)
  const sending = ref(false)
  const roomError = ref('')
  const resourceError = ref('')
  const messageEnd = ref<HTMLElement | null>(null)
  const courseOptions = computed(() => [
    ...new Set(courseResources.value.map(resource => resource.course.trim()).filter(Boolean)),
  ].toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
  const roomResources = computed(() => courseResources.value.filter(resource =>
    !activeCourse.value.trim()
    || resource.course.trim().toLocaleLowerCase() === activeCourse.value.trim().toLocaleLowerCase(),
  ))
  let roomChannel: RealtimeChannel | null = null
  let connectionVersion = 0

  async function loadResources () {
    loadingResources.value = true
    try {
      const [questions, materials] = await Promise.all([
        getResources('past_question'),
        getResources('class_material'),
      ])
      courseResources.value = [...questions, ...materials]
    } catch (error) {
      resourceError.value = getErrorMessage(error, 'Could not load the shared course PDFs.')
    } finally {
      loadingResources.value = false
    }
  }

  function normalizeCourse (course: string) {
    return course.trim().replace(/\s+/g, ' ').toLocaleUpperCase().slice(0, 80)
  }

  async function connectRoom (courseInput: string) {
    const version = ++connectionVersion
    const course = normalizeCourse(courseInput)
    const previousChannel = roomChannel
    roomChannel = null
    await leaveStudyRoom(previousChannel).catch(error => {
      roomError.value = getErrorMessage(error, 'Could not leave the previous study room.')
    })
    onlineCount.value = 0
    messages.value = []

    if (!course) {
      loadingMessages.value = false
      return
    }

    loadingMessages.value = true
    roomError.value = ''
    try {
      const history = await getStudyMessages(course)
      if (version !== connectionVersion) return
      messages.value = history
      roomChannel = await subscribeToStudyRoom(
        course,
        message => {
          if (version !== connectionVersion || messages.value.some(item => item.id === message.id)) return
          messages.value.push(message)
          scrollToLatest()
        },
        count => {
          if (version === connectionVersion) onlineCount.value = count
        },
        error => {
          if (version === connectionVersion) roomError.value = error.message
        },
      )
      await scrollToLatest()
    } catch (error) {
      if (version === connectionVersion) {
        roomError.value = getErrorMessage(error, 'Could not open this study room.')
      }
    } finally {
      if (version === connectionVersion) loadingMessages.value = false
    }
  }

  async function postMessage () {
    roomError.value = ''
    const course = normalizeCourse(activeCourse.value)
    if (!course) {
      roomError.value = 'Choose a course before posting.'
      return
    }

    sending.value = true
    try {
      const message = await sendStudyMessage(course, messageType.value, messageText.value)
      if (!messages.value.some(item => item.id === message.id)) {
        messages.value.push(message)
      }
      messageText.value = ''
      await scrollToLatest()
    } catch (error) {
      roomError.value = getErrorMessage(error, 'Could not post your message.')
    } finally {
      sending.value = false
    }
  }

  async function scrollToLatest () {
    await nextTick()
    messageEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  function formatTime (date: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  }

  onMounted(async () => {
    await loadResources()
    if (activeCourse.value) {
      await connectRoom(activeCourse.value)
    } else if (courseOptions.value[0]) {
      activeCourse.value = courseOptions.value[0]
    }
  })

  watch(activeCourse, (course, previous) => {
    if (course !== previous) void connectRoom(course)
  })

  onBeforeUnmount(() => {
    connectionVersion++
    void leaveStudyRoom(roomChannel).catch(error => {
      console.error('Could not leave the study room.', error)
    })
  })
</script>

<style scoped>
  .study-page {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 8% 4%, rgb(221 238 231 / 48%), transparent 31rem),
      #f4f6f2;
  }

  .study-width {
    max-width: 1280px;
  }

  .study-header,
  .study-header-actions,
  .study-brand,
  .room-toolbar,
  .message-topline,
  .message-form,
  .room-resource {
    display: flex;
    align-items: center;
  }

  .study-header,
  .room-toolbar {
    justify-content: space-between;
    gap: 24px;
  }

  .study-header {
    min-height: 76px;
    border-bottom: 1px solid rgb(32 58 74 / 8%);
  }

  .study-header-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .study-brand {
    gap: 12px;
    color: #1c3b4d;
    text-decoration: none;
  }

  .study-brand img {
    width: 44px;
    height: 44px;
  }

  .study-brand span {
    display: grid;
    gap: 3px;
  }

  .study-brand strong {
    font-size: 13px;
    font-weight: 750;
  }

  .study-brand small {
    color: #78868a;
    font-size: 11px;
  }

  .study-intro {
    padding: 38px 0 28px;
  }

  .section-kicker {
    color: #668d76;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .study-intro h1 {
    margin: 9px 0 8px;
    color: #203a4a;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 750;
    letter-spacing: -0.045em;
    line-height: 1.08;
  }

  .study-intro p {
    max-width: 680px;
    margin: 0;
    color: #748187;
    font-size: 14px;
    line-height: 1.7;
  }

  .room-card,
  .reading-card,
  .community-note {
    border: 1px solid #e4e9e1;
    background: #fffefa;
    box-shadow: 0 12px 32px rgb(30 53 54 / 5%);
  }

  .room-card {
    min-height: 620px;
  }

  .room-toolbar {
    align-items: flex-start;
  }

  .room-toolbar h2,
  .reading-card h2 {
    margin: 5px 0 9px;
    color: #203a4a;
    font-size: 1.3rem;
    font-weight: 750;
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }

  .presence-summary {
    padding-inline: 10px;
    font-size: 11px;
    font-weight: 650;
  }

  .course-picker {
    width: min(100%, 340px);
    flex: 0 0 340px;
  }

  .message-list {
    display: flex;
    min-height: 300px;
    max-height: 490px;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding: 2px 4px 12px;
    scrollbar-color: #bdcdc1 transparent;
    scrollbar-width: thin;
  }

  .room-empty {
    display: grid;
    min-height: 220px;
    align-content: center;
    justify-items: center;
    gap: 9px;
    color: #718085;
    text-align: center;
  }

  .room-empty > .v-icon {
    color: #668d76;
  }

  .room-empty strong {
    color: #294453;
  }

  .room-empty span {
    max-width: 380px;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .compact-room-empty {
    min-height: 130px;
    font-size: 0.85rem;
  }

  .study-message {
    max-width: min(94%, 680px);
    align-self: flex-start;
    border: 1px solid #e4e9e1;
    border-radius: 15px;
    padding: 13px 15px;
    background: #f7f9f5;
  }

  .assignment-message {
    border-color: #ead9ad;
    background: #fcf8eb;
  }

  .message-topline {
    flex-wrap: wrap;
    gap: 8px;
  }

  .message-topline strong {
    color: #294453;
    font-size: 0.88rem;
  }

  .message-topline time {
    margin-left: auto;
    color: #78868a;
    font-size: 0.72rem;
  }

  .study-message p {
    margin: 8px 0 0;
    color: #40545f;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .message-form {
    align-items: flex-end;
    gap: 12px;
  }

  .message-type {
    max-width: 210px;
    flex: 0 0 210px;
  }

  .message-input {
    flex: 1;
  }

  .room-guideline {
    margin: 14px 0 0;
    color: #7a878b;
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .room-resources {
    display: grid;
    gap: 6px;
    margin-top: 16px;
  }

  .room-resource {
    gap: 10px;
    border-bottom: 1px solid #e8ece6;
    padding: 10px 0;
  }

  .room-resource-copy {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 3px;
  }

  .room-resource-copy strong {
    overflow: hidden;
    color: #294453;
    font-size: 0.88rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-resource-copy small {
    color: #78868a;
    font-size: 0.75rem;
  }

  .community-note h3 {
    color: #294453;
    font-size: 1.1rem;
    font-weight: 750;
  }

  .community-note p {
    margin: 8px 0 0;
    color: #718085;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  @media (max-width: 700px) {
    .study-header,
    .room-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .study-header {
      gap: 10px;
      padding: 12px 0;
    }

    .study-header-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .study-intro {
      padding: 28px 0 22px;
    }

    .room-card {
      min-height: 0;
    }

    .course-picker,
    .message-type {
      width: 100%;
      max-width: none;
      flex-basis: auto;
    }

    .message-form {
      align-items: stretch;
      flex-direction: column;
    }

    .message-form > :deep(.v-btn) {
      align-self: flex-end;
    }
  }

  @media (max-width: 420px) {
    .study-width {
      padding-inline: 14px;
    }

    .study-header-actions > :deep(.v-btn) {
      padding-inline: 10px;
      font-size: 0.75rem;
    }

    .study-intro h1 {
      font-size: 2rem;
    }

    .room-card {
      padding: 18px 14px !important;
    }

    .study-message {
      max-width: 100%;
    }
  }
</style>
