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
import { LogOut, CheckCircle2, LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Settings, Menu, Bell } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prioritizedIds, setPrioritizedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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
                        You have {pendingCount} pending tasks and {completedCount} completed tasks.
                      </p>
                    </div>
                    <TaskForm />
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
                <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-background border-dashed">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Settings className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Settings Overview</h3>
                  <p className="text-muted-foreground max-w-sm mt-2">
                    Preferences for AI behavior, notifications, and integration settings will live here.
                  </p>
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
