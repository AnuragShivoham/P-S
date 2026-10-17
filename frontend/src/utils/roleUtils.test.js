import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_ROLES,
  normalizeRoles,
  getPrimaryRole,
  getDashboardPathForRole,
} from './roleUtils.js';

test('allowed roles include all supported roles', () => {
  assert.deepEqual(ALLOWED_ROLES, ['student', 'citizen', 'mentor', 'university', 'admin']);
});

test('normalizeRoles builds a deduplicated role list from mixed input', () => {
  assert.deepEqual(normalizeRoles(['Student', 'mentor', 'student', 'Mentor']), ['student', 'mentor']);
  assert.deepEqual(normalizeRoles('["citizen","admin","citizen"]'), ['citizen', 'admin']);
  assert.deepEqual(normalizeRoles(null), []);
});

test('getPrimaryRole picks the active role or first valid role', () => {
  assert.equal(getPrimaryRole({ role: 'mentor', roles: ['student', 'mentor'] }), 'mentor');
  assert.equal(getPrimaryRole({ roles: ['university', 'student'] }), 'university');
  assert.equal(getPrimaryRole({}), 'student');
});

test('dashboard routes follow the active role without forcing a single-role identity', () => {
  assert.equal(getDashboardPathForRole('student'), '/projects');
  assert.equal(getDashboardPathForRole('citizen'), '/citizen-dashboard');
  assert.equal(getDashboardPathForRole('mentor'), '/mentor');
  assert.equal(getDashboardPathForRole('admin'), '/admin');
  assert.equal(getDashboardPathForRole('university'), '/university');
});
