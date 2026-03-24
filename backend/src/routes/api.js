const express = require('express');
const router  = express.Router();
const config  = require('../config');
const tracker = require('../services/progressTracker');
const goalClarifier     = require('../engines/goalClarifier');
const milestoneGenerator = require('../engines/milestoneGenerator');
const taskPlanner       = require('../engines/taskPlanner');
const courseService     = require('../services/courseService');
const guidedExecution   = require('../engines/guidedExecution');
const qaCritic          = require('../engines/qaCritic');
const automationAdvisor = require('../engines/automationAdvisor');
const WorkspaceService  = require('../services/workspaceService');
const auth = require('../middleware/auth');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[Route Error]', e.message);
  res.status(500).json({ error: e.message });
});

// ── INTERNAL: activate project + generate plan ────────────────────────────────
async function activateAndPlan(res, project, extracted) {
  // Safeguard: Ensure all fields are primitives for SQLite binding
  const safeExtracted = {
    title: String(extracted.title || 'Untitled Project'),
    tech_stack: Array.isArray(extracted.tech_stack) ? extracted.tech_stack : [],
    scope: String(extracted.scope || ''),
    deadline_days: Number(extracted.deadline_days) || 30,
    skill_level: String(extracted.skill_level || 'beginner'),
    deliverables: Array.isArray(extracted.deliverables) ? extracted.deliverables : []
  };
  
  project = tracker.activateProject(project.id, safeExtracted);

  // Milestones - Use safeExtracted for AI prompt too
  const mData = await milestoneGenerator.generateMilestones(safeExtracted);
  const mObjs = mData.map(m => tracker.createMilestone(project.id, m));

  // Unlock milestone 1 + generate tasks
  const first = mObjs[0];
  tracker.unlockMilestone(first.id);

  const ctx = { tech_stack: project.tech_stack, skill_level: project.skill_level, scope: project.scope };
  const tData = await taskPlanner.generateTasks(
    { order: first.ord, title: first.title, description: first.description, duration_days: first.duration_days, measurable_output: first.measurable_output },
    ctx
  );
  const tObjs = tData.map(t => tracker.createTask(first.id, t));

  tracker.setCurrentPointers(project.id, first.id, tObjs[0]?.id || null);
  project = tracker.refreshProgress(project.id);

  tracker.logTurn(project.id, 'mentor', `Project '${project.title}' ready. Start: ${first.title}`, 'task_guidance');

  res.status(201).json({
    action: 'plan_ready',
    message: `Project '${project.title}' is ready. ${mObjs.length} milestone(s). Start with: ${first.title}`,
    project,
    milestones: tracker.getProjectMilestones(project.id),
    task: tObjs[0] || null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/users', wrap(async (req, res) => {
  const { email, name, skill_level = 'beginner' } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'email and name required' });
  if (tracker.getUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });
  res.status(201).json(tracker.createUser(email, name, skill_level));
}));

router.get('/users/:id', wrap(async (req, res) => {
  const u = tracker.getUser(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GOAL SUBMISSION + CLARIFICATION
// ─────────────────────────────────────────────────────────────────────────────
router.post('/goals/submit', wrap(async (req, res) => {
  const { raw_goal } = req.body;
  const user_id = req.user.id;
  if (!raw_goal) return res.status(400).json({ error: 'raw_goal required' });
  if (raw_goal.trim().length < 20) return res.status(400).json({ error: 'Goal too vague — describe what you want to build, what tech, and by when' });
  if (!tracker.getUser(user_id)) return res.status(404).json({ error: 'User not found' });

  const result = await goalClarifier.clarifyGoal(raw_goal);

  if (result.status === 'rejected') {
    return res.json({ action: 'rejected', message: `Goal rejected: ${result.reason}` });
  }

  const project = tracker.createProject(user_id, raw_goal);
  tracker.logTurn(project.id, 'user', raw_goal, 'clarification');

  if (result.status === 'needs_clarification') {
    const questions = result.questions.map(q => q.question);
    tracker.setClarification(project.id, [{ questions: result.questions }], 1);
    const msg = `Answer these questions:\n${questions.map((q,i) => `${i+1}. ${q}`).join('\n')}`;
    tracker.logTurn(project.id, 'mentor', msg, 'clarification');
    return res.status(201).json({ action: 'clarify', message: msg, project: tracker.getProject(project.id), clarification_questions: questions });
  }

  await activateAndPlan(res, project, result);
}));

router.post('/goals/clarify', wrap(async (req, res) => {
  const { project_id, answers } = req.body;
  if (!project_id || !answers) return res.status(400).json({ error: 'project_id and answers required' });

  const project = tracker.getProject(project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (project.status !== 'clarifying') return res.status(400).json({ error: 'Project is not in clarifying state' });
  if (project.clarification_round >= config.MAX_CLARIFY_ROUNDS) {
    return res.status(400).json({ error: 'Max clarification rounds reached. Resubmit with a more specific goal.' });
  }

  const history = Array.isArray(project.clarification_history) ? project.clarification_history : [];
  history.push({ answers });
  tracker.setClarification(project_id, history, project.clarification_round + 1);
  tracker.logTurn(project_id, 'user', JSON.stringify(answers), 'clarification');

  const result = await goalClarifier.clarifyGoal(project.raw_goal, history);

  if (result.status === 'rejected') {
    return res.json({ action: 'rejected', message: `Rejected: ${result.reason}` });
  }
  if (result.status === 'needs_clarification') {
    const questions = result.questions.map(q => q.question);
    history.push({ questions: result.questions });
    tracker.setClarification(project_id, history, project.clarification_round + 1);
    const msg = `Still need clarification:\n${questions.map((q,i) => `${i+1}. ${q}`).join('\n')}`;
    tracker.logTurn(project_id, 'mentor', msg, 'clarification');
    return res.json({ action: 'clarify', message: msg, project: tracker.getProject(project_id), clarification_questions: questions });
  }

  await activateAndPlan(res, tracker.getProject(project_id), result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ENGINE ROUTES (V2)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/courses', wrap(async (req, res) => {
  const courses = courseService.getActiveCourses();
  res.json(courses);
}));

router.get('/courses/:id', wrap(async (req, res) => {
  const structure = courseService.getCourseFullStructure(req.params.id);
  if (!structure || !structure.course.active) {
    return res.status(404).json({ error: 'Course inactive or not found' });
  }
  res.json(structure);
}));

router.post('/courses/:id/start', wrap(async (req, res) => {
  const courseId = req.params.id;
  const courseInfo = courseService.getCourse(courseId);
  
  if (!courseInfo || !courseInfo.active) {
    return res.status(404).json({ error: 'Course unavailable' });
  }

  // Create Reference Project Shell
  const { v4: uuidv4 } = require('uuid');
  const db = require('../db/database');
  const projId = uuidv4();
  
  db.prepare(`
    INSERT INTO projects (id, user_id, raw_goal, title, tech_stack, status, is_course, course_id, course_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    projId, 
    req.user.id, 
    `Learning Course: ${courseInfo.title}`, 
    courseInfo.title, 
    courseInfo.tech_stack, 
    'active', 
    1, 
    courseInfo.id, 
    courseInfo.version
  );

  const workspaceService = require('../services/workspaceService');
  await workspaceService.initWorkspace(projId, 'nodejs');
  
  tracker.setActiveProject(req.user.id, projId);
  res.json({ success: true, project_id: projId });
}));

router.post('/courses/tasks/:id/submit', wrap(async (req, res) => {
  const courseTaskId = req.params.id;
  const { projectId } = req.body; // Need to know which session to check

  const project = tracker.getProject(projectId);
  if (!project || project.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (!project.is_course) return res.status(400).json({ error: 'Not a course project' });

  // Get source-of-truth task rule
  const db = require('../db/database');
  const courseTask = db.prepare('SELECT * FROM course_tasks WHERE id = ?').get(courseTaskId);
  if (!courseTask) return res.status(404).json({ error: 'Task missing' });

  const WorkspaceService = require('../services/workspaceService');
  const workspacePath = WorkspaceService.getWorkspacePath(projectId);

  // BYPASS QA CRITIC -> Static Sandbox Eval
  const result = courseService.validateStaticTask(courseTask, workspacePath);

  // User table = progress only (Upsert into course_progress)
  // Ensure attempt counts increment safely
  db.prepare(`
    INSERT INTO course_progress (id, project_id, course_task_id, status, attempts, completed_at)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET 
      attempts = attempts + 1,
      status = excluded.status,
      completed_at = excluded.completed_at
  `).run(
    require('uuid').v4(), 
    projectId, 
    courseTaskId, 
    result.passed ? 'passed' : 'failed', 
    result.passed ? new Date().toISOString() : null
  );

  res.json({
    verdict: result.passed ? 'pass' : 'fail',
    feedback: result.passed ? 'Excellent work! Everything looks correct.' : result.hint,
    corrections: [] // No AI suggestions mapped
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOR & SCAFFOLDING (V2 ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/courses/behavior/log', auth, wrap(async (req, res) => {
  const learningController = require('../engines/learningController');
  const { taskId, pasteSize, typingSpeed, attempts, timeSpent } = req.body;
  if (!taskId) return res.status(400).json({ error: 'Missing course task context' });
  
  const result = learningController.analyzeBehavior(req.user.id, { taskId, pasteSize, typingSpeed, attempts, timeSpent });
  res.json(result); 
}));

router.get('/courses/tasks/:id/scaffold', auth, wrap(async (req, res) => {
  const learningController = require('../engines/learningController');
  const courseTaskId = req.params.id;
  const db = require('../db/database');
  
  // 1. (BEST) Derive Active Project explicitly from immutable User session state (No timestamp guesswork)
  const userRow = db.prepare('SELECT active_project_id FROM users WHERE id = ?').get(req.user.id);
  
  if (!userRow || !userRow.active_project_id) {
     return res.status(403).json({ error: 'Access denied: No active course project found for user' });
  }
  const projectId = userRow.active_project_id;
  
  let progressData = { attempts: 0, last_scaffold_level: 1 };
  const pRow = db.prepare('SELECT attempts, last_scaffold_level FROM course_progress WHERE course_task_id = ? AND project_id = ?').get(courseTaskId, projectId);
  if (pRow) progressData = pRow;
  
  const behaviorData = db.prepare('SELECT cheat_score FROM behavior_logs WHERE user_id = ? AND task_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id, courseTaskId) || { cheat_score: 0 };
  
  const payload = learningController.controlScaffold(req.user.id, courseTaskId, true, projectId, progressData, behaviorData);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/projects/latest', wrap(async (req, res) => {
  const userId = req.user.id;
  const user = tracker.getUser(userId);
  let latestId = user.active_project_id;
  
  if (!latestId) {
    const projects = tracker.getUserProjects(userId);
    if (!projects || projects.length === 0) return res.json({ project: null });
    latestId = projects[0].id;
  }
  
  const state = tracker.getResumeState(latestId);
  if (!state || !state.project || state.project.user_id !== userId) return res.json({ project: null });

  res.json({
    action: 'task_guidance',
    project: state.project,
    task: state.task,
    milestones: tracker.getProjectMilestones(latestId),
    conversation: tracker.getConversation(latestId, userId, 100),
  });
}));

router.get('/projects/:id', wrap(async (req, res) => {
  if (req.params.id === 'latest') return; 
  const p = tracker.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(p);
}));

router.get('/users/:id/projects', wrap(async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(tracker.getUserProjects(req.params.id));
}));

router.get('/projects/:id/resume', wrap(async (req, res) => {
  const state = tracker.getResumeState(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });
  
  const { project, milestone, task } = state;
  // Ownership check
  if (project.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  tracker.setActiveProject(req.user.id, project.id);

  res.json({
    action: 'task_guidance',
    message: `Resuming '${project.title}' — ${project.progress_pct}% (${project.completed_tasks}/${project.total_tasks} tasks)\nCurrent: ${milestone?.title || 'N/A'} › ${task?.title || 'All done'}`,
    project,
    task,
    milestones: tracker.getProjectMilestones(project.id),
    conversation: tracker.getConversation(project.id, req.user.id, 100),
  });
}));

router.delete('/projects/:id', wrap(async (req, res) => {
  const p = tracker.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  tracker.deleteProject(p.id);
  try {
    WorkspaceService.deleteProjectWorkspace(p.id);
  } catch (e) {
    console.error('[Delete Error] Workspace cleanup failed:', e.message);
  }
  res.json({ success: true });
}));

router.get('/projects/:id/milestones', wrap(async (req, res) => {
  const p = tracker.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(tracker.getProjectMilestones(req.params.id));
}));

router.get('/projects/:id/conversation', wrap(async (req, res) => {
  const p = tracker.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(tracker.getConversation(req.params.id, req.user.id, 100));
}));

router.get('/projects/:id/automations', wrap(async (req, res) => {
  const p = tracker.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(tracker.getProjectAutomations(req.params.id));
}));

// ─────────────────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/milestones/:id/tasks', wrap(async (req, res) => {
  res.json(tracker.getMilestoneTasks(req.params.id));
}));

router.get('/tasks/:id', wrap(async (req, res) => {
  const t = tracker.getTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  res.json(t);
}));

router.post('/tasks/:id/start', wrap(async (req, res) => {
  // V2 Course Tasks Hook (SQLite Integers)
  if (!isNaN(req.params.id)) {
      const db = require('../db/database');
      const courseTask = db.prepare('SELECT * FROM course_tasks WHERE id = ?').get(req.params.id);
      
      if (courseTask) {
          const userRow = db.prepare('SELECT active_project_id FROM users WHERE id = ?').get(req.user.id);
          const projectId = userRow?.active_project_id;
          
          if (!projectId) return res.status(403).json({ error: 'No active course project found for user' });

          const prog = db.prepare('SELECT * FROM course_progress WHERE project_id = ? AND course_task_id = ?').get(projectId, courseTask.id);
          
          if (prog && !['pending', 'failed'].includes(prog.status)) {
              return res.status(400).json({ error: `Cannot start task with status: ${prog.status}` });
          }

          if (prog) {
              db.prepare('UPDATE course_progress SET status = ?, started_at = datetime("now"), updated_at = datetime("now") WHERE id = ?').run('in_progress', prog.id);
          } else {
              db.prepare(`
                  INSERT INTO course_progress (id, project_id, course_task_id, status, attempts, started_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))
              `).run(require('crypto').randomUUID(), projectId, courseTask.id, 'in_progress', 1);
          }

          let parsedCommands = [];
          try { parsedCommands = JSON.parse(courseTask.commands || "[]"); } catch(e) {}
          let parsedConcepts = [];
          try { parsedConcepts = JSON.parse(courseTask.concepts_taught || "[]"); } catch(e) {}
          let parsedFolder = {};
          try { parsedFolder = JSON.parse(courseTask.folder_structure || "{}"); } catch(e) {}

          const updatedTask = {
              ...courseTask,
              commands: parsedCommands,
              concepts_taught: parsedConcepts,
              folder_structure: parsedFolder,
              status: 'in_progress',
              attempts: prog ? prog.attempts : 1
          };
          
          const cmds = parsedCommands.map(c => `  $ ${c}`).join('\n');
          return res.json({ 
              action: 'task_guidance', 
              message: `Task started: ${updatedTask.title}\nEst: ${updatedTask.estimated_hours}h\n\nRun:\n${cmds}`, 
              task: updatedTask 
          });
      }
  }

  // V1 Legacy Fallback
  const task = tracker.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!['pending','failed','submitted'].includes(task.status)) return res.status(400).json({ error: `Cannot start task with status: ${task.status}` });
  const updated = tracker.startTask(task.id);
  const cmds = (updated.commands || []).map(c => `  $ ${c}`).join('\n');
  res.json({ action: 'task_guidance', message: `Task started: ${updated.title}\nEst: ${updated.estimated_hours}h\n\nRun:\n${cmds}`, task: updated });
}));

router.post('/tasks/:id/hint', wrap(async (req, res) => {
  const task = tracker.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const hint = await guidedExecution.getHint(task, task.attempts || 1);
  const ms = tracker.getMilestone(task.milestone_id);
  if (ms) tracker.logTurn(ms.project_id, 'mentor', hint, 'task_guidance', task.id);
  res.json({ action: 'task_guidance', message: hint, task });
}));

router.post('/tasks/:id/ask', wrap(async (req, res) => {
  const { question, activeFileContent, activeFilePath, image } = req.body;
  if (!question && !image) return res.status(400).json({ error: 'question or image required' });
  const task = tracker.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  const ms = tracker.getMilestone(task.milestone_id);
  const project = ms ? tracker.getProject(ms.project_id) : null;
  const milestones = project ? tracker.getProjectMilestones(project.id) : [];
  const history = tracker.getTaskConversation(task.id, 10).map(t => ({ role: t.role, content: t.content }));
  let treeNodes = [];
  try { if (project) treeNodes = WorkspaceService.listFiles(project.id); } catch(e) {}
  
  const guidance = await guidedExecution.getGuidance(task, question || 'Analyze this screenshot and help me fix the error.', history, activeFileContent, activeFilePath, project, milestones, treeNodes, image);
  
  if (project) {
    tracker.logTurn(project.id, 'user',   question, 'task_guidance', task.id);
    tracker.logTurn(project.id, 'mentor', guidance, 'task_guidance', task.id);
  }
  res.json({ action: 'task_guidance', message: guidance, task });
}));

router.post('/projects/:id/ask', wrap(async (req, res) => {
  const { question, activeFileContent, activeFilePath, image } = req.body;
  if (!question && !image) return res.status(400).json({ error: 'question or image required' });
  const project = tracker.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const milestones = tracker.getProjectMilestones(project.id);
  const history = tracker.getConversation(project.id, req.user.id, 10).map(t => ({ role: t.role, content: t.content })).reverse();
  
  let treeNodes = [];
  try { treeNodes = WorkspaceService.listFiles(project.id); } catch(e) {}

  const guidance = await guidedExecution.getGuidance(null, question || 'Analyze this screenshot and help me fix the error.', history, activeFileContent, activeFilePath, project, milestones, treeNodes, image);
  
  tracker.logTurn(project.id, 'user',   question, 'general_guidance');
  tracker.logTurn(project.id, 'mentor', guidance, 'general_guidance');
  
  res.json({ action: 'general_guidance', message: guidance });
}));

// ─────────────────────────────────────────────────────────────────────────────
// TASK SUBMISSION + QA
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tasks/submit', wrap(async (req, res) => {
  const { task_id, submission_text } = req.body;
  if (!task_id || !submission_text) return res.status(400).json({ error: 'task_id and submission_text required' });

  let task = tracker.getTask(task_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!['in_progress','failed','submitted'].includes(task.status)) {
    return res.status(400).json({ error: `Cannot submit task with status: ${task.status}` });
  }

  task = tracker.submitTask(task_id, submission_text);
  const milestone = tracker.getMilestone(task.milestone_id);
  const project   = tracker.getProject(milestone.project_id);

  let treeNodes = [];
  try { if (project) treeNodes = WorkspaceService.listFiles(project.id); } catch(e) {}

  const qaResult = await qaCritic.reviewSubmission(task, submission_text, task.attempts, treeNodes);
  const review   = tracker.saveQAReview(task_id, qaResult);

  tracker.logTurn(project.id, 'user',   submission_text,       'qa_feedback', task_id);
  tracker.logTurn(project.id, 'mentor', qaResult.feedback_text,'qa_feedback', task_id);

  const passed = ['pass','partial'].includes(qaResult.verdict) && (qaResult.score || 0) >= config.QA_PASS_SCORE;

  if (!passed) {
    tracker.failTask(task_id);
    return res.json({ action: 'qa_result', message: qaResult.feedback_text, qa_review: review, task: tracker.getTask(task_id) });
  }

  // PASSED
  tracker.passTask(task_id);
  tracker.refreshProgress(project.id);

  const allTasks  = tracker.getMilestoneTasks(milestone.id);
  const allPassed = allTasks.every(t => t.status === 'passed');

  if (allPassed) {
    tracker.completeMilestone(milestone.id);

    // Automation suggestions
    let automations = [];
    try {
      const suggestions = await automationAdvisor.getAutomationSuggestions(
        { tech_stack: project.tech_stack, scope: project.scope },
        milestone,
        allTasks.map(t => t.title)
      );
      automations = tracker.saveAutomations(project.id, milestone.id, suggestions);
    } catch (e) { console.warn('[Automation skipped]', e.message); }

    const nextMs = tracker.getNextMilestone(project.id, milestone.ord);
    if (!nextMs) {
      tracker.completeProject(project.id);
      return res.json({ action: 'project_complete', message: `Project '${project.title}' completed. All milestones passed.`, project: tracker.getProject(project.id), qa_review: review, automations });
    }

    // Unlock next milestone + generate its tasks
    tracker.unlockMilestone(nextMs.id);
    const ctx = { tech_stack: project.tech_stack, skill_level: project.skill_level, scope: project.scope };
    const newTData = await taskPlanner.generateTasks(
      { order: nextMs.ord, title: nextMs.title, description: nextMs.description, duration_days: nextMs.duration_days, measurable_output: nextMs.measurable_output },
      ctx
    );
    const newTasks = newTData.map(t => tracker.createTask(nextMs.id, t));
    tracker.setCurrentPointers(project.id, nextMs.id, newTasks[0]?.id || null);
    tracker.refreshProgress(project.id);

    return res.json({
      action: 'milestone_complete',
      message: `Milestone '${milestone.title}' complete. Next: ${nextMs.title}`,
      project: tracker.getProject(project.id),
      qa_review: review,
      next_task: newTasks[0] || null,
      milestones: tracker.getProjectMilestones(project.id),
      automations,
    });
  }

  // Next task in same milestone
  const nextTask = tracker.getNextTask(milestone.id, task.ord);
  if (nextTask) tracker.setCurrentPointers(project.id, milestone.id, nextTask.id);

  res.json({
    action: 'task_guidance',
    message: qaResult.feedback_text,
    project: tracker.refreshProgress(project.id),
    qa_review: review,
    next_task: nextTask || null,
  });
}));

router.post('/debug/log', (req, res) => {
  console.log('[BROWSER-LOG]', JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

module.exports = router;



