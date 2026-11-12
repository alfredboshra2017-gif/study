import { and, desc, eq, asc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  exams,
  flashcards,
  focusSessions,
  mistakes,
  notes,
  pdfDocuments,
  pdfFolders,
  subjects,
  tasks,
  upcomingExams,
  users,
  weeklyPlans,
} from './schema.ts';

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', color: '#8B5CF6' },
  { name: 'English', color: '#A78BFA' },
  { name: 'Arabic', color: '#C084FC' },
  { name: 'Integrated Science', color: '#38BDF8' },
  { name: 'French', color: '#F472B6' },
  { name: 'Social Studies', color: '#FBBF24' },
  { name: 'Computer Science', color: '#34D399' },
  { name: 'Logic', color: '#E879F9' },
];

function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diffToMon));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const labelFmt = (dt: Date) =>
    dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    startDate: fmt(start),
    endDate: fmt(end),
    title: `Week of ${labelFmt(start)} – ${labelFmt(end)}`,
  };
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

    let userRecord;
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({ email })
        .where(eq(users.uid, uid))
        .returning();
      userRecord = updated[0];
    } else {
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email,
          displayName: displayName?.trim() || email.split('@')[0] || 'Scholar',
          avatarUrl: avatarUrl || '',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email },
        })
        .returning();
      userRecord = inserted[0];
    }

    // Bootstrap starter subjects, PDF folders, and current weekly plan once
    const existingSubjects = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.userId, userRecord.id))
      .limit(1);

    if (existingSubjects.length === 0) {
      await db.insert(subjects).values(
        DEFAULT_SUBJECTS.map((s) => ({
          userId: userRecord.id,
          name: s.name,
          color: s.color,
        }))
      );

      const existingFolders = await db
        .select({ id: pdfFolders.id })
        .from(pdfFolders)
        .where(eq(pdfFolders.userId, userRecord.id))
        .limit(1);

      if (existingFolders.length === 0) {
        await db.insert(pdfFolders).values(
          DEFAULT_SUBJECTS.map((s) => ({
            userId: userRecord.id,
            parentId: null,
            name: s.name,
          }))
        );
      }

      const existingPlans = await db
        .select({ id: weeklyPlans.id })
        .from(weeklyPlans)
        .where(eq(weeklyPlans.userId, userRecord.id))
        .limit(1);

      if (existingPlans.length === 0) {
        const bounds = getWeekBounds();
        await db.insert(weeklyPlans).values({
          userId: userRecord.id,
          title: bounds.title,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
        });
      }
    }

    return userRecord;
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  userId: number,
  data: Partial<{
    displayName: string;
    avatarUrl: string;
    themeMode: string;
    accentTheme: string;
    dailyFocusGoalMinutes: number;
    pomodoroStudyMinutes: number;
    pomodoroBreakMinutes: number;
  }>
) {
  try {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Failed to update settings.', { cause: error });
  }
}

// Subjects
export async function listSubjects(userId: number) {
  try {
    return await db
      .select()
      .from(subjects)
      .where(eq(subjects.userId, userId))
      .orderBy(asc(subjects.id));
  } catch (error) {
    console.error('listSubjects failed:', error);
    throw new Error('Failed to load subjects.', { cause: error });
  }
}

export async function createSubject(userId: number, name: string, color: string) {
  try {
    const [row] = await db
      .insert(subjects)
      .values({ userId, name, color })
      .returning();
    return row;
  } catch (error) {
    console.error('createSubject failed:', error);
    throw new Error('Failed to create subject.', { cause: error });
  }
}

export async function deleteSubject(userId: number, id: number) {
  try {
    const deleted = await db
      .delete(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('deleteSubject failed:', error);
    throw new Error('Failed to delete subject.', { cause: error });
  }
}

// Weekly Plans & Tasks
export async function listWeeklyPlans(userId: number) {
  try {
    return await db
      .select()
      .from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId))
      .orderBy(desc(weeklyPlans.startDate), desc(weeklyPlans.id));
  } catch (error) {
    console.error('listWeeklyPlans failed:', error);
    throw new Error('Failed to load weekly plans.', { cause: error });
  }
}

export async function createWeeklyPlan(
  userId: number,
  data: { title: string; startDate: string; endDate: string }
) {
  try {
    const [row] = await db
      .insert(weeklyPlans)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createWeeklyPlan failed:', error);
    throw new Error('Failed to create weekly plan.', { cause: error });
  }
}

export async function deleteWeeklyPlan(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(weeklyPlans)
      .where(and(eq(weeklyPlans.id, id), eq(weeklyPlans.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteWeeklyPlan failed:', error);
    throw new Error('Failed to delete weekly plan.', { cause: error });
  }
}

export async function listTasks(userId: number, weeklyPlanId?: number) {
  try {
    const condition = weeklyPlanId
      ? and(eq(tasks.userId, userId), eq(tasks.weeklyPlanId, weeklyPlanId))
      : eq(tasks.userId, userId);
    return await db
      .select()
      .from(tasks)
      .where(condition)
      .orderBy(asc(tasks.completed), asc(tasks.deadline), desc(tasks.id));
  } catch (error) {
    console.error('listTasks failed:', error);
    throw new Error('Failed to load tasks.', { cause: error });
  }
}

export async function createTask(
  userId: number,
  data: {
    weeklyPlanId: number;
    subjectName: string;
    title: string;
    description: string;
    deadline: string;
    priority: string;
  }
) {
  try {
    // Verify weekly plan ownership
    const plan = await db
      .select({ id: weeklyPlans.id })
      .from(weeklyPlans)
      .where(and(eq(weeklyPlans.id, data.weeklyPlanId), eq(weeklyPlans.userId, userId)))
      .limit(1);
    if (plan.length === 0) {
      throw new Error('Weekly plan not found.');
    }
    const [row] = await db
      .insert(tasks)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createTask failed:', error);
    throw new Error('Failed to create task.', { cause: error });
  }
}

export async function updateTask(
  userId: number,
  id: number,
  data: Partial<{
    subjectName: string;
    title: string;
    description: string;
    deadline: string;
    priority: string;
    completed: boolean;
  }>
) {
  try {
    const payload: Record<string, unknown> = { ...data };
    if (typeof data.completed === 'boolean') {
      payload.completedAt = data.completed ? new Date() : null;
    }
    const [updated] = await db
      .update(tasks)
      .set(payload)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('updateTask failed:', error);
    throw new Error('Failed to update task.', { cause: error });
  }
}

export async function deleteTask(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteTask failed:', error);
    throw new Error('Failed to delete task.', { cause: error });
  }
}

// Exams & Upcoming Exams
export async function listExams(userId: number) {
  try {
    return await db
      .select()
      .from(exams)
      .where(eq(exams.userId, userId))
      .orderBy(desc(exams.examDate), desc(exams.id));
  } catch (error) {
    console.error('listExams failed:', error);
    throw new Error('Failed to load exam marks.', { cause: error });
  }
}

export async function createExam(
  userId: number,
  data: {
    subjectName: string;
    examName: string;
    examDate: string;
    obtainedMark: number;
    totalMark: number;
    examType: string;
    comments: string;
  }
) {
  try {
    const [row] = await db
      .insert(exams)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createExam failed:', error);
    throw new Error('Failed to save exam mark.', { cause: error });
  }
}

export async function updateExam(
  userId: number,
  id: number,
  data: Partial<{
    subjectName: string;
    examName: string;
    examDate: string;
    obtainedMark: number;
    totalMark: number;
    examType: string;
    comments: string;
  }>
) {
  try {
    const [updated] = await db
      .update(exams)
      .set(data)
      .where(and(eq(exams.id, id), eq(exams.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('updateExam failed:', error);
    throw new Error('Failed to update exam mark.', { cause: error });
  }
}

export async function deleteExam(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(exams)
      .where(and(eq(exams.id, id), eq(exams.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteExam failed:', error);
    throw new Error('Failed to delete exam mark.', { cause: error });
  }
}

export async function listUpcomingExams(userId: number) {
  try {
    return await db
      .select()
      .from(upcomingExams)
      .where(eq(upcomingExams.userId, userId))
      .orderBy(asc(upcomingExams.examDate), asc(upcomingExams.id));
  } catch (error) {
    console.error('listUpcomingExams failed:', error);
    throw new Error('Failed to load upcoming exams.', { cause: error });
  }
}

export async function createUpcomingExam(
  userId: number,
  data: {
    subjectName: string;
    title: string;
    examDate: string;
    examType: string;
    notes: string;
  }
) {
  try {
    const [row] = await db
      .insert(upcomingExams)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createUpcomingExam failed:', error);
    throw new Error('Failed to schedule upcoming exam.', { cause: error });
  }
}

export async function deleteUpcomingExam(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(upcomingExams)
      .where(and(eq(upcomingExams.id, id), eq(upcomingExams.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteUpcomingExam failed:', error);
    throw new Error('Failed to remove upcoming exam.', { cause: error });
  }
}

// Focus Sessions
export async function listFocusSessions(userId: number) {
  try {
    return await db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.sessionDate), desc(focusSessions.id));
  } catch (error) {
    console.error('listFocusSessions failed:', error);
    throw new Error('Failed to load focus sessions.', { cause: error });
  }
}

export async function createFocusSession(
  userId: number,
  data: {
    subjectName: string;
    sessionDate: string;
    durationSeconds: number;
    mode: string;
    description: string;
  }
) {
  try {
    const [row] = await db
      .insert(focusSessions)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createFocusSession failed:', error);
    throw new Error('Failed to save focus session.', { cause: error });
  }
}

export async function deleteFocusSession(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(focusSessions)
      .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteFocusSession failed:', error);
    throw new Error('Failed to delete focus session.', { cause: error });
  }
}

// Notes
export async function listNotes(userId: number) {
  try {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id));
  } catch (error) {
    console.error('listNotes failed:', error);
    throw new Error('Failed to load notes.', { cause: error });
  }
}

export async function createNote(
  userId: number,
  data: {
    subjectName: string;
    title: string;
    content: string;
    formulas: string;
    definitions: string;
    pinned: boolean;
  }
) {
  try {
    const [row] = await db
      .insert(notes)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createNote failed:', error);
    throw new Error('Failed to create note.', { cause: error });
  }
}

export async function updateNote(
  userId: number,
  id: number,
  data: Partial<{
    subjectName: string;
    title: string;
    content: string;
    formulas: string;
    definitions: string;
    pinned: boolean;
  }>
) {
  try {
    const [updated] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('updateNote failed:', error);
    throw new Error('Failed to update note.', { cause: error });
  }
}

export async function deleteNote(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteNote failed:', error);
    throw new Error('Failed to delete note.', { cause: error });
  }
}

// Mistakes
export async function listMistakes(userId: number) {
  try {
    return await db
      .select()
      .from(mistakes)
      .where(eq(mistakes.userId, userId))
      .orderBy(desc(mistakes.mistakeDate), desc(mistakes.id));
  } catch (error) {
    console.error('listMistakes failed:', error);
    throw new Error('Failed to load mistakes.', { cause: error });
  }
}

export async function createMistake(
  userId: number,
  data: {
    subjectName: string;
    lesson: string;
    question: string;
    incorrectAnswer: string;
    correctAnswer: string;
    explanation: string;
    mistakeDate: string;
    status: string;
  }
) {
  try {
    const [row] = await db
      .insert(mistakes)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createMistake failed:', error);
    throw new Error('Failed to record mistake.', { cause: error });
  }
}

export async function updateMistake(
  userId: number,
  id: number,
  data: Partial<{
    subjectName: string;
    lesson: string;
    question: string;
    incorrectAnswer: string;
    correctAnswer: string;
    explanation: string;
    mistakeDate: string;
    status: string;
    reviewCount: number;
  }>
) {
  try {
    const [updated] = await db
      .update(mistakes)
      .set(data)
      .where(and(eq(mistakes.id, id), eq(mistakes.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('updateMistake failed:', error);
    throw new Error('Failed to update mistake.', { cause: error });
  }
}

export async function deleteMistake(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(mistakes)
      .where(and(eq(mistakes.id, id), eq(mistakes.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteMistake failed:', error);
    throw new Error('Failed to delete mistake.', { cause: error });
  }
}

// Flashcards
export async function listFlashcards(userId: number) {
  try {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId))
      .orderBy(desc(flashcards.id));
  } catch (error) {
    console.error('listFlashcards failed:', error);
    throw new Error('Failed to load flashcards.', { cause: error });
  }
}

export async function createFlashcard(
  userId: number,
  data: {
    collectionName: string;
    subjectName: string;
    lesson: string;
    front: string;
    back: string;
  }
) {
  try {
    const [row] = await db
      .insert(flashcards)
      .values({ userId, ...data })
      .returning();
    return row;
  } catch (error) {
    console.error('createFlashcard failed:', error);
    throw new Error('Failed to create flashcard.', { cause: error });
  }
}

export async function updateFlashcard(
  userId: number,
  id: number,
  data: Partial<{
    collectionName: string;
    subjectName: string;
    lesson: string;
    front: string;
    back: string;
    masteryStatus: string;
    reviewCount: number;
    correctCount: number;
    lastReviewedAt: Date;
  }>
) {
  try {
    const [updated] = await db
      .update(flashcards)
      .set(data)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('updateFlashcard failed:', error);
    throw new Error('Failed to update flashcard.', { cause: error });
  }
}

export async function deleteFlashcard(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(flashcards)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deleteFlashcard failed:', error);
    throw new Error('Failed to delete flashcard.', { cause: error });
  }
}

// PDF Folders & Documents
export async function listPdfFolders(userId: number) {
  try {
    return await db
      .select()
      .from(pdfFolders)
      .where(eq(pdfFolders.userId, userId))
      .orderBy(asc(pdfFolders.name), asc(pdfFolders.id));
  } catch (error) {
    console.error('listPdfFolders failed:', error);
    throw new Error('Failed to load PDF folders.', { cause: error });
  }
}

export async function createPdfFolder(
  userId: number,
  name: string,
  parentId: number | null
) {
  try {
    const [row] = await db
      .insert(pdfFolders)
      .values({ userId, name, parentId })
      .returning();
    return row;
  } catch (error) {
    console.error('createPdfFolder failed:', error);
    throw new Error('Failed to create folder.', { cause: error });
  }
}

export async function renamePdfFolder(userId: number, id: number, name: string) {
  try {
    const [updated] = await db
      .update(pdfFolders)
      .set({ name })
      .where(and(eq(pdfFolders.id, id), eq(pdfFolders.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('renamePdfFolder failed:', error);
    throw new Error('Failed to rename folder.', { cause: error });
  }
}

export async function deletePdfFolder(userId: number, id: number) {
  try {
    // Also delete child folders owned by user
    await db
      .delete(pdfFolders)
      .where(and(eq(pdfFolders.parentId, id), eq(pdfFolders.userId, userId)));
    const [deleted] = await db
      .delete(pdfFolders)
      .where(and(eq(pdfFolders.id, id), eq(pdfFolders.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('deletePdfFolder failed:', error);
    throw new Error('Failed to delete folder.', { cause: error });
  }
}

export async function listPdfDocuments(userId: number) {
  try {
    return await db
      .select({
        id: pdfDocuments.id,
        userId: pdfDocuments.userId,
        folderId: pdfDocuments.folderId,
        subjectName: pdfDocuments.subjectName,
        title: pdfDocuments.title,
        originalFilename: pdfDocuments.originalFilename,
        fileSizeBytes: pdfDocuments.fileSizeBytes,
        description: pdfDocuments.description,
        tags: pdfDocuments.tags,
        createdAt: pdfDocuments.createdAt,
      })
      .from(pdfDocuments)
      .where(eq(pdfDocuments.userId, userId))
      .orderBy(desc(pdfDocuments.createdAt), desc(pdfDocuments.id));
  } catch (error) {
    console.error('listPdfDocuments failed:', error);
    throw new Error('Failed to load PDF library.', { cause: error });
  }
}

export async function createPdfDocument(
  userId: number,
  data: {
    folderId: number | null;
    subjectName: string;
    title: string;
    originalFilename: string;
    fileSizeBytes: number;
    description: string;
    tags: string;
    fileDataBase64: string;
  }
) {
  try {
    const [row] = await db
      .insert(pdfDocuments)
      .values({ userId, ...data })
      .returning({
        id: pdfDocuments.id,
        userId: pdfDocuments.userId,
        folderId: pdfDocuments.folderId,
        subjectName: pdfDocuments.subjectName,
        title: pdfDocuments.title,
        originalFilename: pdfDocuments.originalFilename,
        fileSizeBytes: pdfDocuments.fileSizeBytes,
        description: pdfDocuments.description,
        tags: pdfDocuments.tags,
        createdAt: pdfDocuments.createdAt,
      });
    return row;
  } catch (error) {
    console.error('createPdfDocument failed:', error);
    throw new Error('Failed to upload PDF document.', { cause: error });
  }
}

export async function updatePdfDocument(
  userId: number,
  id: number,
  data: Partial<{
    folderId: number | null;
    subjectName: string;
    title: string;
    description: string;
    tags: string;
  }>
) {
  try {
    const [updated] = await db
      .update(pdfDocuments)
      .set(data)
      .where(and(eq(pdfDocuments.id, id), eq(pdfDocuments.userId, userId)))
      .returning({
        id: pdfDocuments.id,
        userId: pdfDocuments.userId,
        folderId: pdfDocuments.folderId,
        subjectName: pdfDocuments.subjectName,
        title: pdfDocuments.title,
        originalFilename: pdfDocuments.originalFilename,
        fileSizeBytes: pdfDocuments.fileSizeBytes,
        description: pdfDocuments.description,
        tags: pdfDocuments.tags,
        createdAt: pdfDocuments.createdAt,
      });
    return updated ?? null;
  } catch (error) {
    console.error('updatePdfDocument failed:', error);
    throw new Error('Failed to update PDF metadata.', { cause: error });
  }
}

export async function getPdfDocumentWithFile(userId: number, id: number) {
  try {
    const rows = await db
      .select()
      .from(pdfDocuments)
      .where(and(eq(pdfDocuments.id, id), eq(pdfDocuments.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('getPdfDocumentWithFile failed:', error);
    throw new Error('Failed to retrieve PDF file.', { cause: error });
  }
}

export async function deletePdfDocument(userId: number, id: number) {
  try {
    const [deleted] = await db
      .delete(pdfDocuments)
      .where(and(eq(pdfDocuments.id, id), eq(pdfDocuments.userId, userId)))
      .returning({ id: pdfDocuments.id });
    return deleted ?? null;
  } catch (error) {
    console.error('deletePdfDocument failed:', error);
    throw new Error('Failed to delete PDF document.', { cause: error });
  }
}

export async function exportUserStudyBackup(userId: number) {
  try {
    const [
      userRow,
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
      db.select().from(users).where(eq(users.id, userId)).limit(1),
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

    return {
      exportedAt: new Date().toISOString(),
      profile: userRow[0] ?? null,
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
    };
  } catch (error) {
    console.error('exportUserStudyBackup failed:', error);
    throw new Error('Failed to export study backup.', { cause: error });
  }
}
