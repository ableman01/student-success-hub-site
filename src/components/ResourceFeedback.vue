<template>
  <div v-if="viewerId && resource.status === 'approved' && viewerId !== resource.uploaded_by">
    <v-btn
      block
      class="mt-2"
      prepend-icon="mdi-comment-alert-outline"
      rounded="pill"
      variant="text"
      @click="dialogOpen = true"
    >Comment or report</v-btn>

    <v-dialog v-model="dialogOpen" max-width="520">
      <v-card class="pa-5" rounded="xl">
        <h2 class="text-h5 mb-2">Comment or report this upload</h2>

        <p class="text-body-2 text-medium-emphasis mb-4">
          Send feedback to the admin review page. Please include enough detail for the team to follow up.
        </p>

        <v-select
          v-model="reason"
          :items="feedbackOptions"
          label="Feedback type"
          required
        />

        <v-textarea
          v-model="details"
          auto-grow
          counter="1000"
          label="Comment or issue details"
          maxlength="1000"
          required
          rows="3"
        />

        <v-alert v-if="errorMessage" class="mb-3" type="error" variant="tonal">
          {{ errorMessage }}
        </v-alert>

        <div class="d-flex justify-end ga-2">
          <v-btn rounded="pill" variant="text" @click="dialogOpen = false">Cancel</v-btn>

          <v-btn
            color="primary"
            :disabled="!details.trim()"
            :loading="submitting"
            rounded="pill"
            @click="sendFeedback"
          >Send to admin</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successOpen" color="success" timeout="3000">
      Your feedback was sent to the admin review page.
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { getErrorMessage } from '@/lib/errors'
  import { reportResource, type Resource, type ResourceReportReason } from '@/services/resources'

  const props = defineProps<{
    resource: Resource
    viewerId?: string
  }>()

  const dialogOpen = ref(false)
  const successOpen = ref(false)
  const submitting = ref(false)
  const errorMessage = ref('')
  const reason = ref<ResourceReportReason>('comment')
  const details = ref('')
  const feedbackOptions = [
    { title: 'General comment', value: 'comment' },
    { title: 'Incorrect details or file', value: 'incorrect' },
    { title: 'Duplicate upload', value: 'duplicate' },
    { title: 'Inappropriate content', value: 'inappropriate' },
  ]

  async function sendFeedback () {
    if (!details.value.trim()) return
    submitting.value = true
    errorMessage.value = ''
    try {
      await reportResource(props.resource.id, reason.value, details.value)
      dialogOpen.value = false
      successOpen.value = true
      details.value = ''
      reason.value = 'comment'
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not send your feedback.')
    } finally {
      submitting.value = false
    }
  }
</script>
