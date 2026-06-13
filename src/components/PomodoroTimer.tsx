import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Timer, 
  Coffee, 
  Brain, 
  Flame, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '../services/taskService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  activeTask: Task | null;
  onSelectTask?: (task: Task | null) => void;
}

export function PomodoroTimer({ activeTask, onSelectTask }: PomodoroTimerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);

  // Stats stored in localStorage:
  // - 'pomodoro_today_count': number
  // - 'pomodoro_by_task': Record<taskId, number>
  // - 'pomodoro_last_date': string (YYYY-MM-DD)
  const [todayCount, setTodayCount] = useState(0);
  const [taskStats, setTaskStats] = useState<Record<string, number>>({});

  const [customTimeInput, setCustomTimeInput] = useState('25');
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Preset minutes
  const presets = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio synthesizer chime using the Web Audio API
  const playSoundChime = (type: 'start' | 'success' | 'click') => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'success') {
        // High quality dual-tone zen chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.2); // E5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        gain2.gain.setValueAtTime(0.12, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 1.2);

        osc2.start(now);
        osc2.stop(now + 1.2);
      } else if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn('Audio context synthesizer was blocked or failed', e);
    }
  };

  // Load stats on mounting
  useEffect(() => {
    // Today check
    const todayStr = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('pomodoro_last_date');
    
    if (savedDate !== todayStr) {
      localStorage.setItem('pomodoro_today_count', '0');
      localStorage.setItem('pomodoro_last_date', todayStr);
      setTodayCount(0);
    } else {
      const savedCount = localStorage.getItem('pomodoro_today_count');
      if (savedCount) {
        setTodayCount(parseInt(savedCount, 10));
      }
    }

    const savedStatsStr = localStorage.getItem('pomodoro_by_task');
    if (savedStatsStr) {
      try {
        setTaskStats(JSON.parse(savedStatsStr));
      } catch (e) {
        console.error('Error parsing Pomodoro task stats', e);
      }
    }
  }, []);

  // Sync timers with mode changes
  useEffect(() => {
    setIsActive(false);
    setTimeLeft(presets[mode] * 60);
  }, [mode]);

  // Main tick interval
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, mode, activeTask]);

  const handleTimerComplete = () => {
    setIsActive(false);
    playSoundChime('success');

    if (mode === 'focus') {
      const todayStr = new Date().toISOString().split('T')[0];
      const newTodayCount = todayCount + 1;
      localStorage.setItem('pomodoro_today_count', newTodayCount.toString());
      localStorage.setItem('pomodoro_last_date', todayStr);
      setTodayCount(newTodayCount);

      let updatedTaskStats = { ...taskStats };
      if (activeTask && activeTask.id) {
        const currentTaskCount = taskStats[activeTask.id] || 0;
        updatedTaskStats[activeTask.id] = currentTaskCount + 1;
        localStorage.setItem('pomodoro_by_task', JSON.stringify(updatedTaskStats));
        setTaskStats(updatedTaskStats);
        
        toast.success(`Pomodoro session complete for "${activeTask.title}"! Well done!`);
      } else {
        toast.success(`Pomodoro session complete! Great job focus session finished!`);
      }

      // Automatically flip to Break if autoStartBreaks is active
      if (autoStartBreaks) {
        setMode('shortBreak');
        // Small delay to let user realize focus is complete
        setTimeout(() => {
          setIsActive(true);
          playSoundChime('start');
        }, 1200);
      } else {
        setMode('shortBreak');
      }
    } else {
      // Break is complete
      toast(`Break is over! Time to get back to work.`, {
        icon: '💼',
      });
      setMode('focus');
      if (autoStartBreaks) {
        setTimeout(() => {
          setIsActive(true);
          playSoundChime('start');
        }, 1200);
      }
    }
  };

  const toggleStart = () => {
    playSoundChime('click');
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    playSoundChime('click');
    setIsActive(false);
    setTimeLeft(presets[mode] * 60);
  };

  const skipTimer = () => {
    playSoundChime('click');
    setIsActive(false);
    if (mode === 'focus') {
      setMode('shortBreak');
    } else if (mode === 'shortBreak') {
      setMode('longBreak');
    } else {
      setMode('focus');
    }
  };

  const currentTaskSessions = useMemo(() => {
    if (!activeTask || !activeTask.id) return 0;
    return taskStats[activeTask.id] || 0;
  }, [activeTask, taskStats]);

  const formatTimerValue = (secondsTotal: number) => {
    const mins = Math.floor(secondsTotal / 60);
    const secs = secondsTotal % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circular progress calculation
  const totalDuration = presets[mode] * 60;
  const progressRatio = totalDuration > 0 ? (timeLeft / totalDuration) : 0;
  const strokeDashoffset = 220 - (progressRatio * 220); // 2 * PI * r (r=35) is roughly 220

  const handleApplyCustomTime = () => {
    playSoundChime('click');
    const mins = parseInt(customTimeInput, 10);
    if (isNaN(mins) || mins <= 0 || mins > 180) {
      toast.error('Please specify a duration between 1 and 180 minutes.');
      return;
    }
    setIsActive(false);
    setTimeLeft(mins * 60);
    setShowCustomConfig(false);
    toast.success(`Timer set to custom ${mins} minutes.`);
  };

  return (
    <div className="w-full border rounded-xl bg-card text-card-foreground shadow-sm overflow-hidden border-border/80">
      {/* Header section toggle expanded */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {mode === 'focus' ? (
            <Flame className="h-4 w-4 text-orange-500 animate-pulse shrink-0" />
          ) : (
            <Coffee className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          <span className="text-xs font-bold tracking-wide uppercase text-foreground/80">
            {mode === 'focus' ? 'Focus Session' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
          </span>
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground ring-1 ring-border">
              {formatTimerValue(timeLeft)}
            </span>
          )}
          {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Circular interactive Timer and text display */}
              <div className="flex flex-col items-center justify-center pt-2 relative">
                <div className="relative size-32 flex items-center justify-center">
                  {/* SVG circle track */}
                  <svg className="absolute top-0 left-0 size-32 rotate-[-90deg]">
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="48" 
                      className="stroke-muted fill-transparent" 
                      strokeWidth="6" 
                    />
                    <motion.circle 
                      cx="64" 
                      cy="64" 
                      r="48" 
                      className={cn(
                        "fill-transparent transition-all duration-300",
                        mode === 'focus' ? "stroke-orange-500" : "stroke-emerald-500"
                      )}
                      strokeWidth="6" 
                      strokeDasharray="301.6" // 2 * Math.PI * 48
                      strokeDashoffset={301.6 - (progressRatio * 301.6)}
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Text timer readout */}
                  <div className="text-center z-10">
                    <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                      {formatTimerValue(timeLeft)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">
                      {isActive ? 'working' : 'paused'}
                    </p>
                  </div>
                </div>

                {/* Status bar description for selected task */}
                <div className="w-full text-center mt-3 px-1">
                  {activeTask ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Focusing on:</p>
                      <p className="text-xs font-semibold text-foreground truncate max-w-[200px] mx-auto" title={activeTask.title}>
                        {activeTask.title}
                      </p>
                      {currentTaskSessions > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded">
                            {currentTaskSessions} {currentTaskSessions === 1 ? 'Session' : 'Sessions'} Done
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-muted/30 border border-dashed border-border/80 text-center">
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Select a task in list below to attach Pomodoro sessions and accumulate statistics!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modes Selection Chips */}
              <div className="grid grid-cols-3 gap-1 bg-muted/30 p-1 rounded-lg">
                <button
                  onClick={() => { playSoundChime('click'); setMode('focus'); }}
                  className={cn(
                    "text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center",
                    mode === 'focus' 
                      ? "bg-orange-500 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  Focus
                </button>
                <button
                  onClick={() => { playSoundChime('click'); setMode('shortBreak'); }}
                  className={cn(
                    "text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center",
                    mode === 'shortBreak' 
                      ? "bg-emerald-500 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  Short
                </button>
                <button
                  onClick={() => { playSoundChime('click'); setMode('longBreak'); }}
                  className={cn(
                    "text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center",
                    mode === 'longBreak' 
                      ? "bg-emerald-500/80 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  Long
                </button>
              </div>

              {/* Timer Controls Row */}
              <div className="flex items-center justify-between gap-2.5">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted" 
                  onClick={resetTimer} 
                  title="Reset timer"
                >
                  <RotateCcw size={14} className="text-muted-foreground" />
                </Button>

                <Button 
                  size="sm" 
                  onClick={toggleStart}
                  className={cn(
                    "flex-1 h-8 text-xs font-semibold gap-1 rounded-lg select-none",
                    isActive 
                      ? "bg-amber-600 hover:bg-amber-700 text-white" 
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {isActive ? <Pause size={12} /> : <Play size={12} />}
                  {isActive ? 'Pause' : 'Start'}
                </Button>

                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted" 
                  onClick={skipTimer} 
                  title="Skip to next"
                >
                  <SkipForward size={14} className="text-muted-foreground" />
                </Button>

                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted" 
                  onClick={() => setIsMuted(!isMuted)} 
                  title={isMuted ? "Unmute sounds" : "Mute sounds"}
                >
                  {isMuted ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} className="text-muted-foreground" />}
                </Button>
              </div>

              {/* Auto start breaks and config toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px]">
                <button 
                  type="button"
                  onClick={() => setShowCustomConfig(!showCustomConfig)}
                  className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-medium underline"
                >
                  Config Timer
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input 
                    type="checkbox" 
                    checked={autoStartBreaks} 
                    onChange={e => setAutoStartBreaks(e.target.checked)} 
                    className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary size-2.5"
                  />
                  <span>Auto Flow ({autoStartBreaks ? 'On' : 'Off'})</span>
                </label>
              </div>

              {/* Custom Configuration Section */}
              {showCustomConfig && (
                <div className="bg-muted/15 p-2 rounded-lg border border-border/80 space-y-2 animate-in slide-in-from-top-1 duration-150">
                  <span className="text-[10px] font-bold text-foreground/80 block">Duration (minutes):</span>
                  <div className="flex gap-1.5">
                    <input 
                      type="number" 
                      min="1" 
                      max="180"
                      value={customTimeInput} 
                      onChange={e => setCustomTimeInput(e.target.value)}
                      className="w-full bg-background border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
                    />
                    <Button 
                      size="sm" 
                      className="h-6 text-[10px] px-2 shrink-0 py-0" 
                      onClick={handleApplyCustomTime}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {/* Simple daily stats tracking banner */}
              <div className="flex items-center justify-between text-[11px] bg-muted/20 p-2 rounded-lg text-muted-foreground">
                <span className="font-semibold flex items-center gap-1">
                  <Brain size={12} className="text-purple-500" /> Today's Focus
                </span>
                <span className="font-bold text-foreground bg-background px-1.5 py-0.5 rounded border">
                  {todayCount} {todayCount === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
