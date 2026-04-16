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
  ListTodo
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
  { id: 'h3', name: '健身', icon: 'dumbbell', color: '#fca5a5', weeklyStatus: [true, true, true, true, false, false, false] },
  { id: 'h4', name: '早起', icon: 'zap', color: '#fde047', weeklyStatus: [true, false, false, false, false, false, false] },
  { id: 'h5', name: '今年待办', icon: 'list-todo', color: '#a78bfa', weeklyStatus: [false, false, false, false, false, false, false] },
];

export default function App() {
  const [log, setLog] = useState<DailyLog>(() => {
    const saved = localStorage.getItem('daily-checkin-log');
    if (saved) return JSON.parse(saved);
    return {
      date: new Date().toISOString().split('T')[0],
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

  const [activeCategory, setActiveCategory] = useState<string>(log.categories[0]?.id || INITIAL_CATEGORIES[0].id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEyeCare, setIsEyeCare] = useState(() => {
    const saved = localStorage.getItem('daily-checkin-eyecare');
    return saved === 'true';
  });
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; categoryId: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem('daily-checkin-config');
    if (saved) return JSON.parse(saved);
    return {
      title: '清新打卡助手',
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
    localStorage.setItem('daily-checkin-log', JSON.stringify(log));
  }, [log]);

  useEffect(() => {
    localStorage.setItem('daily-checkin-config', JSON.stringify(appConfig));
  }, [appConfig]);

  const calculateProgress = () => {
    const allTasks = log.categories.flatMap(c => c.tasks);
    if (allTasks.length === 0) return 0;
    const totalProgress = allTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return Math.round(totalProgress / allTasks.length);
  };

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
      remainingTime: 1500
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
    { name: '甜心粉', color: '#FFB7B2' },
    { name: '蜜桃橘', color: '#FFDAC1' },
    { name: '薄荷绿', color: '#E2F0CB' },
    { name: '青草绿', color: '#B5EAD7' },
    { name: '薰衣草', color: '#C7CEEA' },
    { name: '樱花粉', color: '#FF9AA2' },
    { name: '奶油黄', color: '#FFFFD8' },
    { name: '经典粉', color: '#fb7185' },
    { name: '天空蓝', color: '#2196F3' },
    { name: '忧郁灰', color: '#94a3b8' },
  ];

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="grid grid-cols-7 gap-2 mt-6">
        {weekDays.map(d => <div key={d} className="text-sm font-bold opacity-30 text-center py-2">{d}</div>)}
        {days.map((d, i) => (
          <div 
            key={i} 
            className={cn(
              "aspect-square flex flex-col items-center justify-center text-lg rounded-2xl transition-all relative",
              d === today ? "text-white font-bold shadow-lg scale-110 z-10" : d ? "hover:bg-black/5 opacity-60" : ""
            )}
            style={{ backgroundColor: d === today ? (log.themeColor || '#fb7185') : undefined }}
          >
            {d}
          </div>
        ))}
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
  ];

  return (
    <div 
      className={cn(
        "min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8 transition-all duration-500 bg-cover bg-center bg-no-repeat bg-fixed",
        isEyeCare && "eyecare"
      )}
      style={{ 
        backgroundColor: log.themeColor ? `${log.themeColor}15` : undefined,
        backgroundImage: log.backgroundImage ? `url(${log.backgroundImage})` : undefined,
        '--color-brand-500': log.themeColor || '#fb7185',
        '--color-bento-accent': log.themeColor || '#fb7185'
      } as any}
    >
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
                  className="text-3xl font-bold h-auto py-1 px-2 border-none bg-black/5 focus-visible:ring-0 font-cute"
                  value={appConfig.title}
                  onChange={e => setAppConfig(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input 
                  className="text-lg opacity-60 h-auto py-1 px-2 border-none bg-black/5 focus-visible:ring-0 font-cute"
                  value={appConfig.tagline}
                  onChange={e => setAppConfig(prev => ({ ...prev, tagline: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-bold tracking-tight font-cute text-brand-500">{appConfig.title}</h1>
                <p className="opacity-60 text-lg font-medium mt-1 font-cute">{log.date} · {appConfig.tagline}</p>
              </>
            )}
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-black/5 p-2 rounded-2xl">
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
                  className="rounded-xl w-10 h-10 hover:bg-rose-50 text-rose-500"
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
              isEyeCare ? "bg-amber-100 text-amber-600" : "bg-black/5 text-slate-400"
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
                  className="rounded-2xl text-rose-500 hover:text-rose-600 hover:bg-rose-50"
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
          <div className="flex bg-black/5 p-1 rounded-2xl">
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
              <section className="col-span-12 glass-card p-6 flex flex-col h-[calc(100vh-260px)] min-h-[600px]">
                <div className="flex justify-between items-center shrink-0 mb-4">
                  <h2 className="text-3xl font-black flex items-center gap-3 font-cute">
                    今日任务 <span className="opacity-30 font-medium text-xl">/ Tasks</span>
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
                    activeCategory === cat.id ? "bg-brand-500 text-white shadow-xl scale-105" : "bg-black/5 opacity-60 hover:opacity-100"
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
                    className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-6 mt-2 content-start">
            <AnimatePresence mode="popLayout">
              {log.categories.find(c => c.id === activeCategory)?.tasks
                .slice()
                .sort((a, b) => {
                  if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
                  const qA = a.quadrant || 4;
                  const qB = b.quadrant || 4;
                  return qA - qB;
                })
                .map((task, idx) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bento-inner-card group relative p-3"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={task.status === 'done'} 
                      onCheckedChange={() => {
                        const newStatus = task.status === 'done' ? 'pending' : 'done';
                        updateTask(activeCategory, task.id, { 
                          status: newStatus,
                          progress: newStatus === 'done' ? 100 : (task.progress === 100 ? 0 : task.progress)
                        });
                      }}
                      className="w-8 h-8 rounded-xl mt-1.5"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="任务名称..."
                              value={task.title}
                              onChange={(e) => updateTask(activeCategory, task.id, { title: e.target.value })}
                              className={cn(
                                "border-none bg-transparent p-0 h-auto font-black text-2xl md:text-2xl focus-visible:ring-0 font-cute",
                                task.status === 'done' && "line-through opacity-30"
                              )}
                            />
                            <select
                              className={cn(
                                "rounded-xl px-3 py-1.5 text-xs font-black outline-none border-none cursor-pointer shadow-sm appearance-none",
                                task.quadrant === 1 ? "bg-rose-100 text-rose-600" :
                                task.quadrant === 2 ? "bg-amber-100 text-amber-600" :
                                task.quadrant === 3 ? "bg-blue-100 text-blue-600" :
                                "bg-slate-100 text-slate-500"
                              )}
                              value={task.quadrant || 4}
                              onChange={(e) => updateTask(activeCategory, task.id, { quadrant: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                            >
                              <option value={1}>重要且紧急</option>
                              <option value={2}>重要不紧急</option>
                              <option value={3}>紧急不重要</option>
                              <option value={4}>不重要不紧急</option>
                            </select>
                          </div>
                          <div className="flex gap-8">
                            {/* Column 1: Unit Related */}
                            <div className="w-44 space-y-4">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs font-black opacity-40">
                                  <span>单元进度 ({task.completedUnits || 0}/{task.totalUnits || 1})</span>
                                  <span>{task.totalUnits ? Math.round((task.completedUnits || 0) / task.totalUnits * 100) : 0}%</span>
                                </div>
                                <Progress value={task.totalUnits ? (task.completedUnits || 0) / task.totalUnits * 100 : 0} className="h-2" />
                              </div>
                              
                              <div className="space-y-3 bg-white/30 px-3 py-2.5 rounded-2xl">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black opacity-40 uppercase">单元操作</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-lg">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-5 w-5 p-0 rounded-md text-[10px]"
                                        onClick={() => updateTask(activeCategory, task.id, { completedUnits: Math.max(0, (task.completedUnits || 0) - 1) })}
                                      >
                                        -
                                      </Button>
                                      <span className="text-xs font-black w-4 text-center">{task.completedUnits || 0}</span>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-5 w-5 p-0 rounded-md text-[10px]"
                                        onClick={() => updateTask(activeCategory, task.id, { completedUnits: Math.min(task.totalUnits || 1, (task.completedUnits || 0) + 1) })}
                                      >
                                        +
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] opacity-30">/</span>
                                      <Input 
                                        type="number" 
                                        className="h-6 w-8 text-[10px] p-0 text-center bg-transparent border-none focus-visible:ring-0 font-black"
                                        value={task.totalUnits || 1}
                                        onChange={(e) => updateTask(activeCategory, task.id, { totalUnits: Math.max(1, parseInt(e.target.value) || 1) })}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black opacity-40 uppercase">开始计时</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      size="sm"
                                      variant={activeTimer?.taskId === task.id ? "destructive" : "default"}
                                      onClick={() => {
                                        if (activeTimer?.taskId === task.id) {
                                          handleTimerEnd();
                                        } else {
                                          setActiveTimer({ taskId: task.id, categoryId: activeCategory });
                                        }
                                      }}
                                      className="h-8 px-4 text-xs font-black uppercase rounded-xl shadow-md flex-1"
                                    >
                                      {activeTimer?.taskId === task.id ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                                      {activeTimer?.taskId === task.id ? '暂停' : '开始'}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => updateTask(activeCategory, task.id, { timeSpent: 0, remainingTime: (task.countdownDuration || 25) * 60 })} 
                                      className="h-8 w-8 opacity-30 hover:opacity-100 bg-white/40 rounded-xl"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Overall Progress Related */}
                            <div className="w-44 space-y-4">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs font-black opacity-40">
                                  <span>整体进度</span>
                                  <span>{task.progress || 0}%</span>
                                </div>
                                <Progress value={task.progress || 0} className="h-2" />
                              </div>

                              <div className="space-y-3 bg-white/30 px-3 py-2.5 rounded-2xl">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black opacity-40 uppercase">进度调节</span>
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
                                    className="w-full"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1 border-t border-black/5 pt-2">
                                  <span className="text-3xl font-mono font-black text-brand-600 tracking-tighter leading-none">
                                    {task.timerMode === 'down' ? formatTime(task.remainingTime || 0) : formatTime(task.timeSpent || 0)}
                                  </span>
                                  <span className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">
                                    {task.timerMode === 'down' ? '剩余' : '累计'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTask(activeCategory, task.id)} className="opacity-0 group-hover:opacity-100 w-10 h-10">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                      {/* Additional Options */}
                      <div className="flex gap-4 items-center bg-black/5 px-4 py-2 rounded-xl w-fit">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black opacity-40 uppercase">模式</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-6 px-2 text-[10px] font-black rounded-lg"
                            onClick={() => updateTask(activeCategory, task.id, { timerMode: task.timerMode === 'down' ? 'up' : 'down' })}
                          >
                            {task.timerMode === 'down' ? '倒计时' : '正计时'}
                          </Button>
                        </div>
                        {task.timerMode === 'down' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black opacity-40 uppercase">设定</span>
                            <Input 
                              type="number" 
                              className="h-6 w-10 text-[10px] p-0 text-center bg-white/50 rounded-lg font-black border-none focus-visible:ring-0"
                              placeholder="分"
                              value={task.countdownDuration || 25}
                              onChange={(e) => {
                                const mins = Math.max(1, parseInt(e.target.value) || 1);
                                updateTask(activeCategory, task.id, { 
                                  countdownDuration: mins,
                                  remainingTime: mins * 60
                                });
                              }}
                            />
                            <span className="text-[10px] font-black opacity-40">分</span>
                          </div>
                        )}
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
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 mb-4 font-cute">习惯周报 / Weekly</h3>
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
                                className="h-8 py-0 px-2 border-none bg-black/5 focus-visible:ring-0 text-base font-black w-28"
                                value={habit.name}
                                onChange={e => updateHabit(habit.id, { name: e.target.value })}
                              />
                            ) : (
                              <span className="text-lg font-black">{habit.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono opacity-40">{habit.weeklyStatus.filter(Boolean).length}/7</span>
                            {isEditMode && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeHabit(habit.id)}
                                className="h-6 w-6 text-rose-500 hover:bg-rose-50"
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
                              className={cn("flex-1 h-2.5 rounded-full transition-all", !done && "bg-black/5")}
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
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">习惯养成率</p>
                  </div>
                </section>

        <section className="col-span-12 lg:col-span-8 glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-3 font-cute">
              数据统计 <span className="opacity-30 font-medium text-lg">/ Statistics</span>
            </h2>
            <div className="flex gap-3">
              {weekDays.map((day, i) => (
                <span key={i} className={cn(
                  "text-xs font-black w-10 text-center",
                  i === (new Date().getDay() || 7) - 1 ? "bg-brand-500 text-white rounded-full py-1.5" : "opacity-30"
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
                <p className="text-xs font-black opacity-40 uppercase tracking-widest mt-1">今日总任务进度</p>
              </div>
            </div>
            <div className="bento-inner-card p-6 flex flex-col items-center justify-center text-center space-y-2">
              <Target className="w-10 h-10 text-indigo-500" />
              <div>
                <p className="text-5xl font-black text-brand-500">
                  {log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length}
                </p>
                <p className="text-xs font-black opacity-40 uppercase tracking-widest mt-1">今日已完成任务</p>
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
                        className="h-8 py-0 px-2 border-none bg-black/5 focus-visible:ring-0 text-xl font-black w-32"
                        value={habit.name}
                        onChange={e => updateHabit(habit.id, { name: e.target.value })}
                      />
                    ) : (
                      <span className="text-xl font-black">{habit.name}</span>
                    )}
                  </div>
                  {isEditMode && (
                    <Button variant="ghost" size="icon" onClick={() => removeHabit(habit.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 w-10 h-10">
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
              今日日历 <span className="opacity-30 font-medium text-lg">/ Calendar</span>
            </h2>
            <div className="text-right">
              <p className="text-5xl font-black leading-none font-cute" style={{ color: log.themeColor || '#fb7185' }}>{new Date().getDate()}</p>
              <p className="text-sm font-bold opacity-40 uppercase tracking-widest mt-2">
                {new Date().toLocaleString('zh-CN', { month: 'long' })}
              </p>
            </div>
          </div>
          {renderCalendar()}
        </section>

        <section className="col-span-12 md:col-span-6 glass-card p-8 flex flex-col">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 font-cute">
            已完成任务 <span className="opacity-30 font-medium text-lg">/ Completed</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').length > 0 ? (
              log.categories.flatMap(c => c.tasks).filter(t => t.status === 'done').map(task => (
                <div key={task.id} className="flex items-center justify-between bg-brand-500/5 p-5 rounded-2xl border border-brand-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-base font-bold opacity-60 line-through">{task.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold opacity-30">
                    {Math.floor((task.timeSpent || 0) / 60)}h {(task.timeSpent || 0) % 60}m
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
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
                <section className="col-span-12 md:col-span-6 glass-card p-8 space-y-6">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 font-cute">说明 / Notes</h3>
          <Textarea
            placeholder="记录今天的收获与感悟..."
            value={log.notes}
            onChange={(e) => setLog(prev => ({ ...prev, notes: e.target.value }))}
            className="min-h-[160px] bg-black/5 border-none rounded-[24px] p-8 text-xl font-medium focus-visible:ring-0 resize-none font-cute"
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
          <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 font-cute">作息 / Routine</h3>
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
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">{appConfig.routineLabels.wakeUp}</span>
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
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">{appConfig.routineLabels.sleep}</span>
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
          <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 font-cute">评价 / Evaluation</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(log.ratings) as Array<keyof DailyLog['ratings']>).map((key) => (
              <div key={key} className="flex flex-col items-center gap-4 bento-inner-card p-6">
                <span className="text-xs font-black uppercase tracking-widest opacity-40">
                  {key === 'efficiency' ? '效率' : key === 'handwriting' ? '书写' : '正确'}
                </span>
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
  </motion.div>
</AnimatePresence>
</div>

      <footer className="text-center py-12 opacity-20">
        <p className="text-xs font-black uppercase tracking-[0.5em]">Stay Disciplined · Stay Fresh</p>
      </footer>
    </div>
  );
}
