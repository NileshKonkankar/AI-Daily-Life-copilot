import { Task, updateTask, deleteTask } from '../services/taskService';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface TaskListProps {
  tasks: Task[];
  prioritizedIds?: string[];
}

export function TaskList({ tasks, prioritizedIds }: TaskListProps) {
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
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
                y: 0
              }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`p-4 transition-all ${isPrioritized && rank === 1 ? 'border-primary shadow-md' : ''}`}>
            <div className="flex items-start gap-3">
              <Checkbox 
                checked={task.status === 'completed'} 
                onCheckedChange={(checked) => {
                  updateTask(task.id!, { status: checked ? 'completed' : 'pending' });
                }}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {rank && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">#{rank}</Badge>}
                  <h4 className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Badge variant="secondary" className="capitalize text-xs font-normal">
                    {task.category}
                  </Badge>
                  {task.priority !== 'unassigned' && (
                    <Badge variant="outline" className={`capitalize text-xs font-normal border-transparent ${getPriorityColor(task.priority)}`}>
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
    </div>
  );
}
