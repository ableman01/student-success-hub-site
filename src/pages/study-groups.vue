<template>
  <main class="groups-page">
    <v-container class="groups-shell py-5 py-md-8" fluid>
      <header class="page-header">
        <RouterLink aria-label="LASU Student Success Hub home" class="brand" to="/">
          <img alt="" src="/academic-mark.svg">
          <span><strong>LASU Student Success Hub</strong><small>Learn together. Go further.</small></span>
        </RouterLink>
        <div class="header-actions">
          <v-btn rounded="pill" to="/study" variant="text" prepend-icon="mdi-forum-outline">Live course chat</v-btn>
          <v-btn rounded="pill" to="/dashboard" variant="tonal">My dashboard</v-btn>
        </div>
      </header>

      <section class="groups-hero">
        <div class="hero-copy">
          <div class="eyebrow"><v-icon size="17">mdi-account-group-outline</v-icon> YOUR PRIVATE STUDY SPACE</div>
          <h1>Better together.<br><span>One question at a time.</span></h1>
          <p>Create a focused group, invite classmates you trust, and share messages or photos of your worked solutions as you study.</p>
          <div class="hero-actions">
            <v-btn color="primary" prepend-icon="mdi-account-multiple-plus" rounded="pill" size="large" @click="showCreateGroup = !showCreateGroup">Create a study group</v-btn>
            <span><v-icon size="17">mdi-lock-outline</v-icon> Private to group members</span>
          </div>
        </div>
        <div class="hero-visual"><div class="visual-glow"></div><img src="/study-together.svg" alt="Classmates studying together"></div>
      </section>

      <v-alert v-if="groupError" class="notice" closable type="error" variant="tonal" @click:close="groupError = ''">{{ groupError }}</v-alert>
      <v-alert v-if="groupNotice" class="notice" closable type="success" variant="tonal" @click:close="groupNotice = ''">{{ groupNotice }}</v-alert>

      <v-expand-transition>
        <v-card v-if="showCreateGroup" class="create-card pa-5 pa-md-7" rounded="xl">
          <div class="card-heading"><div><div class="eyebrow">GET STARTED</div><h2>Create your group</h2><p>Give your study circle a name and course. You can invite classmates as soon as it’s ready.</p></div><v-btn aria-label="Close form" icon="mdi-close" variant="text" @click="showCreateGroup = false" /></div>
          <v-form class="create-form" @submit.prevent="createGroup">
            <v-text-field v-model="newGroupName" label="Group name" maxlength="80" placeholder="BIO 101 revision circle" prepend-inner-icon="mdi-account-group-outline" required variant="outlined" />
            <v-text-field v-model="newGroupCourse" label="Course" maxlength="80" placeholder="BIO 101" prepend-inner-icon="mdi-book-open-variant" required variant="outlined" />
            <v-text-field v-model="newGroupDescription" label="Study goal (optional)" maxlength="300" placeholder="Solve past questions together" prepend-inner-icon="mdi-target" variant="outlined" />
            <div class="form-actions"><v-btn :loading="creatingGroup" color="primary" prepend-icon="mdi-check" rounded="pill" size="large" type="submit">Create and open group</v-btn><v-btn rounded="pill" variant="text" @click="showCreateGroup = false">Cancel</v-btn></div>
          </v-form>
        </v-card>
      </v-expand-transition>

      <section class="group-content">
        <div class="section-heading"><div><div class="eyebrow">YOUR STUDY CIRCLES</div><h2>Groups and conversations</h2><p>Open a group to catch up, post a question, or share a photo of your solution.</p></div><v-chip color="primary" prepend-icon="mdi-account-group" variant="tonal">{{ groups.length }} {{ groups.length === 1 ? 'group' : 'groups' }}</v-chip></div>

        <v-card class="invite-card pa-4 pa-md-5" rounded="xl">
          <div class="invite-icon"><v-icon>mdi-link-variant</v-icon></div>
          <div class="invite-copy"><strong>Joining a classmate’s group?</strong><span>Paste their invitation link or code below.</span></div>
          <v-text-field v-model="inviteCodeInput" class="invite-field" density="comfortable" hide-details label="Invite link or code" prepend-inner-icon="mdi-key-link" variant="outlined" @keydown.enter.prevent="joinGroup" />
          <v-btn :loading="joiningGroup" color="primary" rounded="pill" @click="joinGroup">Join group</v-btn>
        </v-card>

        <div v-if="groups.length" class="group-list">
          <v-card v-for="group in groups" :key="group.id" class="group-card" rounded="xl" variant="outlined">
            <div class="group-heading">
              <button class="group-toggle" :aria-expanded="expandedGroupIds.includes(group.id)" @click="toggleGroup(group.id)">
                <span class="group-avatar"><v-icon>mdi-account-group</v-icon></span>
                <span class="group-title"><strong>{{ group.name }}</strong><small>{{ group.course }}<template v-if="group.description"> · {{ group.description }}</template></small></span>
                <v-icon class="expand-icon">{{ expandedGroupIds.includes(group.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </button>
              <div class="group-actions">
                <v-btn :aria-label="`Copy invitation for ${group.name}`" color="primary" icon="mdi-share-variant-outline" rounded="pill" variant="tonal" @click="copyGroupInvite(group)" />
                <v-btn :aria-label="group.owner_id === currentUserId ? `Delete ${group.name}` : `Leave ${group.name}`" :color="group.owner_id === currentUserId ? 'error' : 'secondary'" :disabled="!currentUserId" :icon="group.owner_id === currentUserId ? 'mdi-trash-can-outline' : 'mdi-logout'" rounded="pill" variant="text" @click="groupToRemove = group" />
              </div>
            </div>
            <div v-if="expandedGroupIds.includes(group.id)" class="group-body">
              <v-progress-linear v-if="loadingGroupIds.includes(group.id)" class="my-3" color="primary" indeterminate rounded />
              <div v-else class="post-list" aria-live="polite">
                <div v-if="!groupPostsById[group.id]?.length" class="empty-chat"><span class="empty-icon"><v-icon>mdi-message-text-outline</v-icon></span><strong>Start the conversation</strong><span>Ask a question or share a solved problem with your group.</span></div>
                <article v-for="post in groupPostsById[group.id] || []" :key="post.id" class="group-post">
                  <div class="post-meta"><strong>{{ post.sender_name }}</strong><v-chip size="x-small" variant="tonal">{{ groupPostLabels[post.post_type] }}</v-chip><time :datetime="post.created_at">{{ formatTime(post.created_at) }}</time></div>
                  <p v-if="post.content" class="post-content">{{ post.content }}</p>
                  <a v-if="post.image_url" :href="post.image_url" target="_blank" rel="noopener noreferrer" class="post-image-link"><img :src="post.image_url" alt="Image shared in the group chat" class="post-image"></a>
                </article>
              </div>
              <v-form class="post-composer" @submit.prevent="postToGroup(group)">
                <v-select v-model="groupPostTypes[group.id]" class="post-type" hide-details item-title="title" item-value="value" :items="groupPostOptions" label="Post type" variant="outlined" />
                <v-textarea v-model="groupDrafts[group.id]" auto-grow class="post-input" hide-details label="Write a message or describe your solution" maxlength="2000" rows="2" variant="outlined" />
                <div class="composer-actions"><v-file-input v-model="groupImages[group.id]" accept="image/jpeg,image/png,image/webp,image/gif" class="image-input" density="comfortable" hide-details label="Add a solution photo (max 5 MB)" prepend-icon="mdi-image-plus-outline" show-size variant="outlined" /><v-btn color="primary" :disabled="!(groupDrafts[group.id] || '').trim() && !groupImages[group.id]" :loading="sendingGroupId === group.id" prepend-icon="mdi-send" rounded="pill" size="large" type="submit">Send message</v-btn></div>
              </v-form>
            </div>
          </v-card>
          <p class="privacy-note"><v-icon size="17">mdi-shield-check-outline</v-icon> Group conversations and shared images are visible to group members.</p>
        </div>

        <v-card v-else class="empty-groups pa-8 pa-md-12" rounded="xl">
          <span class="empty-icon large"><v-icon>mdi-account-multiple-plus-outline</v-icon></span>
          <h3>Your study circle starts here</h3><p>Create a private group for your classmates, or join one with an invitation link or code.</p>
          <v-btn class="mt-2" color="primary" prepend-icon="mdi-plus" rounded="pill" @click="showCreateGroup = true">Create your first group</v-btn>
        </v-card>
      </section>

      <v-dialog :model-value="Boolean(groupToRemove)" max-width="440" @update:model-value="value => { if (!value) groupToRemove = null }">
        <v-card rounded="xl"><v-card-title>{{ groupToRemove?.owner_id === currentUserId ? 'Delete this group?' : 'Leave this group?' }}</v-card-title><v-card-text><template v-if="groupToRemove?.owner_id === currentUserId">“{{ groupToRemove?.name }}” and its discussion will be permanently deleted for every member.</template><template v-else>You will lose access to “{{ groupToRemove?.name }}”. You can rejoin with an invite link.</template></v-card-text><v-card-actions class="pa-4 pt-0"><v-spacer /><v-btn rounded="pill" variant="text" @click="groupToRemove = null">Cancel</v-btn><v-btn :color="groupToRemove?.owner_id === currentUserId ? 'error' : 'primary'" :loading="Boolean(groupToRemove && removingGroupId === groupToRemove.id)" rounded="pill" @click="removeGroup">{{ groupToRemove?.owner_id === currentUserId ? 'Delete group' : 'Leave group' }}</v-btn></v-card-actions></v-card>
      </v-dialog>

      <footer class="page-footer"><span>Need the open course discussion?</span><v-btn rounded="pill" to="/study" variant="text">Return to live course chat<v-icon end>mdi-arrow-right</v-icon></v-btn></footer>
    </v-container>
  </main>
</template>

<script setup lang="ts">
  import type { GroupPostType, StudyGroup, StudyGroupPost } from '@/services/study'
  import type { RealtimeChannel } from '@supabase/supabase-js'
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { getCurrentUser } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'
  import { createStudyGroup as createGroupRecord, deleteStudyGroup, getStudyGroupPosts, getStudyGroups, joinStudyGroup, leaveStudyGroup, leaveStudyGroupMembership, sendStudyGroupPost, subscribeToStudyGroup } from '@/services/study'

  const route = useRoute()
  const groups = ref<StudyGroup[]>([])
  const currentUserId = ref('')
  const expandedGroupIds = ref<string[]>([])
  const groupPostsById = ref<Record<string, StudyGroupPost[]>>({})
  const loadingGroupIds = ref<string[]>([])
  const groupDrafts = ref<Record<string, string>>({})
  const groupImages = ref<Record<string, File | File[] | null>>({})
  const groupPostTypes = ref<Record<string, GroupPostType>>({})
  const groupToRemove = ref<StudyGroup | null>(null)
  const removingGroupId = ref('')
  const groupError = ref('')
  const groupNotice = ref('')
  const inviteCodeInput = ref(typeof route.query.invite === 'string' ? route.query.invite : '')
  const showCreateGroup = ref(false)
  const newGroupName = ref('')
  const newGroupCourse = ref(typeof route.query.course === 'string' ? route.query.course.trim().slice(0, 80) : '')
  const newGroupDescription = ref('')
  const creatingGroup = ref(false)
  const joiningGroup = ref(false)
  const sendingGroupId = ref('')
  const groupPostOptions = [
    { title: 'Discussion', value: 'discussion' },
    { title: 'Past question', value: 'question' },
    { title: 'Assignment', value: 'assignment' },
    { title: 'Practice problem', value: 'practice' },
  ]
  const groupPostLabels: Record<GroupPostType, string> = { discussion: 'Discussion', question: 'Past question', assignment: 'Assignment', practice: 'Practice problem' }
  const groupChannels = new Map<string, RealtimeChannel>()

  async function loadGroups () {
    try {
      groups.value = await getStudyGroups()
      const validIds = new Set(groups.value.map(group => group.id))
      expandedGroupIds.value = expandedGroupIds.value.filter(id => validIds.has(id))
      for (const group of groups.value) groupPostTypes.value[group.id] ||= 'discussion'
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not load your study groups.')
    }
  }

  async function createGroup () {
    groupError.value = ''
    const name = newGroupName.value.trim()
    const course = newGroupCourse.value.trim().slice(0, 80)
    if (!name || !course) return
    creatingGroup.value = true
    try {
      const group = await createGroupRecord({ name, course, description: newGroupDescription.value.trim() })
      groups.value.unshift(group)
      groupPostTypes.value[group.id] = 'discussion'
      await expandGroup(group.id)
      showCreateGroup.value = false
      newGroupName.value = ''
      newGroupDescription.value = ''
      groupNotice.value = 'Your group is ready. Share its invitation link with the classmates you want to join.'
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
      groupError.value = 'Paste an invitation link or code to join a group.'
      return
    }
    joiningGroup.value = true
    try {
      const joined = await joinStudyGroup(inviteCodeInput.value)
      await loadGroups()
      if (joined) {
        await expandGroup(joined.id)
        groupNotice.value = `You joined ${joined.name}. Say hello and agree on a study goal.`
      }
      inviteCodeInput.value = ''
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not join this group. Check the invitation with your classmate.')
    } finally {
      joiningGroup.value = false
    }
  }

  async function copyGroupInvite (group: StudyGroup) {
    const inviteUrl = new URL('/study-groups', window.location.origin)
    inviteUrl.searchParams.set('invite', group.invite_code)
    try {
      await navigator.clipboard.writeText(inviteUrl.toString())
      groupNotice.value = 'Invite link copied. Send it to the classmates you want in the group.'
    } catch {
      groupNotice.value = `Share this invite code with selected classmates: ${group.invite_code}`
    }
  }

  async function expandGroup (groupId: string) {
    if (!expandedGroupIds.value.includes(groupId)) expandedGroupIds.value.push(groupId)
    if (groupPostsById.value[groupId]) {
      if (!groupChannels.has(groupId)) subscribeGroup(groupId)
      return
    }
    if (loadingGroupIds.value.includes(groupId)) return
    loadingGroupIds.value.push(groupId)
    try {
      groupPostsById.value[groupId] = await getStudyGroupPosts(groupId)
      if (expandedGroupIds.value.includes(groupId)) subscribeGroup(groupId)
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not open this group. Check that you are still a member.')
      expandedGroupIds.value = expandedGroupIds.value.filter(id => id !== groupId)
    } finally {
      loadingGroupIds.value = loadingGroupIds.value.filter(id => id !== groupId)
    }
  }

  function subscribeGroup (groupId: string) {
    groupChannels.set(groupId, subscribeToStudyGroup(groupId, post => {
      const posts = groupPostsById.value[groupId] || []
      if (!posts.some(existing => existing.id === post.id)) groupPostsById.value[groupId] = [...posts, post]
    }))
  }

  async function toggleGroup (groupId: string) {
    if (!expandedGroupIds.value.includes(groupId)) {
      await expandGroup(groupId)
      return
    }
    expandedGroupIds.value = expandedGroupIds.value.filter(id => id !== groupId)
    const channel = groupChannels.get(groupId)
    if (channel) {
      await leaveStudyGroup(channel)
      groupChannels.delete(groupId)
    }
  }

  async function postToGroup (group: StudyGroup) {
    const content = (groupDrafts.value[group.id] || '').trim()
    const selected = groupImages.value[group.id]
    const image = Array.isArray(selected) ? selected[0] : selected
    if (!content && !image) return
    sendingGroupId.value = group.id
    groupError.value = ''
    try {
      const post = await sendStudyGroupPost(group.id, groupPostTypes.value[group.id] || 'discussion', content, image)
      const posts = groupPostsById.value[group.id] || []
      if (!posts.some(existing => existing.id === post.id)) groupPostsById.value[group.id] = [...posts, post]
      groupDrafts.value[group.id] = ''
      groupImages.value[group.id] = null
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not post to the study group.')
    } finally {
      sendingGroupId.value = ''
    }
  }

  async function removeGroup () {
    const group = groupToRemove.value
    if (!group) return
    removingGroupId.value = group.id
    groupError.value = ''
    try {
      if (group.owner_id === currentUserId.value) await deleteStudyGroup(group.id)
      else await leaveStudyGroupMembership(group.id)
      const channel = groupChannels.get(group.id)
      if (channel) await leaveStudyGroup(channel)
      groupChannels.delete(group.id)
      groups.value = groups.value.filter(item => item.id !== group.id)
      expandedGroupIds.value = expandedGroupIds.value.filter(id => id !== group.id)
      const nextPosts = { ...groupPostsById.value }
      delete nextPosts[group.id]
      groupPostsById.value = nextPosts
      groupNotice.value = group.owner_id === currentUserId.value ? `${group.name} was deleted.` : `You left ${group.name}.`
      groupToRemove.value = null
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Could not update this group. Please try again.')
    } finally {
      removingGroupId.value = ''
    }
  }

  async function closeGroupChannels () {
    const channels = [...groupChannels.values()]
    groupChannels.clear()
    await Promise.all(channels.map(channel => leaveStudyGroup(channel)))
  }

  function formatTime (date: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
  }

  onMounted(async () => {
    try {
      currentUserId.value = (await getCurrentUser())?.id || ''
    } catch (error) {
      groupError.value = getErrorMessage(error, 'Your profile could not be checked. Reload or sign in again before managing a group.')
    }
    await loadGroups()
    if (inviteCodeInput.value) await joinGroup()
  })

  onBeforeUnmount(() => { void closeGroupChannels() })
</script>

<style scoped>
  .groups-page { min-height: 100vh; background: radial-gradient(ellipse at 8% 2%, rgb(221 238 231 / 56%), transparent 32rem), #f4f6f2; color: #20382f; }
  .groups-shell { max-width: 1180px; }
  .page-header, .brand, .header-actions, .hero-actions, .section-heading, .card-heading, .invite-card, .group-heading, .group-actions, .post-meta, .composer-actions, .page-footer { display: flex; align-items: center; }
  .page-header, .section-heading, .card-heading, .group-heading, .page-footer { justify-content: space-between; }
  .page-header { gap: 18px; }
  .brand { gap: 12px; color: inherit; text-decoration: none; }
  .brand img { width: 45px; height: 45px; }
  .brand span, .group-title, .invite-copy { display: grid; gap: 3px; }
  .brand strong { font-size: 15px; }
  .brand small { color: #728078; font-size: 12px; }
  .header-actions { gap: 8px; }
  .groups-hero { display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: 32px; margin: 36px 0 28px; overflow: hidden; border: 1px solid #e0e8df; border-radius: 28px; padding: clamp(26px, 5vw, 56px); background: linear-gradient(120deg, #fff 0%, #f7faf5 65%, #eaf2e9 100%); box-shadow: 0 14px 40px rgb(36 62 49 / 6%); }
  .eyebrow { display: flex; align-items: center; gap: 7px; color: #668274; font-size: 11px; font-weight: 800; letter-spacing: .13em; }
  .hero-copy h1 { margin: 14px 0; color: #183c30; font-size: clamp(34px, 5vw, 54px); font-weight: 760; letter-spacing: -.045em; line-height: 1.06; }
  .hero-copy h1 span { color: #708e7e; }
  .hero-copy > p, .section-heading p, .card-heading p { max-width: 610px; margin: 0; color: #66766e; font-size: 15px; line-height: 1.7; }
  .hero-actions { flex-wrap: wrap; gap: 18px; margin-top: 24px; }
  .hero-actions > span { display: inline-flex; align-items: center; gap: 6px; color: #698074; font-size: 13px; }
  .hero-visual { position: relative; display: grid; place-items: center; min-height: 250px; }
  .hero-visual img { position: relative; z-index: 1; width: min(100%, 340px); max-height: 280px; object-fit: contain; }
  .visual-glow { position: absolute; width: 250px; height: 250px; border-radius: 50%; background: #dcebdd; filter: blur(2px); }
  .notice { margin-bottom: 16px; }
  .create-card { margin-bottom: 26px; border: 1px solid #e1e8df; box-shadow: 0 12px 32px rgb(36 62 49 / 6%); }
  .card-heading { align-items: flex-start; gap: 16px; margin-bottom: 20px; }
  .card-heading h2, .section-heading h2 { margin: 6px 0; color: #203d32; font-size: clamp(22px, 3vw, 29px); letter-spacing: -.025em; }
  .card-heading p { font-size: 14px; }
  .create-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; }
  .create-form > :nth-child(3) { grid-column: 1 / -1; }
  .form-actions { display: flex; align-items: center; gap: 8px; grid-column: 1 / -1; }
  .section-heading { align-items: flex-end; gap: 16px; margin: 36px 0 18px; }
  .section-heading p { font-size: 14px; }
  .invite-card { flex-wrap: wrap; gap: 14px; margin-bottom: 18px; border: 1px solid #e1e8df; background: #fff; box-shadow: 0 8px 24px rgb(36 62 49 / 4%); }
  .invite-icon, .group-avatar, .empty-icon { display: grid; flex: 0 0 auto; place-items: center; color: #537b68; background: #eaf2eb; }
  .invite-icon { width: 46px; height: 46px; border-radius: 15px; }
  .invite-copy { min-width: 170px; flex: 1; }
  .invite-copy strong { color: #28483a; font-size: 14px; }
  .invite-copy span { color: #78857e; font-size: 12px; }
  .invite-field { flex: 1 1 220px; max-width: 340px; }
  .group-list { display: grid; gap: 14px; }
  .group-card { overflow: hidden; border-color: #dfe7df; background: #fff; box-shadow: 0 8px 24px rgb(36 62 49 / 4%); }
  .group-heading { min-height: 82px; gap: 10px; padding: 14px 18px; }
  .group-toggle { display: flex; flex: 1; min-width: 0; align-items: center; gap: 13px; border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; }
  .group-avatar { width: 48px; height: 48px; border-radius: 16px; }
  .group-title { min-width: 0; }
  .group-title strong { overflow: hidden; color: #234335; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
  .group-title small { overflow: hidden; color: #748178; text-overflow: ellipsis; white-space: nowrap; }
  .expand-icon { margin-left: auto; color: #7a8b80; }
  .group-actions { gap: 4px; }
  .group-body { border-top: 1px solid #edf0eb; padding: 18px; background: #fcfdfb; }
  .post-list { display: grid; gap: 12px; max-height: 520px; overflow-y: auto; padding: 2px 2px 16px; }
  .group-post { max-width: min(780px, 92%); border: 1px solid #e2e9e1; border-radius: 16px; padding: 14px 16px; background: #fff; box-shadow: 0 3px 12px rgb(36 62 49 / 3%); }
  .post-meta { flex-wrap: wrap; gap: 8px; }
  .post-meta strong { color: #294b3b; font-size: 13px; }
  .post-meta time { margin-left: auto; color: #89948d; font-size: 11px; }
  .post-content { margin: 10px 0 0; color: #3e5148; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
  .post-image-link { display: block; margin-top: 10px; }
  .post-image { display: block; max-width: min(100%, 480px); max-height: 380px; border-radius: 12px; object-fit: contain; }
  .empty-chat, .empty-groups { display: grid; justify-items: center; gap: 8px; color: #75837b; text-align: center; }
  .empty-chat { padding: 26px 12px; }
  .empty-chat strong { color: #31503f; }
  .empty-chat > span:last-child, .empty-groups p { max-width: 430px; margin: 0; font-size: 13px; line-height: 1.6; }
  .empty-icon { width: 42px; height: 42px; border-radius: 14px; }
  .empty-icon.large { width: 58px; height: 58px; border-radius: 20px; }
  .empty-groups { margin-top: 12px; border: 1px dashed #cfdccf; background: rgb(255 255 255 / 72%); }
  .empty-groups h3 { margin: 4px 0 0; color: #294b3b; font-size: 20px; }
  .post-composer { display: grid; grid-template-columns: minmax(170px, .55fr) minmax(0, 1.45fr); gap: 12px; border-top: 1px solid #e8ede6; padding-top: 16px; }
  .composer-actions { align-items: center; justify-content: flex-end; gap: 12px; grid-column: 1 / -1; }
  .image-input { flex: 1; max-width: 420px; }
  .privacy-note { display: flex; align-items: center; gap: 6px; margin: 0; color: #75857b; font-size: 12px; }
  .page-footer { gap: 10px; margin-top: 36px; border-top: 1px solid #dfe6df; padding: 18px 2px 4px; color: #75837b; font-size: 13px; }
  @media (max-width: 760px) {
    .page-header { align-items: flex-start; flex-direction: column; }
    .header-actions { width: 100%; justify-content: space-between; }
    .groups-hero { grid-template-columns: 1fr; gap: 0; margin-top: 22px; padding: 28px 22px 10px; }
    .hero-visual { min-height: 170px; }
    .hero-visual img { width: 230px; max-height: 190px; }
    .visual-glow { width: 160px; height: 160px; }
    .section-heading { align-items: flex-start; }
    .invite-card { align-items: flex-start; }
    .invite-copy { min-width: calc(100% - 64px); }
    .invite-field { max-width: none; flex-basis: calc(100% - 120px); }
    .group-heading { align-items: flex-start; padding: 13px; }
    .group-actions { flex-direction: column; }
    .group-body { padding: 13px; }
    .post-composer { grid-template-columns: 1fr; gap: 8px; }
    .composer-actions { align-items: stretch; flex-direction: column; }
    .image-input { max-width: none; }
    .composer-actions > .v-btn { align-self: flex-end; }
    .create-form { grid-template-columns: 1fr; }
    .create-form > :nth-child(3), .form-actions { grid-column: auto; }
    .page-footer { align-items: flex-start; flex-direction: column; }
  }
  .v-theme--academicDark .groups-page {
    color: #e2ebeb;
    background:
      radial-gradient(ellipse at 8% 2%, rgb(40 78 69 / 24%), transparent 32rem),
      #101a21;
  }

  .v-theme--academicDark .groups-hero {
    border-color: #30414a;
    background: linear-gradient(120deg, #1b2932 0%, #17242b 65%, #1d2c31 100%);
    box-shadow: 0 14px 40px rgb(0 0 0 / 30%);
  }

  .v-theme--academicDark .hero-copy h1,
  .v-theme--academicDark .card-heading h2,
  .v-theme--academicDark .section-heading h2,
  .v-theme--academicDark .invite-copy strong,
  .v-theme--academicDark .group-title strong,
  .v-theme--academicDark .post-meta strong,
  .v-theme--academicDark .empty-chat strong,
  .v-theme--academicDark .empty-groups h3 {
    color: #e0eae8;
  }

  .v-theme--academicDark .hero-copy h1 span,
  .v-theme--academicDark .brand small,
  .v-theme--academicDark .group-title small,
  .v-theme--academicDark .invite-copy span,
  .v-theme--academicDark .post-meta time,
  .v-theme--academicDark .empty-chat,
  .v-theme--academicDark .empty-groups,
  .v-theme--academicDark .hero-actions > span,
  .v-theme--academicDark .expand-icon {
    color: #a3b1b4;
  }

  .v-theme--academicDark .eyebrow {
    color: #9bc9ad;
  }

  .v-theme--academicDark .hero-copy > p,
  .v-theme--academicDark .section-heading p,
  .v-theme--academicDark .card-heading p {
    color: #a3b1b4;
  }

  .v-theme--academicDark .post-content {
    color: #cfdad9;
  }

  .v-theme--academicDark .visual-glow {
    background: #1f3a35;
  }

  .v-theme--academicDark .invite-card,
  .v-theme--academicDark .group-card,
  .v-theme--academicDark .group-post {
    border-color: #30414a;
    background: #1b2932;
    box-shadow: 0 8px 24px rgb(0 0 0 / 26%);
  }

  .v-theme--academicDark .group-body {
    border-top-color: #30414a;
    background: #17242b;
  }

  .v-theme--academicDark .invite-icon,
  .v-theme--academicDark .group-avatar,
  .v-theme--academicDark .empty-icon {
    color: #9bc9ad;
    background: #23352f;
  }

  .v-theme--academicDark .empty-groups {
    border-color: #2f4049;
    background: rgb(27 41 50 / 72%);
  }

  .v-theme--academicDark .post-composer {
    border-top-color: #30414a;
  }
</style>
