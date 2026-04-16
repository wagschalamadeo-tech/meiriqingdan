export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'done';
  progress?: number; // 0-100
  timeSpent?: number; // in seconds
  totalUnits?: number;
  completedUnits?: number;
  timerMode?: 'up' | 'down';
  countdownDuration?: number; // in minutes
  remainingTime?: number; // in seconds
}

export interface Category {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  weeklyStatus: boolean[]; // 7 days
}

export interface DailyLog {
  date: string;
  themeColor?: string;
  backgroundImage?: string;
  weather: 'sunny' | 'cloudy' | 'rainy';
  categories: Category[];
  habits: Habit[];
  wakeUpTime: string;
  sleepTime: string;
  ratings: {
    efficiency: number;
    handwriting: number;
    accuracy: number;
  };
  notes: string;
  comments: string;
}

export interface AppTheme {
  bgColor: string;
  textColor: string;
  opacity: number;
}
