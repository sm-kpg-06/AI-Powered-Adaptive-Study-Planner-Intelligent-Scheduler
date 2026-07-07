import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, CheckCircle2, ArrowLeft, BrainCircuit } from 'lucide-react';
import api from '../api/client';

const triggerConfetti = () => {
  void import('canvas-confetti').then((m) => {
    m.default({ particleCount: 200, spread: 100, gravity: 1.2, origin: { y: 0.5 }, colors: ['#3B82F6', '#10B981', '#F59E0B'] });
  });
};

export default function FocusRoom() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    api.get('/schedule').then(res => {
       const t = res.data.find((x: any) => x.id === taskId);
       if (t) {
          setTask(t);
          setTimeLeft(t.duration * 60); // minutes to seconds
       }
    });
  }, [taskId]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((l: number) => l - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    try {
      await api.post(`/tasks/${taskId}/complete`, { completionPercentage: 100 });
      triggerConfetti();
      setTimeout(() => navigate('/app'), 2500);
    } catch (e) { console.error(e); }
  };

  if (!task) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><BrainCircuit className="w-12 h-12 animate-pulse text-indigo-500" /></div>;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = ((task.duration * 60 - timeLeft) / (task.duration * 60)) * 100;

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-700">
       <button onClick={() => navigate('/app')} className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"><ArrowLeft className="w-5 h-5"/> Exit Focus</button>
       
       <div className="text-center max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{task.title}</h1>
          <p className="text-indigo-400 font-bold tracking-widest uppercase flex items-center justify-center gap-2"><BrainCircuit className="w-5 h-5"/> {task.subject?.name || 'General'} • Deep Work Session</p>
          
          <div className="relative w-80 h-80 mx-auto my-20 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0 drop-shadow-2xl">
               <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-900" />
               <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={140 * 2 * Math.PI} strokeDashoffset={(140 * 2 * Math.PI) - ((progress / 100) * (140 * 2 * Math.PI))} className="text-indigo-500 transition-all duration-1000 ease-linear" strokeLinecap="round" />
             </svg>
             <div className="absolute flex flex-col items-center justify-center">
                <div className="text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                   {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </div>
                <div className="text-indigo-200 mt-2 font-medium">REMAINING</div>
             </div>
          </div>

          <div className="flex items-center justify-center gap-6">
             <button onClick={() => setIsActive(!isActive)} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isActive ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-110 shadow-indigo-600/50'}`}>
               {isActive ? <Pause className="w-8 h-8 fill-current"/> : <Play className="w-10 h-10 ml-2 fill-current"/>}
             </button>
             <button onClick={handleComplete} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 rounded-2xl font-bold transition-all hover:scale-105 shadow-xl shadow-emerald-900/50 text-lg">
               <CheckCircle2 className="w-6 h-6"/> Complete Task
             </button>
          </div>
       </div>
    </div>
  );
}
