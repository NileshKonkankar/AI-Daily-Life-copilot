import { Task, updateTask, deleteTask } from '../services/taskService';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, ArrowUp, ArrowRight, ArrowDown, ListTodo, FileText, Plus, X, CheckCircle2, Tag } from 'lucide-react';
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
    const promises = selectedTaskIds.map(id => updateTask(id, { status: 'completed' }));
    await Promise.all(promises);
    setSelectedTaskIds([]);
  };

  const bulkMarkPending = async () => {
    if (selectedTaskIds.length === 0) return;
    const promises = selectedTaskIds.map(id => updateTask(id, { status: 'pending' }));
    await Promise.all(promises);
    setSelectedTaskIds([]);
  };

  const bulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    const promises = selectedTaskIds.map(id => deleteTask(id));
    await Promise.all(promises);
    setSelectedTaskIds([]);
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
    const updatedSubTasks = selectedTask.subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    
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

  // Sort tasks: if prioritizedIds exist, use that order. Otherwise, pending first, then by creation date.
  const sortedTasks = [...tasks].sort((a, b) => {
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        No tasks yet. Add one to get started!
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
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
    <div className="space-y-3">
      {sortedTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/10 border rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="select-all-header"
              checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
              onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
            />
            <label htmlFor="select-all-header" className="cursor-pointer font-medium text-xs select-none">
              Select All ({sortedTasks.length} tasks)
            </label>
          </div>
          {selectedTaskIds.length > 0 && (
            <span className="text-xs font-semibold text-primary">
              {selectedTaskIds.length} of {sortedTasks.length} selected
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  With {selectedTaskIds.length} select{selectedTaskIds.length === 1 ? 'ed' : 'ions'}:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={bulkMarkCompleted}
                  className="h-8 text-xs font-medium flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Complete
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={bulkMarkPending}
                  className="h-8 text-xs font-medium flex items-center gap-1.5"
                >
                  <ListTodo className="h-3.5 w-3.5 text-blue-500" />
                  Pending
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={bulkDelete}
                  className="h-8 text-xs font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSelection}
                  className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task, index) => {
          const isPrioritized = prioritizedIds && prioritizedIds.indexOf(task.id!) !== -1;
          const rank = isPrioritized ? prioritizedIds.indexOf(task.id!) + 1 : null;

          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ 
                opacity: task.status === 'completed' ? 0.6 : 1,
                scale: task.status === 'completed' ? 0.98 : 1,
                y: 0,
                backgroundColor: task.status === 'completed' ? 'var(--muted)' : 'var(--card)',
                transition: {
                  type: "spring",
                  stiffness: task.status === 'completed' ? 400 : 300,
                  damping: task.status === 'completed' ? 15 : 25
                }
              }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              whileHover={{ scale: task.status === 'completed' ? 0.98 : 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25,
                opacity: { duration: 0.2 }
              }}
            >
              <Card className={`p-4 transition-all ${isPrioritized && rank === 1 ? 'border-primary shadow-md' : ''}`}>
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
                className="mt-1 flex items-center"
              >
                <Checkbox 
                  checked={task.status === 'completed'} 
                  onCheckedChange={(checked) => {
                    updateTask(task.id!, { status: checked ? 'completed' : 'pending' });
                    if (checked) {
                      setJustCompletedId(task.id!);
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => deleteTask(task.id!)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
            </motion.div>
        );
      })}
      </AnimatePresence>

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
                  <Badge variant={selectedTask.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                    {selectedTask.status}
                  </Badge>
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
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
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
    </div>
  );
}
