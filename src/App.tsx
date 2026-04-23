/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, MouseEvent, TouchEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sun, 
  Cloud, 
  CloudRain, 
  Star, 
  Clock, 
  Moon, 
  Sunrise,
  BookOpen,
  Calculator,
  Languages,
  MoreHorizontal,
  Palette,
  Image as ImageIcon,
  Check,
  Edit3,
  Save,
  X,
  Play,
  Pause,
  RotateCcw,
  Droplets,
  Sprout,
  Dumbbell,
  Zap,
  Settings,
  Bell,
  Eraser,
  Brush,
  Undo,
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Target,
  Film,
  Tv,
  ListTodo,
  Pin,
  ArrowUp,
  ArrowDown,
  History
} from 'lucide-react';
import { Task, Category, DailyLog, Habit, AppTheme } from './types';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Checkbox } from './components/ui/checkbox';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Slider } from './components/ui/slider';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '语文', tasks: [] },
  { id: 'cat-2', name: '数学', tasks: [] },
  { id: 'cat-3', name: '英语', tasks: [] },
  { id: 'cat-4', name: '纪录片', tasks: [] },
  { id: 'cat-5', name: '英语动画片', tasks: [] },
  { id: 'cat-6', name: '其他', tasks: [] },
];

const INITIAL_HABITS: Habit[] = [
  { id: 'h1', name: '喝水', icon: 'droplets', color: '#93c5fd', weeklyStatus: [true, true, false, false, false, false, false] },
  { id: 'h2', name: '浇花', icon: 'sprout', color: '#86efac', weeklyStatus: [false, true, false, false, false, false, false] },
  { id: 'h3', name: '健身', icon: 'dumbbell', color: '#fb923c', weeklyStatus: [true, true, true, true, false, false, false] },
  { id: 'h4', name: '早起', icon: 'zap', color: '#fde047', weeklyStatus: [true, false, false, false, false, false, false] },
  { id: 'h5', name: '今年待办', icon: 'list-todo', color: '#a78bfa', weeklyStatus: [false, false, false, false, false, false, false] },
];

export default function App() {
  const [log, setLog] = useState<DailyLog>(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`daily-checkin-log-${today}`);
    if (saved) return JSON.parse(saved);
    
    // Try to find the most recent saved data to use as a template for categories/habits
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('daily-checkin-log-')).sort().reverse();
    if (allKeys.length > 0) {
      const lastData = JSON.parse(localStorage.getItem(allKeys[0])!) as DailyLog;
      return {
        ...lastData,
        date: today,
        ratings: { efficiency: 0, handwriting: 0, accuracy: 0 },
        notes: '',
        comments: '',
        // Keep habits but reset weekly status if it's a new week? 
        // For simplicity, let's just create a new daily record based on categories/habit list
        categories: lastData.categories.map(c => ({
          ...c,
          tasks: c.tasks.map(t => ({ ...t, status: 'pending', progress: 0, timeSpent: 0, completedUnits: 0 }))
        }))
      };
    }

    return {
      date: today,
      weather: 'sunny',
      categories: INITIAL_CATEGORIES,
      habits: INITIAL_HABITS,
      wakeUpTime: '07:00',
      sleepTime: '21:30',
      ratings: {
        efficiency: 0,
        handwriting: 0,
        accuracy: 0,
      },
      notes: '',
      comments: '',
    };
  });

  const switchDate = (days: number) => {
    const currentDate = new Date(log.date);
    currentDate.setDate(currentDate.getDate() + days);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Save current before switching? State updates are async, but log is current here.
    localStorage.setItem(`daily-checkin-log-${log.date}`, JSON.stringify(log));

    const saved = localStorage.getItem(`daily-checkin-log-${dateStr}`);
    if (saved) {
      setLog(JSON.parse(saved));
    } else {
      // Create new for that date based on current as template
      setLog(prev => ({
        ...prev,
        date: dateStr,
        ratings: { efficiency: 0, handwriting: 0, accuracy: 0 },
        notes: '',
        comments: '',
        categories: prev.categories.map(c => ({
          ...c,
          tasks: c.tasks.map(t => ({ ...t, status: 'pending', progress: 0, timeSpent: 0, completedUnits: 0 }))
        }))
      }));
    }
  };

  const [activeCategory, setActiveCategory] = useState<string>(log.categories[0]?.id || INITIAL_CATEGORIES[0].id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEyeCare, setIsEyeCare] = useState(() => {
    const saved = localStorage.getItem('daily-checkin-eyecare');
    return saved === 'true';
  });
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; categoryId: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [tempTimeVal, setTempTimeVal] = useState<string>('');

  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem('daily-checkin-config');
    if (saved) return JSON.parse(saved);
    return {
      title: '源源每日清单',
      tagline: '养成好习惯，每天进步一点点',
      routineLabels: {
        wakeUp: '起床时间',
        sleep: '睡觉时间'
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('daily-checkin-eyecare', JSON.stringify(isEyeCare));
  }, [isEyeCare]);

  useEffect(() => {
    localStorage.setItem(`daily-checkin-log-${log.date}`, JSON.stringify(log));
  }, [log]);

  useEffect(() => {
    localStorage.setItem('daily-checkin-config', JSON.stringify(appConfig));
  }, [appConfig]);

  // Reminder System
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDay = (now.getDay() || 7) - 1; // 0-6
      const currentTimeString = now.toTimeString().slice(0, 5); // "HH:mm"

      log.categories.forEach(cat => {
        cat.tasks.forEach(task => {
          if (
            task.isReminderActive && 
            task.reminderTime === currentTimeString && 
            (task.days || []).includes(currentDay) &&
            task.status === 'pending'
          ) {
            setNotification(`⏰ 提醒: 是时候开始任务 "${task.title || '新任务'}" 了！`);
            // Show for 10 seconds
            setTimeout(() => setNotification(null), 10000);
            
            // Auto-deactivate for today to prevent double notification in the same minute
            updateTask(cat.id, task.id, { isReminderActive: false });
          }
        });
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [log]);

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.trim().split(/[:\s]+/).map(p => parseInt(p) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0] * 60;
    return 0;
  };

  const saveManualTime = (categoryId: string, taskId: string, task: Task) => {
    const seconds = parseTimeToSeconds(tempTimeVal);
    if (task.timerMode === 'down') {
      updateTask(categoryId, taskId, { 
        remainingTime: seconds, 
        countdownDuration: Math.floor(seconds / 60) || 1 
      });
    } else {
      updateTask(categoryId, taskId, { timeSpent: seconds });
    }
    setEditingTimerId(null);
  };

  const calculateProgress = () => {
    const allTasks = log.categories.flatMap(c => c.tasks);
    if (allTasks.length === 0) return 0;
    const totalProgress = allTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return Math.round(totalProgress / allTasks.length);
  };

  const getYesterdayLog = () => {
    const today = new Date(log.date);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const saved = localStorage.getItem(`daily-checkin-log-${dateStr}`);
    if (saved) return JSON.parse(saved) as DailyLog;
    return null;
  };

  const yesterdayLog = getYesterdayLog();

  const [archiveDate, setArchiveDate] = useState(log.date);
  const [archiveLog, setArchiveLog] = useState<DailyLog | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`daily-checkin-log-${archiveDate}`);
    if (saved) {
      try {
        setArchiveLog(JSON.parse(saved));
      } catch (e) {
        setArchiveLog(null);
      }
    } else {
      setArchiveLog(null);
    }
  }, [archiveDate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setLog(prev => ({
          ...prev,
          categories: prev.categories.map(cat => 
            cat.id === activeTimer.categoryId 
              ? { 
                  ...cat, 
                  tasks: cat.tasks.map(t => {
                    if (t.id === activeTimer.taskId) {
                      if (t.timerMode === 'down') {
                        const newRemaining = Math.max(0, (t.remainingTime || 0) - 1);
                        if (newRemaining === 0 && (t.remainingTime || 0) > 0) {
                          setNotification(`任务 "${t.title || '未命名'}" 倒计时结束！`);
                          setTimeout(() => setNotification(null), 5000);
                        }
                        return { ...t, remainingTime: newRemaining };
                      } else {
                        return { ...t, timeSpent: (t.timeSpent || 0) + 1 };
                      }
                    }
                    return t;
                  }) 
                } 
              : cat
          )
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleBackgroundUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLog(prev => ({ ...prev, backgroundImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const addTask = (categoryId: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      totalUnits: 1,
      completedUnits: 0,
      timerMode: 'up',
      countdownDuration: 25,
      remainingTime: 1500,
      days: [0, 1, 2, 3, 4, 5, 6],
      quadrant: 4,
      isPinned: false,
      goal: '',
      reminderTime: '',
      isReminderActive: false
    };

    setLog(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === categoryId ? { ...cat, tasks: [...cat.tasks, newTask] } : cat
      )
    }));
  };

  const updateTask = (categoryId: string, taskId: string, updates: Partial<Task>) => {
    setLog(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, tasks: cat.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } 
          : cat
      )
    }));
  };

  const moveTask = (categoryId: string, taskId: string, direction: 'up' | 'down') => {
    setLog(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== categoryId) return cat;
        const index = cat.tasks.findIndex(t => t.id === taskId);
        if (index === -1) return cat;
        const newTasks = [...cat.tasks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newTasks.length) return cat;
        [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];
        return { ...cat, tasks: newTasks };
      })
    }));
  };

  const removeTask = (categoryId: string, taskId: string) => {
    setLog(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, tasks: cat.tasks.filter(t => t.id !== taskId) } 
          : cat
      )
    }));
  };

  const updateRating = (key: keyof DailyLog['ratings'], value: number) => {
    setLog(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [key]: value }
    }));
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setLog(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  };

  const addHabit = () => {
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name: '新习惯',
      icon: 'settings',
      color: '#94a3b8',
      weeklyStatus: [false, false, false, false, false, false, false]
    };
    setLog(prev => ({ ...prev, habits: [...prev.habits, newHabit] }));
  };

  const removeHabit = (id: string) => {
    setLog(prev => ({ ...prev, habits: prev.habits.filter(h => h.id !== id) }));
  };

  const updateCategoryName = (id: string, name: string) => {
    setLog(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, name } : c)
    }));
  };

  const addCategory = () => {
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: '新科目',
      tasks: []
    };
    setLog(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
  };

  const removeCategory = (id: string) => {
    if (log.categories.length <= 1) return;
    setLog(prev => {
      const newCats = prev.categories.filter(c => c.id !== id);
      if (activeCategory === id) setActiveCategory(newCats[0].id);
      return { ...prev, categories: newCats };
    });
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case '语文': return <BookOpen className="w-5 h-5" />;
      case '数学': return <Calculator className="w-5 h-5" />;
      case '英语': return <Languages className="w-5 h-5" />;
      case '纪录片': return <Film className="w-5 h-5" />;
      case '英语动画片': return <Tv className="w-5 h-5" />;
      default: return <MoreHorizontal className="w-5 h-5" />;
    }
  };

  const getHabitIcon = (iconName: string) => {
    switch (iconName) {
      case 'droplets': return <Droplets className="w-4 h-4" />;
      case 'sprout': return <Sprout className="w-4 h-4" />;
      case 'dumbbell': return <Dumbbell className="w-4 h-4" />;
      case 'zap': return <Zap className="w-4 h-4" />;
      case 'list-todo': return <ListTodo className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const macaronColors = [
    { name: '活力橙', color: '#fb923c' },
    { name: '蜜桃橘', color: '#FFDAC1' },
    { name: '薄荷绿', color: '#E2F0CB' },
    { name: '青草绿', color: '#B5EAD7' },
    { name: '薰衣草', color: '#C7CEEA' },
    { name: '宝石蓝', color: '#38bdf8' },
    { name: '奶油黄', color: '#FFFFD8' },
    { name: '星空蓝', color: '#0369a1' },
    { name: '天空蓝', color: '#2196F3' },
    { name: '忧郁灰', color: '#94a3b8' },
  ];

  const renderCalendar = () => {
    const logDate = new Date(log.date);
    const year = logDate.getFullYear();
    const month = logDate.getMonth();
    const todayNum = logDate.getDate();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const getDayStatus = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const saved = localStorage.getItem(`daily-checkin-log-${dateStr}`);
      if (!saved) return null;
      try {
        const data = JSON.parse(saved) as DailyLog;
        const allTasks = data.categories.flatMap(c => c.tasks);
        if (allTasks.length === 0) return null;
        const allDone = allTasks.every(t => t.status === 'done');
        return allDone ? 'done' : 'pending';
      } catch (e) {
        return null;
      }
    };

    return (
      <div className="grid grid-cols-7 gap-2 mt-6">
        {weekDays.map(d => <div key={d} className="text-xs font-black text-slate-400 text-center py-2 uppercase tracking-widest">{d}</div>)}
        {days.map((d, i) => {
          const status = d ? getDayStatus(d) : null;
          const isSelected = d === todayNum;
          return (
            <button 
              key={i} 
              onClick={() => d && switchDate(d - todayNum)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all relative group",
                !d && "pointer-events-none opacity-0",
                isSelected ? "text-white font-bold shadow-lg scale-110 z-10" : "hover:bg-slate-100 text-slate-700"
              )}
              style={{ backgroundColor: isSelected ? (log.themeColor || '#fb7185') : undefined }}
            >
              <span className="text-base mb-0.5">{d}</span>
              <div className="absolute bottom-1.5 flex gap-0.5">
                {status === 'done' && <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[4px]" />}
                {status === 'pending' && <X className="w-3.5 h-3.5 text-red-500 stroke-[4px]" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderArchiveCalendar = () => {
    const logDate = new Date(archiveDate);
    const year = logDate.getFullYear();
    const month = logDate.getMonth();
    const selectedDay = logDate.getDate();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const getDayStatus = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const saved = localStorage.getItem(`daily-checkin-log-${dateStr}`);
      if (!saved) return null;
      try {
        const data = JSON.parse(saved) as DailyLog;
        const allTasks = data.categories.flatMap(c => c.tasks);
        if (allTasks.length === 0) return null;
        const allDone = allTasks.every(t => t.status === 'done');
        return allDone ? 'done' : 'pending';
      } catch (e) {
        return null;
      }
    };

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(d => <div key={d} className="text-[10px] font-black text-slate-400 text-center py-2 uppercase tracking-tight">{d}</div>)}
        {days.map((d, i) => {
          const status = d ? getDayStatus(d) : null;
          const isSelected = d === selectedDay;
          return (
            <button 
              key={i} 
              onClick={() => {
                if (d) {
                  const newDate = new Date(year, month, d);
                  setArchiveDate(newDate.toISOString().split('T')[0]);
                }
              }}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative group text-sm",
                !d && "pointer-events-none opacity-0",
                isSelected ? "text-white font-bold shadow-md scale-105 z-10" : "hover:bg-slate-100 text-slate-600"
              )}
              style={{ backgroundColor: isSelected ? (log.themeColor || '#fb7185') : undefined }}
            >
              <span>{d}</span>
              <div className="absolute bottom-1 flex gap-0.5 scale-75">
                {status === 'done' && <Check className="w-3 h-3 text-emerald-500 stroke-[4px]" />}
                {status === 'pending' && <X className="w-3 h-3 text-red-500 stroke-[4px]" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const handleTimerEnd = () => {
    if (activeTimer) {
      const task = log.categories.find(c => c.id === activeTimer.categoryId)?.tasks.find(t => t.id === activeTimer.taskId);
      if (task) {
        setNotification(`任务 "${task.title || '未命名'}" 计时结束！已用时 ${formatTime(task.timeSpent || 0)}。`);
        setTimeout(() => setNotification(null), 5000);
      }
      setActiveTimer(null);
    }
  };

  const pages = [
    { id: 'tasks', name: '今日任务', icon: <LayoutDashboard className="w-6 h-6" /> },
    { id: 'habits', name: '习惯统计', icon: <BarChart3 className="w-6 h-6" /> },
    { id: 'calendar', name: '日历进度', icon: <CalendarDays className="w-6 h-6" /> },
    { id: 'summary', name: '今日总结', icon: <FileText className="w-6 h-6" /> },
    { id: 'archive', name: '每日总结', icon: <History className="w-6 h-6" /> },
  ];

  return (
    <div 
      className={cn(
        "min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8 transition-all duration-500 bg-cover bg-center bg-no-repeat bg-fixed",
        isEyeCare && "eyecare"
      )}
      style={{ 
        backgroundColor: log.themeColor ? `${log.themeColor}55` : '#f1f5f9',
        backgroundImage: log.backgroundImage ? `url(${log.backgroundImage})` : undefined,
        '--color-brand-500': log.themeColor || '#0ea5e9',
        '--color-brand-600': log.themeColor || '#0284c7',
        '--color-bento-accent': log.themeColor || '#0ea5e9',
        '--primary': log.themeColor || '#0ea5e9'
      } as any}
    >
      <div className="bg-slate-900/5 fixed inset-0 pointer-events-none" /> {/* Subtle overlay for better contrast when background is very light */}

      {/* Header */}
      <header className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-brand-500 flex items-center justify-center text-white shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            {isEditMode ? (
              <div className="space-y-2">
                <Input 
                  className="text-3xl font-black h-auto py-1 px-2 border-none bg-slate-100 focus-visible:ring-0 font-cute"
                  value={appConfig.title}
                  onChange={e => setAppConfig(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input 
                  className="text-lg opacity-80 h-auto py-1 px-2 border-none bg-slate-100 focus-visible:ring-0 font-cute text-slate-700"
                  value={appConfig.tagline}
                  onChange={e => setAppConfig(prev => ({ ...prev, tagline: e.target.value }))}
                />
              </div>
            ) : (
              <div className="text-left mt-2">
                <h1 className="text-4xl font-black tracking-tight font-cute text-slate-900">{appConfig.title}</h1>
                <p className="opacity-70 text-lg font-medium mt-1 font-cute text-slate-600">{appConfig.tagline}</p>
              </div>
            )}
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <input
                type="file"
                id="bg-upload"
                className="hidden"
                accept="image/*"
                onChange={handleBackgroundUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl w-10 h-10 hover:bg-white/50"
                onClick={() => document.getElementById('bg-upload')?.click()}
                title="上传背景图"
              >
                <ImageIcon className="w-5 h-5 opacity-40" />
              </Button>
              {log.backgroundImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl w-10 h-10 hover:bg-red-50 text-red-500"
                  onClick={() => setLog(prev => ({ ...prev, backgroundImage: undefined }))}
                  title="移除背景图"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <div className="w-px h-6 bg-black/10 mx-1" />
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
              {macaronColors.map(c => (
                <button
                  key={c.color}
                  onClick={() => setLog(prev => ({ ...prev, themeColor: c.color }))}
                  title={c.name}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shrink-0",
                    log.themeColor === c.color ? "border-white scale-110 shadow-sm" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEyeCare(!isEyeCare)}
            className={cn(
              "rounded-2xl w-12 h-12 transition-all",
              isEyeCare ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500 border border-slate-200"
            )}
          >
            <Droplets className={cn("w-6 h-6", isEyeCare && "fill-current")} />
          </Button>
          <Dialog>
            <DialogTrigger 
              render={
                <Button 
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              }
            />
            <DialogContent className="rounded-[32px]">
              <DialogHeader>
                <DialogTitle>确定要重置所有数据吗？</DialogTitle>
              </DialogHeader>
              <div className="py-4 opacity-60 text-sm">
                此操作将删除所有打卡记录、习惯和配置，且无法撤销。
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => {}}>取消</Button>
                <Button 
                  variant="destructive" 
                  className="rounded-xl"
                  onClick={() => {
                    localStorage.removeItem('daily-checkin-log');
                    localStorage.removeItem('daily-checkin-config');
                    window.location.reload();
                  }}
                >
                  确定重置
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant={isEditMode ? "default" : "secondary"}
            onClick={() => setIsEditMode(!isEditMode)}
            className="rounded-2xl gap-2 font-bold h-12 px-6 text-lg"
          >
            {isEditMode ? <Save className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
            {isEditMode ? '保存' : '编辑模式'}
          </Button>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {(['sunny', 'cloudy', 'rainy'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setLog(prev => ({ ...prev, weather: w }))}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  log.weather === w ? "bg-white shadow-sm text-brand-500" : "opacity-40 hover:opacity-100"
                )}
              >
                {w === 'sunny' && <Sun className="w-5 h-5" />}
                {w === 'cloudy' && <Cloud className="w-5 h-5" />}
                {w === 'rainy' && <CloudRain className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-brand-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <Bell className="w-5 h-5" />
            <span className="font-bold text-sm">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="flex justify-center items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={currentPage === 0}
          className="rounded-2xl w-12 h-12 bg-white/50 backdrop-blur-md shadow-sm disabled:opacity-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <div className="glass-card p-3 flex gap-4">
          {pages.map((page, idx) => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(idx)}
              className={cn(
                "flex items-center gap-4 px-8 py-4 rounded-[24px] transition-all duration-300",
                currentPage === idx 
                  ? "bg-brand-500 text-white shadow-xl scale-110" 
                  : "hover:bg-black/5 opacity-50 hover:opacity-100"
              )}
            >
              {page.icon}
              <span className="font-black text-lg hidden md:block">{idx === 1 ? '数据统计' : page.name}</span>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
          disabled={currentPage === pages.length - 1}
          className="rounded-2xl w-12 h-12 bg-white/50 backdrop-blur-md shadow-sm disabled:opacity-20"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </nav>

      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bento-grid"
          >
            {currentPage === 0 && (
              <section className="col-span-12 glass-card p-6 flex flex-col h-auto min-h-[600px]">
                <div className="flex justify-between items-center shrink-0 mb-6">
                  <h2 className="text-3xl font-black flex items-center gap-3 font-cute text-slate-900">
                    今日任务 <span className="text-slate-500 font-medium text-xl">/ Tasks</span>
                  </h2>
                  <Button size="icon" onClick={() => addTask(activeCategory)} className="rounded-2xl w-12 h-12 shadow-lg">
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>

          <div className="flex gap-3 overflow-x-auto pb-4 shrink-0 no-scrollbar">
            {log.categories.map(cat => (
              <div key={cat.id} className="relative group shrink-0">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-[20px] whitespace-nowrap transition-all",
                    activeCategory === cat.id ? "bg-brand-500 text-white shadow-xl scale-105" : "bg-slate-200/50 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {getCategoryIcon(cat.name)}
                  {isEditMode ? (
                    <input 
                      className="bg-transparent font-black text-xl uppercase tracking-wider focus:outline-none w-24"
                      value={cat.name}
                      onChange={e => updateCategoryName(cat.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-black text-xl uppercase tracking-wider">{cat.name}</span>
                  )}
                </button>
                {isEditMode && (
                  <button 
                    onClick={() => removeCategory(cat.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {isEditMode && (
              <Button variant="outline" onClick={addCategory} className="rounded-[20px] border-dashed border-2 h-12 px-5 shrink-0">
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-6 pb-12 mt-4">
            <AnimatePresence mode="popLayout">
              {log.categories.find(c => c.id === activeCategory)?.tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={cn(
                    "bento-inner-card group relative p-6 overflow-hidden border border-black/[0.03] transition-all duration-500",
                    activeTimer?.taskId === task.id && "timer-active ring-2 ring-brand-500/20"
                  )}
                >
                  {activeTimer?.taskId === task.id && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-500/20 overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-1/3 h-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-6">
                    {/* Top Row: Title, Status, Priority, Actions */}
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={task.status === 'done'} 
                        onCheckedChange={() => {
                          const newStatus = task.status === 'done' ? 'pending' : 'done';
                          updateTask(activeCategory, task.id, { 
                            status: newStatus,
                            progress: newStatus === 'done' ? 100 : (task.progress === 100 ? 0 : task.progress)
                          });
                        }}
                        className="w-8 h-8 rounded-xl shrink-0 border-2"
                      />
                      
                      <div className="flex-1 flex flex-nowrap items-center gap-3 overflow-hidden">
                        <div className="flex items-center gap-1 shrink-0">
                          {activeTimer?.taskId === task.id ? (
                            <div className="flex items-center gap-2 pr-2">
                              <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center dot-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              </div>
                              <span className="text-[10px] font-black text-brand-600 animate-pulse tracking-widest uppercase">Timing</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg">
                              <button 
                                onClick={() => updateTask(activeCategory, task.id, { isPinned: !task.isPinned })}
                                className={cn(
                                  "p-1 transition-colors rounded-md",
                                  task.isPinned ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-slate-400"
                                )}
                              >
                                <Pin className={cn("w-3.5 h-3.5", task.isPinned && "fill-current")} />
                              </button>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveTask(activeCategory, task.id, 'up')} className="p-0.5 text-slate-400 hover:text-brand-500"><ArrowUp className="w-3 h-3" /></button>
                                <button onClick={() => moveTask(activeCategory, task.id, 'down')} className="p-0.5 text-slate-400 hover:text-brand-500"><ArrowDown className="w-3 h-3" /></button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Input
                          placeholder="任务名称..."
                          value={task.title}
                          onChange={(e) => updateTask(activeCategory, task.id, { title: e.target.value })}
                          className={cn(
                            "border-none bg-transparent p-0 h-auto font-black text-xl md:text-2xl focus-visible:ring-0 font-cute flex-1 min-w-0 break-words text-slate-900",
                            task.status === 'done' && "line-through text-slate-500"
                          )}
                        />

                        <select
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-[10px] font-black outline-none border-none cursor-pointer shadow-sm appearance-none shrink-0 uppercase tracking-widest h-fit",
                            task.quadrant === 1 ? "bg-red-100 text-red-600" :
                            task.quadrant === 2 ? "bg-amber-100 text-amber-600" :
                            task.quadrant === 3 ? "bg-blue-100 text-blue-600" :
                            "bg-slate-100 text-slate-500"
                          )}
                          value={task.quadrant || 4}
                          onChange={(e) => updateTask(activeCategory, task.id, { quadrant: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                        >
                          <option value={1}>重要·紧急</option>
                          <option value={2}>重要·不紧急</option>
                          <option value={3}>不重要·紧急</option>
                          <option value={4}>不重要·不紧急</option>
                        </select>
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => removeTask(activeCategory, task.id)} className="opacity-0 group-hover:opacity-100 w-10 h-10 shrink-0 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Middle Section: Metrics Pillars (扁平式拉宽) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                      {/* Left Section: Unit Progress */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">单元进度</span>
                            <span className="text-2xl font-black text-slate-900 tabular-nums">
                              {task.completedUnits || 0}<span className="text-slate-300 mx-1">/</span>{task.totalUnits || 1}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-mono font-black text-brand-500">
                              {task.totalUnits ? Math.round((task.completedUnits || 0) / task.totalUnits * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <Progress value={task.totalUnits ? (task.completedUnits || 0) / task.totalUnits * 100 : 0} className="h-3 rounded-full bg-white shadow-inner [&>[data-slot=progress-indicator]]:bg-brand-500" />
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg text-lg font-black text-slate-400 hover:text-brand-500"
                              onClick={() => updateTask(activeCategory, task.id, { completedUnits: Math.max(0, (task.completedUnits || 0) - 1) })}
                            > - </Button>
                            <span className="text-base font-black w-8 text-center tabular-nums text-slate-700">{task.completedUnits || 0}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg text-lg font-black text-slate-400 hover:text-brand-500"
                              onClick={() => updateTask(activeCategory, task.id, { completedUnits: Math.min(task.totalUnits || 1, (task.completedUnits || 0) + 1) })}
                            > + </Button>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] font-black text-slate-400 uppercase">总量</span>
                            <Input 
                              type="number" 
                              className="h-9 w-16 text-center text-sm bg-white border border-slate-100 shadow-sm font-black focus-visible:ring-2 focus-visible:ring-brand-500/20 rounded-xl"
                              value={task.totalUnits || 1}
                              onChange={(e) => updateTask(activeCategory, task.id, { totalUnits: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Overall Mastery */}
                      <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-10">
                        <div className="flex justify-between items-end px-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">整体掌握程度</span>
                            <div className="flex items-center gap-2 text-brand-500 mt-1">
                              <Target className="w-4 h-4" />
                              <span className="text-sm font-black line-clamp-1 italic text-slate-600">{task.goal || '暂无详细目标'}</span>
                            </div>
                          </div>
                          <span className="text-3xl font-mono font-black text-brand-600 tracking-tighter tabular-nums">{task.progress || 0}%</span>
                        </div>
                        
                        <div className="space-y-6 pt-2">
                          <Slider
                            value={[task.progress || 0]}
                            max={100}
                            step={1}
                            onValueChange={(val) => {
                              const progress = Array.isArray(val) ? val[0] : val;
                              updateTask(activeCategory, task.id, { 
                                progress,
                                status: progress === 100 ? 'done' : 'pending'
                              });
                            }}
                            className="w-full [&>[data-slot=slider-range]]:bg-brand-500"
                          />
                          <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest px-1">
                            <span>入门</span>
                            <span>熟练</span>
                            <span>精通</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Additional Info & Timer */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-8 px-2">
                      <div className="flex flex-1 flex-wrap items-center gap-6 min-w-0">
                         {/* Goal Editor */}
                         <div className="flex items-center gap-3 group/goal flex-1 min-w-[280px] bg-slate-100/30 px-3 py-2 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                            <Edit3 className="w-4 h-4 text-slate-400 shrink-0" />
                            <Input
                              placeholder="更新本次学习/工作目标..."
                              value={task.goal || ''}
                              onChange={(e) => updateTask(activeCategory, task.id, { goal: e.target.value })}
                              className="border-none bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 text-slate-600 placeholder:text-slate-300 italic flex-1"
                            />
                         </div>

                         {/* Reminder & Weekdays Info */}
                         <div className="flex items-center gap-6 shrink-0">
                            <div className="flex items-center gap-2 bg-brand-50 px-3 py-2 rounded-2xl border border-brand-100 shadow-sm">
                               <Bell className={cn("w-4 h-4", task.isReminderActive ? "text-brand-500 animate-bounce" : "text-brand-300")} />
                               <Input 
                                 type="time"
                                 value={task.reminderTime || ''}
                                 onChange={(e) => updateTask(activeCategory, task.id, { reminderTime: e.target.value, isReminderActive: !!e.target.value })}
                                 className="border-none bg-transparent p-0 h-5 w-[75px] text-xs font-black focus-visible:ring-0 text-brand-600 cursor-pointer"
                               />
                            </div>

                            <div className="flex gap-1 bg-slate-100/50 p-1 rounded-xl">
                               {weekDays.map((label, index) => {
                                 const isSelected = (task.days || []).includes(index);
                                 return (
                                   <button
                                     key={index}
                                     onClick={() => {
                                       const currentDays = task.days || [];
                                       const newDays = isSelected ? currentDays.filter(d => d !== index) : [...currentDays, index].sort();
                                       updateTask(activeCategory, task.id, { days: newDays });
                                     }}
                                     className={cn(
                                       "w-7 h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center",
                                       isSelected 
                                         ? "bg-brand-500 text-white shadow-md scale-110" 
                                         : "text-slate-300 hover:text-brand-400"
                                     )}
                                   >
                                     {label}
                                   </button>
                                 );
                               })}
                            </div>
                         </div>
                      </div>

                      {/* Timer Cluster */}
                      <div className="flex items-center gap-8 pl-8 lg:border-l lg:border-slate-100 shrink-0">
                        <div className="flex flex-col text-right">
                          <div className="flex items-center justify-end gap-3">
                             {task.timerMode === 'down' && activeTimer?.taskId !== task.id && (
                               <div className="flex items-center gap-1.5 bg-brand-50 px-2 py-1 rounded-xl border border-brand-100 shadow-sm animate-in fade-in slide-in-from-right-2">
                                 <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">设定</span>
                                 <Input 
                                   type="number" 
                                   className="h-7 w-12 text-center text-xs bg-transparent border-none p-0 font-black focus-visible:ring-0 text-brand-600 tabular-nums"
                                   value={task.countdownDuration || 25}
                                   onChange={(e) => {
                                     const mins = Math.max(1, parseInt(e.target.value) || 1);
                                     updateTask(activeCategory, task.id, { 
                                       countdownDuration: mins,
                                       remainingTime: mins * 60
                                     });
                                   }}
                                 />
                                 <span className="text-[9px] font-black text-brand-400 uppercase">分</span>
                               </div>
                             )}
                             
                             {editingTimerId === task.id ? (
                               <Input
                                 autoFocus
                                 className="h-10 w-32 text-right font-mono font-black border-2 border-brand-500 rounded-xl bg-white shadow-lg tabular-nums animate-in zoom-in-95 duration-200"
                                 value={tempTimeVal}
                                 onChange={e => setTempTimeVal(e.target.value)}
                                 onBlur={() => saveManualTime(activeCategory, task.id, task)}
                                 onKeyDown={e => e.key === 'Enter' && saveManualTime(activeCategory, task.id, task)}
                                 placeholder="MM:SS"
                               />
                             ) : (
                               <span 
                                 onClick={() => {
                                   if (!activeTimer) {
                                     setEditingTimerId(task.id);
                                     setTempTimeVal(task.timerMode === 'down' 
                                       ? `${Math.floor((task.remainingTime || 0)/60)}:${String((task.remainingTime || 0) % 60).padStart(2, '0')}`
                                       : `${Math.floor((task.timeSpent || 0)/60)}:${String((task.timeSpent || 0) % 60).padStart(2, '0')}`
                                     );
                                   }
                                 }}
                                 className="text-4xl font-mono font-black text-slate-900 leading-none tabular-nums tracking-tighter cursor-pointer hover:text-brand-500 hover:scale-105 transition-all duration-200 active:scale-95"
                                 title="点击修改时长"
                               >
                                 {task.timerMode === 'down' ? formatTime(task.remainingTime || 0) : formatTime(task.timeSpent || 0)}
                               </span>
                             )}
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 mt-2">
                             <div className="flex bg-slate-100/80 p-0.5 rounded-lg text-[8px] font-black uppercase">
                                <button onClick={() => updateTask(activeCategory, task.id, { timerMode: 'up' })} className={cn("px-1.5 py-0.5 rounded-md", task.timerMode !== 'down' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400")}>正计</button>
                                <button onClick={() => updateTask(activeCategory, task.id, { timerMode: 'down' })} className={cn("px-1.5 py-0.5 rounded-md", task.timerMode === 'down' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400")}>倒计</button>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {task.timerMode === 'down' ? '剩余时长' : '累计用时'}
                             </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <Button 
                            size="lg"
                            onClick={() => activeTimer?.taskId === task.id ? handleTimerEnd() : setActiveTimer({ taskId: task.id, categoryId: activeCategory })}
                            className={cn(
                              "h-14 w-14 p-0 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 border-2",
                              activeTimer?.taskId === task.id 
                                ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100" 
                                : "bg-brand-500 text-white border-brand-400 hover:bg-brand-600 shadow-brand-500/20"
                            )}
                          >
                            {activeTimer?.taskId === task.id ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => window.confirm('确定要重置计时吗？') && updateTask(activeCategory, task.id, { timeSpent: 0, remainingTime: (task.countdownDuration || 25) * 60 })}
                            className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </section>
    )}

            {currentPage === 1 && (
              <>
                <section className="col-span-12 lg:col-span-4 glass-card p-6 flex flex-col">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800 mb-4 font-cute">习惯周报 / Weekly</h3>
                  <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                    {log.habits.map(habit => (
                      <div key={habit.id} className="space-y-2 group relative">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${habit.color}20`, color: habit.color }}>
                              {getHabitIcon(habit.icon)}
                            </div>
                            {isEditMode ? (
                              <Input 
                                className="h-8 py-0 px-2 border-none bg-slate-100 focus-visible:ring-0 text-base font-black w-28"
                                value={habit.name}
                                onChange={e => updateHabit(habit.id, { name: e.target.value })}
                              />
                            ) : (
                              <span className="text-lg font-black">{habit.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-800">{habit.weeklyStatus.filter(Boolean).length}/7</span>
                            {isEditMode && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeHabit(habit.id)}
                                className="h-6 w-6 text-red-500 hover:bg-red-50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {habit.weeklyStatus.map((done, i) => (
                            <div 
                              key={i} 
                              className={cn("flex-1 h-2.5 rounded-full transition-all", !done && "bg-slate-200")}
                              style={{ backgroundColor: done ? habit.color : undefined }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {isEditMode && (
                      <Button variant="outline" onClick={addHabit} className="w-full h-10 border-dashed border-2 rounded-xl flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">添加习惯</span>
                      </Button>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-black/5 text-center">
                    <p className="text-4xl font-black text-brand-500">
                      {log.habits.length > 0 ? Math.round(log.habits.reduce((acc, h) => acc + h.weeklyStatus.filter(Boolean).length, 0) / (log.habits.length * 7) * 100) : 0}%
                    </p>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-1">习惯养成率</p>
                  </div>
                </section>

        <section className="col-span-12 lg:col-span-8 glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-3 font-cute">
              数据统计 <span className="text-slate-500 font-medium text-lg">/ Statistics</span>
            </h2>
            <div className="flex gap-3">
              {weekDays.map((day, i) => (
                <span key={i} className={cn(
                  "text-xs font-black w-10 text-center",
                  i === (new Date().getDay() || 7) - 1 ? "bg-brand-500 text-white rounded-full py-1.5" : "text-slate-900 font-black"
                )}>
                  {day}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bento-inner-card p-6 flex flex-col items-center justify-center text-center space-y-2">
              <Zap className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-5xl font-black text-brand-500">{calculateProgress()}%</p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest mt-1">今日总任务进度</p>
              </div>
            </div>
            <div className="bento-inner-card p-6 flex flex-col items-center justify-center text-center space-y-2">
              <Target className="w-10 h-10 text-indigo-500" />
              <div>
                <p className="text-5xl font-black text-brand-500">
                  {log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length}
                </p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest mt-1">今日已完成任务</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {log.habits.map(habit => (
              <div key={habit.id} className="bento-inner-card group p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${habit.color}20`, color: habit.color }}>
                      {getHabitIcon(habit.icon)}
                    </div>
                    {isEditMode ? (
                      <Input 
                        className="h-8 py-0 px-2 border-none bg-slate-100 focus-visible:ring-0 text-xl font-black w-32"
                        value={habit.name}
                        onChange={e => updateHabit(habit.id, { name: e.target.value })}
                      />
                    ) : (
                      <span className="text-xl font-black">{habit.name}</span>
                    )}
                  </div>
                  {isEditMode && (
                    <Button variant="ghost" size="icon" onClick={() => removeHabit(habit.id)} className="text-red-500 opacity-0 group-hover:opacity-100 w-10 h-10">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  {habit.weeklyStatus.map((done, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        const newStatus = [...habit.weeklyStatus];
                        newStatus[i] = !newStatus[i];
                        updateHabit(habit.id, { weeklyStatus: newStatus });
                      }}
                      className={cn(
                        "w-full h-10 rounded-xl transition-all",
                        done ? "shadow-lg scale-105" : "bg-white/50 hover:bg-white/80"
                      )}
                      style={{ backgroundColor: done ? habit.color : undefined }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {isEditMode && (
              <Button variant="outline" onClick={addHabit} className="h-full min-h-[160px] border-dashed border-2 rounded-[32px] flex flex-col gap-3">
                <Plus className="w-8 h-8" />
                <span className="text-sm font-black uppercase">添加习惯</span>
              </Button>
            )}
                  </div>
                </section>
              </>
            )}

            {currentPage === 2 && (
              <>
                <section className="col-span-12 md:col-span-6 glass-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3 font-cute">
              今日日历 <span className="text-slate-500 font-medium text-lg">/ Calendar</span>
            </h2>
            <div className="text-right">
              <p className="text-5xl font-black leading-none font-cute" style={{ color: log.themeColor || '#fb7185' }}>{new Date().getDate()}</p>
              <p className="text-sm font-black text-slate-800 uppercase tracking-widest mt-2">
                {new Date().toLocaleString('zh-CN', { month: 'long' })}
              </p>
            </div>
          </div>
          {renderCalendar()}
        </section>

        <section className="col-span-12 md:col-span-6 glass-card p-8 flex flex-col">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 font-cute">
            已完成任务 <span className="text-slate-500 font-medium text-lg">/ Completed</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length > 0 ? (
              log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').map(task => (
                <div key={task.id} className="flex items-center justify-between bg-brand-500/5 p-5 rounded-2xl border border-brand-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-base font-black text-slate-700 line-through">{task.title}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-900">
                    {Math.floor((task.timeSpent || 0) / 60)}h {(task.timeSpent || 0) % 60}m
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Zap className="w-12 h-12" />
                <p className="text-sm font-bold uppercase tracking-widest">暂无进度 / No Progress</p>
              </div>
            )}
                  </div>
                </section>
              </>
            )}

            {currentPage === 3 && (
              <>
                {yesterdayLog && (
                  <section className="col-span-12 glass-card p-8 bg-slate-50/50 border-dashed border-2 border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <History className="w-6 h-6 text-slate-400" />
                      <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-500 font-cute">昨日回顾 / Yesterday</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">昨日说明 / Notes</span>
                        <p className="text-lg font-medium text-slate-600 font-cute leading-relaxed italic whitespace-pre-wrap">
                          {yesterdayLog.notes || '当日无记录'}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">昨日评语 / Comments</span>
                        <p className="text-lg font-medium text-brand-500/70 font-cute leading-relaxed italic whitespace-pre-wrap">
                          {yesterdayLog.comments || '当日无记录'}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <section className="col-span-12 md:col-span-6 glass-card p-8 space-y-6">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800 font-cute">说明 / Notes</h3>
          <Textarea
            placeholder="记录今天的收获与感悟..."
            value={log.notes}
            onChange={(e) => setLog(prev => ({ ...prev, notes: e.target.value }))}
            className="min-h-[160px] bg-slate-50 border border-slate-200 rounded-[24px] p-8 text-xl font-medium focus-visible:ring-0 resize-none font-cute text-slate-900"
          />
        </section>

        <section className="col-span-12 md:col-span-6 glass-card p-8 space-y-6 bg-brand-500/5 border-brand-500/10">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-brand-500 font-cute">评语 / Comments</h3>
          <Textarea
            placeholder="写下对自己的评价或家长的寄语..."
            value={log.comments}
            onChange={(e) => setLog(prev => ({ ...prev, comments: e.target.value }))}
            className="min-h-[160px] bg-white/50 border-none rounded-[24px] p-8 text-xl font-medium focus-visible:ring-0 resize-none font-cute"
          />
        </section>

        {/* Row 5: Routine and Evaluation */}
        <section className="col-span-12 md:col-span-6 glass-card p-8 space-y-8">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800 font-cute">作息 / Routine</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center justify-between gap-4 bento-inner-card">
              <div className="flex items-center gap-4 flex-1">
                <Sunrise className="w-10 h-10 text-amber-500" />
                <div className="flex flex-col">
                  {isEditMode ? (
                    <Input 
                      className="text-xs font-black uppercase tracking-widest h-auto p-0 border-none bg-transparent focus-visible:ring-0"
                      value={appConfig.routineLabels.wakeUp}
                      onChange={e => setAppConfig(prev => ({ ...prev, routineLabels: { ...prev.routineLabels, wakeUp: e.target.value } }))}
                    />
                  ) : (
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">{appConfig.routineLabels.wakeUp}</span>
                  )}
                  <input 
                    type="time" 
                    value={log.wakeUpTime}
                    onChange={(e) => setLog(prev => ({ ...prev, wakeUpTime: e.target.value }))}
                    className="bg-transparent font-black text-2xl focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 bento-inner-card">
              <div className="flex items-center gap-4 flex-1">
                <Moon className="w-10 h-10 text-indigo-500" />
                <div className="flex flex-col">
                  {isEditMode ? (
                    <Input 
                      className="text-xs font-black uppercase tracking-widest h-auto p-0 border-none bg-transparent focus-visible:ring-0"
                      value={appConfig.routineLabels.sleep}
                      onChange={e => setAppConfig(prev => ({ ...prev, routineLabels: { ...prev.routineLabels, sleep: e.target.value } }))}
                    />
                  ) : (
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">{appConfig.routineLabels.sleep}</span>
                  )}
                  <input 
                    type="time" 
                    value={log.sleepTime}
                    onChange={(e) => setLog(prev => ({ ...prev, sleepTime: e.target.value }))}
                    className="bg-transparent font-black text-2xl focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 md:col-span-6 glass-card p-8 space-y-8">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800 font-cute">评价 / Evaluation</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(log.ratings) as Array<keyof DailyLog['ratings']>).map((key) => (
              <div key={key} className="flex flex-col items-center gap-4 bento-inner-card p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-xl mb-1",
                    key === 'efficiency' ? "bg-amber-100 text-amber-600" :
                    key === 'handwriting' ? "bg-indigo-100 text-indigo-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {key === 'efficiency' ? <Zap className="w-5 h-5" /> : 
                     key === 'handwriting' ? <Edit3 className="w-5 h-5" /> : 
                     <Check className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800">
                    {key === 'efficiency' ? '效率' : key === 'handwriting' ? '书写' : '正确'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateRating(key, star)}
                      className={cn(
                        "transition-all hover:scale-125",
                        star <= log.ratings[key] ? "text-amber-400" : "opacity-10"
                      )}
                    >
                      <Star className={cn("w-6 h-6", star <= log.ratings[key] && "fill-current")} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    )}

    {currentPage === 4 && (
      <div className="col-span-12 grid grid-cols-12 gap-8">
        {/* Archive Calendar Side */}
        <aside className="col-span-12 lg:col-span-4 glass-card p-6 h-fit bg-white/40 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black font-cute flex items-center gap-2 text-slate-800">
               <History className="w-5 h-5 text-brand-500" />
               每日汇总 <span className="text-slate-400 font-medium text-xs">/ Archive</span>
            </h2>
          </div>
          <div className="bg-white/60 p-4 rounded-3xl border border-white/40 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4 px-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const d = new Date(archiveDate);
                  d.setMonth(d.getMonth() - 1);
                  setArchiveDate(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-black text-slate-800 font-cute text-sm">
                {new Date(archiveDate).toLocaleString('zh-CN', { year: 'numeric', month: 'long' })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const d = new Date(archiveDate);
                  d.setMonth(d.getMonth() + 1);
                  setArchiveDate(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {renderArchiveCalendar()}
          </div>
          <Button 
            className="w-full rounded-2xl h-12 font-black gap-2 transition-all hover:scale-[1.02] active:scale-95 text-white shadow-lg"
            onClick={() => {
              const currentLogDate = new Date(log.date);
              const targetArchiveDate = new Date(archiveDate);
              const diffTime = targetArchiveDate.getTime() - currentLogDate.getTime();
              const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
              switchDate(diffDays);
              setCurrentPage(0); // Jump to tasks of that day
              setNotification(`已跳转到 ${archiveDate}`);
              setTimeout(() => setNotification(null), 3000);
            }}
            style={{ backgroundColor: log.themeColor || '#fb7185' }}
          >
            <RotateCcw className="w-5 h-5" />
            查看详情
          </Button>
        </aside>

        {/* Archive Content Side */}
        <main className="col-span-12 lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {archiveLog ? (
            <>
              {/* Top Banner with Weather & Mastery */}
              <div 
                className="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-l-8 transition-colors"
                style={{ borderLeftColor: archiveLog.themeColor || '#fb7185' }}
              >
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center p-4 bg-white/60 rounded-3xl border border-white/40 shadow-inner">
                    <div className="text-brand-500 mb-2">
                      {archiveLog.weather === 'sunny' && <Sun className="w-8 h-8" />}
                      {archiveLog.weather === 'cloudy' && <Cloud className="w-8 h-8" />}
                      {archiveLog.weather === 'rainy' && <CloudRain className="w-8 h-8" />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      {archiveLog.weather === 'sunny' ? '晴朗' : archiveLog.weather === 'cloudy' ? '多云' : '雨天'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black font-cute text-slate-800 mb-2">
                      {new Date(archiveDate).toLocaleDateString('zh-CN', { weekday: 'long' })}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: archiveLog.themeColor || '#fb7185' }} />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        主题色: <span style={{ color: archiveLog.themeColor || '#fb7185' }}>{archiveLog.themeColor || '默认粉色'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-800">
                      {archiveLog.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length}
                      <span className="text-slate-300 mx-1">/</span>
                      {archiveLog.categories.flatMap(c => c.tasks).length}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">任务完成度</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-brand-500">
                      {Math.round(
                        (archiveLog.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length / 
                        (archiveLog.categories.flatMap(c => c.tasks).length || 1)) * 100
                      )}%
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">总体掌握度</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 bg-brand-500/5 group">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6" style={{ color: archiveLog.themeColor || '#fb7185' }} />
                  <h3 className="text-2xl font-black font-cute text-slate-800">当天收获与感悟</h3>
                </div>
                <div className="p-6 bg-white/40 rounded-[28px] border border-white/60 shadow-inner min-h-[120px]">
                  <p className="text-xl text-slate-600 font-cute leading-relaxed whitespace-pre-wrap">
                    {archiveLog.notes || '当日未填写说明'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Summary Ratings */}
                <div className="glass-card p-8 border-t-4" style={{ borderTopColor: archiveLog.themeColor || '#fb7185' }}>
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4" style={{ color: archiveLog.themeColor || '#fb7185' }} /> 汇总评分
                  </h4>
                  <div className="space-y-6">
                    {(Object.keys(archiveLog.ratings || {}) as Array<keyof DailyLog['ratings']>).map((key) => (
                      <div key={key} className="flex items-center justify-between bg-white/40 p-4 rounded-2xl border border-white/60">
                        <span className="font-bold text-slate-600">
                          {key === 'efficiency' ? '效率' : key === 'handwriting' ? '书写' : '正确'}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={cn("w-5 h-5", star <= (archiveLog.ratings?.[key] || 0) ? "fill-current" : "text-slate-200")} 
                              style={{ color: star <= (archiveLog.ratings?.[key] || 0) ? (archiveLog.themeColor || '#fbbf24') : undefined }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Routine */}
                <div className="glass-card p-8 border-t-4" style={{ borderTopColor: archiveLog.themeColor || '#fb7185' }}>
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 text-sm">
                     <Clock className="w-4 h-4" style={{ color: archiveLog.themeColor || '#fb7185' }} /> 作息回顾
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/60">
                      <div className="flex items-center gap-3">
                        <Sunrise className="w-6 h-6 text-amber-500" />
                        <span className="font-bold text-slate-600 text-sm">{appConfig.routineLabels.wakeUp}</span>
                      </div>
                      <span className="text-2xl font-black font-mono text-slate-800">{archiveLog.wakeUpTime || '--:--'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/60">
                      <div className="flex items-center gap-3">
                        <Moon className="w-6 h-6 text-indigo-500" />
                        <span className="font-bold text-slate-600 text-sm">{appConfig.routineLabels.sleep}</span>
                      </div>
                      <span className="text-2xl font-black font-mono text-slate-800">{archiveLog.sleepTime || '--:--'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Review Section */}
              <div className="glass-card p-8 bg-white/40 border-l-8" style={{ borderLeftColor: archiveLog.themeColor || '#fb7185' }}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black font-cute text-slate-800 flex items-center gap-3">
                    <Target className="w-6 h-6" style={{ color: archiveLog.themeColor || '#fb7185' }} /> 任务清单回顾
                  </h3>
                  <div className="px-4 py-1 rounded-full bg-white/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border border-white/40">
                    Tasks Detail
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archiveLog.categories.flatMap(c => c.tasks).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/80 shadow-sm transition-all hover:bg-white/80">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                          task.status === 'done' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white shadow-sm"
                        )}>
                          {task.status === 'done' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          "text-sm font-bold font-cute",
                          task.status === 'done' ? "text-slate-400 line-through" : "text-slate-700"
                        )}>
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-black font-mono text-slate-400">
                        {Math.floor((task.timeSpent || 0) / 60)}m {(task.timeSpent || 0) % 60}s
                      </span>
                    </div>
                  ))}
                  {archiveLog.categories.flatMap(c => c.tasks).length === 0 && (
                    <div className="col-span-2 py-12 text-center text-slate-400 font-cute italic">
                      当日没有添加任何任务
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-8 border-t-8" style={{ backgroundColor: `${archiveLog.themeColor}08` || 'rgba(251, 113, 133, 0.05)', borderTopColor: archiveLog.themeColor || '#fb7185' }}>
                <div className="flex items-center gap-3 mb-6">
                   <Eraser className="w-6 h-6" style={{ color: archiveLog.themeColor || '#fb7185' }} />
                   <h3 className="text-2xl font-black font-cute text-slate-800">评语与寄语</h3>
                </div>
                <div className="p-6 bg-white/60 rounded-[28px] border border-white shadow-sm min-h-[100px]">
                  <p className="text-xl font-cute leading-relaxed whitespace-pre-wrap italic" style={{ color: archiveLog.themeColor || '#fb7185', opacity: 0.8 }}>
                    {archiveLog.comments || '暂无评语'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 glass-card">
              <History className="w-16 h-16 opacity-20 mb-4 animate-pulse" />
              <p className="text-xl font-black font-cute tracking-widest uppercase opacity-40">该日尚无记录数据</p>
              <p className="text-sm font-medium mt-2 opacity-30">请在日历中选择曾打卡过的日期</p>
            </div>
          )}
        </main>
      </div>
    )}
  </motion.div>
</AnimatePresence>
</div>

      <footer className="text-center py-12 text-slate-900">
        <p className="text-xs font-black uppercase tracking-[0.5em]">Stay Disciplined · Stay Fresh</p>
      </footer>
    </div>
  );
}
