import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckSquare,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { StudyTask } from '../types/study.ts';

export function WeeklyTodoView() {
  const {
    workspace,
    addWeeklyPlan,
    deleteWeeklyPlan,
    addTask,
    updateTask,
    deleteTask,
    showToast,
  } = useStudy();

  const plans = workspace?.weeklyPlans || [];
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    plans[0]?.id ?? null
  );
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // New Week Modal
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planStart, setPlanStart] = useState(new Date().toISOString().slice(0, 10));
  const [planEnd, setPlanEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });

  // Add/Edit Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [taskDeadline, setTaskDeadline] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Low'>(
    'Medium'
  );
  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    if (plans.length > 0 && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  const planTasks = useMemo(() => {
    if (!workspace || !activePlan) return [];
    return workspace.tasks.filter((t) => t.weeklyPlanId === activePlan.id);
  }, [workspace, activePlan]);

  const filteredTasks = useMemo(() => {
    return planTasks.filter((t) => {
      if (subjectFilter !== 'All' && t.subjectName !== subjectFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [planTasks, subjectFilter, priorityFilter]);

  const unfinishedTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const totalInPlan = planTasks.length;
  const completedInPlan = planTasks.filter((t) => t.completed).length;
  const completionPct =
    totalInPlan > 0 ? Math.round((completedInPlan / totalInPlan) * 100) : 0;

  if (!workspace) return null;

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskSubject(workspace.subjects[0]?.name || 'Mathematics');
    setTaskDeadline(activePlan?.endDate || new Date().toISOString().slice(0, 10));
    setTaskPriority('Medium');
    setTaskDescription('');
    setShowTaskModal(true);
  };

  const openEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskSubject(task.subjectName);
    setTaskDeadline(task.deadline);
    setTaskPriority(task.priority);
    setTaskDescription(task.description);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !taskTitle.trim()) return;
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskTitle.trim(),
          subjectName: taskSubject,
          deadline: taskDeadline,
          priority: taskPriority,
          description: taskDescription.trim(),
        });
        showToast('Task updated.');
      } else {
        await addTask({
          weeklyPlanId: activePlan.id,
          title: taskTitle.trim(),
          subjectName: taskSubject,
          deadline: taskDeadline,
          priority: taskPriority,
          description: taskDescription.trim(),
        });
        showToast('Task added to weekly plan.');
      }
      setShowTaskModal(false);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to save task.',
        'error'
      );
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;
    try {
      const created = await addWeeklyPlan({
        title: planTitle.trim(),
        startDate: planStart,
        endDate: planEnd,
      });
      setSelectedPlanId(created.id);
      setPlanTitle('');
      setShowNewPlanModal(false);
      showToast('New weekly plan created.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to create weekly plan.',
        'error'
      );
    }
  };

  const priorityTextColor = (p: string) => {
    if (p === 'High') return 'text-rose-600 dark:text-rose-400';
    if (p === 'Medium') return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Weekly To-Do List
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Manage independent weekly study plans and track completion history
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNewPlanModal(true)}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#13131E] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>New Weekly Plan</span>
          </button>
          <button
            type="button"
            onClick={openCreateTask}
            disabled={!activePlan}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Weekly Plan Selector + Completion Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-zinc-500 dark:text-[#8E8AA8]">
              Active Plan
            </label>
            <select
              value={activePlan?.id || ''}
              onChange={(e) => setSelectedPlanId(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
            >
              {plans.map((plan) => {
                const count = workspace.tasks.filter(
                  (t) => t.weeklyPlanId === plan.id
                ).length;
                return (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} ({plan.startDate} → {plan.endDate}) · {count} tasks
                  </option>
                );
              })}
            </select>

            {activePlan && plans.length > 1 && (
              <button
                type="button"
                onClick={async () => {
                  await deleteWeeklyPlan(activePlan.id);
                  showToast('Weekly plan deleted.');
                }}
                title="Delete selected weekly plan"
                className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="All">All Subjects</option>
              {workspace.subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-[#8E8AA8]">
              Weekly Completion ({completedInPlan} of {totalInPlan} tasks completed)
            </span>
            <span className="font-mono tabular-nums font-semibold text-violet-600 dark:text-violet-300">
              {completionPct}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-[#1D1C2C] overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Unfinished & Completed Separate Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unfinished */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
              Unfinished Tasks ({unfinishedTasks.length})
            </h2>
          </div>

          {unfinishedTasks.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                No unfinished tasks in this view.
              </p>
              <button
                type="button"
                onClick={openCreateTask}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-violet-600/10 text-violet-600 dark:text-violet-300 hover:bg-violet-600/20 cursor-pointer"
              >
                Add Study Task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
              {unfinishedTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3.5 flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, { completed: true })}
                      aria-label={`Mark ${task.title} complete`}
                      className="mt-0.5 text-zinc-400 hover:text-violet-500 transition-colors cursor-pointer shrink-0"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-xs text-zinc-600 dark:text-[#9692AF] leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      <div className="text-xs text-zinc-500 dark:text-[#84809E] flex flex-wrap items-center gap-1.5">
                        <span>{task.subjectName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Due {task.deadline}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-medium ${priorityTextColor(task.priority)}`}>
                          {task.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditTask(task)}
                      aria-label="Edit task"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-500 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      aria-label="Delete task"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
              Completed Tasks ({completedTasks.length})
            </h2>
          </div>

          {completedTasks.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                Completed tasks will appear here as you finish them.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3.5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, { completed: false })}
                      aria-label={`Reopen ${task.title}`}
                      className="mt-0.5 text-violet-600 dark:text-violet-400 cursor-pointer shrink-0"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium text-zinc-500 dark:text-[#7D7998] line-through">
                        {task.title}
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-[#6B6784] flex flex-wrap items-center gap-1.5">
                        <span>{task.subjectName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{task.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Previous Weeks History Summary */}
      {plans.length > 1 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Weekly Plans History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-[#222033] text-xs text-zinc-500 dark:text-[#8E8AA8]">
                  <th className="py-2.5 pr-4 font-medium">Plan Title</th>
                  <th className="py-2.5 px-4 font-medium">Date Range</th>
                  <th className="py-2.5 px-4 font-medium text-right">Completed</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
                {plans.map((p) => {
                  const pTasks = workspace.tasks.filter(
                    (t) => t.weeklyPlanId === p.id
                  );
                  const done = pTasks.filter((t) => t.completed).length;
                  const pct =
                    pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className="hover:bg-zinc-50 dark:hover:bg-[#161622] cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-white">
                        {p.title}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-zinc-500 dark:text-[#8E8AA8]">
                        {p.startDate} → {p.endDate}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-700 dark:text-zinc-300">
                        {done} / {pTasks.length}
                      </td>
                      <td className="py-3 pl-4 font-mono tabular-nums text-right font-semibold text-violet-600 dark:text-violet-300">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Weekly Plan Modal */}
      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Create New Weekly Plan
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPlanModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Plan Title
                </label>
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g., Week 12 — Midterm Prep"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={planStart}
                    onChange={(e) => setPlanStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={planEnd}
                    onChange={(e) => setPlanEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlanModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'New Study Task'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Solve Calculus Chapter 3 problem set"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    {workspace.subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as 'High' | 'Medium' | 'Low')
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Deadline
                </label>
                <input
                  type="date"
                  required
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Optional study notes or exercises to cover..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  {editingTask ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
