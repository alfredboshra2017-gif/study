export type SectionId =
  | 'dashboard'
  | 'todo'
  | 'exams'
  | 'focus'
  | 'notes'
  | 'mistakes'
  | 'flashcards'
  | 'analytics'
  | 'pdfs'
  | 'settings';

export type ThemeMode = 'dark' | 'light';
export type AccentTheme = 'amethyst' | 'obsidian-violet' | 'royal-plum';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  themeMode: ThemeMode;
  accentTheme: AccentTheme;
  dailyFocusGoalMinutes: number;
  pomodoroStudyMinutes: number;
  pomodoroBreakMinutes: number;
  createdAt: string;
}

export interface SubjectItem {
  id: number;
  userId: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface WeeklyPlan {
  id: number;
  userId: number;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface StudyTask {
  id: number;
  userId: number;
  weeklyPlanId: number;
  subjectName: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface ExamRecord {
  id: number;
  userId: number;
  subjectName: string;
  examName: string;
  examDate: string;
  obtainedMark: number;
  totalMark: number;
  examType: 'Quiz' | 'Monthly Exam' | 'Final Exam' | 'Homework' | 'Midterm' | 'Lab';
  comments: string;
  createdAt: string;
}

export interface UpcomingExam {
  id: number;
  userId: number;
  subjectName: string;
  title: string;
  examDate: string;
  examType: string;
  notes: string;
  createdAt: string;
}

export interface FocusSession {
  id: number;
  userId: number;
  subjectName: string;
  sessionDate: string;
  durationSeconds: number;
  mode: 'Stopwatch' | 'Pomodoro';
  description: string;
  createdAt: string;
}

export interface NoteItem {
  id: number;
  userId: number;
  subjectName: string;
  title: string;
  content: string;
  formulas: string;
  definitions: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeItem {
  id: number;
  userId: number;
  subjectName: string;
  lesson: string;
  question: string;
  incorrectAnswer: string;
  correctAnswer: string;
  explanation: string;
  mistakeDate: string;
  status: 'Not Reviewed' | 'Reviewing' | 'Mastered';
  reviewCount: number;
  createdAt: string;
}

export interface FlashcardItem {
  id: number;
  userId: number;
  collectionName: string;
  subjectName: string;
  lesson: string;
  front: string;
  back: string;
  masteryStatus: 'Known' | 'Need Review';
  reviewCount: number;
  correctCount: number;
  lastReviewedAt: string | null;
  createdAt: string;
}

export interface PdfFolder {
  id: number;
  userId: number;
  parentId: number | null;
  name: string;
  createdAt: string;
}

export interface PdfDocument {
  id: number;
  userId: number;
  folderId: number | null;
  subjectName: string;
  title: string;
  originalFilename: string;
  fileSizeBytes: number;
  description: string;
  tags: string;
  createdAt: string;
}

export interface WorkspaceData {
  profile: UserProfile;
  subjects: SubjectItem[];
  weeklyPlans: WeeklyPlan[];
  tasks: StudyTask[];
  exams: ExamRecord[];
  upcomingExams: UpcomingExam[];
  focusSessions: FocusSession[];
  notes: NoteItem[];
  mistakes: MistakeItem[];
  flashcards: FlashcardItem[];
  pdfFolders: PdfFolder[];
  pdfDocuments: PdfDocument[];
}
