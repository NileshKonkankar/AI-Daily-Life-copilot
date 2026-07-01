import { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Task, subscribeToTasks } from './services/taskService';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { AIPanel } from './components/AIPanel';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, CheckCircle2, LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Settings, Menu, Bell, Sun, Moon, Clock, SlidersHorizontal, RotateCcw, Timer, X } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { format, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarView } from './components/CalendarView';
import { PomodoroTimer } from './components/PomodoroTimer';
import { WeeklyGoalTracker } from './components/WeeklyGoalTracker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardFAB } from './components/DashboardFAB';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function App() {
  const navigate = useNavigate();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Create Task Shortcut: Cmd+N or Ctrl+N
      if (isCmdOrCtrl && key === 'n') {
        e.preventDefault();
        setIsAddTaskOpen(true);
      }

      // Toggle Sidebar Shortcut: Cmd+B or Ctrl+B
      if (isCmdOrCtrl && key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prioritizedIds, setPrioritizedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'unassigned'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        tagsSet.add(tag);
      });
    });
    return Array.from(tagsSet).sort();
  }, [tasks]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const location = useLocation();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeTasks = subscribeToTasks((fetchedTasks) => {
        setTasks(fetchedTasks);
      });
      return () => unsubscribeTasks();
    } else {
      setTasks([]);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-xl font-semibold">Loading AI Copilot...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="max-w-md w-full p-8 bg-background rounded-2xl shadow-lg border text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Daily Life Copilot</h1>
          <p className="text-muted-foreground">
            Your intelligent personal productivity system for task prioritization, decision-making, and daily planning.
          </p>
          <div className="pt-4">
            <Button size="lg" className="w-full" onClick={loginWithGoogle}>
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = pendingCount + completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Compute upcoming/urgent tasks
  const notifications = (() => {
    const list: { id: string; type: 'overdue' | 'today' | 'tomorrow'; title: string; task: Task; dateText: string }[] = [];
    const now = new Date();
    const todayStart = startOfDay(now);

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.deadline) return;

      const dl = new Date(task.deadline);
      if (isBefore(dl, todayStart) && !isToday(dl)) {
        list.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          title: task.title,
          task,
          dateText: `Overdue (due ${format(dl, 'MMM d')})`
        });
      } else if (isToday(dl)) {
        list.push({
          id: `today-${task.id}`,
          type: 'today',
          title: task.title,
          task,
          dateText: `Due Today`
        });
      } else if (isTomorrow(dl)) {
        list.push({
          id: `tomorrow-${task.id}`,
          type: 'tomorrow',
          title: task.title,
          task,
          dateText: `Due Tomorrow`
        });
      }
    });

    // Sort: overdue first, then today, then tomorrow
    return list.sort((a, b) => {
      const types = { overdue: 0, today: 1, tomorrow: 2 };
      return types[a.type] - types[b.type];
    });
  })();

  const overdueCount = notifications.filter(n => n.type === 'overdue').length;
  const todayCount = notifications.filter(n => n.type === 'today').length;
  const urgentCount = overdueCount + todayCount;

  const COLORS = theme === 'dark' 
    ? { completed: '#10b981', pending: '#6366f1', empty: '#3f3f46' }
    : { completed: '#10b981', pending: '#3b82f6', empty: '#e4e4e7' };

  const chartData = totalCount > 0 
    ? [
        { name: 'Completed', value: completedCount, color: COLORS.completed },
        { name: 'Pending', value: pendingCount, color: COLORS.pending }
      ]
    : [
        { name: 'No Tasks', value: 1, color: COLORS.empty }
      ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/tasks': return 'All Tasks';
      case '/calendar': return 'Calendar View';
      case '/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20 font-sans text-foreground">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r bg-background flex flex-col shrink-0 transition-all duration-300 z-40",
        "fixed inset-y-0 left-0 md:static",
        isSidebarOpen 
          ? "translate-x-0" 
          : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden"
      )}>
        <div className="h-14 flex items-center justify-between px-4 border-b shrink-0">
          <div className="flex items-center">
            <CheckCircle2 className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg tracking-tight">AI Copilot</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link to="/" className={cn(buttonVariants({ variant: location.pathname === '/' ? 'secondary' : 'ghost' }), "w-full justify-start")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/tasks" className={cn(buttonVariants({ variant: location.pathname === '/tasks' ? 'secondary' : 'ghost' }), "w-full justify-start text-muted-foreground hover:text-foreground", location.pathname === '/tasks' && "text-foreground")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </Link>
          <Link to="/calendar" className={cn(buttonVariants({ variant: location.pathname === '/calendar' ? 'secondary' : 'ghost' }), "w-full justify-start text-muted-foreground hover:text-foreground", location.pathname === '/calendar' && "text-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendar
          </Link>
          <Link to="/settings" className={cn(buttonVariants({ variant: location.pathname === '/settings' ? 'secondary' : 'ghost' }), "w-full justify-start text-muted-foreground hover:text-foreground", location.pathname === '/settings' && "text-foreground")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t space-y-4">
          <PomodoroTimer activeTask={activeTask} onSelectTask={setActiveTask} />
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate text-foreground">{user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">Workspace User</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(prev => !prev)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden md:flex text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title="Toggle Sidebar (Cmd+B / Ctrl+B)"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg hidden sm:block">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="text-muted-foreground hover:text-foreground transition-colors duration-200" 
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-500 animate-in spin-in-12 duration-200" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700 animate-in spin-in-12 duration-200" />
              )}
            </Button>

            {/* Mobile Pomodoro Timer Popover Shortcut */}
            <Popover>
              <PopoverTrigger render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-orange-500 md:hidden transition-colors relative"
                  title="Pomodoro Session Timer"
                >
                  <Timer className="h-5 w-5 text-orange-500 animate-pulse" />
                </Button>
              } />
              <PopoverContent className="w-80 p-0 shadow-xl rounded-xl border z-50 bg-background overflow-hidden" align="end">
                <div className="p-3 bg-muted/20 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Timer className="h-4 w-4 text-orange-500" /> Pomodoro Timer
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Quick Access</span>
                </div>
                <div className="p-3">
                  <PomodoroTimer activeTask={activeTask} onSelectTask={setActiveTask} />
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors relative", 
                    urgentCount > 0 && "text-foreground"
                  )}
                  title="Notifications & Upcoming Deadlines"
                >
                  <Bell className={cn("h-5 w-5", urgentCount > 0 && "animate-pulse")} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-in zoom-in-50 duration-200">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              } />
              <PopoverContent className="w-80 p-0 shadow-xl rounded-xl border z-50 bg-background overflow-hidden" align="end">
                <div className="p-4 bg-muted/20 border-b flex items-center justify-between animate-in fade-in-50 duration-150">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Notifications
                  </span>
                  <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] font-semibold">
                    {notifications.length} alerts
                  </Badge>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
                      <div>
                        <p className="font-semibold text-foreground">You are all caught up!</p>
                        <p className="text-[10px] mt-0.5">No overdue or upcoming task deadlines.</p>
                      </div>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => setActiveTask(notif.task)}
                        className="p-3.5 hover:bg-muted/50 cursor-pointer transition-colors text-left flex items-start gap-3"
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          notif.type === 'overdue' ? 'bg-red-500' :
                          notif.type === 'today' ? 'bg-amber-500' : 'bg-primary'
                        )} />
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight text-foreground truncate">{notif.title}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Clock size={10} className="shrink-0" />
                            <span className={cn(
                              "font-medium",
                              notif.type === 'overdue' && "text-red-500 font-semibold"
                            )}>
                              {notif.dateText}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut size={16} />
              <span className="hidden sm:inline-block">Sign out</span>
            </Button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Routes>
              {/* Dashboard Route */}
              <Route path="/" element={
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        Here is a quick overview of your personal workspace and task status distribution.
                      </p>
                    </div>
                    <TaskForm />
                  </div>

                  {urgentCount > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Upcoming & Urgent Deadlines</p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                            You have {overdueCount > 0 ? `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}` : ''}
                            {overdueCount > 0 && todayCount > 0 ? ' and ' : ''}
                            {todayCount > 0 ? `${todayCount} task${todayCount > 1 ? 's' : ''} due today` : ''}. Take actions to complete them.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs shrink-0 border-amber-300/35 bg-transparent text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => {
                            const firstUrgent = notifications[0]?.task;
                            if (firstUrgent) {
                              setActiveTask(firstUrgent);
                            }
                          }}
                        >
                          Review Urgent Tasks
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Overview Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Metrics Card */}
                    <div className="bg-background rounded-xl border shadow-sm p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completion Progress</span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-4xl font-extrabold tracking-tight">{completionRate}%</span>
                          <span className="text-sm text-muted-foreground">completed</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Keep it up! You've completed <strong>{completedCount}</strong> out of <strong>{totalCount}</strong> tasks.
                        </p>
                      </div>
                      
                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">System Progress</span>
                          <span className="text-foreground">{completedCount}/{totalCount} Tasks</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recharts Pie Chart Card */}
                    <div className="bg-background rounded-xl border shadow-sm p-6 flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Status Distribution</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">Live</span>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center min-h-[140px] mt-2">
                        {totalCount === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No tasks available</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Add tasks to see distribution</p>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-around gap-4">
                            {/* Chart Container */}
                            <div className="w-[140px] h-[140px] relative shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={60}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'var(--background)', 
                                      border: '1px solid var(--border)',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      color: 'var(--foreground)'
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Central text for Donut Chart */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-lg font-bold">{totalCount}</span>
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Tasks</span>
                              </div>
                            </div>

                            {/* Legend Details */}
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.completed }} />
                                <div className="text-left">
                                  <p className="text-xs font-semibold leading-none">{completedCount} Completed</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% of total</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.pending }} />
                                <div className="text-left">
                                  <p className="text-xs font-semibold leading-none">{pendingCount} Pending</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}% of total</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weekly Completion Goal Tracker Card */}
                    <WeeklyGoalTracker tasks={tasks} userId={user.uid} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left Column: Tasks */}
                    <div className="xl:col-span-8 space-y-6">
                      <div className="bg-background rounded-xl border shadow-sm p-1">
                        <TaskList 
                          tasks={tasks} 
                          prioritizedIds={prioritizedIds} 
                          selectedTask={activeTask}
                          onSelectTask={setActiveTask}
                        />
                      </div>
                    </div>

                    {/* Right Column: AI Panel */}
                    <div className="xl:col-span-4">
                      <div className="sticky top-6">
                        <AIPanel tasks={tasks} onPrioritize={setPrioritizedIds} />
                      </div>
                    </div>
                  </div>
                </>
              } />

              {/* Tasks Route */}
              <Route path="/tasks" element={
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">All Tasks</h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        View, organize, and filter all your tasks in one place.
                      </p>
                    </div>
                    <TaskForm />
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center gap-4 bg-background p-4 rounded-xl border shadow-sm max-w-4xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filter tasks by:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Status Filter */}
                      <Select 
                        value={statusFilter} 
                        onValueChange={(val: any) => setStatusFilter(val)}
                      >
                        <SelectTrigger className="w-[145px] h-9 text-xs">
                          <SelectValue placeholder="Status: All" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border">
                          <SelectItem value="all">Status: All</SelectItem>
                          <SelectItem value="pending">Status: Pending</SelectItem>
                          <SelectItem value="completed">Status: Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Priority Filter */}
                      <Select 
                        value={priorityFilter} 
                        onValueChange={(val: any) => setPriorityFilter(val)}
                      >
                        <SelectTrigger className="w-[155px] h-9 text-xs">
                          <SelectValue placeholder="Priority: All" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border">
                          <SelectItem value="all">Priority: All</SelectItem>
                          <SelectItem value="high">Priority: High</SelectItem>
                          <SelectItem value="medium">Priority: Medium</SelectItem>
                          <SelectItem value="low">Priority: Low</SelectItem>
                          <SelectItem value="unassigned">Priority: Unassigned</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Tag Filter */}
                      <Select 
                        value={tagFilter} 
                        onValueChange={(val: any) => setTagFilter(val)}
                      >
                        <SelectTrigger className="w-[145px] h-9 text-xs">
                          <SelectValue placeholder="Tag: All" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border">
                          <SelectItem value="all">Tag: All</SelectItem>
                          {allTags.map(tag => (
                            <SelectItem key={tag} value={tag}>Tag: #{tag}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Clear Filters Button */}
                      {(statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStatusFilter('all');
                            setPriorityFilter('all');
                            setTagFilter('all');
                          }}
                          className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-background rounded-xl border shadow-sm p-1 max-w-4xl">
                    <TaskList 
                      tasks={tasks.filter(task => {
                        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
                        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
                        const matchesTag = tagFilter === 'all' || (task.tags && task.tags.includes(tagFilter));
                        return matchesStatus && matchesPriority && matchesTag;
                      })} 
                      selectedTask={activeTask}
                      onSelectTask={setActiveTask}
                    />
                  </div>
                </div>
              } />

              {/* Calendar Route */}
              <Route path="/calendar" element={
                <div className="space-y-6">
                  <CalendarView 
                    tasks={tasks} 
                    onSelectTask={setActiveTask}
                  />
                  {/* Shared Details overlay */}
                  {activeTask && (
                    <div className="hidden">
                      <TaskList 
                        tasks={tasks} 
                        selectedTask={activeTask}
                        onSelectTask={setActiveTask}
                      />
                    </div>
                  )}
                </div>
              } />

              {/* Settings Route */}
              <Route path="/settings" element={
                <div className="space-y-6 max-w-2xl py-2">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Manage visual appearance, notifications, and personal preferences for AI Copilot.
                    </p>
                  </div>

                  <div className="bg-background rounded-xl border shadow-sm p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Theme & Appearance</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Choose your interface visual style. Dark mode relaxes eye strain in low-light environments.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          variant={theme === 'light' ? 'default' : 'outline'} 
                          className="flex-1 justify-start gap-3 h-14 px-4"
                          onClick={() => setTheme('light')}
                        >
                          <Sun className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-semibold text-sm leading-none">Light Mode</p>
                            <p className="text-xs text-muted-foreground mt-1">Bright, clean, high-contrast</p>
                          </div>
                        </Button>
                        <Button 
                          variant={theme === 'dark' ? 'default' : 'outline'} 
                          className="flex-1 justify-start gap-3 h-14 px-4"
                          onClick={() => setTheme('dark')}
                        >
                          <Moon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-semibold text-sm leading-none">Dark Mode</p>
                            <p className="text-xs text-muted-foreground mt-1">Deep, eye-friendly palette</p>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-3">Keyboard Shortcuts</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Speed up your workflow using global keys accessible from anywhere in the application.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/50">
                          <span className="text-muted-foreground font-medium">Create New Task</span>
                          <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono font-bold shadow-sm">
                            <span className="text-[10px] mr-0.5">⌘</span>N / <span className="text-[10px] mr-0.5">Ctrl</span>+N
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between text-sm py-1.5">
                          <span className="text-muted-foreground font-medium">Toggle Left Sidebar</span>
                          <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono font-bold shadow-sm">
                            <span className="text-[10px] mr-0.5">⌘</span>B / <span className="text-[10px] mr-0.5">Ctrl</span>+B
                          </kbd>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-3">Account Details</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between border-b py-2 flex-wrap gap-2">
                          <span>User Account</span>
                          <span className="font-medium text-foreground">{user.email}</span>
                        </div>
                        <div className="flex justify-between border-b py-2">
                          <span>Status</span>
                          <span className="font-medium text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Environment</span>
                          <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">Active Container</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } />
              {/* Fallback Catch-all Route: Redirects any typed invalid URL to Dashboard securely */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster />

      {/* Task Creation & Timer Dialog Triggers for FAB */}
      <TaskForm open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen} hideTrigger />
      
      <Dialog open={isTimerOpen} onOpenChange={setIsTimerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Timer className="h-5 w-5 text-orange-500 animate-pulse" /> Pomodoro Timer
            </DialogTitle>
          </DialogHeader>
          <div className="p-1">
            <PomodoroTimer activeTask={activeTask} onSelectTask={setActiveTask} />
          </div>
        </DialogContent>
      </Dialog>
      
      <DashboardFAB 
        onAddTask={() => setIsAddTaskOpen(true)}
        onStartTimer={() => setIsTimerOpen(true)}
        onViewCalendar={() => navigate('/calendar')}
      />
    </div>
  );
}
