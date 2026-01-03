import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { FocusMode } from './components/FocusMode';
import { Task, AppMode } from './types';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<AppMode>('planning');

  const handleStartFocus = () => {
    if (tasks.length > 0) {
        setMode('focus');
    }
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' } : t
    ));
    // We stay in focus mode, the FocusMode component will automatically switch to the next task
    // or show the summary screen if no tasks are left.
  };

  const handleExitFocus = () => {
    setMode('planning');
  };

  return (
    <main className="w-full h-screen bg-tf-bg overflow-hidden text-tf-accent font-sans">
      {mode === 'planning' ? (
        <Dashboard 
            tasks={tasks} 
            setTasks={setTasks} 
            onStartFocus={handleStartFocus}
        />
      ) : (
        <FocusMode 
            tasks={tasks} 
            onCompleteTask={handleCompleteTask}
            onExit={handleExitFocus}
        />
      )}
    </main>
  );
}