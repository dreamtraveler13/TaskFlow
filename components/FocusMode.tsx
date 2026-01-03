import React, { useState, useEffect, useRef } from 'react';
import { Task, SubjectType } from '../types';
import { CheckCircle2, Pause, Play, ChevronRight, X } from 'lucide-react';
import { generateStepsForTask } from '../services/geminiService';

interface FocusModeProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onExit: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ tasks, onCompleteTask, onExit }) => {
  // Filter active or pending tasks
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const currentTask = pendingTasks[0];

  const [timeLeft, setTimeLeft] = useState(currentTask ? currentTask.estimatedMinutes * 60 : 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [totalTime, setTotalTime] = useState(currentTask ? currentTask.estimatedMinutes * 60 : 0);
  const [localSteps, setLocalSteps] = useState(currentTask?.steps || []);
  
  // Ref for previous task ID to detect changes
  const prevTaskIdRef = useRef<string | null>(null);

  // Initialize or Reset timer when task changes
  useEffect(() => {
    if (!currentTask) return;
    
    // Only reset if the task ID changed
    if (prevTaskIdRef.current !== currentTask.id) {
        setTotalTime(currentTask.estimatedMinutes * 60);
        setTimeLeft(currentTask.estimatedMinutes * 60);
        setLocalSteps(currentTask.steps);
        setIsPlaying(true);
        prevTaskIdRef.current = currentTask.id;

        // If no steps, try to generate them on the fly if not already there
        if (currentTask.steps.length === 0) {
             generateStepsForTask(currentTask.title, currentTask.subject).then(steps => {
                 setLocalSteps(steps.map(s => ({ id: crypto.randomUUID(), text: s, isCompleted: false })));
             });
        }
    }
  }, [currentTask]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && timeLeft > 0 && currentTask) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentTask) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, currentTask]);

  if (!currentTask) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-green-50 p-8 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-900 mb-2">All Done!</h1>
        <p className="text-green-700 mb-8">You've completed your flow for today.</p>
        <button 
            onClick={onExit}
            className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-transform"
        >
            Back to Plan
        </button>
      </div>
    );
  }

  const toggleStep = (stepId: string) => {
    setLocalSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s
    ));
  };

  const percentLeft = (timeLeft / totalTime) * 100;
  
  // Dynamic Background Color based on urgency
  let bgColorClass = 'bg-emerald-500'; // Plenty of time
  if (percentLeft < 40) bgColorClass = 'bg-yellow-400'; // Getting tight
  if (percentLeft < 15) bgColorClass = 'bg-rose-500'; // Urgent

  return (
    <div className="h-screen w-full relative overflow-hidden bg-white flex flex-col">
      {/* Background Water Level */}
      <div 
        className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-linear ${bgColorClass} opacity-10`}
        style={{ height: `${percentLeft}%` }} 
      />
      
      {/* Wave Element (Purely visual at the top of the water) */}
      <div 
         className={`absolute left-0 right-0 h-4 bg-gradient-to-t from-white/0 to-white/50 z-0 transition-all duration-1000 ease-linear`}
         style={{ bottom: `${percentLeft}%` }}
      />

      {/* Header / Nav */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <button onClick={onExit} className="p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
            <X className="w-5 h-5 text-stone-600" />
        </button>
        <div className="text-sm font-medium text-stone-400 bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
            Next: {pendingTasks[1]?.title || "Finish"}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto w-full">
        
        {/* Timer Text */}
        <div className="mb-8">
             <span className={`text-6xl font-bold font-mono tracking-tighter ${percentLeft < 15 ? 'text-rose-600' : 'text-stone-800'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
             </span>
             <p className="text-stone-400 mt-2 text-sm uppercase tracking-widest font-semibold">Remaining</p>
        </div>

        {/* Current Task Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 w-full shadow-2xl border border-stone-100/50">
            <div className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-bold mb-4 uppercase tracking-wider">
                {currentTask.subject}
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-6 leading-tight">
                {currentTask.title}
            </h2>

            {/* Micro Steps */}
            <div className="space-y-3 text-left">
                {localSteps.map(step => (
                    <div 
                        key={step.id} 
                        onClick={() => toggleStep(step.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                            step.isCompleted 
                            ? 'bg-green-50 border-green-100' 
                            : 'bg-stone-50 border-transparent hover:bg-stone-100'
                        }`}
                    >
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            step.isCompleted ? 'border-green-500 bg-green-500' : 'border-stone-300'
                        }`}>
                            {step.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${step.isCompleted ? 'text-green-700 line-through' : 'text-stone-600'}`}>
                            {step.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 p-6 pb-12 flex items-center justify-center gap-6">
         <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-stone-800 hover:scale-105 active:scale-95 transition-all"
         >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
         </button>

         <button 
            onClick={() => onCompleteTask(currentTask.id)}
            className="h-16 px-8 rounded-full bg-tf-accent text-white shadow-lg shadow-stone-300 flex items-center justify-center gap-2 font-bold text-lg hover:scale-105 active:scale-95 transition-all flex-1 max-w-[200px]"
         >
            <CheckCircle2 className="w-6 h-6" />
            Done
         </button>
      </div>
    </div>
  );
};