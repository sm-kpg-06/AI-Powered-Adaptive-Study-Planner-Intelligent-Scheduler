import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target, Flame, Zap, Clock } from 'lucide-react';
import api from '../api/client';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const triggerConfetti = () => {
  void import('canvas-confetti').then((m) => {
    m.default({ particleCount: 50, gravity: 0.8, spread: 90, origin: { y: 0.1 } });
  });
};

export default function Analytics() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api.get('/schedule').then(res => {
        setTasks(res.data);
        if (res.data.filter((t: any) => t.isCompleted).length > 0) {
            triggerConfetti();
        }
    }).catch(console.error);
  }, []);

  const completedTasks = tasks.filter(t => t.isCompleted);
  
  // Gamification Engine
  const totalXP = completedTasks.reduce((acc, t) => acc + (t.difficulty === 'Hard' ? 100 : t.difficulty === 'Medium' ? 50 : 25), 0);
  const level = Math.floor(Math.pow(totalXP, 0.6) * 0.1) + 1;
  const currentLevelXPRequirement = Math.pow((level - 1) / 0.1, 1 / 0.6);
  const nextLevelXPRequirement = Math.pow(level / 0.1, 1 / 0.6);
  const xpInCurrentLevel = totalXP - currentLevelXPRequirement;
  const xpNeededForNext = nextLevelXPRequirement - currentLevelXPRequirement;
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100);

  // Subject Mastery Map
  const subjectMap: any = {};
  completedTasks.forEach(t => {
      const sName = t.subject?.name || 'General';
      if (!subjectMap[sName]) subjectMap[sName] = 0;
      subjectMap[sName] += t.duration; // mapped in minutes internally
  });
  const pieData = Object.keys(subjectMap).map(k => ({ name: k, value: Math.round(subjectMap[k] / 60) }));

  // Difficulty Distribution
  const diffMap = { Hard: 0, Medium: 0, Easy: 0 };
  completedTasks.forEach(t => {
      if (t.difficulty === 'Hard') diffMap.Hard++;
      if (t.difficulty === 'Medium') diffMap.Medium++;
      if (t.difficulty === 'Easy') diffMap.Easy++;
  });
  const barData = [
      { name: 'Hard', count: diffMap.Hard },
      { name: 'Medium', count: diffMap.Medium },
      { name: 'Easy', count: diffMap.Easy },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-gray-800 pb-6">
         <div>
           <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Analytics & Mastery</h1>
           <p className="text-gray-400 mt-1">Track your progress, level up your profile, and visualize your cognitive load.</p>
         </div>
      </div>

      {/* Gamification Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-indigo-500/30">
         <div className="absolute top-0 right-0 -mt-10 -mr-10 text-indigo-500/20">
            <Trophy className="w-64 h-64" />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="bg-gray-950 p-6 rounded-full border-4 border-indigo-500 shadow-xl shadow-indigo-500/50 flex flex-col items-center justify-center w-32 h-32">
               <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Level</span>
               <span className="text-4xl font-black text-white">{level}</span>
            </div>
            <div className="flex-1 w-full">
               <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2"><Flame className="w-6 h-6 text-orange-500" /> Scholar Profile (Elite)</h2>
               <p className="text-indigo-200 mb-4">You have earned <strong className="text-white">{Math.round(totalXP)} XP</strong>. Keep completing AI-assigned blocks to reach Level {level + 1}!</p>
               <div className="w-full bg-gray-950 rounded-full h-4 border border-gray-800 relative overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all duration-1000 relative" style={{ width: `${progressPercent}%` }}>
                     <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                  </div>
               </div>
               <div className="flex justify-between text-xs text-indigo-300 mt-2 font-medium">
                  <span>{Math.round(xpInCurrentLevel)} XP</span>
                  <span>{Math.round(xpNeededForNext)} XP Needed</span>
               </div>
            </div>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <Target className="w-8 h-8 text-blue-500 mb-3"/>
            <span className="text-3xl font-bold text-white">{completedTasks.length}</span>
            <span className="text-gray-400 text-sm mt-1">Total Tasks Mastered</span>
         </div>
         <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-emerald-500 mb-3"/>
            <span className="text-3xl font-bold text-white">{pieData.reduce((a, b) => a + b.value, 0)}</span>
            <span className="text-gray-400 text-sm mt-1">Total Hours Studied</span>
         </div>
         <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <Zap className="w-8 h-8 text-yellow-500 mb-3"/>
            <span className="text-3xl font-bold text-white">{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%</span>
            <span className="text-gray-400 text-sm mt-1">Completion Rate</span>
         </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-6">Subject Time Distribution (Hours)</h3>
            {pieData.length > 0 ? (
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                         {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} itemStyle={{ color: '#fff' }}/>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="flex flex-wrap justify-center gap-4 mt-2">
                       {pieData.map((d, i) => (
                           <div key={d.name} className="flex items-center gap-2 text-xs text-gray-400"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>{d.name} ({d.value}h)</div>
                       ))}
                   </div>
                </div>
            ) : <div className="h-64 flex items-center justify-center text-gray-500">No data accumulated</div>}
         </div>

         <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-6">Completed Tasks by Difficulty</h3>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                   <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                   <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                   <Tooltip cursor={{fill: '#1F2937'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }} />
                   <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                       {barData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.name === 'Hard' ? '#EF4444' : entry.name === 'Medium' ? '#F59E0B' : '#10B981'} />
                       ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
