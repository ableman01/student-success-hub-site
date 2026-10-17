<template>
  <main class="study-page">
    <v-container class="study-width py-5 py-md-8" fluid>
      <header class="study-header">
        <RouterLink aria-label="LASU Student Success Hub home" class="study-brand" to="/">
          <img alt="" src="/academic-mark.svg">
          <span><strong>LASU Student Success Hub</strong><small>Learn together. Go further.</small></span>
        </RouterLink>

        <nav aria-label="Study room navigation" class="study-header-actions">
          <v-btn rounded="pill" to="/dashboard" variant="text">My dashboard</v-btn>

          <v-btn
            href="mailto:noreply@mail2student.com?subject=LASU%20Student%20Success%20Hub%20support"
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

      <nav aria-label="Study room sections" class="study-section-nav">
        <a href="#study-groups">Study groups</a>
        <a href="#course-room">Course discussion</a>
        <a href="#course-resources">Course PDFs</a>
        <a href="#study-guidance">Study guidance</a>
      </nav>

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

      <section id="study-groups" class="groups-section" aria-labelledby="groups-heading">
        <div class="groups-heading-row">
          <div>
            <div class="section-kicker">SMALL GROUP STUDY</div>
            <h2 id="groups-heading">Study with your people</h2>
            <p>Create a private group, invite selected classmates with a link, then work through questions, assignments and practice together.</p>
          </div>
          <img alt="Students sharing notes and studying together" class="group-art" src="/study-together.svg">
        </div>

        <v-alert v-if="groupError" class="mb-4" type="error" variant="tonal">{{ groupError }}</v-alert>
        <v-alert v-if="groupNotice" class="mb-4" type="success" variant="tonal">{{ groupNotice }}</v-alert>

        <v-card class="group-card pa-4 pa-md-6" rounded="xl">
          <div class="group-actions">
            <v-btn color="primary" prepend-icon="mdi-account-multiple-plus" rounded="pill" @click="showCreateGroup = !showCreateGroup">Create a group</v-btn>
            <v-text-field v-model="inviteCodeInput" class="invite-input" density="comfortable" hide-details label="Paste a classmate’s invite code" prepend-inner-icon="mdi-link-variant" variant="outlined" @keydown.enter.prevent="joinGroup" />
            <v-btn :loading="joiningGroup" rounded="pill" variant="tonal" @click="joinGroup">Join group</v-btn>
          </div>

          <v-expand-transition>
            <v-form v-if="showCreateGroup" class="create-group-form" @submit.prevent="createGroup">
              <v-text-field v-model="newGroupName" label="Group name" maxlength="80" placeholder="BIO 101 Saturday revision" required />
              <v-text-field v-model="newGroupCourse" label="Course" maxlength="80" placeholder="BIO 101" required />
              <v-text-field v-model="newGroupDescription" label="Study goal (optional)" maxlength="300" placeholder="Review lecture topics and solve past questions" />
              <div class="create-group-actions">
                <v-btn :loading="creatingGroup" color="primary" rounded="pill" type="submit">Create and join</v-btn>
                <v-btn rounded="pill" variant="text" @click="showCreateGroup = false">Cancel</v-btn>
              </div>
            </v-form>
          </v-expand-transition>

          <v-divider class="my-4" />
          <div v-if="groups.length" class="group-workspace">
            <v-select v-model="activeGroupId" class="group-picker" hide-details item-title="name" item-value="id" :items="groups" label="Your study groups" prepend-inner-icon="mdi-account-group" variant="outlined">
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="`${item.raw.course} · ${item.raw.description || 'Study together'}`" />
              </template>
            </v-select>
            <div v-if="activeGroup" class="active-group-summary">
              <div><strong>{{ activeGroup.name }}</strong><span>{{ activeGroup.course }}<template v-if="activeGroup.description"> · {{ activeGroup.description }}</template></span></div>
              <v-btn :aria-label="`Copy invitation for ${activeGroup.name}`" color="primary" prepend-icon="mdi-content-copy" rounded="pill" size="small" variant="tonal" @click="copyGroupInvite">Invite selected classmates</v-btn>
            </div>

            <v-progress-linear v-if="loadingGroupPosts" class="my-3" color="primary" indeterminate rounded />
            <div v-else class="group-post-list" aria-live="polite">
              <div v-if="groupPosts.length === 0" class="group-empty"><v-icon size="26">mdi-chat-processing-outline</v-icon><strong>Start your group’s first study session</strong><span>Post a question, assignment, or practice problem and invite classmates to explain their thinking.</span></div>
              <article v-for="post in groupPosts" :key="post.id" class="group-post" :class="`group-post-${post.post_type}`">
                <div class="group-post-meta"><strong>{{ post.sender_name }}</strong><v-chip size="x-small" variant="tonal">{{ groupPostLabels[post.post_type] }}</v-chip><time :datetime="post.created_at">{{ formatTime(post.created_at) }}</time></div>
                <p>{{ post.content }}</p>
              </article>
            </div>

            <v-form class="group-post-form" @submit.prevent="postToGroup">
              <v-select v-model="groupPostType" class="group-post-type" hide-details item-title="title" item-value="value" :items="groupPostOptions" label="Post type" variant="outlined" />
              <v-textarea v-model="groupPostText" auto-grow class="group-post-text" hide-details label="Share a question, assignment prompt, or practice problem" maxlength="2000" rows="2" />
              <v-btn color="primary" :disabled="!groupPostText.trim()" :loading="sendingGroupPost" prepend-icon="mdi-send" rounded="pill" type="submit">Post to group</v-btn>
            </v-form>
            <p class="group-safety-note"><v-icon size="16">mdi-shield-check-outline</v-icon> Group posts are visible only to members. Share the invite link with classmates you choose.</p>
          </div>
          <div v-else class="group-empty groups-first-empty"><v-icon size="30">mdi-account-multiple-outline</v-icon><strong>Your study groups will appear here</strong><span>Create a group and you’ll be added automatically, or join with a classmate’s invite code.</span></div>
        </v-card>
      </section>

      <v-row align="start">
        <v-col cols="12" lg="8">
          <v-card id="course-room" class="room-card pa-4 pa-md-6" rounded="xl">
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

            <div class="discussion-starters" aria-label="Discussion starters">
              <span>Need a starting point?</span>
              <v-chip size="small" variant="outlined" @click="messageText = 'Which part of this topic should we review first?'">
                Review a topic
              </v-chip>
              <v-chip size="small" variant="outlined" @click="messageText = 'Can someone explain how they approached this problem?'">
                Explain a problem
              </v-chip>
              <v-chip size="small" variant="outlined" @click="messageText = 'What are the key ideas we should remember for this course?'">
                Share key ideas
              </v-chip>
            </div>

            <p class="room-guideline">Keep the room welcoming. Don’t post private information or content you don’t have permission to share.</p>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card id="course-resources" class="reading-card pa-5" rounded="xl">
            <div class="section-kicker">READ TOGETHER</div>
            <h2 class="mt-1">Course PDFs</h2>
            <p class="text-body-2 text-medium-emphasis">Open a shared resource while you discuss it in the room.</p>

            <v-select
              v-model="resourceCategoryFilter"
              class="room-category-filter mt-3"
              density="comfortable"
              hide-details
              item-title="title"
              item-value="value"
              :items="roomCategoryOptions"
              label="Resource category"
              prepend-inner-icon="mdi-shape-outline"
              variant="outlined"
            />

            <v-progress-linear
              v-if="loadingResources"
              class="my-4"
              color="primary"
              indeterminate
              rounded
            />

            <div v-else-if="filteredRoomResources.length > 0" class="room-resources">
              <article v-for="resource in filteredRoomResources" :key="resource.id" class="room-resource">
                <v-icon color="error">mdi-file-pdf-box</v-icon>

                <div class="room-resource-copy">
                  <strong>{{ resource.title }}</strong>
                  <small>{{ resource.course || 'Course not specified' }}</small>
                  <v-chip size="x-small" color="secondary" variant="tonal">
                    {{ getResourceCategoryLabel(resource.category) }}
                  </v-chip>
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

            <div v-else-if="roomResources.length > 0" class="room-empty compact-room-empty">
              <v-icon>mdi-filter-remove-outline</v-icon>
              <span>No resources in this category for {{ activeCourse }}.</span>
              <v-btn size="small" variant="text" @click="resourceCategoryFilter = 'all'">Show all resources</v-btn>
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

          <v-card class="focus-card mt-5 pa-5" rounded="xl">
            <div class="section-kicker">FOCUS SESSION</div>
            <div class="focus-timer" role="timer" aria-label="Time remaining" aria-live="off">
              {{ formatFocusTime(focusRemaining) }}
            </div>
            <p class="focus-caption">A short, focused study sprint for {{ activeCourse || 'your next course' }}.</p>
            <v-progress-linear
              class="my-4"
              color="secondary"
              :model-value="focusProgress"
              rounded
            />
            <v-text-field
              v-model="focusGoal"
              density="compact"
              hide-details
              label="My goal for this session"
              placeholder="e.g. Review lecture 3"
              prepend-inner-icon="mdi-target"
              variant="outlined"
            />
            <div class="focus-actions">
              <v-btn color="primary" rounded="pill" @click="toggleFocusTimer">
                {{ focusRunning ? 'Pause sprint' : 'Start 25-minute sprint' }}
                <v-icon end>{{ focusRunning ? 'mdi-pause' : 'mdi-play' }}</v-icon>
              </v-btn>
              <v-btn aria-label="Reset focus timer" icon="mdi-restart" variant="text" @click="resetFocusTimer" />
            </div>
            <p v-if="focusRemaining === 0" class="focus-complete">Sprint complete. Take a short break and celebrate your progress.</p>
          </v-card>

          <v-card class="community-note mt-5 pa-5" rounded="xl">
            <v-icon color="secondary" size="26">mdi-account-group-outline</v-icon>
            <h3 class="mt-2">Practice as a group</h3>
            <p>Post a problem as an assignment question, then use discussion comments to compare ideas and explain solutions.</p>
          </v-card>

          <v-card id="study-guidance" class="guide-card mt-5 pa-5" rounded="xl">
            <img class="guide-art" src="/study-planner.svg" alt="Illustrated study planner with completed tasks and a course book">
            <div class="section-kicker">A SIMPLE STUDY ROUTINE</div>
            <h3 class="mt-2">Make each session count</h3>
            <ol class="study-routine">
              <li><strong>Choose one clear goal.</strong><span>Write what you’ll understand or finish before the session ends.</span></li>
              <li><strong>Try active recall.</strong><span>Close your notes and explain the idea from memory before checking.</span></li>
              <li><strong>Practise in short rounds.</strong><span>Attempt a past question, compare approaches, then correct your work.</span></li>
              <li><strong>Return to it later.</strong><span>Review the same topic tomorrow and again later in the week.</span></li>
            </ol>
            <v-btn class="mt-2" rounded="pill" to="/dashboard" variant="tonal">Plan your study week<v-icon end>mdi-arrow-right</v-icon></v-btn>
          </v-card>
        </v-col>
      </v-row>

    </v-container>
  </main>
</template>

<script setup lang="ts">
  import type { Resource } from '@/services/resources'
  import type { ResourceCategory } from '@/services/resources'
  import type { GroupPostType, StudyGroup, StudyGroupPost, StudyMessage, StudyMessageType } from '@/services/study'
  import type { RealtimeChannel } from '@supabase/supabase-js'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { getErrorMessage } from '@/lib/errors'
  import { getResourceCategoryLabel, getResources, resourceCategories } from '@/services/resources'
  import { createStudyGroup as createGroupRecord, getStudyGroupPosts, getStudyGroups, getStudyMessages, joinStudyGroup, leaveStudyGroup, leaveStudyRoom, sendStudyGroupPost, sendStudyMessage, subscribeToStudyGroup, subscribeToStudyRoom } from '@/services/study'

  const route = useRoute()
  const activeCourse = ref(typeof route.query.course === 'string' ? route.query.course.trim().slice(0, 80) : '')
  const courseResources = ref<Resource[]>([])
  const messages = ref<StudyMessage[]>([])
  const messageText = ref('')
  const messageType = ref<StudyMessageType>('discussion')
  const resourceCategoryFilter = ref<ResourceCategory | 'all'>('all')
  const roomCategoryOptions = [
    { title: 'All categories', value: 'all' },
    ...resourceCategories,
  ]
  const focusDurationSeconds = 25 * 60
  const focusRemaining = ref(focusDurationSeconds)
  const focusGoal = ref('')
  const focusRunning = ref(false)
  const focusProgress = computed(() => ((focusDurationSeconds - focusRemaining.value) / focusDurationSeconds) * 100)
  const onlineCount = ref(0)
  const loadingMessages = ref(false)
  const loadingResources = ref(false)
  const sending = ref(false)
  const roomError = ref('')
  const resourceError = ref('')
  const messageEnd = ref<HTMLElement | null>(null)
  const groups = ref<StudyGroup[]>([])
  const activeGroupId = ref('')
  const activeGroup = computed(() => groups.value.find(group => group.id === activeGroupId.value) ?? null)
  const groupPosts = ref<StudyGroupPost[]>([])
  const groupError = ref('')
  const groupNotice = ref('')
  const inviteCodeInput = ref(typeof route.query.invite === 'string' ? route.query.invite : '')
  const showCreateGroup = ref(false)
  const newGroupName = ref('')
  const newGroupCourse = ref(typeof route.query.course === 'string' ? route.query.course.trim().slice(0, 80) : '')
  const newGroupDescription = ref('')
  const creatingGroup = ref(false)
  const joiningGroup = ref(false)
  const loadingGroupPosts = ref(false)
  const sendingGroupPost = ref(false)
  const groupPostText = ref('')
  const groupPostType = ref<GroupPostType>('discussion')
  const groupPostOptions = [
    { title: 'Discussion', value: 'discussion' },
    { title: 'Past question', value: 'question' },
    { title: 'Assignment', value: 'assignment' },
    { title: 'Practice problem', value: 'practice' },
  ]
  const groupPostLabels: Record<GroupPostType, string> = { discussion: 'Discussion', question: 'Past question', assignment: 'Assignment', practice: 'Practice problem' }
  const courseOptions = computed(() => [
    ...new Set(courseResources.value.map(resource => resource.course.trim()).filter(Boolean)),
  ].toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
  const roomResources = computed(() => courseResources.value.filter(resource =>
    !activeCourse.value.trim()
    || resource.course.trim().toLocaleLowerCase() === activeCourse.value.trim().toLocaleLowerCase(),
  ))
  const filteredRoomResources = computed(() => roomResources.value.filter(resource =>
    resourceCategoryFilter.value === 'all' || resource.category === resourceCategoryFilter.value,
  ))
  let roomChannel: RealtimeChannel | null = null
  let groupChannel: RealtimeChannel | null = null
  let connectionVersion = 0
  let focusInterval: ReturnType<typeof globalThis.setInterval> | null = null

  async function loadGroups () {
    try {
      groups.value = await getStudyGroups()
      if (!groups.value.some(group => group.id === activeGroupId.value)) activeGroupId.value = groups.value[0]?.id ?? ''
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not load your study groups.')
    }
  }

  async function createGroup () {
    groupError.value = ''
    const name = newGroupName.value.trim()
    const course = normalizeCourse(newGroupCourse.value)
    if (!name || !course) return
    creatingGroup.value = true
    try {
      const group = await createGroupRecord({ name, course, description: newGroupDescription.value.trim() })
      groups.value.unshift(group)
      activeGroupId.value = group.id
      showCreateGroup.value = false
      newGroupName.value = ''
      newGroupDescription.value = ''
      groupNotice.value = 'Your group is ready. Copy the invite code and share it with the classmates you want to join.'
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not create the study group.')
    } finally {
      creatingGroup.value = false
    }
  }

  async function joinGroup () {
    groupError.value = ''
    groupNotice.value = ''
    if (!inviteCodeInput.value.trim()) {
      groupError.value = 'Paste the invitation code or open the group invite link first.'
      return
    }
    joiningGroup.value = true
    try {
      const joined = await joinStudyGroup(inviteCodeInput.value)
      await loadGroups()
      if (joined) {
        activeGroupId.value = joined.id
        groupNotice.value = `You joined ${joined.name}. Say hello and agree on a study goal.`
      }
      inviteCodeInput.value = ''
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not join this group. Ask for a fresh invitation.')
    } finally {
      joiningGroup.value = false
    }
  }

  async function copyGroupInvite () {
    if (!activeGroup.value) return
    const inviteUrl = new URL('/study', window.location.origin)
    inviteUrl.searchParams.set('invite', activeGroup.value.invite_code)
    try {
      await navigator.clipboard.writeText(inviteUrl.toString())
      groupNotice.value = 'Invite link copied. Send it directly to the classmates you want in the group.'
    } catch {
      groupNotice.value = `Share this invite code with selected classmates: ${activeGroup.value.invite_code}`
    }
  }

  async function connectGroup (groupId: string) {
    if (groupChannel) await leaveStudyGroup(groupChannel)
    groupChannel = null
    groupPosts.value = []
    if (!groupId) return
    loadingGroupPosts.value = true
    try {
      groupPosts.value = await getStudyGroupPosts(groupId)
      groupChannel = subscribeToStudyGroup(groupId, post => {
        if (!groupPosts.value.some(existing => existing.id === post.id)) groupPosts.value.push(post)
      })
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not open this group. Check that you are still a member.')
    } finally {
      loadingGroupPosts.value = false
    }
  }

  async function postToGroup () {
    if (!activeGroupId.value || !groupPostText.value.trim()) return
    sendingGroupPost.value = true
    groupError.value = ''
    try {
      const post = await sendStudyGroupPost(activeGroupId.value, groupPostType.value, groupPostText.value)
      if (!groupPosts.value.some(existing => existing.id === post.id)) groupPosts.value.push(post)
      groupPostText.value = ''
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not post to the study group.')
    } finally {
      sendingGroupPost.value = false
    }
  }

  function formatFocusTime (seconds: number) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const remainder = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainder}`
  }

  function toggleFocusTimer () {
    if (focusRunning.value) {
      if (focusInterval !== null) globalThis.clearInterval(focusInterval)
      focusInterval = null
      focusRunning.value = false
      return
    }

    if (focusRemaining.value === 0) focusRemaining.value = focusDurationSeconds
    focusRunning.value = true
    focusInterval = globalThis.setInterval(() => {
      if (focusRemaining.value <= 1) {
        focusRemaining.value = 0
        focusRunning.value = false
        if (focusInterval !== null) globalThis.clearInterval(focusInterval)
        focusInterval = null
      } else {
        focusRemaining.value--
      }
    }, 1000)
  }

  function resetFocusTimer () {
    if (focusInterval !== null) globalThis.clearInterval(focusInterval)
    focusInterval = null
    focusRemaining.value = focusDurationSeconds
    focusRunning.value = false
  }

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
    await loadGroups()
    if (inviteCodeInput.value) await joinGroup()
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

  watch(activeGroupId, groupId => { void connectGroup(groupId) })

  onBeforeUnmount(() => {
    connectionVersion++
    if (focusInterval !== null) globalThis.clearInterval(focusInterval)
    if (groupChannel) void leaveStudyGroup(groupChannel)
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

  .study-section-nav {
    position: sticky;
    z-index: 3;
    top: 8px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin: 0 0 22px;
    border: 1px solid #e3e9e2;
    border-radius: 999px;
    padding: 8px;
    background: rgb(255 254 250 / 94%);
    box-shadow: 0 8px 24px rgb(37 58 47 / 7%);
    scrollbar-width: none;
  }

  .study-section-nav::-webkit-scrollbar { display: none; }

  .study-section-nav a {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 8px 13px;
    color: #37574b;
    font-size: 0.82rem;
    font-weight: 650;
    text-decoration: none;
  }

  .study-section-nav a:hover,
  .study-section-nav a:focus-visible {
    background: #e9f1e9;
    outline: 2px solid #74977b;
    outline-offset: 1px;
  }

  #study-groups, #course-room, #course-resources, #study-guidance { scroll-margin-top: 88px; }

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
  .community-note,
  .guide-card,
  .group-card,
  .focus-card {
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

  .discussion-starters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
    color: #718085;
    font-size: 0.78rem;
  }

  .discussion-starters > span {
    margin-right: 2px;
    font-weight: 650;
  }

  .focus-card {
    overflow: hidden;
    border-color: #286354;
    background:
      radial-gradient(circle at 100% 0%, rgb(224 190 104 / 22%), transparent 12rem),
      linear-gradient(145deg, #17483e, #23614f);
    color: #fff;
  }

  .focus-card .section-kicker {
    color: #cbdccf;
  }

  .focus-card :deep(.v-field__outline) {
    color: rgb(255 255 255 / 40%);
  }

  .focus-card :deep(.v-field__input),
  .focus-card :deep(.v-label) {
    color: #fff;
  }

  .focus-timer {
    margin-top: 12px;
    color: #f0d68d;
    font-size: 3rem;
    font-variant-numeric: tabular-nums;
    font-weight: 750;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .focus-caption,
  .focus-complete {
    margin: 10px 0 0;
    color: #e0ece5;
    font-size: 0.82rem;
    line-height: 1.55;
  }

  .groups-section {
    margin-bottom: 28px;
  }

  .groups-heading-row {
    display: flex;
    min-height: 150px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 18px;
    border: 1px solid #dce8dd;
    border-radius: 24px;
    padding: 20px 28px;
    background: linear-gradient(112deg, #eff5ed 0%, #fbfaf3 62%, #edf4ef 100%);
  }

  .groups-heading-row h2 {
    margin: 7px 0 5px;
    color: #203a4a;
    font-size: clamp(1.3rem, 2.7vw, 1.85rem);
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  .groups-heading-row p {
    max-width: 700px;
    margin: 0;
    color: #748187;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .group-art {
    width: 130px;
    height: 120px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .group-card {
    border-color: #dfe8df;
  }

  .group-actions,
  .create-group-actions,
  .active-group-summary,
  .group-post-meta,
  .group-safety-note {
    display: flex;
    align-items: center;
  }

  .group-actions {
    flex-wrap: wrap;
    gap: 12px;
  }

  .invite-input {
    min-width: min(100%, 280px);
    flex: 1;
  }

  .create-group-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
    margin-top: 20px;
    border-radius: 16px;
    padding: 17px;
    background: #f5f8f3;
  }

  .create-group-form > :nth-child(3) {
    grid-column: 1 / -1;
  }

  .create-group-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    gap: 8px;
  }

  .group-workspace {
    display: grid;
    gap: 14px;
  }

  .group-picker {
    max-width: 520px;
  }

  .active-group-summary {
    justify-content: space-between;
    gap: 14px;
    border-radius: 15px;
    padding: 13px 16px;
    background: #f1f6f0;
  }

  .active-group-summary > div {
    display: grid;
    min-width: 0;
    gap: 3px;
  }

  .active-group-summary strong {
    color: #294453;
    font-size: 0.95rem;
  }

  .active-group-summary span {
    color: #718085;
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  .group-post-list {
    display: flex;
    min-height: 130px;
    max-height: 420px;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    padding: 4px;
  }

  .group-empty {
    display: grid;
    min-height: 145px;
    align-content: center;
    justify-items: center;
    gap: 7px;
    color: #718085;
    text-align: center;
  }

  .group-empty .v-icon {
    color: #638874;
  }

  .group-empty strong {
    color: #294453;
  }

  .group-empty span {
    max-width: 560px;
    font-size: 0.82rem;
    line-height: 1.55;
  }

  .groups-first-empty {
    min-height: 180px;
  }

  .group-post {
    max-width: min(94%, 850px);
    align-self: flex-start;
    border: 1px solid #e2e9df;
    border-radius: 15px;
    padding: 12px 15px;
    background: #f7f9f5;
  }

  .group-post-question,
  .group-post-practice {
    border-color: #d6e5dd;
    background: #f0f6f1;
  }

  .group-post-assignment {
    border-color: #ead9ad;
    background: #fcf8eb;
  }

  .group-post-meta {
    flex-wrap: wrap;
    gap: 8px;
  }

  .group-post-meta strong {
    color: #294453;
    font-size: 0.83rem;
  }

  .group-post-meta time {
    margin-left: auto;
    color: #78868a;
    font-size: 0.7rem;
  }

  .group-post p {
    margin: 8px 0 0;
    color: #40545f;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .group-post-form {
    display: flex;
    align-items: flex-end;
    gap: 11px;
    border-top: 1px solid #e7ece5;
    padding-top: 14px;
  }

  .group-post-type {
    max-width: 180px;
    flex: 0 0 180px;
  }

  .group-post-text {
    flex: 1;
  }

  .group-safety-note {
    gap: 6px;
    margin: 0;
    color: #718085;
    font-size: 0.75rem;
  }

  .guide-card {
    border-color: #e2e9df;
    background: linear-gradient(150deg, #fffefa, #f4f7f1);
  }

  .guide-card h3 {
    margin-bottom: 12px;
    color: #294453;
    font-size: 1.08rem;
    font-weight: 750;
  }

  .guide-art {
    display: block;
    width: 100%;
    max-height: 145px;
    margin: -7px auto 12px;
    object-fit: contain;
  }

  .study-routine {
    display: grid;
    gap: 12px;
    margin: 0;
    padding-left: 20px;
    color: #638874;
  }

  .study-routine li {
    padding-left: 3px;
  }

  .study-routine strong,
  .study-routine span {
    display: block;
  }

  .study-routine strong {
    color: #294453;
    font-size: 0.82rem;
  }

  .study-routine span {
    margin-top: 3px;
    color: #718085;
    font-size: 0.77rem;
    line-height: 1.5;
  }

  .focus-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 14px;
  }

  .focus-actions :deep(.v-btn--icon) {
    color: #fff;
  }

  .focus-complete {
    color: #f0d68d;
    font-weight: 650;
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

    .groups-heading-row {
      padding: 18px;
    }

    .group-art {
      width: 96px;
      height: 90px;
    }

    .group-post-form {
      align-items: stretch;
      flex-direction: column;
    }

    .group-post-type {
      width: 100%;
      max-width: none;
      flex-basis: auto;
    }

    .group-post-form > :deep(.v-btn) {
      align-self: flex-end;
    }

    .active-group-summary {
      align-items: flex-start;
      flex-direction: column;
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

    .groups-heading-row {
      align-items: flex-start;
    }

    .group-art {
      width: 72px;
      height: 72px;
    }

    .group-actions > :deep(.v-btn) {
      width: 100%;
    }

    .invite-input {
      min-width: 100%;
    }

    .create-group-form {
      grid-template-columns: 1fr;
      padding-inline: 10px;
    }

    .create-group-form > :nth-child(3),
    .create-group-actions {
      grid-column: auto;
    }

    .group-post {
      max-width: 100%;
    }

    .group-safety-note {
      align-items: flex-start;
    }
  }
</style>
