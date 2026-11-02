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
