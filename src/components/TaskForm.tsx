import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { addTask, Task, subscribeToCategories, Category, addCategory } from '../services/taskService';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfDay } from 'date-fns';
import { CalendarIcon, Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TaskForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Task['priority']>('unassigned');
  const [category, setCategory] = useState<Task['category']>('work');
  const [loading, setLoading] = useState(false);
  
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  React.useEffect(() => {
    const unsub = subscribeToCategories(setCustomCategories);
    return () => unsub();
  }, []);

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        await addCategory(newCategoryName.trim());
        setCategory(newCategoryName.trim());
        setIsAddingCategory(false);
        setNewCategoryName('');
        toast.success('Category added');
      } catch (error) {
        toast.error('Failed to add category');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await addTask({
        title,
        deadline: deadline || null,
        priority,
        category,
        status: 'pending'
      });
      toast.success('Task added successfully');
      setOpen(false);
      // Reset form
      setTitle('');
      setDeadline(undefined);
      setPriority('unassigned');
      setCategory('work');
    } catch (error) {
      toast.error('Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2"><Plus size={16} /> Add Task</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              placeholder="What needs to be done?" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
            />
          </div>
          
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Due Date</label>
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              } />
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < startOfDay(new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Category</label>
                {!isAddingCategory && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2 -mr-2 text-muted-foreground" onClick={() => setIsAddingCategory(true)}>
                    <Plus size={12} className="mr-1" /> New
                  </Button>
                )}
              </div>
              
              {isAddingCategory ? (
                <div className="flex items-center gap-2">
                  <Input 
                    className="h-9 text-sm" 
                    placeholder="Enter category name..." 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    autoFocus
                  />
                  <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                    <Check size={14}/>
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    {customCategories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
            {loading ? 'Adding...' : 'Add Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
