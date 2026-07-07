import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Clock, Sun, Moon, CheckCircle2, Loader2, Calendar, Plus, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Slot = { start: string; end: string };
type Timetable = Record<string, Slot[]>;

// Isolated slot row to avoid closure issues
const SlotRow = ({
  slot, dayName, idx, onRemove, onChange
}: {
  slot: Slot; dayName: string; idx: number;
  onRemove: (day: string, idx: number) => void;
  onChange: (day: string, idx: number, field: 'start' | 'end', val: string) => void;
}) => (
  <div className="flex items-center gap-2">
    <input
      type="time"
      value={slot.start}
      onChange={(e) => onChange(dayName, idx, 'start', e.target.value)}
      className="w-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
    />
    <span className="text-slate-400 text-xs font-bold uppercase shrink-0">to</span>
    <input
      type="time"
      value={slot.end}
      onChange={(e) => onChange(dayName, idx, 'end', e.target.value)}
      className="w-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
    />
    <button
      type="button"
      onClick={() => onRemove(dayName, idx)}
      className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition shrink-0"
      title="Remove class"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

const Routine = () => {
  const [routine, setRoutine] = useState({ wakeTime: '07:00', sleepTime: '23:00' });
  const [timetable, setTimetable] = useState<Timetable>(() => {
    const t: Timetable = {};
    DAYS.forEach(d => { t[d] = []; });
    return t;
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/routine').then(res => {
      if (res.data) {
        setRoutine({ wakeTime: res.data.wakeTime || '07:00', sleepTime: res.data.sleepTime || '23:00' });
        if (res.data.timetable) {
          try {
            const parsed = JSON.parse(res.data.timetable);
            setTimetable(prev => {
              const next = { ...prev };
              DAYS.forEach(d => { next[d] = parsed[d] ?? []; });
              return next;
            });
          } catch (e) {}
        }
      }
    }).finally(() => setFetching(false));
  }, []);

  const handleAddClass = useCallback((day: string) => {
    setTimetable(prev => ({
      ...prev,
      [day]: [...prev[day], { start: '08:00', end: '09:00' }]
    }));
  }, []);

  const handleRemoveClass = useCallback((day: string, idx: number) => {
    setTimetable(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx)
    }));
  }, []);

  const handleChangeSlot = useCallback((day: string, idx: number, field: 'start' | 'end', val: string) => {
    setTimetable(prev => {
      const slots = [...prev[day]];
      slots[idx] = { ...slots[idx], [field]: val };
      return { ...prev, [day]: slots };
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await api.put('/routine', { ...routine, timetable: JSON.stringify(timetable) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      api.post('/schedule/generate').catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="animate-pulse p-8 flex space-x-4">
      <div className="flex-1 space-y-4 py-1">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4 shadow-sm">
          <Clock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Routine</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Set your sleep schedule and weekly class timetable. The AI will strictly avoid these hours.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
        <form onSubmit={handleSave} className="space-y-10 relative z-10">

          {/* Sleep Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sun className="w-5 h-5 text-orange-500" /> Wake Time
              </label>
              <input
                type="time"
                value={routine.wakeTime}
                onChange={(e) => setRoutine(r => ({ ...r, wakeTime: e.target.value }))}
                className="text-4xl sm:text-5xl w-full font-black tracking-tighter text-center bg-slate-50 dark:bg-slate-900/50 py-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 focus:ring-0 focus:border-indigo-500 text-slate-800 dark:text-slate-100 outline-none transition-all"
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Moon className="w-5 h-5 text-indigo-500" /> Sleep Time
              </label>
              <input
                type="time"
                value={routine.sleepTime}
                onChange={(e) => setRoutine(r => ({ ...r, sleepTime: e.target.value }))}
                className="text-4xl sm:text-5xl w-full font-black tracking-tighter text-center bg-slate-50 dark:bg-slate-900/50 py-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 focus:ring-0 focus:border-indigo-500 text-slate-800 dark:text-slate-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Weekly Timetable */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-left flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> Weekly Class Timetable
            </h3>
            <p className="text-left text-sm text-slate-500 mb-6">
              Add recurring college/work class slots. The AI blocks these times every week automatically.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAYS.map(day => (
                <div key={day} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{day}</span>
                    <button
                      type="button"
                      onClick={() => handleAddClass(day)}
                      className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Class
                    </button>
                  </div>
                  <div className="space-y-3">
                    {timetable[day].map((slot, idx) => (
                      <SlotRow
                        key={`${day}-${idx}`}
                        slot={slot}
                        dayName={day}
                        idx={idx}
                        onRemove={handleRemoveClass}
                        onChange={handleChangeSlot}
                      />
                    ))}
                    {timetable[day].length === 0 && (
                      <div className="text-xs text-slate-500 italic flex items-center justify-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        No classes — free day 🎉
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-lg ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (saved ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />)}
            {loading ? 'Saving...' : (saved ? 'Saved Successfully!' : 'Set Routine Constraints')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Routine;
