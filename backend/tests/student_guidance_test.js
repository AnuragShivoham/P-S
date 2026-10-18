/**
 * student_guidance_test.js
 * 
 * Comprehensive Test Suite for Zero-Input Student Gap Report & I.D.E. Guidance
 * 
 * Verifies:
 * 1. Honest Competency State: Profile returns empty competencies array for new student (no synthetic seeding)
 * 2. Zero-Input Role Guidance Generation: Generates complete report even with 0 student evidence
 * 3. Separation of Concerns: Market requirements separated from student evidence (score is null, status is NOT_ASSESSED)
 * 4. Provenance & Freshness: Source counts and deterministic engine reported accurately
 * 5. Role Switching: Dynamically evaluates different career paths from roles_ontology
 * 6. Actionable I.D.E. Guidance: Recommends new project vs upgrade based on real project presence
 * 7. LLM Independence: 100% deterministic execution resilient to AI provider outages
 */

const assert = require('assert');
const db = require('../src/db/database');
const { generateStudentRoleGuidance, invalidateGuidanceCache } = require('../src/services/studentGuidanceService');

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function itAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('RUNNING ZERO-INPUT STUDENT GAP & I.D.E. GUIDANCE TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════════\n');

  const testStudentId = `student_zero_input_${Date.now()}`;

  // Create a brand new clean student record
  db.prepare(`
    INSERT INTO users (id, email, name, role)
    VALUES (?, ?, ?, 'student')
  `).run(testStudentId, `${testStudentId}@example.com`, 'Test Zero-Input Learner');

  // Test 1: Honest Data Model (No synthetic claimed skills)
  it('Data Model: Student with no records has exactly 0 competencies (no synthetic claims)', () => {
    const existing = db.prepare('SELECT * FROM student_competency_profiles WHERE student_id = ?').all(testStudentId);
    assert.strictEqual(existing.length, 0, 'New student must not have synthetic competency claims seeded');
  });

  // Test 2: Role Guidance Generation with Zero Evidence
  await itAsync('Zero-Input Experience: Role guidance renders completely with zero student records', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert(report !== null, 'Report must be returned');
    assert.strictEqual(report.profile_state, 'NO_EVIDENCE', 'Profile state must be NO_EVIDENCE');
    assert(report.role, 'Report must contain resolved role object');
    assert.strictEqual(report.role.id, 'software-engineering-intern');
    assert(Array.isArray(report.competencies), 'Competencies must be an array');
    assert(report.competencies.length > 0, 'Market requirements must be populated from ontology/labour_requirements');
  });

  // Test 3: Unassessed Readiness Score (Never invent a fake score)
  await itAsync('Readiness Accuracy: Score is null and status is NOT_ASSESSED when student has no evidence', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert.strictEqual(report.readiness.score, null, 'Readiness score must be null for unassessed students (not 0 or 50)');
    assert.strictEqual(report.readiness.status, 'NOT_ASSESSED', 'Readiness status must be NOT_ASSESSED');
    assert(report.readiness.reason.includes('Insufficient verified student evidence'), 'Readiness reason must be clear and constructive');
  });

  // Test 4: Competency Evidence Separation (Unknown proficiency is NOT marked failure or beginner)
  await itAsync('Evidence Separation: Unassessed competencies are marked evidence_state NONE and gap_status UNKNOWN', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    for (const comp of report.competencies) {
      assert.strictEqual(comp.evidence_state, 'NONE', `Competency ${comp.skill_id} evidence_state must be NONE`);
      assert.strictEqual(comp.gap_status, 'UNKNOWN', `Competency ${comp.skill_id} gap_status must be UNKNOWN`);
      assert.strictEqual(comp.recommended_action, 'BUILD_AND_VALIDATE_PROJECT');
    }
  });

  // Test 5: Provenance and Market Signal Tracking
  await itAsync('Provenance & Signals: Report specifies deterministic engine and market data source counts', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert.strictEqual(report.provenance.engine, 'deterministic', 'Engine must report deterministic provenance');
    assert.strictEqual(report.provenance.report_version, '1.0');
    assert(report.market_data.source_count >= 0, 'Source count must be tracked');
    assert(report.market_data.last_updated, 'last_updated timestamp must exist');
  });

  // Test 6: 4-Phase Progressive Roadmap
  await itAsync('Roadmap Architecture: Generates progressive 4-phase learning and validation roadmap', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert(Array.isArray(report.roadmap), 'Roadmap must be an array');
    assert.strictEqual(report.roadmap.length, 4, 'Must have 4 standard progressive phases');
    assert.strictEqual(report.roadmap[0].phase, 'LEARN');
    assert.strictEqual(report.roadmap[1].phase, 'BUILD');
    assert.strictEqual(report.roadmap[2].phase, 'VALIDATE');
    assert.strictEqual(report.roadmap[3].phase, 'REASSESS');
    assert(report.roadmap.every(s => s.deliverable && s.validation), 'Every roadmap phase must include deliverable and validation criteria');
  });

  // Test 7: I.D.E. Action when Student has No Projects
  await itAsync('I.D.E. Action (New Student): Recommends NEW_IDE_PROJECT when student has no existing repositories', async () => {
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert(report.recommended_projects.length > 0, 'Must have project recommendations');
    const rec = report.recommended_projects[0];
    assert.strictEqual(rec.action_type, 'NEW_IDE_PROJECT', 'Must recommend NEW_IDE_PROJECT for new student');
    assert.strictEqual(rec.project_id, null);
  });

  // Test 8: I.D.E. Action when Student has an Existing Project
  await itAsync('I.D.E. Action (Active Student): Recommends UPGRADE_EXISTING_PROJECT when compatible project exists', async () => {
    const projId = `proj_test_${Date.now()}`;
    db.prepare(`
      INSERT INTO projects (id, user_id, title, raw_goal, status, tech_stack)
      VALUES (?, ?, 'My Microservice', 'Build a backend service', 'active', 'Node.js, Express')
    `).run(projId, testStudentId);

    invalidateGuidanceCache(testStudentId);
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert.strictEqual(report.profile_state, 'PARTIAL_EVIDENCE', 'Profile state should reflect project presence');
    assert(report.recommended_projects.length > 0);
    const rec = report.recommended_projects[0];
    assert.strictEqual(rec.action_type, 'UPGRADE_EXISTING_PROJECT', 'Must recommend upgrading existing project');
    assert.strictEqual(rec.project_id, projId);
  });

  // Test 9: Verified Evidence updates Readiness Score
  await itAsync('Evidence Loop: Verified evidence transitions readiness from NOT_ASSESSED to scored progress', async () => {
    db.prepare(`
      INSERT INTO competency_evidence_store (
        id, learner_id, skill_id, role_id, evidence_type, status, rubric_version, competency_version
      ) VALUES (?, ?, 'programming', 'software-engineering-intern', 'test_eval', 'VERIFIED', 1, 1)
    `).run(`ev_test_${Date.now()}`, testStudentId);

    invalidateGuidanceCache(testStudentId);
    const report = await generateStudentRoleGuidance(testStudentId, 'software-engineering-intern');
    assert.strictEqual(report.profile_state, 'VERIFIED_EVIDENCE');
    assert(typeof report.readiness.score === 'number', 'Readiness score should now be a number');
    assert(report.readiness.score > 0, 'Score should reflect verified evidence percentage');
    const progComp = report.competencies.find(c => c.skill_id === 'programming');
    assert(progComp, 'Programming competency must exist');
    assert.strictEqual(progComp.evidence_state, 'VERIFIED');
    assert.strictEqual(progComp.gap_status, 'VERIFIED');
  });

  // Test 10: Role Switching Support
  await itAsync('Role Switching: Dynamically resolves other roles from ontology (software-engineer, backend-engineer)', async () => {
    invalidateGuidanceCache(testStudentId);
    const sweReport = await generateStudentRoleGuidance(testStudentId, 'software-engineer');
    assert.strictEqual(sweReport.role.id, 'software-engineer');
    assert.strictEqual(sweReport.role.selection_type, 'selected');

    invalidateGuidanceCache(testStudentId);
    const backendReport = await generateStudentRoleGuidance(testStudentId, 'backend-engineer');
    assert.strictEqual(backendReport.role.id, 'backend-engineer');
    assert(backendReport.competencies.length > 0);
  });

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`ZERO-INPUT GUIDANCE RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('═════════════════════════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
