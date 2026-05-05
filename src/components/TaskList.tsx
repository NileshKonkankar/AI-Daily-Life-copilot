import { Task, updateTask, deleteTask } from '../services/taskService';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';

interface TaskListProps {
  tasks: Task[];
  prioritizedIds?: string[];
}

export function TaskList({ tasks, prioritizedIds }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
                backgroundColor: task.status === 'completed' ? 'var(--muted)' : 'var(--card)'
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
              <motion.div 
                whileTap={{ scale: 0.8 }}
                className="mt-1 flex items-center"
              >
                <Checkbox 
                  checked={task.status === 'completed'} 
                  onCheckedChange={(checked) => {
                    updateTask(task.id!, { status: checked ? 'completed' : 'pending' });
                  }}
                />
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
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={12} />
                      <span>{format(task.deadline, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
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
            <div className="space-y-6 pt-4">
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
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    {selectedTask.deadline ? format(selectedTask.deadline, 'PPP') : 'No due date'}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Created At</h4>
                  <p className="text-sm text-foreground">{format(selectedTask.createdAt, 'PPP p')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
