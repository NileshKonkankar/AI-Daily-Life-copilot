import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Timer, Calendar as CalendarIcon, CheckSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardFABProps {
  onAddTask: () => void;
  onStartTimer: () => void;
  onViewCalendar: () => void;
}

export function DashboardFAB({ onAddTask, onStartTimer, onViewCalendar }: DashboardFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(prev => !prev);
  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const menuItems = [
    {
      label: 'Add Task',
      icon: <CheckSquare size={18} />,
      onClick: () => handleAction(onAddTask),
      colorClass: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20',
      tooltipColor: 'bg-primary text-primary-foreground',
    },
    {
      label: 'Start Timer',
      icon: <Timer size={18} />,
      onClick: () => handleAction(onStartTimer),
      colorClass: 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20',
      tooltipColor: 'bg-orange-600 text-white',
    },
    {
      label: 'View Calendar',
      icon: <CalendarIcon size={18} />,
      onClick: () => handleAction(onViewCalendar),
      colorClass: 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20',
      tooltipColor: 'bg-blue-600 text-white',
    },
  ];

  return (
    <>
      {/* Backdrop overlay for focus */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-40 transition-all"
            id="fab-backdrop"
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end z-50 gap-3" id="fab-container">
        {/* Shortcut Items Menu */}
        <div className="flex flex-col items-end gap-3 mb-1">
          <AnimatePresence>
            {isOpen &&
              menuItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: {
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 400,
                      damping: 20
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 10, 
                    scale: 0.9,
                    transition: {
                      delay: (menuItems.length - 1 - index) * 0.05,
                      duration: 0.15
                    }
                  }}
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={item.onClick}
                  id={`fab-item-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {/* Item Label (Desktop hover / Mobile default visible) */}
                  <span className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border select-none transition-all duration-200 transform scale-95 origin-right",
                    "bg-background text-foreground border-border group-hover:scale-100 group-hover:shadow-lg"
                  )}>
                    {item.label}
                  </span>

                  {/* Circular Icon Button */}
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 border border-white/10",
                    item.colorClass
                  )}>
                    {item.icon}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Main Trigger Button */}
        <motion.button
          onClick={toggleOpen}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 focus:outline-none border border-white/10",
            isOpen 
              ? "bg-slate-800 dark:bg-slate-700 shadow-slate-900/30" 
              : "bg-primary shadow-primary/30 hover:bg-primary/95"
          )}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          title={isOpen ? "Close Actions" : "Quick Actions Menu"}
          id="fab-trigger-btn"
        >
          <Plus size={26} className={cn("transition-transform duration-200", isOpen && "text-destructive-foreground")} />
        </motion.button>
      </div>
    </>
  );
}
