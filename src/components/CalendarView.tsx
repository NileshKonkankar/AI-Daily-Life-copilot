import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckSquare, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task } from '../services/taskService';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function CalendarView({ tasks, onSelectTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/45';
      case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/45';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/45';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/45';
    }
  };

  // Filter tasks with deadlines in the current rendered interval
  const tasksWithDeadlines = tasks.filter(t => t.deadline);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{format(currentDate, 'MMMM yyyy')}</h2>
            <p className="text-xs text-muted-foreground">
              Showing deadlines and time-sensitive milestones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9" 
            onClick={prevMonth}
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            className="h-9 px-3 text-xs font-semibold" 
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9" 
            onClick={nextMonth}
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground py-1 bg-muted/10 rounded-lg">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 min-h-[480px]">
        {days.map((day, idx) => {
          const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
          const isTodayDate = isToday(day);
          
          // Filter tasks due on this particular day
          const dayTasks = tasksWithDeadlines.filter(task => 
            isSameDay(new Date(task.deadline!), day)
          );

          return (
            <Card 
              key={idx} 
              className={`p-1.5 flex flex-col justify-between min-h-[90px] md:min-h-[110px] h-full border transition-all duration-200 relative ${
                !isCurrentMonth ? 'opacity-30 bg-muted/5' : 'bg-background'
              } ${
                isTodayDate ? 'ring-2 ring-primary/60 border-primary' : ''
              } hover:border-primary/40`}
            >
              <div className="flex justify-between items-start">
                {isTodayDate ? (
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    Today
                  </span>
                ) : <span />}
                
                <span className={`text-xs font-semibold ${
                  isTodayDate ? 'font-bold' : 'text-foreground/70'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Tasks List for Day */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-1 max-h-[70px] md:max-h-[90px] scrollbar-thin">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`text-[10px] leading-tight px-1.5 py-1 rounded-md border font-medium truncate cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
                      task.status === 'completed'
                        ? 'bg-muted text-muted-foreground line-through border-transparent'
                        : getPriorityColor(task.priority)
                    }`}
                    title={task.title}
                  >
                    <span className="mr-0.5">{task.status === 'completed' ? '✓' : '•'}</span>
                    {task.title}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
