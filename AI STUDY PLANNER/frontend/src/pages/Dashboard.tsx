import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle, Send, Activity, Sun, Moon, BrainCircuit, Coffee, Zap, BookOpen, Flame } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const FOCUS_CONFIG: Record<string, { label: string; cls: string }> = {
  'Deep Focus':    { label: 'Deep Focus',    cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  'Active Recall': { label: 'Active Recall', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  'Light Focus':   { label: 'Light Focus',   cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
};

const DIFF_CLS: Record<string, string> = {
  Hard:   'bg-red-500/20 text-red-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Easy:   'bg-green-500/20 text-green-400',
};

function FocusBadge({ type }: { type: string }) {
  const cfg = FOCUS_CONFIG[type] ?? FOCUS_CONFIG['Active Recall'];
  const Icon = type === 'Deep Focus' ? Flame : type === 'Active Recall' ? Zap : BookOpen;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [yesterdayTasks, setYesterdayTasks] = useState<any[]>([]);
  const [logId, setLogId] = useState('');
  const [taskCompletionMap, setTaskCompletionMap] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const scheduleRes = await api.get('/schedule');
      setTasks(scheduleRes.data);

      const feedbackRes = await api.get('/feedback/today');
      if (feedbackRes.data.log && !feedbackRes.data.log.reported && feedbackRes.data.yesterdayTasks?.length > 0) {
        setLogId(feedbackRes.data.log.id);
        setYesterdayTasks(feedbackRes.data.yesterdayTasks);
        const m: Record<string, number> = {};
        feedbackRes.data.yesterdayTasks.forEach((t: any) => m[t.id] = 100);
        setTaskCompletionMap(m);
        setShowFeedbackModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/schedule/generate');
      await fetchData();
    } catch (e) {
      alert('Failed to generate schedule. Please check your routine settings.');
    } finally { setGenerating(false); }
  };

  const submitFeedback = async () => {
    try {
      await api.post('/feedback/submit', { logId, feedbackData: { reviewed: true }, taskCompletionMap });
      setShowFeedbackModal(false);
      handleGenerate();
    } catch (e) { console.error(e); }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/complete`, { completionPercentage: 100 });
      fetchData();
      import('canvas-confetti').then((m) => {
        m.default({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#3B82F6', '#10B981', '#F59E0B'] });
      });
    } catch (e) { console.error(e); }
  };

  // Build break entries between tasks
  function buildDayTimeline(dayTasks: any[]) {
    const sorted = [...dayTasks].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const entries: any[] = [];
    for (let i = 0; i < sorted.length; i++) {
      entries.push({ ...sorted[i], _isBreak: false });
      if (i < sorted.length - 1) {
        // 15-min break between tasks
        entries.push({
          _isBreak: true,
          startTime: sorted[i].endTime,
          endTime: addMins(sorted[i].endTime, 15),
        });
      }
    }
    return entries;
  }

  function addMins(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-400">Your AI-optimised daily study blocks.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all disabled:opacity-50"
        >
          {generating ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Activity className="w-5 h-5" />}
          Smart Replanner
        </button>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
              <Sun className="w-6 h-6 text-yellow-500" /> Morning Review
            </h2>
            <p className="text-gray-400 text-sm mb-6">How much of each topic did you complete? Unfinished work will be auto-rescheduled.</p>
            <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2">
              {yesterdayTasks.map(t => (
                <div key={t.id} className="flex flex-col p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-200 pr-2">{t.title}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${taskCompletionMap[t.id] === 100 ? 'bg-emerald-500/20 text-emerald-400' : taskCompletionMap[t.id] === 0 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {taskCompletionMap[t.id]}%
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="10"
                    value={taskCompletionMap[t.id] || 0}
                    onChange={(e) => setTaskCompletionMap({ ...taskCompletionMap, [t.id]: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0% Missed</span><span>50% Halfway</span><span>100% Done</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitFeedback} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-white font-medium flex justify-center items-center gap-2">
              <Send className="w-4 h-4" /> Sync & Reschedule
            </button>
          </div>
        </div>
      )}

      {/* All scheduled days */}
      <div className="space-y-6 mt-4">
        {(() => {
          // Group tasks by date string YYYY-MM-DD
          const grouped: Record<string, any[]> = {};
          for (const t of tasks) {
            if (!t.date) continue;
            const key = t.date.slice(0, 10);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
          }
          const sortedDates = Object.keys(grouped).sort();
          if (sortedDates.length === 0) {
            return (
              <div className="text-center py-16 text-gray-500 bg-gray-900/50 rounded-2xl border border-dashed border-gray-800 flex flex-col items-center gap-3">
                <AlertTriangle className="w-10 h-10 opacity-40" />
                <p className="text-lg font-medium">No tasks scheduled yet</p>
                <p className="text-sm">Click <strong>Smart Replanner</strong> to generate your full study plan.</p>
              </div>
            );
          }

          const todayStr = new Date().toISOString().slice(0, 10);

          return sortedDates.map(dateStr => {
            const dayTasks = grouped[dateStr];
            const dateObj  = new Date(dateStr + 'T00:00:00');
            const isToday  = dateStr === todayStr;
            const isTomorrow = dateStr === new Date(Date.now() + 86400000).toISOString().slice(0, 10);
            const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(dateObj, 'EEEE, d MMM');
            const timeline = buildDayTimeline(dayTasks);

            return (
              <div key={dateStr} className={`bg-gray-900 border p-6 rounded-2xl shadow-xl ${isToday ? 'border-indigo-600/60' : 'border-gray-800'}`}>
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  {isToday
                    ? <Sun className="w-5 h-5 text-yellow-500" />
                    : isTomorrow
                      ? <Moon className="w-5 h-5 text-indigo-400" />
                      : <BookOpen className="w-5 h-5 text-gray-500" />}
                  {label}
                  {isToday && <span className="ml-2 text-xs font-medium bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-600/30">Today</span>}
                  <span className="ml-auto text-sm font-normal text-gray-500">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                </h2>

                <div className="space-y-2">
                  {timeline.map((entry, i) => {
                    if (entry._isBreak) {
                      return (
                        <div key={`break-${i}`} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/40 border border-dashed border-gray-700/50">
                          <Coffee className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className="text-xs text-gray-500 font-medium font-mono">{entry.startTime}–{entry.endTime}</span>
                          <span className="text-xs text-gray-600 italic">15-min Break</span>
                        </div>
                      );
                    }

                    const task      = entry;
                    const focusType = task.focusType ?? (task.difficulty === 'Hard' ? 'Deep Focus' : task.difficulty === 'Easy' ? 'Light Focus' : 'Active Recall');
                    // Use scheduledMinutes (actual chunk = endTime - startTime) for display;
                    // fall back to task.duration for unscheduled tasks
                    const displayMins = task.scheduledMinutes ?? task.duration ?? 0;
                    const durationH   = displayMins >= 60
                      ? `${(displayMins / 60).toFixed(1)}h`
                      : `${displayMins}min`;

                    return (
                      <div key={task.id} className={`rounded-xl border p-4 transition-all hover:border-gray-600 ${task.isCompleted ? 'bg-emerald-900/10 border-emerald-900/30' : task.difficulty === 'Hard' ? 'bg-gray-800 border-red-900/30' : task.difficulty === 'Easy' ? 'bg-gray-800 border-green-900/30' : 'bg-gray-800 border-gray-700'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex gap-4 items-start">
                            {/* Time range */}
                            <div className="shrink-0">
                              <div className="font-mono text-xs font-bold text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded-md border border-indigo-800/40 whitespace-nowrap">
                                {task.startTime}–{task.endTime}
                              </div>
                            </div>
                            {/* Details */}
                            <div className="min-w-0">
                              <h3 className={`font-semibold leading-tight ${task.isCompleted ? 'text-emerald-500 line-through' : 'text-white'}`}>{task.title}</h3>
                              {/* Breadcrumb */}
                              <div className="flex flex-wrap items-center gap-1 mt-1 text-xs text-gray-400">
                                {task.subjectName && <span className="font-medium text-blue-400">{task.subjectName}</span>}
                                {task.examName && <><span className="text-gray-600">›</span><span className="text-purple-400 font-medium">{task.examName}</span></>}
                                {task.topicName && task.topicName !== task.title && <><span className="text-gray-600">›</span><span className="text-gray-300">{task.topicName}</span></>}
                              </div>
                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">⏱ {durationH}</span>
                                {task.difficulty && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFF_CLS[task.difficulty] ?? DIFF_CLS.Medium}`}>{task.difficulty}</span>}
                                <FocusBadge type={focusType} />
                                {task.taskType === 'REVISION' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Exam Revision</span>}
                              </div>
                            </div>
                          </div>
                          {/* Actions */}
                          {!task.isCompleted && (
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => window.open(`/app/focus/${task.id}`, '_self')} className="p-2 bg-gray-800 border border-gray-700 hover:bg-indigo-900 text-indigo-400 rounded-lg transition flex items-center gap-1 text-xs font-bold px-3">
                                <BrainCircuit size={15} /> Focus
                              </button>
                              <button onClick={() => handleComplete(task.id)} className="p-2 bg-emerald-600/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/20 rounded-lg transition" title="Mark complete">
                                <CheckCircle size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
