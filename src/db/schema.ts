import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Scholar'),
  avatarUrl: text('avatar_url').notNull().default(''),
  themeMode: text('theme_mode').notNull().default('dark'),
  accentTheme: text('accent_theme').notNull().default('amethyst'),
  dailyFocusGoalMinutes: integer('daily_focus_goal_minutes').notNull().default(120),
  pomodoroStudyMinutes: integer('pomodoro_study_minutes').notNull().default(25),
  pomodoroBreakMinutes: integer('pomodoro_break_minutes').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#8B5CF6'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const weeklyPlans = pgTable('weekly_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  weeklyPlanId: integer('weekly_plan_id')
    .references(() => weeklyPlans.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  deadline: text('deadline').notNull(),
  priority: text('priority').notNull().default('Medium'),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  examName: text('exam_name').notNull(),
  examDate: text('exam_date').notNull(),
  obtainedMark: doublePrecision('obtained_mark').notNull(),
  totalMark: doublePrecision('total_mark').notNull(),
  examType: text('exam_type').notNull().default('Quiz'),
  comments: text('comments').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const upcomingExams = pgTable('upcoming_exams', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  title: text('title').notNull(),
  examDate: text('exam_date').notNull(),
  examType: text('exam_type').notNull().default('Exam'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const focusSessions = pgTable('focus_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  sessionDate: text('session_date').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  mode: text('mode').notNull().default('Stopwatch'),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  formulas: text('formulas').notNull().default(''),
  definitions: text('definitions').notNull().default(''),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mistakes = pgTable('mistakes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectName: text('subject_name').notNull(),
  lesson: text('lesson').notNull(),
  question: text('question').notNull(),
  incorrectAnswer: text('incorrect_answer').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
  mistakeDate: text('mistake_date').notNull(),
  status: text('status').notNull().default('Not Reviewed'),
  reviewCount: integer('review_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  collectionName: text('collection_name').notNull().default('Core Review'),
  subjectName: text('subject_name').notNull(),
  lesson: text('lesson').notNull().default(''),
  front: text('front').notNull(),
  back: text('back').notNull(),
  masteryStatus: text('mastery_status').notNull().default('Need Review'),
  reviewCount: integer('review_count').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  lastReviewedAt: timestamp('last_reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pdfFolders = pgTable('pdf_folders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: integer('parent_id'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pdfDocuments = pgTable('pdf_documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  folderId: integer('folder_id').references(() => pdfFolders.id, {
    onDelete: 'set null',
  }),
  subjectName: text('subject_name').notNull(),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  description: text('description').notNull().default(''),
  tags: text('tags').notNull().default(''),
  fileDataBase64: text('file_data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
  weeklyPlans: many(weeklyPlans),
  tasks: many(tasks),
  exams: many(exams),
  upcomingExams: many(upcomingExams),
  focusSessions: many(focusSessions),
  notes: many(notes),
  mistakes: many(mistakes),
  flashcards: many(flashcards),
  pdfFolders: many(pdfFolders),
  pdfDocuments: many(pdfDocuments),
}));

export const weeklyPlansRelations = relations(weeklyPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [weeklyPlans.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  weeklyPlan: one(weeklyPlans, {
    fields: [tasks.weeklyPlanId],
    references: [weeklyPlans.id],
  }),
}));

export const pdfFoldersRelations = relations(pdfFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [pdfFolders.userId],
    references: [users.id],
  }),
  documents: many(pdfDocuments),
}));

export const pdfDocumentsRelations = relations(pdfDocuments, ({ one }) => ({
  user: one(users, {
    fields: [pdfDocuments.userId],
    references: [users.id],
  }),
  folder: one(pdfFolders, {
    fields: [pdfDocuments.folderId],
    references: [pdfFolders.id],
  }),
}));
