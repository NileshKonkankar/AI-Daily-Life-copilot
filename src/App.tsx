import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Task, subscribeToTasks } from './services/taskService';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { AIPanel } from './components/AIPanel';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, CheckCircle2, LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Settings, Menu, Bell, Sun, Moon } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prioritizedIds, setPrioritizedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background hidden md:flex flex-col">
        <div className="h-14 flex items-center px-4 border-b">
          <CheckCircle2 className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">AI Copilot</span>
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
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
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
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
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

                  {/* Overview Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left Column: Tasks */}
                    <div className="xl:col-span-8 space-y-6">
                      <div className="bg-background rounded-xl border shadow-sm p-1">
                        <TaskList tasks={tasks} prioritizedIds={prioritizedIds} />
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
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">All Tasks</h2>
                    <TaskForm />
                  </div>
                  <div className="bg-background rounded-xl border shadow-sm p-1 max-w-4xl">
                    <TaskList tasks={tasks} />
                  </div>
                </div>
              } />

              {/* Calendar Route */}
              <Route path="/calendar" element={
                <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-background border-dashed">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Calendar Integration Coming Soon</h3>
                  <p className="text-muted-foreground max-w-sm mt-2">
                    A visual calendar view of all your deadlines and time-blocks is currently in development.
                  </p>
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
            </Routes>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
