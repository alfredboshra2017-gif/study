import express, { Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  createExam,
  createFlashcard,
  createFocusSession,
  createMistake,
  createNote,
  createPdfDocument,
  createPdfFolder,
  createSubject,
  createTask,
  createUpcomingExam,
  createWeeklyPlan,
  deleteExam,
  deleteFlashcard,
  deleteFocusSession,
  deleteMistake,
  deleteNote,
  deletePdfDocument,
  deletePdfFolder,
  deleteSubject,
  deleteTask,
  deleteUpcomingExam,
  deleteWeeklyPlan,
  exportUserStudyBackup,
  getOrCreateUser,
  getPdfDocumentWithFile,
  listExams,
  listFlashcards,
  listFocusSessions,
  listMistakes,
  listNotes,
  listPdfDocuments,
  listPdfFolders,
  listSubjects,
  listTasks,
  listUpcomingExams,
  listWeeklyPlans,
  renamePdfFolder,
  updateExam,
  updateFlashcard,
  updateMistake,
  updateNote,
  updatePdfDocument,
  updateTask,
  updateUserProfile,
} from './src/db/repository.ts';

dotenv.config();

interface AuthedRequest extends AuthRequest {
  dbUser?: Awaited<ReturnType<typeof getOrCreateUser>>;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

async function attachDbUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.dbUser = await getOrCreateUser(
      req.user.uid,
      req.user.email || '',
      req.user.name,
      req.user.picture
    );
    next();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to load account';
    return res.status(500).json({ error: message });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Protected API Router
  const api = express.Router();
  api.use(requireAuth, attachDbUser);

  // Bootstrap / Workspace Overview
  api.get('/bootstrap', async (req: AuthedRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      const [
        subjectRows,
        planRows,
        taskRows,
        examRows,
        upcomingRows,
        focusRows,
        noteRows,
        mistakeRows,
        flashcardRows,
        folderRows,
        pdfRows,
      ] = await Promise.all([
        listSubjects(userId),
        listWeeklyPlans(userId),
        listTasks(userId),
        listExams(userId),
        listUpcomingExams(userId),
        listFocusSessions(userId),
        listNotes(userId),
        listMistakes(userId),
        listFlashcards(userId),
        listPdfFolders(userId),
        listPdfDocuments(userId),
      ]);

      res.json({
        profile: req.dbUser,
        subjects: subjectRows,
        weeklyPlans: planRows,
        tasks: taskRows,
        exams: examRows,
        upcomingExams: upcomingRows,
        focusSessions: focusRows,
        notes: noteRows,
        mistakes: mistakeRows,
        flashcards: flashcardRows,
        pdfFolders: folderRows,
        pdfDocuments: pdfRows,
      });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to load workspace' });
    }
  });

  // Profile & Settings
  api.patch('/profile', async (req: AuthedRequest, res) => {
    try {
      const {
        displayName,
        avatarUrl,
        themeMode,
        accentTheme,
        dailyFocusGoalMinutes,
        pomodoroStudyMinutes,
        pomodoroBreakMinutes,
      } = req.body;

      const patch: Record<string, unknown> = {};
      if (typeof displayName === 'string' && displayName.trim()) {
        patch.displayName = displayName.trim().slice(0, 80);
      }
      if (typeof avatarUrl === 'string') {
        patch.avatarUrl = avatarUrl.slice(0, 500000);
      }
      if (themeMode === 'dark' || themeMode === 'light') {
        patch.themeMode = themeMode;
      }
      if (
        accentTheme === 'amethyst' ||
        accentTheme === 'obsidian-violet' ||
        accentTheme === 'royal-plum'
      ) {
        patch.accentTheme = accentTheme;
      }
      if (
        typeof dailyFocusGoalMinutes === 'number' &&
        dailyFocusGoalMinutes >= 15 &&
        dailyFocusGoalMinutes <= 960
      ) {
        patch.dailyFocusGoalMinutes = Math.round(dailyFocusGoalMinutes);
      }
      if (
        typeof pomodoroStudyMinutes === 'number' &&
        pomodoroStudyMinutes >= 5 &&
        pomodoroStudyMinutes <= 180
      ) {
        patch.pomodoroStudyMinutes = Math.round(pomodoroStudyMinutes);
      }
      if (
        typeof pomodoroBreakMinutes === 'number' &&
        pomodoroBreakMinutes >= 1 &&
        pomodoroBreakMinutes <= 60
      ) {
        patch.pomodoroBreakMinutes = Math.round(pomodoroBreakMinutes);
      }

      const updated = await updateUserProfile(req.dbUser!.id, patch);
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update failed' });
    }
  });

  api.get('/backup', async (req: AuthedRequest, res) => {
    try {
      const backup = await exportUserStudyBackup(req.dbUser!.id);
      res.json(backup);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Backup failed' });
    }
  });

  // Subjects
  api.post('/subjects', async (req: AuthedRequest, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const color = String(req.body.color || '#8B5CF6').trim();
      if (!name) {
        return res.status(400).json({ error: 'Subject name is required.' });
      }
      const created = await createSubject(req.dbUser!.id, name, color);
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to create subject' });
    }
  });

  api.delete('/subjects/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteSubject(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Subject not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete failed' });
    }
  });

  // Weekly Plans
  api.post('/weekly-plans', async (req: AuthedRequest, res) => {
    try {
      const title = String(req.body.title || '').trim();
      const startDate = String(req.body.startDate || '').trim();
      const endDate = String(req.body.endDate || '').trim();
      if (!title || !startDate || !endDate) {
        return res.status(400).json({ error: 'Title, start date, and end date are required.' });
      }
      const created = await createWeeklyPlan(req.dbUser!.id, {
        title,
        startDate,
        endDate,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create plan failed' });
    }
  });

  api.delete('/weekly-plans/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteWeeklyPlan(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Weekly plan not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete plan failed' });
    }
  });

  // Tasks
  api.post('/tasks', async (req: AuthedRequest, res) => {
    try {
      const weeklyPlanId = Number(req.body.weeklyPlanId);
      const subjectName = String(req.body.subjectName || '').trim();
      const title = String(req.body.title || '').trim();
      const description = String(req.body.description || '').trim();
      const deadline = String(req.body.deadline || '').trim();
      const priority = String(req.body.priority || 'Medium').trim();
      if (!Number.isFinite(weeklyPlanId) || !subjectName || !title || !deadline) {
        return res.status(400).json({ error: 'Plan, subject, title, and deadline are required.' });
      }
      const created = await createTask(req.dbUser!.id, {
        weeklyPlanId,
        subjectName,
        title,
        description,
        deadline,
        priority,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create task failed' });
    }
  });

  api.patch('/tasks/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.subjectName === 'string') patch.subjectName = req.body.subjectName.trim();
      if (typeof req.body.title === 'string') patch.title = req.body.title.trim();
      if (typeof req.body.description === 'string') patch.description = req.body.description;
      if (typeof req.body.deadline === 'string') patch.deadline = req.body.deadline;
      if (typeof req.body.priority === 'string') patch.priority = req.body.priority;
      if (typeof req.body.completed === 'boolean') patch.completed = req.body.completed;

      const updated = await updateTask(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update task failed' });
    }
  });

  api.delete('/tasks/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteTask(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete task failed' });
    }
  });

  // Exams
  api.post('/exams', async (req: AuthedRequest, res) => {
    try {
      const subjectName = String(req.body.subjectName || '').trim();
      const examName = String(req.body.examName || '').trim();
      const examDate = String(req.body.examDate || '').trim();
      const obtainedMark = Number(req.body.obtainedMark);
      const totalMark = Number(req.body.totalMark);
      const examType = String(req.body.examType || 'Quiz').trim();
      const comments = String(req.body.comments || '').trim();

      if (
        !subjectName ||
        !examName ||
        !examDate ||
        !Number.isFinite(obtainedMark) ||
        !Number.isFinite(totalMark) ||
        totalMark <= 0 ||
        obtainedMark < 0 ||
        obtainedMark > totalMark
      ) {
        return res.status(400).json({
          error: 'Valid subject, exam name, date, and marks (0 <= obtained <= total) are required.',
        });
      }

      const created = await createExam(req.dbUser!.id, {
        subjectName,
        examName,
        examDate,
        obtainedMark,
        totalMark,
        examType,
        comments,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create exam failed' });
    }
  });

  api.patch('/exams/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.subjectName === 'string') patch.subjectName = req.body.subjectName.trim();
      if (typeof req.body.examName === 'string') patch.examName = req.body.examName.trim();
      if (typeof req.body.examDate === 'string') patch.examDate = req.body.examDate;
      if (typeof req.body.obtainedMark === 'number') patch.obtainedMark = req.body.obtainedMark;
      if (typeof req.body.totalMark === 'number' && req.body.totalMark > 0) {
        patch.totalMark = req.body.totalMark;
      }
      if (typeof req.body.examType === 'string') patch.examType = req.body.examType;
      if (typeof req.body.comments === 'string') patch.comments = req.body.comments;

      const updated = await updateExam(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Exam record not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update exam failed' });
    }
  });

  api.delete('/exams/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteExam(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Exam record not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete exam failed' });
    }
  });

  // Upcoming Exams
  api.post('/upcoming-exams', async (req: AuthedRequest, res) => {
    try {
      const subjectName = String(req.body.subjectName || '').trim();
      const title = String(req.body.title || '').trim();
      const examDate = String(req.body.examDate || '').trim();
      const examType = String(req.body.examType || 'Exam').trim();
      const notesStr = String(req.body.notes || '').trim();
      if (!subjectName || !title || !examDate) {
        return res.status(400).json({ error: 'Subject, title, and date are required.' });
      }
      const created = await createUpcomingExam(req.dbUser!.id, {
        subjectName,
        title,
        examDate,
        examType,
        notes: notesStr,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create upcoming exam failed' });
    }
  });

  api.delete('/upcoming-exams/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteUpcomingExam(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Upcoming exam not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete failed' });
    }
  });

  // Focus Sessions
  api.post('/focus-sessions', async (req: AuthedRequest, res) => {
    try {
      const subjectName = String(req.body.subjectName || '').trim();
      const sessionDate = String(req.body.sessionDate || '').trim();
      const durationSeconds = Number(req.body.durationSeconds);
      const mode = String(req.body.mode || 'Stopwatch').trim();
      const description = String(req.body.description || '').trim();
      if (!subjectName || !sessionDate || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return res.status(400).json({ error: 'Subject, date, and positive duration are required.' });
      }
      const created = await createFocusSession(req.dbUser!.id, {
        subjectName,
        sessionDate,
        durationSeconds: Math.round(durationSeconds),
        mode,
        description,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Save focus session failed' });
    }
  });

  api.delete('/focus-sessions/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteFocusSession(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Session not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete session failed' });
    }
  });

  // Notes
  api.post('/notes', async (req: AuthedRequest, res) => {
    try {
      const subjectName = String(req.body.subjectName || '').trim();
      const title = String(req.body.title || '').trim();
      const content = String(req.body.content || '');
      const formulas = String(req.body.formulas || '');
      const definitions = String(req.body.definitions || '');
      const pinned = Boolean(req.body.pinned);
      if (!subjectName || !title) {
        return res.status(400).json({ error: 'Subject and note title are required.' });
      }
      const created = await createNote(req.dbUser!.id, {
        subjectName,
        title,
        content,
        formulas,
        definitions,
        pinned,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create note failed' });
    }
  });

  api.patch('/notes/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.subjectName === 'string') patch.subjectName = req.body.subjectName.trim();
      if (typeof req.body.title === 'string') patch.title = req.body.title.trim();
      if (typeof req.body.content === 'string') patch.content = req.body.content;
      if (typeof req.body.formulas === 'string') patch.formulas = req.body.formulas;
      if (typeof req.body.definitions === 'string') patch.definitions = req.body.definitions;
      if (typeof req.body.pinned === 'boolean') patch.pinned = req.body.pinned;

      const updated = await updateNote(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Note not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update note failed' });
    }
  });

  api.delete('/notes/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteNote(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Note not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete note failed' });
    }
  });

  // Important Mistakes
  api.post('/mistakes', async (req: AuthedRequest, res) => {
    try {
      const subjectName = String(req.body.subjectName || '').trim();
      const lesson = String(req.body.lesson || '').trim();
      const question = String(req.body.question || '').trim();
      const incorrectAnswer = String(req.body.incorrectAnswer || '').trim();
      const correctAnswer = String(req.body.correctAnswer || '').trim();
      const explanation = String(req.body.explanation || '').trim();
      const mistakeDate = String(req.body.mistakeDate || '').trim();
      const status = String(req.body.status || 'Not Reviewed').trim();

      if (!subjectName || !lesson || !question || !correctAnswer || !mistakeDate) {
        return res.status(400).json({
          error: 'Subject, lesson, question, correct answer, and date are required.',
        });
      }
      const created = await createMistake(req.dbUser!.id, {
        subjectName,
        lesson,
        question,
        incorrectAnswer,
        correctAnswer,
        explanation,
        mistakeDate,
        status,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Save mistake failed' });
    }
  });

  api.patch('/mistakes/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.subjectName === 'string') patch.subjectName = req.body.subjectName.trim();
      if (typeof req.body.lesson === 'string') patch.lesson = req.body.lesson.trim();
      if (typeof req.body.question === 'string') patch.question = req.body.question;
      if (typeof req.body.incorrectAnswer === 'string') patch.incorrectAnswer = req.body.incorrectAnswer;
      if (typeof req.body.correctAnswer === 'string') patch.correctAnswer = req.body.correctAnswer;
      if (typeof req.body.explanation === 'string') patch.explanation = req.body.explanation;
      if (typeof req.body.mistakeDate === 'string') patch.mistakeDate = req.body.mistakeDate;
      if (typeof req.body.status === 'string') patch.status = req.body.status;
      if (typeof req.body.reviewCount === 'number') patch.reviewCount = req.body.reviewCount;

      const updated = await updateMistake(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Mistake not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update mistake failed' });
    }
  });

  api.delete('/mistakes/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteMistake(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Mistake not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete mistake failed' });
    }
  });

  // Flashcards
  api.post('/flashcards', async (req: AuthedRequest, res) => {
    try {
      const collectionName = String(req.body.collectionName || 'Core Review').trim();
      const subjectName = String(req.body.subjectName || '').trim();
      const lesson = String(req.body.lesson || '').trim();
      const front = String(req.body.front || '').trim();
      const back = String(req.body.back || '').trim();
      if (!subjectName || !front || !back) {
        return res.status(400).json({ error: 'Subject, front question, and back answer are required.' });
      }
      const created = await createFlashcard(req.dbUser!.id, {
        collectionName,
        subjectName,
        lesson,
        front,
        back,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create flashcard failed' });
    }
  });

  api.patch('/flashcards/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.collectionName === 'string') patch.collectionName = req.body.collectionName.trim();
      if (typeof req.body.subjectName === 'string') patch.subjectName = req.body.subjectName.trim();
      if (typeof req.body.lesson === 'string') patch.lesson = req.body.lesson.trim();
      if (typeof req.body.front === 'string') patch.front = req.body.front;
      if (typeof req.body.back === 'string') patch.back = req.body.back;
      if (req.body.masteryStatus === 'Known' || req.body.masteryStatus === 'Need Review') {
        patch.masteryStatus = req.body.masteryStatus;
      }
      if (typeof req.body.reviewCount === 'number') patch.reviewCount = req.body.reviewCount;
      if (typeof req.body.correctCount === 'number') patch.correctCount = req.body.correctCount;
      if (req.body.reviewed === true) patch.lastReviewedAt = new Date();

      const updated = await updateFlashcard(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Flashcard not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update flashcard failed' });
    }
  });

  api.delete('/flashcards/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deleteFlashcard(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Flashcard not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete flashcard failed' });
    }
  });

  // PDF Folders
  api.post('/pdf-folders', async (req: AuthedRequest, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const parentId =
        req.body.parentId !== null && req.body.parentId !== undefined
          ? Number(req.body.parentId)
          : null;
      if (!name) return res.status(400).json({ error: 'Folder name is required.' });
      const created = await createPdfFolder(
        req.dbUser!.id,
        name,
        parentId && Number.isFinite(parentId) ? parentId : null
      );
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Create folder failed' });
    }
  });

  api.patch('/pdf-folders/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const name = String(req.body.name || '').trim();
      if (!Number.isFinite(id) || !name) {
        return res.status(400).json({ error: 'Valid ID and folder name are required.' });
      }
      const updated = await renamePdfFolder(req.dbUser!.id, id, name);
      if (!updated) return res.status(404).json({ error: 'Folder not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Rename folder failed' });
    }
  });

  api.delete('/pdf-folders/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deletePdfFolder(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Folder not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete folder failed' });
    }
  });

  // PDF Documents
  api.post('/pdfs/upload', upload.single('file'), async (req: AuthedRequest, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'PDF file is required.' });
      }
      if (
        file.mimetype !== 'application/pdf' &&
        !file.originalname.toLowerCase().endsWith('.pdf')
      ) {
        return res.status(400).json({ error: 'Only PDF files are supported.' });
      }

      const folderIdRaw = req.body.folderId ? Number(req.body.folderId) : null;
      const folderId =
        folderIdRaw !== null && Number.isFinite(folderIdRaw) ? folderIdRaw : null;
      const subjectName = String(req.body.subjectName || 'General').trim();
      const title = String(
        req.body.title || file.originalname.replace(/\.pdf$/i, '')
      ).trim();
      const description = String(req.body.description || '').trim();
      const tags = String(req.body.tags || '').trim();

      const created = await createPdfDocument(req.dbUser!.id, {
        folderId,
        subjectName,
        title,
        originalFilename: file.originalname,
        fileSizeBytes: file.size,
        description,
        tags,
        fileDataBase64: file.buffer.toString('base64'),
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Upload PDF failed' });
    }
  });

  api.patch('/pdfs/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const patch: Record<string, unknown> = {};
      if (typeof req.body.title === 'string' && req.body.title.trim()) {
        patch.title = req.body.title.trim();
      }
      if (typeof req.body.subjectName === 'string') {
        patch.subjectName = req.body.subjectName.trim();
      }
      if (typeof req.body.description === 'string') {
        patch.description = req.body.description;
      }
      if (typeof req.body.tags === 'string') {
        patch.tags = req.body.tags;
      }
      if (req.body.folderId !== undefined) {
        patch.folderId =
          req.body.folderId === null ? null : Number(req.body.folderId);
      }

      const updated = await updatePdfDocument(req.dbUser!.id, id, patch);
      if (!updated) return res.status(404).json({ error: 'Document not found' });
      res.json(updated);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Update PDF failed' });
    }
  });

  api.get('/pdfs/:id/file', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const doc = await getPdfDocumentWithFile(req.dbUser!.id, id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const buffer = Buffer.from(doc.fileDataBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(doc.originalFilename)}"`
      );
      res.send(buffer);
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Download PDF failed' });
    }
  });

  api.delete('/pdfs/:id', async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await deletePdfDocument(req.dbUser!.id, id);
      if (!deleted) return res.status(404).json({ error: 'Document not found' });
      res.json({ ok: true });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Delete PDF failed' });
    }
  });

  app.use('/api', api);

  // Vite or Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Study Space server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
