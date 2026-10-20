<template>
  <main id="dashboard-top" class="dashboard-page">
    <v-container class="dashboard-width py-5 py-md-8" fluid>
      <header class="dashboard-header">
        <RouterLink aria-label="LASU Student Success Hub home" class="dashboard-brand" to="/">
          <img alt="" src="/academic-mark.svg">

          <span>
            <strong>LASU Student Success Hub</strong>
            <small>Your academic space</small>
          </span>
        </RouterLink>

        <nav aria-label="Dashboard navigation" class="dashboard-actions">
          <v-btn
            class="notification-button"
            aria-label="Notifications"
            icon
            rounded="circle"
            variant="tonal"
            @click="openNotifications"
          >
            <v-badge v-if="unreadNotificationCount" color="error" :content="unreadNotificationCount" floating>
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-bell-outline</v-icon>
          </v-btn>

          <v-btn
            class="shared-link"
            prepend-icon="mdi-account-group-outline"
            rounded="pill"
            to="/study"
            variant="text"
          >
            Study together
          </v-btn>

          <v-btn
            class="shared-link"
            prepend-icon="mdi-file-question-outline"
            rounded="pill"
            to="/#past-questions"
            variant="text"
          >
            Shared questions
          </v-btn>

          <v-btn
            class="profile-button"
            prepend-icon="mdi-account-circle-outline"
            rounded="pill"
            variant="tonal"
            @click="openProfileSettings"
          >
            My profile
          </v-btn>

          <v-btn
            class="support-button"
            aria-label="Customer care"
            title="Customer care"
            href="mailto:noreply@mail2student.com?subject=LASU%20Student%20Success%20Hub%20support"
            prepend-icon="mdi-lifebuoy"
            rounded="pill"
            variant="text"
          >
            Customer care
          </v-btn>

          <v-btn
            class="logout-button"
            aria-label="Log out"
            title="Log out"
            :loading="signingOut"
            rounded="pill"
            variant="tonal"
            @click="logout"
          >
            <v-icon start>mdi-logout</v-icon>
            Log out
          </v-btn>
        </nav>
      </header>

      <section class="dashboard-welcome">
        <div>
          <div class="dashboard-kicker">
            <v-icon size="16">mdi-school-outline</v-icon>
            MY ACADEMIC SPACE
          </div>

          <h1>{{ greeting }}, {{ user?.firstName || 'Student' }}.</h1>
          <p>Small steps every day add up to remarkable progress.</p>
        </div>

        <div class="welcome-date">
          <v-icon size="18">mdi-calendar-month-outline</v-icon>
          {{ todayLabel }}
        </div>
      </section>

      <section aria-label="Study together" class="dashboard-hero">
        <div class="dashboard-hero-copy">
          <span class="dashboard-hero-kicker">A GOOD DAY TO LEARN</span>
          <h2>Big goals feel easier together.</h2>
          <p>Meet classmates in your course room to practice questions, share ideas, and make progress as a team.</p>

          <v-btn color="white" rounded="pill" to="/study">
            Join your study room
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>

        <img alt="" class="dashboard-hero-image" src="/study-dashboard.svg">
      </section>

      <v-alert
        class="connection-status mb-5"
        density="compact"
        :type="isSupabaseConfigured ? 'success' : 'info'"
        variant="tonal"
      >
        {{ modeMessage }}
      </v-alert>

      <v-alert
        v-if="errorMessage && !showAssignmentForm && !showMaterialForm"
        class="mb-5"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>

      <section v-if="isResourceModerator" aria-labelledby="moderation-heading" class="moderation-panel">
        <div class="section-title-row">
          <div>
            <div class="section-kicker">CREATOR TOOLS</div>
            <h2 id="moderation-heading">Upload approvals</h2>
            <p>Review new past questions and course PDFs before students can access them.</p>
          </div>
          <v-chip color="warning" prepend-icon="mdi-clock-outline" variant="tonal">
            {{ pendingResources.length }} waiting
          </v-chip>
        </div>

        <v-alert v-if="pendingResources.length === 0" class="mt-4" type="success" variant="tonal">
          Everything is up to date. New student uploads will appear here for review.
        </v-alert>

        <div v-else class="moderation-list">
          <article v-for="resource in pendingResources" :key="resource.id" class="moderation-item">
            <div class="moderation-copy">
              <v-chip color="warning" size="x-small" variant="tonal">{{ resource.kind === 'past_question' ? 'Past question' : getResourceCategoryLabel(resource.category) }}</v-chip>
              <strong>{{ resource.title }}</strong>
              <span>{{ resource.course || 'Course not specified' }} · {{ resource.uploaded_by_name }} · {{ formatDate(resource.created_at) }}</span>
              <p v-if="resource.description">{{ resource.description }}</p>
              <v-textarea v-model="reviewComments[resource.id]" class="review-comment-input mt-2" auto-grow counter="400" density="compact" hide-details="auto" label="Reviewer note (required to reject, shown to uploader)" maxlength="400" rows="2" />
            </div>
            <div class="moderation-actions">
              <v-btn :href="resource.url" prepend-icon="mdi-file-eye-outline" rounded="pill" target="_blank" variant="tonal">Preview PDF</v-btn>
              <v-btn color="error" :disabled="reviewingResourceId === resource.id || !(reviewComments[resource.id] || '').trim()" :loading="reviewingResourceId === resource.id && reviewAction === 'rejected'" rounded="pill" variant="text" @click="moderateResource(resource, 'rejected')">Reject</v-btn>
              <v-btn color="success" :disabled="reviewingResourceId === resource.id" :loading="reviewingResourceId === resource.id && reviewAction === 'approved'" rounded="pill" @click="moderateResource(resource, 'approved')">Approve</v-btn>
            </div>
          </article>
        </div>
      </section>

      <section aria-label="Academic overview" class="stats-grid">
        <v-card class="stat-card stat-pending" rounded="xl">
          <div class="stat-icon"><v-icon>mdi-clipboard-text-clock-outline</v-icon></div>

          <div class="stat-copy">
            <span>Open assignments</span>
            <strong>{{ pendingCount }}</strong>
            <small>Ready for your attention</small>
          </div>
        </v-card>

        <v-card class="stat-card stat-complete" rounded="xl">
          <div class="stat-icon"><v-icon>mdi-check-decagram-outline</v-icon></div>

          <div class="stat-copy">
            <span>Completed</span>
            <strong>{{ completedCount }}</strong>
            <small>Look how far you’ve come</small>
          </div>
        </v-card>

        <v-card class="stat-card stat-resources" rounded="xl">
          <div class="stat-icon"><v-icon>mdi-bookshelf</v-icon></div>

          <div class="stat-copy">
            <span>Class resources</span>
            <strong>{{ classMaterials.length }}</strong>
            <small>Shared lecture PDFs</small>
          </div>
        </v-card>
      </section>

      <v-row align="start" class="dashboard-content">
        <v-col cols="12" lg="8">
          <section aria-labelledby="assignments-heading" class="section-panel">
            <div class="section-title-row">
              <div>
                <div class="section-kicker">PLAN YOUR WORK</div>
                <h2 id="assignments-heading">{{ isResourceModerator ? 'Student assignments' : 'My assignments' }}</h2>
                <p>{{ isResourceModerator ? 'Review student planner entries and remove any assignment that should not remain.' : 'Keep deadlines and instructions together in one place.' }}</p>
              </div>

              <div class="assignment-heading-actions">
                <v-chip
                  v-if="dueSoonCount"
                  class="due-soon-summary"
                  color="warning"
                  prepend-icon="mdi-clock-alert-outline"
                  size="small"
                  variant="tonal"
                >
                  {{ dueSoonCount }} due soon
                </v-chip>

                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  rounded="pill"
                  @click="showAssignmentForm = true"
                >
                  New assignment
                </v-btn>
              </div>
            </div>

            <v-tabs
              v-model="taskFilter"
              class="assignment-tabs"
              color="primary"
              density="comfortable"
              show-arrows
            >
              <v-tab value="all">
                All
                <span class="tab-count">{{ tasks.length }}</span>
              </v-tab>

              <v-tab value="pending">
                Open
                <span class="tab-count">{{ pendingCount }}</span>
              </v-tab>

              <v-tab value="completed">
                Completed
                <span class="tab-count">{{ completedCount }}</span>
              </v-tab>
            </v-tabs>

            <div class="assignment-tools">
              <v-text-field
                v-model="searchQuery"
                class="assignment-search"
                clearable
                density="comfortable"
                hide-details
                label="Search assignments"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
              />
            </div>

            <v-progress-linear
              v-if="loading"
              class="my-5"
              color="primary"
              indeterminate
              rounded
            />

            <div v-else-if="tasks.length === 0" class="assignment-empty">
              <div class="empty-symbol"><v-icon>mdi-notebook-plus-outline</v-icon></div>
              <h3>Your plan starts with one assignment.</h3>
              <p>Add your coursework and deadlines to keep everything in view.</p>

              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                rounded="pill"
                @click="showAssignmentForm = true"
              >
                Add your first assignment
              </v-btn>
            </div>

            <div v-else-if="filteredTasks.length === 0" class="assignment-empty compact-empty">
              <div class="empty-symbol"><v-icon>mdi-text-search</v-icon></div>
              <h3>No assignments match this view.</h3>
              <p>Try a different search or status filter.</p>
            </div>

            <div v-else class="assignment-list">
              <v-card
                v-for="task in filteredTasks"
                :key="task.id"
                class="assignment-card"
                :class="{ 'assignment-done': task.completed }"
                rounded="lg"
              >
                <v-checkbox-btn
                  class="assignment-checkbox"
                  color="success"
                  :disabled="isResourceModerator && task.user_id !== user?.id"
                  :model-value="task.completed"
                  @update:model-value="toggleTask(task)"
                />

                <div class="assignment-detail">
                  <div class="assignment-heading">
                    <h3 :class="{ 'text-decoration-line-through': task.completed }">
                      {{ task.title }}
                    </h3>

                    <v-chip
                      class="priority-chip"
                      :color="task.priority === 'high' ? 'error' : task.priority === 'low' ? 'info' : 'secondary'"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ task.priority }} priority
                    </v-chip>
                  </div>

                  <v-chip
                    v-if="isResourceModerator && task.user_id !== user?.id"
                    class="mt-2"
                    color="secondary"
                    size="x-small"
                    variant="tonal"
                  >
                    Student assignment
                  </v-chip>

                  <p v-if="task.description" class="assignment-description">
                    {{ task.description }}
                  </p>

                  <div class="assignment-meta">
                    <span><v-icon size="15">mdi-book-outline</v-icon>{{ task.course || 'Course not specified' }}</span>

                    <span :class="{ 'due-soon': isDueSoon(task) }">
                      <v-icon size="15">mdi-calendar-clock-outline</v-icon>
                      {{ formatDueDate(task.due_date) }}
                    </span>
                  </div>
                </div>

                <v-btn
                  v-if="isResourceModerator"
                  aria-label="Delete assignment"
                  color="error"
                  icon="mdi-trash-can-outline"
                  size="small"
                  variant="text"
                  @click="removeTask(task)"
                />
              </v-card>
            </div>
          </section>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="upcoming-card pa-5" rounded="xl">
            <div class="section-title-row">
              <div>
                <div class="section-kicker">COMING UP</div>
                <h2>This week</h2>
              </div>

              <v-chip color="warning" size="small" variant="tonal">
                {{ dueSoonCount }}
              </v-chip>
            </div>

            <p class="upcoming-intro">Deadlines in the next seven days.</p>

            <div v-if="upcomingTasks.length > 0" class="upcoming-list">
              <article
                v-for="task in upcomingTasks"
                :key="task.id"
                class="upcoming-item"
              >
                <span class="upcoming-date">
                  <v-icon size="17">mdi-calendar-clock-outline</v-icon>
                </span>

                <div>
                  <strong>{{ task.title }}</strong>
                  <span>{{ task.course || 'Course not specified' }}</span>
                </div>

                <time>{{ formatDueDate(task.due_date) }}</time>
              </article>
            </div>

            <div v-else class="upcoming-empty">
              <v-icon size="21">mdi-calendar-check-outline</v-icon>
              <span>No upcoming deadlines. You have room to plan ahead.</span>
            </div>
          </v-card>

          <v-card class="study-tip mt-5 pa-5" rounded="xl">
            <div class="tip-icon"><v-icon>mdi-lightbulb-on-outline</v-icon></div>
            <div class="section-kicker">A NOTE FOR YOUR STUDY WEEK</div>
            <h3>Make time for focused study.</h3>
            <p>Break larger assignments into small steps and give yourself a clear deadline for each one.</p>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog
        v-model="showAssignmentForm"
        aria-labelledby="assignment-dialog-title"
        max-width="620"
        scrollable
      >
        <v-card class="assignment-dialog-card" rounded="xl">
          <div class="dialog-heading">
            <div class="form-icon"><v-icon>mdi-pencil-plus-outline</v-icon></div>

            <div>
              <div class="section-kicker">ADD TO YOUR PLAN</div>
              <h2 id="assignment-dialog-title">New assignment</h2>
              <p>Capture the instructions, course, and deadline.</p>
            </div>

            <v-btn
              aria-label="Close assignment form"
              class="dialog-close"
              icon="mdi-close"
              variant="text"
              @click="showAssignmentForm = false"
            />
          </div>

          <v-card-text class="dialog-form-content">
            <v-form @submit.prevent="addTask">
              <v-alert
                v-if="errorMessage"
                class="mb-4"
                type="error"
                variant="tonal"
              >
                {{ errorMessage }}
              </v-alert>

              <v-text-field
                v-model="title"
                label="Assignment title"
                placeholder="e.g. Prepare surveying notes"
                required
              />

              <v-textarea
                v-model="description"
                auto-grow
                label="Instructions and notes"
                placeholder="Write the full assignment question and requirements."
                rows="3"
              />

              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="course"
                    label="Course"
                    placeholder="e.g. SVG 202"
                  />
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="dueDate"
                    label="Due date"
                    type="date"
                  />
                </v-col>
              </v-row>

              <v-select
                v-model="priority"
                :items="[
                  { title: 'Low priority', value: 'low' },
                  { title: 'Medium priority', value: 'medium' },
                  { title: 'High priority', value: 'high' },
                ]"
                label="Priority"
              />

              <div class="dialog-actions">
                <v-btn
                  rounded="pill"
                  variant="text"
                  @click="showAssignmentForm = false"
                >
                  Cancel
                </v-btn>

                <v-btn
                  color="primary"
                  :loading="saving"
                  prepend-icon="mdi-content-save-outline"
                  rounded="pill"
                  type="submit"
                >
                  Save assignment
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>

      <section aria-labelledby="materials-heading" class="materials-section">
        <div class="section-title-row materials-title-row">
          <div>
            <div class="section-kicker">LEARN TOGETHER</div>
            <h2 id="materials-heading">Class materials</h2>

            <p>
              Browse approved lecture notes, assignment PDFs, and handouts for courses in
              {{ user?.academicLevel ? getAcademicLevelLabel(user.academicLevel) : 'your level' }}.
            </p>
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            rounded="pill"
            @click="showMaterialForm = true"
          >
            Add new material
          </v-btn>
        </div>

        <div class="materials-toolbar">
          <v-text-field
            v-model="materialSearch"
            class="materials-search"
            clearable
            density="comfortable"
            hide-details
            label="Search class materials"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />

          <v-select
            v-model="materialCategory"
            class="material-category-filter"
            density="comfortable"
            hide-details
            item-title="title"
            item-value="value"
            :items="materialCategoryFilters"
            label="Filter by category"
            prepend-inner-icon="mdi-shape-outline"
            variant="outlined"
          />

          <v-chip color="secondary" prepend-icon="mdi-account-school-outline" variant="tonal">
            {{ user?.academicLevel ? getAcademicLevelLabel(user.academicLevel) : 'All levels' }}
          </v-chip>
        </div>

        <v-progress-linear
          v-if="loadingResources"
          class="mb-4"
          color="primary"
          indeterminate
          rounded
        />

        <div
          v-else-if="!errorMessage && classMaterials.length === 0"
          class="materials-empty"
        >
          <v-icon>mdi-bookshelf</v-icon>
          <span>No class PDFs are listed for your level yet. Share the first helpful resource.</span>

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            rounded="pill"
            variant="tonal"
            @click="showMaterialForm = true"
          >
            Add new material
          </v-btn>
        </div>

        <div v-else-if="filteredClassMaterials.length === 0" class="materials-empty">
          <v-icon>mdi-text-search</v-icon>
          <span>No materials match that search. Try a different title, course, or keyword.</span>
        </div>

        <v-row v-else class="material-grid">
          <v-col
            v-for="resource in filteredClassMaterials"
            :key="resource.id"
            cols="12"
            md="6"
            xl="4"
          >
            <v-card class="material-card fill-height pa-5" rounded="xl">
              <div class="material-heading">
                <div class="resource-icon"><v-icon color="error">mdi-file-pdf-box</v-icon></div>

                <div class="min-width-0">
                  <h3>{{ resource.title }}</h3>

                  <p>
                    {{ resource.course || 'Course not specified' }}
                    · {{ formatDate(resource.created_at) }}
                  </p>
                </div>
              </div>

              <div class="material-meta">
                <v-chip color="primary" size="x-small" variant="tonal">
                  {{ getResourceCategoryLabel(resource.category) }}
                </v-chip>
                <span>Shared by {{ resource.uploaded_by_name || 'LASU student' }}</span>
              </div>

              <v-chip
                v-if="resource.status !== 'approved'"
                class="mt-3 align-self-start"
                :color="resource.status === 'pending' ? 'warning' : 'error'"
                prepend-icon="mdi-clock-outline"
                size="small"
                variant="tonal"
              >
                {{ resource.status === 'pending' ? 'Awaiting creator approval' : 'Not approved · upload a corrected PDF' }}
              </v-chip>

              <v-chip
                class="material-level-chip"
                color="secondary"
                prepend-icon="mdi-account-school-outline"
                size="x-small"
                variant="tonal"
              >
                {{ getAcademicLevelLabel(getCourseAcademicLevel(resource.course) || resource.academic_level) }}
              </v-chip>

              <p v-if="resource.description" class="material-description">
                {{ resource.description }}
              </p>

              <v-btn
                block
                class="mt-auto"
                color="primary"
                :href="resource.url"
                rel="noopener noreferrer"
                rounded="pill"
                target="_blank"
                variant="tonal"
              >
                Read PDF
                <v-icon end>mdi-open-in-new</v-icon>
              </v-btn>

              <v-btn
                v-if="isResourceModerator"
                block
                class="mt-2"
                color="error"
                prepend-icon="mdi-delete-outline"
                rounded="pill"
                variant="text"
                @click="resourceToDelete = resource"
              >
                Delete resource
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <v-dialog
        :model-value="Boolean(resourceToDelete)"
        max-width="440"
        @update:model-value="value => { if (!value) resourceToDelete = null }"
      >
        <v-card rounded="xl">
          <v-card-title>Delete this shared resource?</v-card-title>
          <v-card-text>“{{ resourceToDelete?.title }}” and its PDF will be removed from the library.</v-card-text>
          <v-card-actions class="pa-4 pt-0">
            <v-spacer />
            <v-btn rounded="pill" variant="text" @click="resourceToDelete = null">Cancel</v-btn>
            <v-btn color="error" :loading="deletingResource" rounded="pill" @click="confirmDeleteMaterial">Delete resource</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showNotifications" max-width="560" scrollable>
        <v-card class="notification-dialog" rounded="xl">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Notifications</span>
            <v-btn aria-label="Close notifications" icon="mdi-close" variant="text" @click="showNotifications = false" />
          </v-card-title>
          <v-card-text>
            <div v-if="notifications.length" class="notification-list">
              <article v-for="notification in notifications" :key="notification.id" class="notification-item" :class="{ 'notification-unread': !notification.is_read }">
                <v-icon :color="notification.type === 'resource_rejected' ? 'error' : notification.type === 'resource_approved' ? 'success' : 'primary'">
                  {{ notification.type === 'resource_uploaded' ? 'mdi-file-upload-outline' : notification.type === 'resource_approved' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
                </v-icon>
                <div><p>{{ notification.message }}</p><small>{{ formatDate(notification.created_at) }}</small></div>
              </article>
            </div>
            <v-alert v-else type="info" variant="tonal">No notifications yet. Upload reviews and decisions will show here.</v-alert>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="showMaterialForm"
        aria-labelledby="material-dialog-title"
        max-width="680"
        scrollable
      >
        <v-card class="material-dialog-card" rounded="xl">
          <div class="dialog-heading">
            <div class="form-icon"><v-icon>mdi-bookshelf</v-icon></div>

            <div>
              <div class="section-kicker">SHARE WITH CLASSMATES</div>
              <h2 id="material-dialog-title">Add class material</h2>
              <p>Choose whether to share lecture notes, an assignment PDF, or another class handout. New uploads are reviewed before students can access them.</p>
            </div>

            <v-btn
              aria-label="Close material form"
              class="dialog-close"
              icon="mdi-close"
              variant="text"
              @click="showMaterialForm = false"
            />
          </div>

          <v-card-text class="dialog-form-content">
            <v-alert v-if="!user?.academicLevel" class="mb-4" type="warning" variant="tonal">
              Set your academic level in My profile before sharing class materials.
            </v-alert>

            <v-alert v-if="errorMessage" class="mb-4" type="error" variant="tonal">
              {{ errorMessage }}
            </v-alert>

            <v-form @submit.prevent="uploadClassPdf">
              <v-text-field
                v-model="resourceTitle"
                label="PDF title"
                placeholder="e.g. Week 4 lecture notes"
                required
              />

              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="resourceCourse"
                    label="Course"
                    placeholder="e.g. BIO 201"
                  />
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    label="Shared with level"
                    :model-value="resourceAcademicLevel
                      ? getAcademicLevelLabel(resourceAcademicLevel)
                      : 'Set a course code to identify its level'"
                    readonly
                  />
                </v-col>
              </v-row>

              <v-select
                v-model="resourceCategory"
                item-title="title"
                item-value="value"
                :items="materialCategories"
                label="Resource category"
                prepend-inner-icon="mdi-shape-outline"
                required
              />

              <v-file-input
                v-model="resourceFile"
                accept="application/pdf,.pdf"
                label="Choose a PDF (max 20 MB)"
                prepend-icon="mdi-file-pdf-box"
                required
                show-size
              />

              <v-textarea
                v-model="resourceDescription"
                auto-grow
                label="What should classmates know?"
                rows="2"
              />

              <div class="dialog-actions">
                <v-btn rounded="pill" variant="text" @click="showMaterialForm = false">
                  Cancel
                </v-btn>

                <v-btn
                  color="primary"
                  :disabled="!user?.academicLevel"
                  :loading="uploadingResource"
                  prepend-icon="mdi-cloud-upload-outline"
                  rounded="pill"
                  type="submit"
                >
                  Upload material
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="showProfileDialog"
        aria-labelledby="profile-dialog-title"
        max-width="700"
        scrollable
      >
        <v-card class="profile-dialog-card" rounded="xl">
          <div class="dialog-heading">
            <div class="form-icon"><v-icon>mdi-account-edit-outline</v-icon></div>

            <div>
              <div class="section-kicker">YOUR ACCOUNT</div>
              <h2 id="profile-dialog-title">Profile and security</h2>
              <p>Keep your academic details current and your account secure.</p>
            </div>

            <v-btn
              aria-label="Close profile settings"
              class="dialog-close"
              icon="mdi-close"
              variant="text"
              @click="showProfileDialog = false"
            />
          </div>

          <v-tabs v-model="profileTab" class="profile-tabs" color="primary">
            <v-tab prepend-icon="mdi-account-outline" value="profile">Profile</v-tab>
            <v-tab prepend-icon="mdi-lock-outline" value="security">Password</v-tab>
          </v-tabs>

          <v-card-text class="dialog-form-content">
            <v-alert
              v-if="profileMessage"
              class="mb-4"
              type="success"
              variant="tonal"
            >
              {{ profileMessage }}
            </v-alert>

            <v-alert
              v-if="profileError"
              class="mb-4"
              type="error"
              variant="tonal"
            >
              {{ profileError }}
            </v-alert>

            <v-window v-model="profileTab">
              <v-window-item value="profile">
                <v-form @submit.prevent="saveProfile">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="profileFirstName"
                        autocomplete="given-name"
                        label="First name"
                        required
                      />
                    </v-col>

                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="profileLastName"
                        autocomplete="family-name"
                        label="Last name"
                        required
                      />
                    </v-col>
                  </v-row>

                  <v-text-field
                    v-model="profileEmail"
                    autocomplete="email"
                    label="Email address"
                    required
                    type="email"
                  />

                  <v-select
                    v-model="profileAcademicLevel"
                    :items="academicLevels"
                    label="Current academic level"
                    required
                  />

                  <v-text-field
                    v-model="profileProgram"
                    label="Programme or department"
                    placeholder="e.g. Environmental Management"
                  />

                  <p class="profile-hint">
                    Changing your email may require confirmation from your new email inbox.
                  </p>

                  <div class="dialog-actions">
                    <v-btn
                      color="primary"
                      :loading="savingProfile"
                      prepend-icon="mdi-content-save-outline"
                      rounded="pill"
                      type="submit"
                    >
                      Save profile
                    </v-btn>
                  </div>
                </v-form>
              </v-window-item>

              <v-window-item value="security">
                <v-form @submit.prevent="savePassword">
                  <v-text-field
                    v-model="currentPassword"
                    :append-inner-icon="showCurrentPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    autocomplete="current-password"
                    label="Current password"
                    required
                    :type="showCurrentPassword ? 'text' : 'password'"
                    @click:append-inner="showCurrentPassword = !showCurrentPassword"
                  />

                  <v-text-field
                    v-model="newPassword"
                    :append-inner-icon="showNewPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    autocomplete="new-password"
                    label="New password (at least 8 characters)"
                    required
                    :type="showNewPassword ? 'text' : 'password'"
                    @click:append-inner="showNewPassword = !showNewPassword"
                  />

                  <v-text-field
                    v-model="confirmPassword"
                    autocomplete="new-password"
                    label="Confirm new password"
                    required
                    :type="showNewPassword ? 'text' : 'password'"
                  />

                  <div class="dialog-actions">
                    <v-btn
                      color="primary"
                      :loading="changingPassword"
                      prepend-icon="mdi-lock-reset"
                      rounded="pill"
                      type="submit"
                    >
                      Change password
                    </v-btn>
                  </div>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-dialog>

      <footer class="dashboard-footer">
        <span>One step at a time. You’re making progress.</span>
        <RouterLink to="/">Back to LASU Student Success Hub</RouterLink>
      </footer>

      <nav aria-label="Quick dashboard navigation" class="mobile-dashboard-nav">
        <a href="#dashboard-top"><v-icon>mdi-view-dashboard-outline</v-icon><span>Home</span></a>
        <a href="#assignments-heading"><v-icon>mdi-checkbox-marked-circle-outline</v-icon><span>Tasks</span></a>
        <a href="#materials-heading"><v-icon>mdi-bookshelf</v-icon><span>Resources</span></a>
        <RouterLink to="/study"><v-icon>mdi-account-group-outline</v-icon><span>Community</span></RouterLink>
      </nav>

      <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
        {{ successMessage }}
      </v-snackbar>
    </v-container>
  </main>
</template>

<script setup lang="ts">
  import type { AppUser } from '@/lib/auth'
  import type { Resource, ResourceCategory } from '@/services/resources'
  import type { Task } from '@/services/tasks'
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    academicLevels,
    getAcademicLevelLabel,
    getCourseAcademicLevel,
  } from '@/lib/academics'
  import {
    changePassword,
    getCurrentUser,
    signOut,
    updateProfile,
  } from '@/lib/auth'
  import { getErrorMessage } from '@/lib/errors'
  import { isSupabaseConfigured } from '@/lib/supabase'
  import {
    deleteResource,
    getResources,
    getNotifications,
    getPendingResources,
    getResourceCategoryLabel,
    isResourceModerator as checkResourceModerator,
    markNotificationsRead,
    resourceCategories,
    reviewResource,
    uploadResource,
    type AppNotification,
  } from '@/services/resources'
  import {
    createTask,
    deleteTask,
    getTasks,
    updateTask,
  } from '@/services/tasks'

  const router = useRouter()
  const user = ref<AppUser | null>(null)
  const tasks = ref<Task[]>([])
  const classMaterials = ref<Resource[]>([])
  const pendingResources = ref<Resource[]>([])
  const notifications = ref<AppNotification[]>([])
  const isResourceModerator = ref(false)
  const showNotifications = ref(false)
  const resourceToDelete = ref<Resource | null>(null)
  const deletingResource = ref(false)
  const reviewingResourceId = ref<string | null>(null)
  const reviewAction = ref<'approved' | 'rejected' | null>(null)
  const reviewComments = ref<Record<string, string>>({})
  let notificationPoll: ReturnType<typeof globalThis.setInterval> | null = null
  const unreadNotificationCount = computed(() => notifications.value.filter(item => !item.is_read).length)
  const materialSearch = ref('')
  const materialCategory = ref<ResourceCategory | 'all'>('all')
  const resourceCategory = ref<ResourceCategory>('lecture_notes')
  const materialCategories = resourceCategories.filter(category => category.value !== 'past_question')
  const materialCategoryFilters = [
    { title: 'All categories', value: 'all' },
    ...materialCategories,
  ]
  const filteredClassMaterials = computed(() => {
    const query = materialSearch.value.trim().toLocaleLowerCase()

    return classMaterials.value
      .filter(resource => materialCategory.value === 'all' || resource.category === materialCategory.value)
      .filter(resource => !query ||
        `${resource.title} ${resource.course} ${resource.description} ${getResourceCategoryLabel(resource.category)} ${resource.uploaded_by_name}`
          .toLocaleLowerCase()
          .includes(query),
      )
  })
  const title = ref('')
  const description = ref('')
  const course = ref('')
  const dueDate = ref('')
  const priority = ref<'low' | 'medium' | 'high'>('medium')
  const searchQuery = ref('')
  const taskFilter = ref<'all' | 'pending' | 'completed'>('all')
  const showAssignmentForm = ref(false)
  const showMaterialForm = ref(false)
  const showProfileDialog = ref(false)
  const profileTab = ref<'profile' | 'security'>('profile')
  const profileFirstName = ref('')
  const profileLastName = ref('')
  const profileEmail = ref('')
  const profileAcademicLevel = ref('')
  const profileProgram = ref('')
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const showCurrentPassword = ref(false)
  const showNewPassword = ref(false)
  const savingProfile = ref(false)
  const changingPassword = ref(false)
  const profileMessage = ref('')
  const profileError = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const signingOut = ref(false)
  const errorMessage = ref('')
  const resourceTitle = ref('')
  const resourceCourse = ref('')
  const resourceAcademicLevel = computed(() =>
    getCourseAcademicLevel(resourceCourse.value) || user.value?.academicLevel || '',
  )
  const resourceDescription = ref('')
  const resourceFile = ref<File | File[] | null>(null)
  const uploadingResource = ref(false)
  const loadingResources = ref(false)
  const successSnackbar = ref(false)
  const successMessage = ref('')
  const modeMessage = computed(() => isSupabaseConfigured
    ? 'Connected to Supabase. Assignments are saved to your account online.'
    : 'Local test mode. Your account and assignments are stored only in this browser tab.')
  const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  const completedCount = computed(
    () => tasks.value.filter(task => task.completed).length,
  )
  const pendingCount = computed(
    () => tasks.value.filter(task => !task.completed).length,
  )
  const filteredTasks = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase()

    return tasks.value.filter(task => {
      const matchesFilter = taskFilter.value === 'all'
        || (taskFilter.value === 'completed' ? task.completed : !task.completed)
      const matchesQuery = !query
        || `${task.title} ${task.course} ${task.description}`.toLocaleLowerCase().includes(query)
      return matchesFilter && matchesQuery
    })
  })
  const dueSoonCount = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const todayKey = dateKey(today)
    const nextWeekKey = dateKey(nextWeek)

    return tasks.value.filter(task =>
      !task.completed
      && task.due_date
      && task.due_date >= todayKey
      && task.due_date <= nextWeekKey,
    ).length
  })
  const upcomingTasks = computed(() => tasks.value
    .filter(task => isDueSoon(task))
    .toSorted((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5))

  function dateKey (date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function formatDueDate (date: string | null) {
    if (!date) return 'No due date'
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
      .format(new Date(`${date}T00:00:00`))
  }

  function isDueSoon (task: Task) {
    if (task.completed || !task.due_date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return task.due_date >= dateKey(today) && task.due_date <= dateKey(nextWeek)
  }

  async function loadTasks () {
    loading.value = true
    errorMessage.value = ''

    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        await router.replace('/login')
        return
      }

      user.value = currentUser
      const moderator = await checkResourceModerator(currentUser.id)
      isResourceModerator.value = moderator
      const [loadedTasks] = await Promise.all([
        getTasks(),
        loadClassMaterials(),
        refreshDashboardSignals(moderator),
      ])
      tasks.value = loadedTasks
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function refreshDashboardSignals (moderator = isResourceModerator.value) {
    if (!isSupabaseConfigured) return
    try {
      const [loadedNotifications, pending] = await Promise.all([
        getNotifications(),
        moderator ? getPendingResources() : Promise.resolve([]),
      ])
      notifications.value = loadedNotifications
      pendingResources.value = pending
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not refresh notifications and upload approvals.')
    }
  }

  async function openNotifications () {
    showNotifications.value = true
    await refreshDashboardSignals()
    const unread = notifications.value.filter(item => !item.is_read).map(item => item.id)
    if (!unread.length) return
    try {
      await markNotificationsRead(unread)
      notifications.value = notifications.value.map(item => unread.includes(item.id) ? { ...item, is_read: true } : item)
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not mark notifications as read.')
    }
  }

  async function moderateResource (resource: Resource, status: 'approved' | 'rejected') {
    reviewingResourceId.value = resource.id
    reviewAction.value = status
    errorMessage.value = ''
    try {
      await reviewResource(resource.id, status, reviewComments.value[resource.id] || '')
      pendingResources.value = pendingResources.value.filter(item => item.id !== resource.id)
      delete reviewComments.value[resource.id]
      await refreshDashboardSignals()
      successMessage.value = status === 'approved'
        ? `${resource.title} approved and shared with students.`
        : `${resource.title} rejected. The uploader has been notified.`
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not review this upload.')
    } finally {
      reviewingResourceId.value = null
      reviewAction.value = null
    }
  }

  async function confirmDeleteMaterial () {
    const resource = resourceToDelete.value
    if (!resource) return
    deletingResource.value = true
    errorMessage.value = ''
    try {
      await deleteResource(resource)
      classMaterials.value = classMaterials.value.filter(item => item.id !== resource.id)
      resourceToDelete.value = null
      successMessage.value = 'Your class material upload has been deleted.'
      successSnackbar.value = true
    } catch (error) {
      errorMessage.value = getErrorMessage(error, 'Could not delete this class material.')
    } finally {
      deletingResource.value = false
    }
  }

  async function addTask () {
    errorMessage.value = ''

    if (!title.value.trim()) {
      errorMessage.value = 'Enter an assignment title.'
      return
    }

    saving.value = true

    try {
      const newTask = await createTask({
        title: title.value,
        description: description.value,
        course: course.value,
        due_date: dueDate.value || null,
        priority: priority.value,
      })

      tasks.value.push(newTask)
      showAssignmentForm.value = false
      successMessage.value = 'Assignment saved to your academic plan.'
      successSnackbar.value = true
      title.value = ''
      description.value = ''
      course.value = ''
      dueDate.value = ''
      priority.value = 'medium'
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      saving.value = false
    }
  }

  async function loadClassMaterials () {
    loadingResources.value = true
    try {
      classMaterials.value = await getResources('class_material', user.value?.academicLevel)
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      loadingResources.value = false
    }
  }

  async function uploadClassPdf () {
    errorMessage.value = ''
    if (!user.value?.academicLevel) {
      errorMessage.value = 'Set your academic level in My profile before sharing class materials.'
      return
    }

    const file = Array.isArray(resourceFile.value)
      ? resourceFile.value[0]
      : resourceFile.value

    if (!file) {
      errorMessage.value = 'Choose a PDF file to upload.'
      return
    }

    uploadingResource.value = true
    try {
      const sharedLevel = resourceAcademicLevel.value
      const resource = await uploadResource({
        title: resourceTitle.value,
        course: resourceCourse.value,
        description: resourceDescription.value,
        kind: 'class_material',
        category: resourceCategory.value,
        file,
        academic_level: sharedLevel,
      })
      classMaterials.value.unshift(resource)
      showMaterialForm.value = false
      resourceTitle.value = ''
      resourceCourse.value = ''
      resourceCategory.value = 'lecture_notes'
      resourceDescription.value = ''
      resourceFile.value = null
      successMessage.value = isSupabaseConfigured
        ? 'Upload received. The creator will review it before it appears to students.'
        : `Class material shared with ${getAcademicLevelLabel(sharedLevel)} students.`
      successSnackbar.value = true
      await refreshDashboardSignals()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      uploadingResource.value = false
    }
  }

  function openProfileSettings () {
    profileError.value = ''
    profileMessage.value = ''
    profileTab.value = 'profile'
    profileFirstName.value = user.value?.firstName || ''
    profileLastName.value = user.value?.lastName || ''
    profileEmail.value = user.value?.email || ''
    profileAcademicLevel.value = user.value?.academicLevel || ''
    profileProgram.value = user.value?.program || ''
    showProfileDialog.value = true
  }

  async function saveProfile () {
    profileError.value = ''
    profileMessage.value = ''

    if (!profileFirstName.value.trim() || !profileLastName.value.trim()
      || !profileEmail.value.trim() || !profileAcademicLevel.value) {
      profileError.value = 'Complete your name, email, and academic level.'
      return
    }

    const requestedEmail = profileEmail.value.trim().toLowerCase()
    savingProfile.value = true
    try {
      const updatedUser = await updateProfile({
        firstName: profileFirstName.value,
        lastName: profileLastName.value,
        email: requestedEmail,
        academicLevel: profileAcademicLevel.value,
        program: profileProgram.value,
      })
      user.value = updatedUser
      profileFirstName.value = updatedUser.firstName
      profileLastName.value = updatedUser.lastName
      profileEmail.value = updatedUser.email
      profileAcademicLevel.value = updatedUser.academicLevel
      profileProgram.value = updatedUser.program

      profileMessage.value = requestedEmail !== updatedUser.email.toLowerCase() && isSupabaseConfigured ? 'Profile saved. Confirm the email change using the message sent to your new address.' : 'Your profile has been updated.'

      await loadClassMaterials()
    } catch (error) {
      profileError.value = getErrorMessage(error, 'Could not update your profile.')
    } finally {
      savingProfile.value = false
    }
  }

  async function savePassword () {
    profileError.value = ''
    profileMessage.value = ''

    if (!currentPassword.value || !newPassword.value) {
      profileError.value = 'Enter your current password and a new password.'
      return
    }
    if (newPassword.value.length < 8) {
      profileError.value = 'Use a new password of at least 8 characters.'
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      profileError.value = 'The new password and confirmation do not match.'
      return
    }

    changingPassword.value = true
    try {
      await changePassword(currentPassword.value, newPassword.value)
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      profileMessage.value = 'Your password has been changed.'
    } catch (error) {
      profileError.value = getErrorMessage(error, 'Could not change your password.')
    } finally {
      changingPassword.value = false
    }
  }

  function formatDate (date: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date))
  }

  async function toggleTask (task: Task) {
    errorMessage.value = ''

    try {
      const updated = await updateTask(task.id, {
        completed: !task.completed,
      })
      const index = tasks.value.findIndex(item => item.id === task.id)

      if (index !== -1) {
        tasks.value[index] = updated
      }
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  async function removeTask (task: Task) {
    errorMessage.value = ''

    try {
      await deleteTask(task.id)
      tasks.value = tasks.value.filter(item => item.id !== task.id)
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  async function logout () {
    signingOut.value = true

    try {
      await signOut()
      await router.replace('/login')
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      signingOut.value = false
    }
  }

  onMounted(async () => {
    await loadTasks()
    notificationPoll = globalThis.setInterval(() => {
      void refreshDashboardSignals()
      void loadClassMaterials()
    }, 30_000)
  })
  onBeforeUnmount(() => {
    if (notificationPoll !== null) globalThis.clearInterval(notificationPoll)
  })
</script>

<style scoped>
  .dashboard-page {
    min-height: 100vh;
    color: #213a4a;
    background:
      radial-gradient(ellipse at 4% 0%, rgb(223 236 226 / 55%), transparent 31rem),
      #f4f6f2;
  }

  .dashboard-width {
    max-width: 1420px;
    margin-inline: auto;
  }

  .dashboard-header {
    display: flex;
    min-height: 61px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 34px;
  }

  .dashboard-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #1c3b4d;
    text-decoration: none;
  }

  .dashboard-brand img {
    width: 42px;
    height: 42px;
  }

  .dashboard-brand span,
  .dashboard-brand strong,
  .dashboard-brand small {
    display: block;
  }

  .dashboard-brand strong {
    font-size: 13px;
    font-weight: 750;
  }

  .dashboard-brand small {
    margin-top: 2px;
    color: #829092;
    font-size: 10px;
  }

  .dashboard-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dashboard-welcome {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .dashboard-kicker,
  .section-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #668a73;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  .dashboard-welcome h1 {
    margin: 9px 0 5px;
    color: #1e394b;
    font-size: clamp(1.8rem, 3.8vw, 2.65rem);
    font-weight: 750;
    letter-spacing: -0.05em;
  }

  .dashboard-welcome p {
    margin: 0;
    color: #78868a;
    font-size: 13px;
  }

  .welcome-date {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    border: 1px solid #e0e7df;
    border-radius: 99px;
    padding: 10px 15px;
    color: #587366;
    background: rgb(255 255 252 / 75%);
    font-size: 11px;
    font-weight: 650;
  }

  .dashboard-hero {
    position: relative;
    display: grid;
    min-height: 230px;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.8fr);
    align-items: center;
    overflow: hidden;
    margin-bottom: 22px;
    border-radius: 24px;
    padding: 28px 38px;
    color: #fff;
    background:
      radial-gradient(ellipse at 86% 12%, rgb(213 235 210 / 24%), transparent 25rem),
      linear-gradient(115deg, #1b4551, #477762);
    box-shadow: 0 18px 38px rgb(32 69 59 / 15%);
  }

  .dashboard-hero-copy {
    position: relative;
    z-index: 1;
    max-width: 570px;
  }

  .dashboard-hero-kicker {
    color: #e3d29b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .dashboard-hero h2 {
    margin: 9px 0 6px;
    font-size: clamp(1.45rem, 3vw, 2.1rem);
    font-weight: 750;
    letter-spacing: -0.045em;
  }

  .dashboard-hero p {
    max-width: 490px;
    margin: 0 0 18px;
    color: rgb(255 255 255 / 78%);
    font-size: 12px;
    line-height: 1.65;
  }

  .dashboard-hero .v-btn {
    color: #285443 !important;
    font-weight: 700;
  }

  .dashboard-hero-image {
    width: 100%;
    max-height: 220px;
    object-fit: contain;
    filter: drop-shadow(0 14px 18px rgb(12 34 31 / 17%));
  }

  .connection-status {
    max-width: max-content;
    font-size: 11px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 0 0 27px;
  }

  .stat-card {
    display: flex;
    min-height: 126px;
    align-items: center;
    gap: 15px;
    border: 1px solid #e4e9e1;
    padding: 21px;
    background: #fffefa;
    box-shadow: 0 8px 25px rgb(30 53 54 / 4%);
  }

  .stat-icon,
  .form-icon,
  .tip-icon,
  .empty-symbol {
    display: grid;
    width: 48px;
    height: 48px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 15px;
    font-size: 22px;
  }

  .stat-pending .stat-icon {
    color: #a17b36;
    background: #f4eedb;
  }

  .stat-complete .stat-icon {
    color: #4c8167;
    background: #e6f0e6;
  }

  .stat-resources .stat-icon {
    color: #4c7887;
    background: #e7eff0;
  }

  .stat-copy {
    display: grid;
    gap: 2px;
  }

  .stat-copy > span {
    color: #718085;
    font-size: 11px;
    font-weight: 650;
  }

  .stat-copy strong {
    color: #203a4a;
    font-size: 27px;
    font-weight: 750;
    letter-spacing: -0.04em;
    line-height: 1.15;
  }

  .stat-copy small {
    color: #929d9d;
    font-size: 10px;
  }

  .dashboard-content {
    margin-bottom: 24px;
  }

  .section-panel,
  .upcoming-card,
  .upload-material-card,
  .material-card {
    border: 1px solid #e4e9e1;
    background: #fffefa;
    box-shadow: 0 9px 28px rgb(30 53 54 / 4%);
  }

  .section-panel {
    min-height: 100%;
    border-radius: 20px;
    padding: 25px;
  }

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .section-title-row h2 {
    margin: 6px 0 0;
    color: #203a4a;
    font-size: 20px;
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  .section-title-row p {
    margin: 5px 0 0;
    color: #7c898d;
    font-size: 11px;
  }

  .profile-button {
    font-size: 11px;
  }

  .materials-toolbar {
    display: grid;
    max-width: 1040px;
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 0.8fr) max-content;
    align-items: center;
    gap: 14px;
    margin: 18px 0;
  }

  .materials-search {
    flex: 1;
  }

  .material-category-filter {
    min-width: 220px;
  }

  .material-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: #78868a;
    font-size: 0.76rem;
  }

  .material-level-chip {
    align-self: flex-start;
    width: max-content;
  }

  .profile-tabs {
    border-bottom: 1px solid #e8ece6;
  }

  .profile-hint {
    margin: -4px 0 15px;
    color: #879294;
    font-size: 10px;
  }

  .assignment-heading-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex: 0 0 auto;
  }

  .assignment-tabs {
    margin: 17px -8px 0;
    border-bottom: 1px solid #e9ece6;
  }

  .assignment-tabs :deep(.v-tab) {
    min-width: 0;
    padding-inline: 12px;
    color: #758389;
    font-size: 11px;
    font-weight: 650;
    text-transform: none;
  }

  .assignment-tabs :deep(.v-tab--selected) {
    color: #244b5b;
  }

  .tab-count {
    display: inline-grid;
    min-width: 19px;
    height: 19px;
    place-items: center;
    margin-left: 7px;
    border-radius: 99px;
    padding-inline: 5px;
    color: #667a7d;
    background: #edf1eb;
    font-size: 9px;
    font-weight: 750;
  }

  .assignment-tabs :deep(.v-tab--selected .tab-count) {
    color: #315d4b;
    background: #e4eee4;
  }

  .assignment-tools {
    max-width: 430px;
    margin: 16px 0;
  }

  .assignment-search {
    margin: 0;
  }

  .assignment-list {
    display: grid;
    gap: 11px;
  }

  .assignment-card {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    border: 1px solid #e9ece6;
    padding: 14px 12px;
    background: #fffefa;
  }

  .assignment-done {
    background: #f7f9f5;
  }

  .assignment-checkbox {
    margin-top: -5px;
  }

  .assignment-detail {
    min-width: 0;
    flex: 1;
  }

  .assignment-heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .assignment-heading h3 {
    margin: 0;
    color: #284252;
    font-size: 13px;
    font-weight: 700;
  }

  .assignment-description {
    margin: 7px 0 9px;
    color: #7a888c;
    font-size: 11px;
    line-height: 1.6;
    white-space: pre-line;
  }

  .assignment-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 9px;
    color: #7c898d;
    font-size: 10px;
  }

  .assignment-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .assignment-meta .due-soon {
    color: #a87e36;
    font-weight: 750;
  }

  .priority-chip {
    text-transform: capitalize;
  }

  .assignment-empty {
    display: grid;
    justify-items: center;
    padding: 38px 14px 24px;
    text-align: center;
  }

  .compact-empty {
    padding-block: 27px;
  }

  .empty-symbol {
    margin-bottom: 12px;
    color: #57816a;
    background: #e8f0e8;
  }

  .assignment-empty h3 {
    margin: 0;
    color: #304b5a;
    font-size: 14px;
  }

  .assignment-empty p {
    margin: 5px 0 0;
    color: #839093;
    font-size: 11px;
  }

  .dialog-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 25px 26px 17px;
    border-bottom: 1px solid #e8ece6;
  }

  .form-icon {
    width: 44px;
    height: 44px;
    color: #a17b36;
    background: #f4eedb;
  }

  .dialog-heading > div:nth-child(2) {
    min-width: 0;
    flex: 1;
  }

  .dialog-heading h2 {
    margin: 5px 0 0;
    color: #203a4a;
    font-size: 19px;
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  .dialog-heading p {
    margin: 4px 0 0;
    color: #7c898d;
    font-size: 11px;
  }

  .dialog-close {
    align-self: flex-start;
  }

  .dialog-form-content {
    padding: 21px 26px 25px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 6px;
  }

  .upcoming-card {
    border-radius: 20px;
  }

  .upcoming-card .section-title-row h2 {
    margin: 6px 0 0;
    color: #203a4a;
    font-size: 18px;
    font-weight: 750;
    letter-spacing: -0.03em;
  }

  .upcoming-intro {
    margin: 6px 0 16px;
    color: #7c898d;
    font-size: 11px;
  }

  .upcoming-list {
    display: grid;
    gap: 14px;
  }

  .upcoming-item {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 0 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid #edf0eb;
  }

  .upcoming-item:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .upcoming-date {
    display: grid;
    width: 32px;
    height: 32px;
    grid-row: span 2;
    place-items: center;
    border-radius: 11px;
    color: #a17b36;
    background: #f4eedb;
  }

  .upcoming-item > div {
    display: grid;
    min-width: 0;
    gap: 3px;
  }

  .upcoming-item strong {
    overflow: hidden;
    color: #2a4554;
    font-size: 11px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upcoming-item span:not(.upcoming-date) {
    overflow: hidden;
    color: #839093;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upcoming-item time {
    grid-column: 2;
    margin-top: 4px;
    color: #a17b36;
    font-size: 9px;
    font-weight: 700;
  }

  .upcoming-empty {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    border-radius: 13px;
    padding: 13px;
    color: #64816f;
    background: #edf3eb;
    font-size: 10px;
    line-height: 1.5;
  }

  .study-tip {
    border: 1px solid #e4e9df;
    color: #355244;
    background: linear-gradient(130deg, #eaf1e7, #f6f4e9);
  }

  .tip-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 13px;
    color: #a47f3a;
    background: rgb(255 255 255 / 72%);
    font-size: 18px;
  }

  .study-tip .section-kicker {
    color: #678270;
    font-size: 8px;
  }

  .study-tip h3 {
    margin: 8px 0 5px;
    font-size: 15px;
    font-weight: 750;
  }

  .study-tip p {
    margin: 0;
    color: #6f8177;
    font-size: 11px;
    line-height: 1.6;
  }

  .materials-section {
    margin-top: 30px;
  }

  .materials-title-row {
    margin-bottom: 17px;
  }

  .upload-material-card {
    border-radius: 20px;
    padding: 12px 10px 3px;
  }

  .material-card {
    display: flex;
    flex-direction: column;
    gap: 15px;
    border-radius: 18px;
  }

  .material-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .resource-icon {
    display: grid;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 14px;
    background: #f8e9e5;
    font-size: 21px;
  }

  .material-heading h3 {
    margin: 0;
    color: #294453;
    font-size: 14px;
    font-weight: 700;
  }

  .material-heading p {
    margin: 5px 0 0;
    color: #7c898d;
    font-size: 10px;
  }

  .material-description {
    margin: 0;
    color: #728187;
    font-size: 11px;
    line-height: 1.6;
  }

  .materials-empty {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px dashed #d3ddd2;
    border-radius: 16px;
    padding: 17px 20px;
    color: #71827a;
    background: rgb(255 255 252 / 60%);
    font-size: 11px;
  }

  .materials-empty .v-icon {
    color: #648875;
  }

  .dashboard-footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 30px;
    padding: 18px 0 4px;
    border-top: 1px solid #e2e8e0;
    color: #859191;
    font-size: 10px;
  }

  .mobile-dashboard-nav {
    display: none;
  }

  @media (max-width: 1279px) {
    .mobile-dashboard-nav {
      position: fixed;
      z-index: 20;
      right: 12px;
      bottom: max(12px, env(safe-area-inset-bottom));
      left: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      border: 1px solid #e3e9e1;
      border-radius: 18px;
      padding: 8px 5px;
      background: rgb(255 255 255 / 96%);
      box-shadow: 0 10px 32px rgb(28 49 40 / 16%);
      backdrop-filter: blur(14px);
    }

    .mobile-dashboard-nav a {
      display: grid;
      justify-items: center;
      gap: 2px;
      color: #68746f;
      font-size: 10px;
      font-weight: 650;
      text-decoration: none;
    }

    .mobile-dashboard-nav .v-icon {
      color: #5146ea;
      font-size: 20px;
    }

    .dashboard-width {
      padding-bottom: 92px;
    }

    .dashboard-actions .shared-link {
      display: none;
    }
  }

  .dashboard-footer a {
    color: #638371;
    font-weight: 650;
    text-decoration: none;
  }

  :global(.v-theme--academicDark) .dashboard-page {
    color: #e2ebeb;
    background:
      radial-gradient(ellipse at 4% 0%, rgb(40 78 69 / 24%), transparent 31rem),
      #101a21;
  }

  :global(.v-theme--academicDark) .dashboard-brand,
  :global(.v-theme--academicDark) .dashboard-welcome h1,
  :global(.v-theme--academicDark) .section-title-row h2,
  :global(.v-theme--academicDark) .dialog-heading h2,
  :global(.v-theme--academicDark) .stat-copy strong,
  :global(.v-theme--academicDark) .assignment-heading h3,
  :global(.v-theme--academicDark) .material-heading h3 {
    color: #e0eae8;
  }

  :global(.v-theme--academicDark) .dashboard-brand small,
  :global(.v-theme--academicDark) .dashboard-welcome p,
  :global(.v-theme--academicDark) .section-title-row p,
  :global(.v-theme--academicDark) .stat-copy > span,
  :global(.v-theme--academicDark) .stat-copy small,
  :global(.v-theme--academicDark) .assignment-meta,
  :global(.v-theme--academicDark) .assignment-description,
  :global(.v-theme--academicDark) .material-heading p,
  :global(.v-theme--academicDark) .material-description {
    color: #a3b1b4;
  }

  :global(.v-theme--academicDark) .welcome-date,
  :global(.v-theme--academicDark) .stat-card,
  :global(.v-theme--academicDark) .section-panel,
  :global(.v-theme--academicDark) .upcoming-card,
  :global(.v-theme--academicDark) .assignment-dialog-card,
  :global(.v-theme--academicDark) .material-dialog-card,
  :global(.v-theme--academicDark) .profile-dialog-card,
  :global(.v-theme--academicDark) .upload-material-card,
  :global(.v-theme--academicDark) .material-card,
  :global(.v-theme--academicDark) .assignment-card {
    border-color: #30414a;
    background: #1b2932;
  }

  :global(.v-theme--academicDark) .assignment-done {
    background: #17242b;
  }

  :global(.v-theme--academicDark) .assignment-tabs {
    border-color: #30414a;
  }

  :global(.v-theme--academicDark) .assignment-tabs :deep(.v-tab) {
    color: #a3b1b4;
  }

  :global(.v-theme--academicDark) .assignment-tabs :deep(.v-tab--selected) {
    color: #c5dfd1;
  }

  :global(.v-theme--academicDark) .tab-count {
    color: #b7c5c1;
    background: #2d3c40;
  }

  :global(.v-theme--academicDark) .assignment-tabs :deep(.v-tab--selected .tab-count) {
    color: #d1e7d7;
    background: #31463e;
  }

  :global(.v-theme--academicDark) .dialog-heading {
    border-color: #30414a;
  }

  :global(.v-theme--academicDark) .profile-tabs {
    border-color: #30414a;
  }

  :global(.v-theme--academicDark) .profile-hint {
    color: #a3b1b4;
  }

  :global(.v-theme--academicDark) .dialog-heading h2,
  :global(.v-theme--academicDark) .upcoming-card .section-title-row h2,
  :global(.v-theme--academicDark) .upcoming-item strong {
    color: #e0eae8;
  }

  :global(.v-theme--academicDark) .dialog-heading p,
  :global(.v-theme--academicDark) .upcoming-intro,
  :global(.v-theme--academicDark) .upcoming-item span:not(.upcoming-date) {
    color: #a3b1b4;
  }

  :global(.v-theme--academicDark) .upcoming-item {
    border-color: #30414a;
  }

  :global(.v-theme--academicDark) .upcoming-date {
    color: #d4b66e;
    background: #393628;
  }

  :global(.v-theme--academicDark) .upcoming-empty {
    color: #b7c9bb;
    background: #263a34;
  }

  :global(.v-theme--academicDark) .stat-pending .stat-icon,
  :global(.v-theme--academicDark) .form-icon {
    color: #d4b66e;
    background: #393628;
  }

  :global(.v-theme--academicDark) .stat-complete .stat-icon,
  :global(.v-theme--academicDark) .empty-symbol {
    color: #9bc9ad;
    background: #263a34;
  }

  :global(.v-theme--academicDark) .stat-resources .stat-icon {
    color: #9ac5d0;
    background: #263a42;
  }

  :global(.v-theme--academicDark) .study-tip {
    border-color: #33443d;
    color: #dbe8de;
    background: linear-gradient(130deg, #253a34, #30382f);
  }

  :global(.v-theme--academicDark) .study-tip p,
  :global(.v-theme--academicDark) .study-tip .section-kicker {
    color: #b1c0b4;
  }

  :global(.v-theme--academicDark) .tip-icon {
    color: #d4b66e;
    background: #3d3b30;
  }

  :global(.v-theme--academicDark) .materials-empty {
    border-color: #3a4a4b;
    color: #afbdba;
    background: #1b2932;
  }

  :global(.v-theme--academicDark) .dashboard-footer {
    border-color: #30414a;
    color: #9ba9ab;
  }

  :global(.v-theme--academicDark) .dashboard-footer a {
    color: #a5cbbb;
  }

  :global(.v-theme--campusGreen) .dashboard-page {
    color: #264538;
    background: radial-gradient(ellipse at 4% 0%, #dcebe0, transparent 31rem), #edf4ee;
  }

  :global(.v-theme--campusGreen) .dashboard-brand,
  :global(.v-theme--campusGreen) .dashboard-welcome h1,
  :global(.v-theme--campusGreen) .section-title-row h2,
  :global(.v-theme--campusGreen) .dialog-heading h2,
  :global(.v-theme--campusGreen) .stat-copy strong {
    color: #284a3a;
  }

  :global(.v-theme--campusGreen) .stat-card,
  :global(.v-theme--campusGreen) .section-panel,
  :global(.v-theme--campusGreen) .upcoming-card,
  :global(.v-theme--campusGreen) .assignment-card,
  :global(.v-theme--campusGreen) .material-card,
  :global(.v-theme--campusGreen) .assignment-dialog-card,
  :global(.v-theme--campusGreen) .material-dialog-card,
  :global(.v-theme--campusGreen) .profile-dialog-card {
    border-color: #d6e4d8;
    background: #fbfef9;
  }

  :global(.v-theme--libraryWarm) .dashboard-page {
    color: #49382b;
    background: radial-gradient(ellipse at 4% 0%, #eee1ce, transparent 31rem), #f7f0e6;
  }

  :global(.v-theme--libraryWarm) .dashboard-brand,
  :global(.v-theme--libraryWarm) .dashboard-welcome h1,
  :global(.v-theme--libraryWarm) .section-title-row h2,
  :global(.v-theme--libraryWarm) .dialog-heading h2,
  :global(.v-theme--libraryWarm) .stat-copy strong {
    color: #57412f;
  }

  :global(.v-theme--libraryWarm) .stat-card,
  :global(.v-theme--libraryWarm) .section-panel,
  :global(.v-theme--libraryWarm) .upcoming-card,
  :global(.v-theme--libraryWarm) .assignment-card,
  :global(.v-theme--libraryWarm) .material-card,
  :global(.v-theme--libraryWarm) .assignment-dialog-card,
  :global(.v-theme--libraryWarm) .material-dialog-card,
  :global(.v-theme--libraryWarm) .profile-dialog-card {
    border-color: #e9ddcd;
    background: #fffaf2;
  }

  :global(.v-theme--scholarBlue) .dashboard-page {
    color: #2b4358;
    background: radial-gradient(ellipse at 4% 0%, #dce8f1, transparent 31rem), #eef3f8;
  }

  :global(.v-theme--scholarBlue) .dashboard-brand,
  :global(.v-theme--scholarBlue) .dashboard-welcome h1,
  :global(.v-theme--scholarBlue) .section-title-row h2,
  :global(.v-theme--scholarBlue) .dialog-heading h2,
  :global(.v-theme--scholarBlue) .stat-copy strong {
    color: #294766;
  }

  :global(.v-theme--scholarBlue) .stat-card,
  :global(.v-theme--scholarBlue) .section-panel,
  :global(.v-theme--scholarBlue) .upcoming-card,
  :global(.v-theme--scholarBlue) .assignment-card,
  :global(.v-theme--scholarBlue) .material-card,
  :global(.v-theme--scholarBlue) .assignment-dialog-card,
  :global(.v-theme--scholarBlue) .material-dialog-card,
  :global(.v-theme--scholarBlue) .profile-dialog-card {
    border-color: #dbe5ee;
    background: #fbfdff;
  }

  .moderation-panel {
    margin-bottom: 24px;
    border: 1px solid #e4e9e1;
    border-radius: 22px;
    padding: 22px;
    background: #fffefa;
    box-shadow: 0 9px 28px rgb(30 53 54 / 4%);
  }

  .moderation-list,
  .notification-list {
    display: grid;
    gap: 10px;
    margin-top: 15px;
  }

  .moderation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border: 1px solid #e5eae3;
    border-radius: 16px;
    padding: 14px;
    background: #fbfcf8;
  }

  .moderation-copy {
    display: grid;
    min-width: 0;
    gap: 6px;
  }

  .moderation-copy strong,
  .moderation-copy span,
  .moderation-copy p {
    overflow-wrap: anywhere;
  }

  .moderation-copy strong {
    color: #294453;
    font-size: 14px;
  }

  .moderation-copy span,
  .moderation-copy p {
    margin: 0;
    color: #718085;
    font-size: 11px;
  }

  .moderation-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: 14px;
    padding: 12px;
  }

  .notification-unread {
    background: #f0f5ef;
  }

  .notification-item p {
    margin: 0;
    color: #344a55;
  }

  .notification-item small {
    display: block;
    margin-top: 5px;
    color: #83908e;
  }

  @media (max-width: 1279px) {
    .dashboard-content > .v-col {
      flex: 0 0 100% !important;
      max-width: 100% !important;
    }

    .material-grid > .v-col {
      flex: 0 0 100% !important;
      max-width: 100% !important;
    }

    .dashboard-header {
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 22px;
    }

    .dashboard-brand {
      min-width: 0;
      flex: 1 1 145px;
    }

    .dashboard-brand strong {
      white-space: nowrap;
    }

    .dashboard-actions {
      min-width: 0;
      flex: 0 1 auto;
      justify-content: flex-end;
      gap: 4px;
    }

    .dashboard-actions .profile-button,
    .dashboard-actions .support-button,
    .dashboard-actions .logout-button {
      min-width: 40px;
      padding-inline: 9px;
      font-size: 0;
    }

    .dashboard-actions .profile-button :deep(.v-icon),
    .dashboard-actions .support-button :deep(.v-icon),
    .dashboard-actions .logout-button :deep(.v-icon) {
      font-size: 20px !important;
      margin-inline: 0;
    }
  }

  @media (max-width: 600px) {
    .moderation-panel {
      padding: 16px 13px;
    }

    .moderation-item {
      align-items: stretch;
      flex-direction: column;
      gap: 12px;
    }

    .moderation-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      justify-content: stretch;
    }

    .moderation-actions > :deep(.v-btn:first-child) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 760px) {
    .mobile-dashboard-nav {
      position: fixed;
      z-index: 20;
      right: 12px;
      bottom: max(12px, env(safe-area-inset-bottom));
      left: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      border: 1px solid #e3e9e1;
      border-radius: 18px;
      padding: 8px 5px;
      background: rgb(255 255 255 / 96%);
      box-shadow: 0 10px 32px rgb(28 49 40 / 16%);
      backdrop-filter: blur(14px);
    }

    .mobile-dashboard-nav a {
      display: grid;
      justify-items: center;
      gap: 2px;
      color: #68746f;
      font-size: 10px;
      font-weight: 650;
      text-decoration: none;
    }

    .mobile-dashboard-nav .v-icon {
      color: #5146ea;
      font-size: 20px;
    }

    .dashboard-width {
      padding-bottom: 92px;
    }
    .dashboard-header {
      margin-bottom: 26px;
    }

    .shared-link {
      display: none;
    }

    .profile-button {
      min-width: 40px;
      padding-inline: 10px;
      font-size: 0;
    }

    .profile-button :deep(.v-icon) {
      margin-inline: 0;
    }

    .dashboard-welcome {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
    }

    .dashboard-hero {
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.65fr);
      padding: 24px;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .stat-card {
      min-height: 98px;
    }

    .section-panel {
      padding: 19px 15px;
    }

    .assignment-heading-actions {
      align-items: flex-end;
      flex-direction: column-reverse;
      gap: 7px;
    }

    .assignment-heading-actions .v-btn {
      font-size: 10px;
    }

    .dialog-heading {
      padding: 19px 18px 14px;
    }

    .dialog-form-content {
      padding: 18px;
    }
  }

  @media (max-width: 480px) {
    .dashboard-width {
      padding-inline: 16px;
    }

    .dashboard-hero {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 22px;
    }

    .dashboard-hero-image {
      width: min(100%, 300px);
      justify-self: center;
    }

    .dashboard-brand {
      gap: 7px;
    }

    .dashboard-brand img {
      width: 35px;
      height: 35px;
    }

    .dashboard-brand strong {
      font-size: 11px;
    }

    .dashboard-brand small {
      display: none;
    }

    .dashboard-actions {
      gap: 5px;
    }

    .dashboard-actions > .v-btn:last-child {
      min-width: 38px;
      padding-inline: 9px;
      font-size: 0;
    }

    .dashboard-actions > .v-btn:last-child .v-icon {
      margin: 0;
    }

    .section-panel {
      padding-inline: 14px;
    }

    .assignment-heading-actions .due-soon-summary {
      display: none;
    }

    .materials-toolbar {
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
    }

    .material-category-filter {
      min-width: 0;
    }

    .assignment-heading-actions .v-btn {
      min-width: 0;
      padding-inline: 12px;
    }

    .assignment-tabs {
      margin-inline: -5px;
    }

    .assignment-tabs :deep(.v-tab) {
      padding-inline: 8px;
      font-size: 10px;
    }

    .dialog-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }

    .dialog-actions .v-btn {
      min-height: 42px;
    }

    .assignment-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .dashboard-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
