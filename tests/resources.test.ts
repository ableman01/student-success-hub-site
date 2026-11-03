import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  findDuplicateIds,
  getResourceIdentityKey,
  normalizeCourseLabel,
} from '../src/lib/identity.ts'

test('course labels normalize spacing, punctuation, and case', () => {
  assert.equal(normalizeCourseLabel('bio-201'), 'bio 201')
  assert.equal(normalizeCourseLabel('BIO201'), 'bio 201')
})

test('a course code in the title and course field shares one identity', () => {
  assert.equal(
    getResourceIdentityKey('BIO 201', 'BIO 201 Week 4 Notes.pdf'),
    getResourceIdentityKey('BIO201', 'Week 4 Notes'),
  )
})

test('duplicate cleanup keeps the preferred resource and lists redundant ids', () => {
  const items = [
    { id: 'preferred', key: 'bio::week 4 notes', rank: 0 },
    { id: 'duplicate', key: 'bio::week 4 notes', rank: 1 },
    { id: 'other', key: 'bio::week 5 notes', rank: 0 },
  ]
  const removed = findDuplicateIds(items, item => item.key, (a, b) => a.rank - b.rank)
  assert.deepEqual(removed, ['duplicate'])
})

test('database report policies bind submissions and moderation to institution scope', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261102000000_resource_metadata_and_reports.sql', import.meta.url), 'utf8')
  assert.match(migration, /reporter_id\s*=\s*\(select auth\.uid\(\)\)/)
  assert.match(migration, /institution_key\s*=\s*\(select public\.current_student_institution_key\(\)\)/)
  assert.match(migration, /exists \(select 1 from public\.resource_moderators moderator/)
  assert.match(migration, /where resource\.id = resource_reports\.resource_id/)
})

test('upload approval notifications include institution details and stay scoped to moderators', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261103160000_add_institution_to_upload_notifications.sql', import.meta.url), 'utf8')
  assert.match(migration, /new\.institution_type/)
  assert.match(migration, /new\.institution_name/)
  assert.match(migration, /moderator\.is_global_admin\s+or profile\.institution_key = new\.institution_key/)
  assert.match(migration, /left\(concat_ws\([\s\S]*\), 500\)/)
})

test('all students can report approved resources and global admins can delete cross-institution resources', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261103170000_all_students_resource_feedback_and_global_deletion.sql', import.meta.url), 'utf8')
  assert.match(migration, /reporter_id = \(select auth\.uid\(\)\)/)
  assert.match(migration, /resource\.status = 'approved'/)
  assert.doesNotMatch(migration, /resource\.uploaded_by\s*<>\s*\(select auth\.uid\(\)\)/)
  assert.match(migration, /for delete to authenticated\s+using \(\(select public\.is_global_resource_admin\(\)\)\)/)
  assert.match(migration, /bucket_id = 'student-resources'\s+and \(select public\.is_global_resource_admin\(\)\)/)
})

test('approved past questions and class materials show an expandable feedback box', async () => {
  const component = await readFile(new URL('../src/components/ResourceFeedback.vue', import.meta.url), 'utf8')
  const homePage = await readFile(new URL('../src/pages/index.vue', import.meta.url), 'utf8')
  const dashboard = await readFile(new URL('../src/pages/dashboard.vue', import.meta.url), 'utf8')
  assert.match(component, /Add a comment or review/)
  assert.match(component, /v-if="viewerId && resource\.status === 'approved'"/)
  assert.doesNotMatch(component, /viewerId !== resource\.uploaded_by/)
  assert.match(homePage, /<ResourceFeedback :resource="resource" :viewer-id="currentUser\?\.id" \/>/)
  assert.match(dashboard, /<ResourceFeedback :resource="resource" :viewer-id="user\?\.id" \/>/)
  assert.equal((dashboard.match(/prepend-icon="mdi-delete-outline"[\s\S]{0,180}>Delete<\/v-btn>/g) || []).length > 0, true)
})

test('past questions use an explicit upload label without a classmate discussion shortcut', async () => {
  const homePage = await readFile(new URL('../src/pages/index.vue', import.meta.url), 'utf8')
  assert.match(homePage, /Upload past question/)
  assert.doesNotMatch(homePage, /Discuss with classmates/)
})

test('admin shows approved resources from every institution and paginates moderation history', async () => {
  const dashboard = await readFile(new URL('../src/pages/dashboard.vue', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/resources.ts', import.meta.url), 'utf8')
  assert.match(dashboard, /Approved resources/)
  assert.match(dashboard, /const approvedResources = computed\(\(\) => moderationHistory\.value\.filter\(resource => resource\.status === 'approved'\)\)/)
  assert.match(dashboard, /institution_name \|\| resource\.institution_key/)
  assert.match(service, /\.neq\('status', 'pending'\)[\s\S]*?\.range\(offset, offset \+ pageSize - 1\)/)
})

test('study room prioritizes full-width live chat and class material actions say upload', async () => {
  const studyRoom = await readFile(new URL('../src/pages/study-room.vue', import.meta.url), 'utf8')
  const dashboard = await readFile(new URL('../src/pages/dashboard.vue', import.meta.url), 'utf8')
  assert.ok(studyRoom.indexOf('class="groups-invitation"') < studyRoom.indexOf('id="course-room"'))
  assert.ok(studyRoom.indexOf('id="course-room"') < studyRoom.indexOf('id="course-resources"'))
  assert.match(studyRoom, /<v-col cols="12">\s*<v-card id="course-room"/)
  assert.match(dashboard, /Upload class materials/)
  assert.doesNotMatch(dashboard, /Add new material|Add class material/)
})
