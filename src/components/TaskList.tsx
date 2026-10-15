import { Task, updateTask, deleteTask, batchDeleteTasks, batchArchiveTasks, batchUpdatePriority, batchUpdateStatus } from '../services/taskService';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Trash2, 
  ArrowUp, 
  ArrowRight, 
  ArrowDown, 
  Minus,
  ListTodo, 
  FileText, 
  Plus, 
  X, 
  CheckCircle2, 
  Tag, 
  Archive, 
  ArchiveRestore, 
  Flag, 
  ChevronDown, 
  AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { startOfDay } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { playCompletionChime } from '../utils/sound';
import { fireTaskCompletionConfetti, fireBulkCompletionConfetti } from '../utils/confetti';

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const taskItemVariants = {
  hidden: { 
    opacity: 0, 
    x: -28, 
    scale: 0.97,
  },
  visible: (custom: { isCompleted: boolean; index: number }) => ({
    opacity: custom.isCompleted ? 0.6 : 1,
    scale: custom.isCompleted ? 0.98 : 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: custom.isCompleted ? 360 : 320,
      damping: custom.isCompleted ? 24 : 26,
      mass: 0.8,
      delay: Math.min(custom.index * 0.03, 0.25),
    }
  }),
  exit: { 
    opacity: 0, 
    x: 36, 
    scale: 0.93, 
    transition: { 
      duration: 0.24, 
      ease: [0.32, 0, 0.67, 0] 
    } 
  },
};

interface TaskListProps {
  tasks: Task[];
  prioritizedIds?: string[];
  selectedTask?: Task | null;
  onSelectTask?: (task: Task | null) => void;
}

export function TaskList({ 
  tasks, 
  prioritizedIds, 
  selectedTask: propSelectedTask, 
  onSelectTask: propSetSelectedTask 
}: TaskListProps) {
  const [localSelectedTask, setLocalSelectedTask] = useState<Task | null>(null);
  
  const selectedTask = propSelectedTask !== undefined ? propSelectedTask : localSelectedTask;
  const setSelectedTask = (task: Task | null) => {
    if (propSetSelectedTask) {
      propSetSelectedTask(task);
    } else {
      setLocalSelectedTask(task);
    }
  };
  const [newSubTask, setNewSubTask] = useState('');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [detailTagInput, setDetailTagInput] = useState('');

  // Bulk actions and archive filter states
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isPriorityPopoverOpen, setIsPriorityPopoverOpen] = useState(false);

  const handleAddDetailTag = async () => {
    if (!selectedTask || !detailTagInput.trim()) return;
    const currentTags = selectedTask.tags || [];
    if (currentTags.includes(detailTagInput.trim())) {
      setDetailTagInput('');
      return;
    }
    if (currentTags.length >= 10) {
      toast.error('Maximum 10 tags allowed per task');
      return;
    }
    const updatedTags = [...currentTags, detailTagInput.trim()];
    await updateTask(selectedTask.id!, { tags: updatedTags });
    setSelectedTask({ ...selectedTask, tags: updatedTags });
    setDetailTagInput('');
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(sortedTasks.map(t => t.id!).filter(Boolean));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const bulkMarkCompleted = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkLoading(true);
    try {
      await batchUpdateStatus(selectedTaskIds, 'completed');
      playCompletionChime({ isBulk: true });
      fireBulkCompletionConfetti();
      toast.success(`Completed ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''}! 🎉`);
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to update tasks');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkMarkPending = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkLoading(true);
    try {
      await batchUpdateStatus(selectedTaskIds, 'pending');
      toast.success(`Marked ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''} as pending`);
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to update tasks');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkArchive = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkLoading(true);
    const isUnarchiving = archiveFilter === 'archived';
    const count = selectedTaskIds.length;
    try {
      await batchArchiveTasks(selectedTaskIds, !isUnarchiving);
      toast.success(
        isUnarchiving 
          ? `Restored ${count} task${count > 1 ? 's' : ''} to active list` 
          : `Archived ${count} task${count > 1 ? 's' : ''}`,
        {
          action: !isUnarchiving ? {
            label: 'View Archived',
            onClick: () => setArchiveFilter('archived'),
          } : {
            label: 'View Active',
            onClick: () => setArchiveFilter('active'),
          }
        }
      );
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to update archive status');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkSetPriority = async (priority: Task['priority']) => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkLoading(true);
    const count = selectedTaskIds.length;
    try {
      await batchUpdatePriority(selectedTaskIds, priority);
      toast.success(`Updated priority to ${priority} for ${count} task${count > 1 ? 's' : ''}`);
      setSelectedTaskIds([]);
      setIsPriorityPopoverOpen(false);
    } catch {
      toast.error('Failed to update task priority');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkLoading(true);
    const count = selectedTaskIds.length;
    try {
      await batchDeleteTasks(selectedTaskIds);
      toast.success(`Deleted ${count} task${count > 1 ? 's' : ''}`);
      setSelectedTaskIds([]);
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error('Failed to delete tasks');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  const calculateProgress = (task: Task) => {
    if (!task.subTasks || task.subTasks.length === 0) return task.status === 'completed' ? 100 : 0;
    const completed = task.subTasks.filter(st => st.completed).length;
    return Math.round((completed / task.subTasks.length) * 100);
  };

  const addSubTask = async () => {
    if (!selectedTask || !newSubTask.trim()) return;
    const subTasks = selectedTask.subTasks || [];
    const updatedSubTasks = [...subTasks, { id: Math.random().toString(36).substr(2, 9), title: newSubTask.trim(), completed: false }];
    
    await updateTask(selectedTask.id!, { subTasks: updatedSubTasks });
    setSelectedTask({ ...selectedTask, subTasks: updatedSubTasks });
    setNewSubTask('');
  };

  const toggleSubTask = async (subTaskId: string) => {
    if (!selectedTask || !selectedTask.subTasks) return;
    let becameCompleted = false;
    const updatedSubTasks = selectedTask.subTasks.map(st => {
      if (st.id === subTaskId) {
        if (!st.completed) becameCompleted = true;
        return { ...st, completed: !st.completed };
      }
      return st;
    });
    
    if (becameCompleted) {
      const allSubtasksDone = updatedSubTasks.length > 0 && updatedSubTasks.every(st => st.completed);
      if (allSubtasksDone) {
        playCompletionChime();
        fireTaskCompletionConfetti({ x: 0.5, y: 0.5 });
        toast.success("All sub-tasks completed! 🎉");
      } else {
        playCompletionChime({ volumeMultiplier: 0.65 });
      }
    }

    await updateTask(selectedTask.id!, { subTasks: updatedSubTasks });
    setSelectedTask({ ...selectedTask, subTasks: updatedSubTasks });
  };

  const removeSubTask = async (subTaskId: string) => {
    if (!selectedTask || !selectedTask.subTasks) return;
    const updatedSubTasks = selectedTask.subTasks.filter(st => st.id !== subTaskId);
    
    await updateTask(selectedTask.id!, { subTasks: updatedSubTasks });
    setSelectedTask({ ...selectedTask, subTasks: updatedSubTasks });
  };

  const updateNotes = async (notes: string) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id!, { notes });
    setSelectedTask({ ...selectedTask, notes });
  };

  const activeTasks = tasks.filter(t => !t.isArchived);
  const archivedTasks = tasks.filter(t => !!t.isArchived);

  const displayedTasks = tasks.filter(t => {
    if (archiveFilter === 'active') return !t.isArchived;
    if (archiveFilter === 'archived') return !!t.isArchived;
    return true;
  });

  // Sort tasks: if prioritizedIds exist, use that order. Otherwise, pending first, then by creation date.
  const sortedTasks = [...displayedTasks].sort((a, b) => {
    if (prioritizedIds && prioritizedIds.length > 0) {
      const indexA = prioritizedIds.indexOf(a.id!);
      const indexB = prioritizedIds.indexOf(b.id!);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getPriorityCardClasses = (task: Task) => {
    if (task.status === 'completed') {
      return 'bg-muted/30 text-muted-foreground border-muted-foreground/10 opacity-70 transition-all';
    }

    switch (task.priority) {
      case 'high':
        return 'bg-red-500/[0.04] hover:bg-red-500/[0.07] dark:bg-red-500/[0.05] dark:hover:bg-red-500/[0.08] ring-red-500/35 border-l-4 border-l-red-500 rounded-l-none transition-all';
      case 'medium':
        return 'bg-amber-500/[0.04] hover:bg-amber-500/[0.07] dark:bg-amber-500/[0.05] dark:hover:bg-amber-500/[0.08] ring-amber-500/35 border-l-4 border-l-amber-500 rounded-l-none transition-all';
      case 'low':
        return 'bg-blue-500/[0.04] hover:bg-blue-500/[0.07] dark:bg-blue-500/[0.05] dark:hover:bg-blue-500/[0.08] ring-blue-500/35 border-l-4 border-l-blue-500 rounded-l-none transition-all';
      default:
        return 'bg-card hover:bg-muted/20 border-border transition-all';
    }
  };

  const PriorityIcon = ({ priority, className }: { priority: string, className?: string }) => {
    switch (priority) {
      case 'high': return <ArrowUp className={className} />;
      case 'medium': return <ArrowRight className={className} />;
      case 'low': return <ArrowDown className={className} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3 relative">
      {/* Header with Active / Archived views and Select All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 text-sm text-muted-foreground bg-muted/15 border rounded-xl">
        <div className="flex items-center gap-3">
          {/* Active / Archived View Switcher */}
          <div className="inline-flex items-center p-0.5 bg-muted/50 rounded-lg text-xs border">
            <button
              type="button"
              onClick={() => { setArchiveFilter('active'); setSelectedTaskIds([]); }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all text-xs",
                archiveFilter === 'active' 
                  ? "bg-background text-foreground shadow-xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active ({activeTasks.length})
            </button>
            <button
              type="button"
              onClick={() => { setArchiveFilter('archived'); setSelectedTaskIds([]); }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all text-xs flex items-center gap-1.5",
                archiveFilter === 'archived' 
                  ? "bg-background text-foreground shadow-xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Archive className="h-3 w-3" />
              <span>Archived ({archivedTasks.length})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Select All Checkbox */}
          {sortedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all-header"
                checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
                onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
              />
              <label htmlFor="select-all-header" className="cursor-pointer font-medium text-xs select-none">
                Select All ({sortedTasks.length})
              </label>
            </div>
          )}
        </div>

        {selectedTaskIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              {selectedTaskIds.length} of {sortedTasks.length} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Toolbar that appears when one or more tasks are selected */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="sticky bottom-4 z-40 my-1 w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card/95 backdrop-blur-md border-2 border-primary/30 rounded-2xl shadow-xl ring-4 ring-primary/10">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs shrink-0">
                  {selectedTaskIds.length}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight text-foreground">
                    {selectedTaskIds.length} task{selectedTaskIds.length === 1 ? '' : 's'} selected
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(selectedTaskIds.length !== sortedTasks.length)}
                      className="hover:text-primary transition-colors hover:underline text-left"
                    >
                      {selectedTaskIds.length === sortedTasks.length ? 'Deselect all' : `Select all (${sortedTasks.length})`}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="hover:text-destructive transition-colors hover:underline text-left"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Priority Selection Popover */}
                <Popover open={isPriorityPopoverOpen} onOpenChange={setIsPriorityPopoverOpen}>
                  <PopoverTrigger render={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isBulkLoading}
                      className="h-8 text-xs font-medium gap-1.5 border-border hover:bg-muted"
                    >
                      <Flag className="h-3.5 w-3.5 text-amber-500" />
                      <span>Change Priority</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  } />
                  <PopoverContent className="w-60 p-2 z-50 bg-background border shadow-lg rounded-xl" align="end">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1 flex items-center justify-between">
                      <span>Change Priority</span>
                      <Badge variant="secondary" className="text-[10px]">{selectedTaskIds.length} selected</Badge>
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => bulkSetPriority('high')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <ArrowUp className="h-3.5 w-3.5 text-red-500" /> High Priority
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200">High</Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetPriority('medium')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <ArrowRight className="h-3.5 w-3.5 text-amber-500" /> Medium Priority
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200">Medium</Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetPriority('low')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-blue-500/10 hover:text-blue-600 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <ArrowDown className="h-3.5 w-3.5 text-blue-500" /> Low Priority
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200">Low</Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetPriority('unassigned')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <span className="flex items-center gap-2 font-medium text-muted-foreground">
                          <Minus className="h-3.5 w-3.5" /> Unassigned
                        </span>
                        <Badge variant="outline" className="text-[10px]">None</Badge>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Batch Archive / Restore */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={bulkArchive}
                  disabled={isBulkLoading}
                  className="h-8 text-xs font-medium gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                  title={archiveFilter === 'archived' ? 'Restore tasks to active list' : 'Archive tasks'}
                >
                  {archiveFilter === 'archived' ? (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5 text-blue-500" />
                      <span>Restore</span>
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5 text-amber-500" />
                      <span>Archive</span>
                    </>
                  )}
                </Button>

                {/* Batch Complete */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={bulkMarkCompleted}
                  disabled={isBulkLoading}
                  className="h-8 text-xs font-medium gap-1.5 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Complete</span>
                </Button>

                {/* Batch Delete (triggers confirmation dialog) */}
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isBulkLoading}
                  className="h-8 text-xs font-medium gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>

                {/* Clear selection button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearSelection}
                  className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-full"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sortedTasks.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="text-center py-12 text-muted-foreground border border-dashed rounded-xl p-6"
        >
          {archiveFilter === 'archived' ? (
            <div className="flex flex-col items-center gap-2">
              <Archive className="h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium text-sm">No archived tasks</p>
              <p className="text-xs text-muted-foreground/75">
                Select tasks from the active list and click Archive to keep your workspace focused.
              </p>
            </div>
          ) : (
            <p>No tasks yet. Add one to get started!</p>
          )}
        </motion.div>
      )}

      <motion.div 
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task, index) => {
            const isPrioritized = prioritizedIds && prioritizedIds.indexOf(task.id!) !== -1;
            const rank = isPrioritized ? prioritizedIds.indexOf(task.id!) + 1 : null;

            return (
              <motion.div
                key={task.id}
                layout="position"
                variants={taskItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={{ isCompleted: task.status === 'completed', index }}
                whileHover={{ scale: task.status === 'completed' ? 0.99 : 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
              <Card className={cn("p-4 transition-all", getPriorityCardClasses(task), isPrioritized && rank === 1 ? 'border-primary shadow-md' : '')}>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex items-center shrink-0">
                <Checkbox 
                  checked={selectedTaskIds.includes(task.id!)} 
                  onCheckedChange={() => toggleSelectTask(task.id!)}
                  className="border-muted-foreground/35 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  title="Select task for bulk actions"
                />
              </div>
              <motion.div 
                whileTap={{ scale: 0.8 }}
                className="mt-1 flex items-center relative"
                onPointerDown={(e) => {
                  if (typeof window !== 'undefined' && e.clientX && e.clientY) {
                    (window as any).__lastPointerOrigin = {
                      x: e.clientX / window.innerWidth,
                      y: e.clientY / window.innerHeight,
                    };
                  }
                }}
              >
                <Checkbox 
                  checked={task.status === 'completed'} 
                  onCheckedChange={(checked) => {
                    updateTask(task.id!, { status: checked ? 'completed' : 'pending' });
                    if (checked) {
                      setJustCompletedId(task.id!);
                      playCompletionChime();
                      const origin = typeof window !== 'undefined' ? (window as any).__lastPointerOrigin : undefined;
                      fireTaskCompletionConfetti(origin);
                      setTimeout(() => setJustCompletedId(null), 800);
                    }
                  }}
                />
                <AnimatePresence>
                  {justCompletedId === task.id && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 0, y: 0, scale: 0 }}
                          animate={{ 
                            x: (Math.random() - 0.5) * 50, 
                            y: (Math.random() - 0.5) * 50, 
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0]
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-primary rounded-full"
                        />
                      ))}
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 rounded-full border-2 border-primary"
                      />
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
              <div 
                className="flex-1 min-w-0 cursor-pointer rounded-md hover:bg-muted/30 p-1 -m-1 transition-colors"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {rank && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">#{rank}</Badge>}
                  <h4 className={`relative font-medium truncate inline-block ${task.status === 'completed' ? 'text-muted-foreground' : ''}`}>
                    {task.title}
                    <motion.div
                      initial={false}
                      animate={{ width: task.status === 'completed' ? '100%' : '0%' }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute left-0 top-[55%] h-[1.5px] bg-muted-foreground/60 rounded-full"
                    />
                  </h4>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Badge variant="secondary" className="capitalize text-xs font-normal">
                    {task.category}
                  </Badge>
                  {task.isArchived && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                      <Archive className="w-2.5 h-2.5" /> Archived
                    </Badge>
                  )}
                  {task.priority !== 'unassigned' && (
                    <Badge variant="outline" className={`capitalize text-xs font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                      <PriorityIcon priority={task.priority} className="w-3 h-3" />
                      {task.priority}
                    </Badge>
                  )}
                  {task.tags && task.tags.map(t => (
                    <Badge key={t} variant="secondary" className="bg-primary/5 text-primary border border-primary/20 text-[10px] py-0 px-1.5 h-5 font-medium rounded-full">
                      # {t}
                    </Badge>
                  ))}
                  {task.notes && (
                    <div className="flex items-center gap-1" title="Has notes">
                      <FileText size={12} className="text-muted-foreground" />
                    </div>
                  )}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="flex items-center gap-1" title={`${task.subTasks.filter(st => st.completed).length}/${task.subTasks.length} sub-tasks`}>
                      <ListTodo size={12} className="text-muted-foreground" />
                      <span className="text-[10px] font-medium">{task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}</span>
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={12} />
                      <span>{format(task.deadline, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
                {task.priority === 'high' && (task.subTasks && task.subTasks.length > 0) && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground">
                      <span>Progress</span>
                      <span>{calculateProgress(task)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${calculateProgress(task)}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-amber-600 transition-colors"
                  title={task.isArchived ? "Restore task to active list" : "Archive task"}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const willArchive = !task.isArchived;
                    await updateTask(task.id!, { isArchived: willArchive });
                    toast.success(willArchive ? "Task archived" : "Task restored to active list");
                  }}
                >
                  {task.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  title="Delete task"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id!);
                    toast.success("Task deleted");
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
            </motion.div>
        );
      })}
        </AnimatePresence>
      </motion.div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              A deeper look at your task.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <ScrollArea className="max-h-[80vh] px-1">
            <div className="space-y-6 pt-4 pb-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Title</h4>
                <p className="text-base font-semibold">{selectedTask.title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <button
                    type="button"
                    onClick={async (e) => {
                      const nextStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
                      await updateTask(selectedTask.id!, { status: nextStatus });
                      setSelectedTask({ ...selectedTask, status: nextStatus });
                      if (nextStatus === 'completed') {
                        playCompletionChime();
                        const origin = e.clientX && e.clientY ? {
                          x: e.clientX / window.innerWidth,
                          y: e.clientY / window.innerHeight
                        } : undefined;
                        fireTaskCompletionConfetti(origin);
                      }
                    }}
                    className="flex items-center gap-1.5 focus:outline-none group"
                  >
                    <Badge 
                      variant={selectedTask.status === 'completed' ? 'default' : 'secondary'} 
                      className={cn(
                        "capitalize cursor-pointer transition-all hover:opacity-90 flex items-center gap-1",
                        selectedTask.status === 'completed' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      )}
                    >
                      {selectedTask.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      {selectedTask.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground group-hover:underline">click to toggle</span>
                  </button>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Priority</h4>
                  <Badge variant="outline" className={`capitalize flex items-center gap-1 w-fit ${getPriorityColor(selectedTask.priority)}`}>
                    <PriorityIcon priority={selectedTask.priority} className="w-3 h-3" />
                    {selectedTask.priority}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <Badge variant="secondary" className="capitalize">
                    {selectedTask.category}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Archive State</h4>
                  <button
                    type="button"
                    onClick={async () => {
                      const willArchive = !selectedTask.isArchived;
                      await updateTask(selectedTask.id!, { isArchived: willArchive });
                      setSelectedTask({ ...selectedTask, isArchived: willArchive });
                      toast.success(willArchive ? "Task archived" : "Task restored to active");
                    }}
                    className="flex items-center gap-1.5 focus:outline-none group"
                  >
                    <Badge 
                      variant={selectedTask.isArchived ? 'outline' : 'secondary'} 
                      className={cn(
                        "cursor-pointer transition-all hover:opacity-90 flex items-center gap-1.5",
                        selectedTask.isArchived ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300" : ""
                      )}
                    >
                      {selectedTask.isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                      <span>{selectedTask.isArchived ? 'Archived' : 'Active'}</span>
                    </Badge>
                    <span className="text-[10px] text-muted-foreground group-hover:underline">click to {selectedTask.isArchived ? 'restore' : 'archive'}</span>
                  </button>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h4>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal text-xs h-9 mt-1"
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {selectedTask.deadline ? format(selectedTask.deadline, "PPP") : <span className="text-muted-foreground">No due date</span>}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 z-[100] scale-95" align="start">
                      <div className="p-1 border-b text-center bg-muted/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[10px] h-7 font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            await updateTask(selectedTask.id!, { deadline: null });
                            setSelectedTask({ ...selectedTask, deadline: null });
                          }}
                        >
                          Clear Due Date
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectedTask.deadline || undefined}
                        onSelect={async (newDate) => {
                          const updatedDate = newDate || null;
                          await updateTask(selectedTask.id!, { deadline: updatedDate });
                          setSelectedTask({ ...selectedTask, deadline: updatedDate });
                        }}
                        disabled={(date) => date < startOfDay(new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags / Labels
                </h4>
                <div className="space-y-2">
                  {/* Suggestions for existing task details */}
                  <div className="flex flex-wrap gap-1.5 items-center mb-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Quick Add:</span>
                    {['Work', 'Personal', 'Urgent'].map(sug => {
                      const currentTags = selectedTask.tags || [];
                      const alreadyAdded = currentTags.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={async () => {
                            if (alreadyAdded) return;
                            if (currentTags.length >= 10) {
                              toast.error('Maximum 10 tags allowed per task');
                              return;
                            }
                            const updatedTags = [...currentTags, sug];
                            await updateTask(selectedTask.id!, { tags: updatedTags });
                            setSelectedTask({ ...selectedTask, tags: updatedTags });
                          }}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded border font-medium transition-all",
                            alreadyAdded 
                              ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50"
                              : "bg-background text-foreground hover:bg-muted/70 hover:border-primary/30 border-border"
                          )}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/10 min-h-[36px] items-center">
                    {(!selectedTask.tags || selectedTask.tags.length === 0) ? (
                      <span className="text-xs text-muted-foreground italic pl-1">No tags on this task</span>
                    ) : (
                      selectedTask.tags.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs py-0.5 pl-2 pr-1 flex items-center gap-1.5">
                          {t}
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedTags = selectedTask.tags?.filter(tag => tag !== t) || [];
                              await updateTask(selectedTask.id!, { tags: updatedTags });
                              setSelectedTask({ ...selectedTask, tags: updatedTags });
                            }}
                            className="text-muted-foreground hover:text-foreground rounded-full size-4 flex items-center justify-center bg-muted/40 hover:bg-muted"
                            title="Remove tag"
                          >
                            <X size={10} />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add custom tag..." 
                      value={detailTagInput}
                      onChange={(e) => setDetailTagInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          await handleAddDetailTag();
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleAddDetailTag} className="h-8 px-3 text-xs shrink-0">
                      Add Tag
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Sub-tasks
                </h4>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {selectedTask.subTasks?.map((st) => (
                      <motion.div 
                        key={st.id}
                        layout="position"
                        initial={{ opacity: 0, x: -16, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 26,
                          opacity: { duration: 0.2 }
                        }}
                        className="flex items-center gap-2 group p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all"
                      >
                        <Checkbox 
                          checked={st.completed}
                          onCheckedChange={() => toggleSubTask(st.id)}
                        />
                        <span className={`text-sm flex-1 ${st.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {st.title}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeSubTask(st.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  <div className="flex gap-2 mt-2">
                    <Input 
                      placeholder="Add a sub-task..." 
                      value={newSubTask}
                      onChange={(e) => setNewSubTask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={addSubTask} className="h-8 px-2">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <Textarea 
                  placeholder="Add details, links, or context..."
                  value={selectedTask.notes || ''}
                  onChange={(e) => updateNotes(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created At</h4>
                <p className="text-sm text-foreground">{format(selectedTask.createdAt, 'PPP p')}</p>
              </div>
            </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Delete {selectedTaskIds.length} tasks?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the {selectedTaskIds.length} selected task{selectedTaskIds.length === 1 ? '' : 's'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2.5 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isBulkLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={bulkDelete}
              disabled={isBulkLoading}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {isBulkLoading ? 'Deleting...' : `Delete ${selectedTaskIds.length} Task${selectedTaskIds.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
