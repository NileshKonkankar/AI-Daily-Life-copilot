import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Trophy, Plus, Minus, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { Task } from '../services/taskService';

interface WeeklyGoalTrackerProps {
  tasks: Task[];
  userId: string;
}

export function WeeklyGoalTracker({ tasks, userId }: WeeklyGoalTrackerProps) {
  // Get start of the current week (Monday) and end of the current week (Sunday)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Filter tasks completed during the current calendar week
  // Since tasks may not have completedAt, we check if they are status === 'completed'
  // and their createdAt is within the current week's range (or deadline, to be flexible).
  // Comparing createdAt within local current week is highly robust for ongoing week progress.
  const completedThisWeekTasks = tasks.filter(task => {
    if (task.status !== 'completed') return false;
    
    // Fallback to createdAt as the standard timestamp
    const dateToCheck = task.createdAt ? new Date(task.createdAt) : null;
    if (!dateToCheck) return false;

    return isWithinInterval(dateToCheck, { start: weekStart, end: weekEnd });
  });

  const completedCount = completedThisWeekTasks.length;

  // Retrieve user-specific weekly goal from localStorage (defaults to 5)
  const storageKey = `weekly_goal_${userId}`;
  const [goal, setGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading weekly goal', e);
    }
    return 5; // default weekly goal
  });

  // Keep goal in sync with user changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, goal.toString());
    } catch (e) {
      console.error('Error saving weekly goal', e);
    }
  }, [goal, storageKey]);

  const handleIncrement = () => {
    setGoal(prev => (prev < 100 ? prev + 1 : prev));
  };

  const handleDecrement = () => {
    setGoal(prev => (prev > 1 ? prev - 1 : prev));
  };

  const progressPercentage = goal > 0 ? Math.min(Math.round((completedCount / goal) * 100), 100) : 0;
  const isGoalReached = completedCount >= goal;

  // Render contextual message and colors based on goal completion status
  const getMotivationalContent = () => {
    if (completedCount === 0) {
      return {
        message: "Kick off the week! Complete your first task to start your progress.",
        colorClass: "bg-muted text-muted-foreground",
        barColor: "bg-primary",
      };
    }
    if (progressPercentage < 50) {
      return {
        message: "Steady progress! Keep the momentum going.",
        colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
        barColor: "bg-amber-500",
      };
    }
    if (progressPercentage < 100) {
      return {
        message: "You are more than halfway there! Almost at the target.",
        colorClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
        barColor: "bg-blue-500",
      };
    }
    return {
      message: "Weekly target hit! Incredible focus and execution! 🏆",
      colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
      barColor: "bg-emerald-500",
    };
  };

  const motivation = getMotivationalContent();

  return (
    <div className="bg-background rounded-xl border shadow-sm p-6 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shrink-0 ${isGoalReached ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
              {isGoalReached ? <Trophy size={16} /> : <Target size={16} />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Weekly Task Goal</span>
              <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Goal Controller UI */}
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/20">
            <button
              onClick={handleDecrement}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-sm transition-all focus:outline-none"
              title="Decrease Goal"
            >
              <Minus size={12} />
            </button>
            <span className="font-mono text-xs font-bold text-foreground px-1.5 min-w-[20px] text-center select-none">
              {goal}
            </span>
            <button
              onClick={handleIncrement}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-sm transition-all focus:outline-none"
              title="Increase Goal"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Highlighted Goal Ratio display */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight">{completedCount}</span>
          <span className="text-sm text-muted-foreground">/ {goal} tasks completed this week</span>
        </div>

        {/* Motivational Status Notification */}
        <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium leading-relaxed ${motivation.colorClass} flex items-center justify-between`}>
          <span>{motivation.message}</span>
          {isGoalReached && (
            <Sparkles size={14} className="text-amber-500 shrink-0 ml-1.5 animate-bounce" />
          )}
        </div>
      </div>

      {/* Progress Bar with Motion */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
          <span className="uppercase">Target Progress</span>
          <span className="font-mono font-bold text-foreground">{progressPercentage}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
          <motion.div 
            className={`h-full rounded-full ${motivation.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {isGoalReached && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold justify-end mt-1 animate-pulse">
            <CheckCircle2 size={10} /> Completed!
          </div>
        )}
      </div>
    </div>
  );
}
