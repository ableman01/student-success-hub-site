<template>
  <div v-if="viewerId && resource.status === 'approved' && viewerId !== resource.uploaded_by" class="resource-feedback">
    <details>
      <summary>
        <v-icon size="18">mdi-comment-alert-outline</v-icon>
        Comment or report this upload
      </summary>

      <div class="feedback-form">
        <p class="text-body-2 text-medium-emphasis">
          Your comment is private to the admin review team and will be attached to this upload.
        </p>

        <v-select
          v-model="reason"
          hide-details="auto"
          :items="feedbackOptions"
          label="Feedback type"
        />

        <v-textarea
          v-model="details"
          auto-grow
          counter="1000"
          hide-details="auto"
          label="Comment or issue details"
          maxlength="1000"
          required
          rows="3"
        />

        <v-alert v-if="errorMessage" type="error" variant="tonal">
          {{ errorMessage }}
        </v-alert>

        <div class="d-flex justify-end">
          <v-btn
            color="primary"
            :disabled="!details.trim()"
            :loading="submitting"
            prepend-icon="mdi-send"
            rounded="pill"
            @click="sendFeedback"
          >Send to admin</v-btn>
        </div>
      </div>
    </details>

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

<style scoped>
  .resource-feedback {
    margin-top: 12px;
    border: 1px solid rgb(var(--v-theme-outline-variant));
    border-radius: 16px;
    background: rgb(var(--v-theme-surface));
  }

  summary {
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 9px;
    padding: 10px 14px;
    color: rgb(var(--v-theme-secondary));
    cursor: pointer;
    font-weight: 650;
    list-style: none;
  }

  summary::-webkit-details-marker { display: none; }
  summary::after { margin-left: auto; content: '＋'; font-size: 18px; }
  details[open] summary::after { content: '−'; }
  summary:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }

  .feedback-form {
    display: grid;
    gap: 14px;
    padding: 0 14px 16px;
  }

  .feedback-form p { margin: 0; }
</style>
