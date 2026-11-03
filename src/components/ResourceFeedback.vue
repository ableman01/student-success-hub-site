<template>
  <div v-if="viewerId && resource.status === 'approved'" class="resource-feedback">
    <v-btn
      :append-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
      :aria-controls="`resource-feedback-${resource.id}`"
      :aria-expanded="expanded"
      block
      class="feedback-toggle"
      color="secondary"
      prepend-icon="mdi-comment-text-outline"
      rounded="lg"
      variant="tonal"
      @click="expanded = !expanded"
    >
      Add a comment or review
    </v-btn>

    <v-expand-transition>
      <section v-if="expanded" :id="`resource-feedback-${resource.id}`" class="feedback-form">
        <p class="text-body-2 text-medium-emphasis">
          Share a comment or report an issue. Your feedback is sent to the admin for review.
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
      </section>
    </v-expand-transition>

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

  const expanded = ref(false)
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

  .feedback-toggle {
    min-height: 48px;
    justify-content: flex-start;
    padding-inline: 14px;
  }

  .feedback-form {
    display: grid;
    gap: 14px;
    padding: 14px;
  }

  .feedback-form p { margin: 0; }
</style>
