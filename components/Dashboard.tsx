import React, { useState } from 'react';
import { Plus, Play, Trash2, GripVertical, Clock } from 'lucide-react';
import { SubjectType, Task } from '../types';
import { CameraInput } from './CameraInput';
import { analyzeHomeworkImage, generateStepsForTask } from '../services/geminiService';
import { CompanionChat } from './CompanionChat';

interface DashboardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onStartFocus: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, setTasks, onStartFocus }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  const handleImageCaptured = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const aiTasks = await analyzeHomeworkImage(base64);
      const newTasks: Task[] = aiTasks.map(t => ({
        id: crypto.randomUUID(),
        title: t.title,
        subject: mapSubject(t.subject),
        estimatedMinutes: t.estimatedMinutes,
        steps: t.steps.map(s => ({ id: crypto.randomUUID(), text: s, isCompleted: false })),
        status: 'pending',
        createdAt: Date.now()
      }));
      setTasks(prev => [...prev, ...newTasks]);
    } catch (err) {
      alert("Oops! Couldn't analyze the image. Try again clearly.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mapSubject = (str: string): SubjectType => {
    const s = str.toLowerCase();
    if (s.includes('math')) return SubjectType.MATH;
    if (s.includes('lang') || s.includes('english')) return SubjectType.LANGUAGE;
    if (s.includes('sci')) return SubjectType.SCIENCE;
    if (s.includes('art')) return SubjectType.ART;
    return SubjectType.OTHER;
  };

  const getSubjectColor = (subject: SubjectType) => {
    switch (subject) {
      case SubjectType.MATH: return 'bg-tf-math text-tf-math-text';
      case SubjectType.LANGUAGE: return 'bg-tf-lang text-tf-lang-text';
      case SubjectType.SCIENCE: return 'bg-tf-sci text-tf-sci-text';
      case SubjectType.ART: return 'bg-tf-art text-tf-art-text';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const handleAddQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: quickTitle,
      subject: SubjectType.OTHER,
      estimatedMinutes: 30,
      steps: [],
      status: 'pending',
      createdAt: Date.now()
    };
    
    setTasks(prev => [...prev, newTask]);
    setQuickTitle('');

    // Background generate steps
    const steps = await generateStepsForTask(quickTitle, "General");
    setTasks(prev => prev.map(t => t.id === newTask.id ? {
      ...t,
      steps: steps.map(s => ({ id: crypto.randomUUID(), text: s, isCompleted: false }))
    } : t));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-tf-accent tracking-tight">Today's Flow</h1>
        <p className="text-stone-400 mt-1 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {tasks.length} tasks • {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
        </p>
      </header>

      <CameraInput onImageCaptured={handleImageCaptured} isLoading={isAnalyzing} />

      {/* Vertical Timeline Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-24 relative">
        {/* Vertical Line */}
        {tasks.length > 0 && (
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-stone-200 rounded-full -z-10"></div>
        )}

        {tasks.map((task, index) => (
          <div key={task.id} className="relative flex items-center gap-4 group">
            {/* Timeline Node */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 z-10 border-2 border-white box-content shadow-sm
              ${task.status === 'completed' ? 'bg-green-400' : 'bg-stone-300'}`}>
            </div>

            {/* Task Card */}
            <div className={`flex-1 p-4 rounded-2xl transition-all duration-300 flex justify-between items-center shadow-sm hover:shadow-md bg-white border border-stone-100`}>
              <div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${getSubjectColor(task.subject)}`}>
                  {task.subject}
                </div>
                <h3 className="font-semibold text-stone-800">{task.title}</h3>
                <p className="text-xs text-stone-400 mt-0.5">{task.estimatedMinutes} min • {task.steps.length} steps</p>
              </div>
              <button 
                onClick={() => removeTask(task.id)}
                className="text-stone-300 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Quick Add Input */}
        <div className="relative flex items-center gap-4">
             <div className="w-3 h-3 rounded-full bg-stone-200 flex-shrink-0 border-2 border-white box-content"></div>
             <form onSubmit={handleAddQuickTask} className="flex-1">
                <input
                  type="text"
                  placeholder="Type to add task..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-stone-200 py-2 px-1 focus:outline-none focus:border-tf-accent transition-colors placeholder:text-stone-300"
                />
             </form>
        </div>
      </div>

      <CompanionChat tasks={tasks} setTasks={setTasks} />

      {/* Floating Action Button */}
      {tasks.length > 0 && (
        <div className="fixed bottom-6 left-6 right-[6rem] flex justify-center z-50">
          <button
            onClick={onStartFocus}
            className="w-full bg-tf-accent text-white rounded-2xl py-4 font-bold text-lg shadow-xl shadow-stone-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Flow
          </button>
        </div>
      )}
    </div>
  );
};