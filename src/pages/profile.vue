<template>
  <main class="profile-page">
    <div class="profile-container">
      <header class="profile-header">
        <div>
          <div class="profile-kicker">
            <v-icon size="16">mdi-account-circle-outline</v-icon>
            MY PROFILE
          </div>
          <h1>My profile</h1>
          <p>Manage your personal information, academic details, and account security.</p>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-arrow-left"
          rounded="pill"
          to="/dashboard"
          variant="tonal"
        >
          Back to dashboard
        </v-btn>
      </header>

      <v-card class="profile-card" elevation="0" rounded="xl">
        <div class="profile-card-header">
          <v-tabs v-model="profileTab" class="profile-tabs" color="primary">
            <v-tab prepend-icon="mdi-account-outline" value="profile">Profile</v-tab>
            <v-tab prepend-icon="mdi-shield-lock-outline" value="security">Security</v-tab>
          </v-tabs>
        </div>

        <v-alert
          v-if="profileMessage"
          class="profile-alert"
          closable
          density="compact"
          :text="profileMessage"
          type="success"
          variant="tonal"
          @click:close="profileMessage = ''"
        />

        <v-alert
          v-if="profileError"
          class="profile-alert"
          closable
          density="compact"
          :text="profileError"
          type="error"
          variant="tonal"
          @click:close="profileError = ''"
        />

        <v-window v-model="profileTab">
          <v-window-item value="profile">
            <v-form @submit.prevent="saveProfile">
              <v-card-text class="profile-form">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileFirstName"
                      color="primary"
                      label="First name"
                      :readonly="!isEditingProfile"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileLastName"
                      color="primary"
                      label="Last name"
                      :readonly="!isEditingProfile"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="profileEmail"
                      color="primary"
                      label="Email address"
                      readonly
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="profileInstitutionType"
                      color="primary"
                      :disabled="!isEditingProfile"
                      :items="institutionTypes"
                      label="Institution category"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="profileInstitution"
                      color="primary"
                      :disabled="!isEditingProfile"
                      :items="institutionOptions"
                      label="Institution"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="profileAcademicLevel"
                      color="primary"
                      :disabled="!isEditingProfile"
                      item-title="title"
                      item-value="value"
                      :items="academicLevels"
                      label="Academic level"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileProgram"
                      color="primary"
                      label="Program of study"
                      :readonly="!isEditingProfile"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
                <p class="profile-hint">
                  Profile details stay locked until you choose Edit profile details. Your email address is permanently locked after account creation.
                  Confirm your current password to save other changes.
                </p>
                <v-text-field
                  v-if="isEditingProfile"
                  v-model="profileCurrentPassword"
                  class="mt-4"
                  color="primary"
                  label="Current password"
                  type="password"
                  variant="outlined"
                />
              </v-card-text>
              <v-card-actions class="profile-actions">
                <v-btn v-if="!isEditingProfile" color="primary" rounded="pill" variant="tonal" @click="beginProfileEdit">Edit profile details</v-btn>
                <template v-else>
                  <v-btn rounded="pill" variant="text" @click="cancelProfileEdit">Cancel</v-btn>
                  <v-btn
                    color="primary"
                    :disabled="!profileCurrentPassword.trim()"
                    :loading="savingProfile"
                    rounded="pill"
                    type="submit"
                    variant="elevated"
                  >
                    Save changes
                  </v-btn>
                </template>
              </v-card-actions>
            </v-form>
          </v-window-item>

          <v-window-item value="security">
            <v-form @submit.prevent="updatePassword">
              <v-card-text class="profile-form">
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="currentPassword"
                      color="primary"
                      label="Current password"
                      required
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="newPassword"
                      color="primary"
                      label="New password"
                      required
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="confirmPassword"
                      color="primary"
                      label="Confirm new password"
                      required
                      type="password"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="profile-actions">
                <v-btn color="primary" :loading="updatingPassword" rounded="pill" type="submit" variant="elevated">Update password</v-btn>
              </v-card-actions>
            </v-form>
          </v-window-item>
        </v-window>
      </v-card>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { academicLevels } from '@/lib/academics'
  import { getDefaultInstitution, getInstitutions, institutionTypes } from '@/lib/institutions'
  import { changePassword, getCurrentUser, updateProfile as updateUserProfile } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'

  const router = useRouter()

  const user = ref<any>(null)
  const profileTab = ref<'profile' | 'security'>('profile')

  const profileFirstName = ref('')
  const profileLastName = ref('')
  const profileEmail = ref('')
  const profileAcademicLevel = ref('')
  const profileInstitutionType = ref('university')
  const profileInstitution = ref(getDefaultInstitution('university'))
  const institutionOptions = computed(() => getInstitutions(profileInstitutionType.value))
  watch(profileInstitutionType, type => {
    if (!getInstitutions(type).some(option => option.value === profileInstitution.value)) {
      profileInstitution.value = getDefaultInstitution(type)
    }
  })
  const profileProgram = ref('')

  const isEditingProfile = ref(false)
  const profileCurrentPassword = ref('')
  const profileMessage = ref('')
  const profileError = ref('')
  const savingProfile = ref(false)

  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const updatingPassword = ref(false)

  function syncProfile () {
    if (!user.value) return
    profileFirstName.value = user.value.firstName || ''
    profileLastName.value = user.value.lastName || ''
    profileEmail.value = user.value.email || ''
    profileAcademicLevel.value = user.value.academicLevel || ''
    profileInstitutionType.value = user.value.institutionType || 'university'
    profileInstitution.value = user.value.institution || getDefaultInstitution('university')
    profileProgram.value = user.value.program || ''
  }

  function beginProfileEdit () {
    isEditingProfile.value = true
    profileCurrentPassword.value = ''
    profileMessage.value = ''
    profileError.value = ''
  }

  function cancelProfileEdit () {
    isEditingProfile.value = false
    profileCurrentPassword.value = ''
    profileMessage.value = ''
    profileError.value = ''
    syncProfile()
  }

  async function saveProfile () {
    if (!user.value) return
    savingProfile.value = true
    profileMessage.value = ''
    profileError.value = ''
    try {
      await updateUserProfile({
        currentPassword: profileCurrentPassword.value,
        firstName: profileFirstName.value,
        lastName: profileLastName.value,
        academicLevel: profileAcademicLevel.value,
        institutionType: profileInstitutionType.value,
        institution: profileInstitution.value,
        program: profileProgram.value,
      })
      profileMessage.value = 'Profile updated successfully.'
      isEditingProfile.value = false
      profileCurrentPassword.value = ''
      user.value = await getCurrentUser()
      syncProfile()
    } catch (error) {
      profileError.value = getErrorMessage(error, 'Could not update your profile.')
    } finally {
      savingProfile.value = false
    }
  }

  async function updatePassword () {
    if (newPassword.value !== confirmPassword.value) {
      profileError.value = 'The new passwords do not match.'
      profileTab.value = 'security'
      return
    }
    updatingPassword.value = true
    profileMessage.value = ''
    profileError.value = ''
    try {
      await changePassword(currentPassword.value, newPassword.value)
      profileMessage.value = 'Password updated successfully.'
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } catch (error) {
      profileError.value = getErrorMessage(error, 'Could not update your password.')
    } finally {
      updatingPassword.value = false
    }
  }

  onMounted(async () => {
    try {
      user.value = await getCurrentUser()
      if (!user.value) {
        router.push('/login')
        return
      }
      syncProfile()
    } catch {
      router.push('/login')
    }
  })
</script>

<style scoped>
  .profile-page {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 4% 0%, rgb(223 236 226 / 55%), transparent 31rem),
      #f4f6f2;
  }

  .profile-container {
    width: min(900px, calc(100% - 32px));
    margin: 0 auto;
    padding: 40px 0 80px;
  }

  .profile-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;
  }

  .profile-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4b7960;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .profile-header h1 {
    margin: 10px 0 6px;
    color: #1e3c2e;
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.045em;
  }

  .profile-header p {
    margin: 0;
    color: #75847b;
  }

  .profile-card {
    border: 1px solid #e3e9e2;
    overflow: hidden;
  }

  .profile-card-header {
    border-bottom: 1px solid #e3e9e2;
  }

  .profile-tabs {
    padding: 0 24px;
  }

  .profile-alert {
    margin: 20px 24px 0;
  }

  .profile-form {
    padding: 32px 24px 16px;
  }

  .profile-hint {
    margin: 12px 0 0;
    color: #75847b;
    font-size: 13px;
    line-height: 1.6;
  }

  .profile-actions {
    justify-content: flex-end;
    gap: 12px;
    padding: 0 24px 24px;
  }
</style>
