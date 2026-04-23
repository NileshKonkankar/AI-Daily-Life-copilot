import { useState } from 'react';
import { Task } from '../services/taskService';
import { prioritizeTasks, getNextBestAction, generateDailySummary } from '../services/aiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, CalendarDays, BrainCircuit, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AIPanelProps {
  tasks: Task[];
  onPrioritize: (ids: string[]) => void;
}

export function AIPanel({ tasks, onPrioritize }: AIPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<{id: string, whyItMattersNow: string} | null>(null);
  const [dailySummary, setDailySummary] = useState<any | null>(null);
  const [prioritizationResult, setPrioritizationResult] = useState<any[] | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const clearAIResults = () => {
    setNextAction(null);
    setDailySummary(null);
    setPrioritizationResult(null);
    onPrioritize([]);
  };

  const handlePrioritize = async () => {
    if (pendingTasks.length === 0) return;
    setNextAction(null);
    setDailySummary(null);
    setLoading('prioritize');
    try {
      const result = await prioritizeTasks(tasks);
      if (result) {
        setPrioritizationResult(result);
        onPrioritize(result.map((r: any) => r.id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleNextAction = async () => {
    if (pendingTasks.length === 0) return;
    setPrioritizationResult(null);
    setDailySummary(null);
    onPrioritize([]);
    setLoading('nextAction');
    try {
      const result = await getNextBestAction(tasks);
      setNextAction(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleDailySummary = async () => {
    if (tasks.length === 0) return;
    setPrioritizationResult(null);
    setNextAction(null);
    onPrioritize([]);
    setLoading('summary');
    try {
      const result = await generateDailySummary(tasks);
      setDailySummary(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const getTaskTitle = (id: string) => {
    return tasks.find(t => t.id === id)?.title || 'Unknown Task';
  };

  return (
    <Card className="h-full flex flex-col border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <BrainCircuit className="h-5 w-5" />
            AI Copilot
          </CardTitle>
          {(nextAction || prioritizationResult || dailySummary) && (
            <Button variant="ghost" size="sm" onClick={clearAIResults} className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
              Clear Results
            </Button>
          )}
        </div>
        <CardDescription>Intelligent insights for your tasks</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-col h-auto py-3 gap-1 bg-background"
            onClick={handlePrioritize}
            disabled={loading !== null || pendingTasks.length === 0}
          >
            {loading === 'prioritize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
            <span className="text-xs">Prioritize</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-col h-auto py-3 gap-1 bg-background"
            onClick={handleNextAction}
            disabled={loading !== null || pendingTasks.length === 0}
          >
            {loading === 'nextAction' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4 text-red-500" />}
            <span className="text-xs">Next Action</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-col h-auto py-3 gap-1 bg-background"
            onClick={handleDailySummary}
            disabled={loading !== null || tasks.length === 0}
          >
            {loading === 'summary' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4 text-blue-500" />}
            <span className="text-xs">Daily Plan</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm">AI is thinking...</p>
            </div>
          )}

          {!loading && !nextAction && !dailySummary && !prioritizationResult && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Select an AI action above to get intelligent insights on your tasks.
            </div>
          )}

          {!loading && nextAction && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold">Do This Next</h3>
                </div>
                <div className="p-3 bg-primary/10 text-primary font-medium rounded-md mb-3 border border-primary/20">
                  {getTaskTitle(nextAction.id)}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Why: </span>
                  {nextAction.whyItMattersNow}
                </p>
              </div>
            </div>
          )}

          {!loading && prioritizationResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Prioritized List</h3>
              </div>
              <div className="space-y-3">
                {prioritizationResult.map((item, idx) => (
                  <div key={item.id} className="bg-background p-3 rounded-lg border shadow-sm text-sm">
                    <div className="flex items-start gap-2 mb-1">
                      <Badge variant={item.urgency === 'high' ? 'destructive' : item.urgency === 'medium' ? 'default' : 'secondary'}>
                        #{idx + 1}
                      </Badge>
                      <span className="font-medium">{getTaskTitle(item.id)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 pl-8 border-l-2 ml-2 border-muted">
                      {item.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && dailySummary && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Daily Summary</h3>
              </div>
              
              <div className="bg-background p-4 rounded-lg border shadow-sm space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Plan for the day</h4>
                  <p className="text-muted-foreground">{dailySummary.planForTheDay}</p>
                </div>
                
                {dailySummary.timeSuggestions?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Time Suggestions</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                      {dailySummary.timeSuggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {dailySummary.focusRecommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Focus Tips</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                      {dailySummary.focusRecommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {dailySummary.insights?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">AI Insights</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dailySummary.insights.map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
