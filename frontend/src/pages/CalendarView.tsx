import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, UploadCloud, CheckCircle, Plus, X, Sun } from 'lucide-react';
import api from '../api/client';

type ModalMode = 'busy' | 'holiday';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>('busy');
  const [showModal, setShowModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  const month1start = startOfMonth(currentDate);
  const month1end = endOfMonth(month1start);
  const month2start = startOfMonth(addMonths(currentDate, 1));
  const month2end = endOfMonth(month2start);

  const getDays = (start: Date, end: Date) => eachDayOfInterval({ start: startOfWeek(start), end: endOfWeek(end) });
  const month1Days = getDays(month1start, month1end);
  const month2Days = getDays(month2start, month2end);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/calendar');
      setEvents(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setManualTitle(mode === 'holiday' ? 'Holiday' : '');
    setManualDate(''); setManualStart(''); setManualEnd('');
    setShowModal(true);
  };

  const handleManualSave = async () => {
    if (!manualDate) return alert('Please select a date');
    if (modalMode === 'busy' && (!manualTitle || !manualStart || !manualEnd)) return alert('Fill all fields');

    const payload: any = {
      title: modalMode === 'holiday' ? (manualTitle || 'Holiday') : manualTitle,
      date: new Date(manualDate).toISOString(),
      type: modalMode === 'holiday' ? 'HOLIDAY' : 'BUSY',
    };
    if (modalMode === 'busy') {
      payload.startTime = manualStart;
      payload.endTime = manualEnd;
    }

    try {
      await api.post('/calendar', payload);
      setShowModal(false);
      fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/calendar/${id}`);
      setEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('timetable', e.target.files[0]);
    try {
      const res = await api.post('/calendar/ocr-upload', formData);
      setPreviewEvents(res.data.preview);
    } catch (e) {
      console.error(e);
      alert('Failed to parse timetable from image.');
    } finally { setUploadLoading(false); }
  };

  const savePreviewEvents = async () => {
    if (!previewEvents) return;
    try {
      for (const ev of previewEvents) {
        await api.post('/calendar', { ...ev, date: new Date().toISOString() });
      }
      setPreviewEvents(null);
      fetchEvents();
    } catch (e) { console.error(e); }
  };

  const renderMonth = (monthTitleDate: Date, days: Date[]) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl w-full">
      <h2 className="text-xl font-bold text-white mb-4">{format(monthTitleDate, 'MMMM yyyy')}</h2>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthTitleDate);
          const dayEvents = events.filter(ev => isSameDay(new Date(ev.date), day));
          const isHoliday = dayEvents.some(ev => ev.type === 'HOLIDAY');
          return (
            <div
              key={i}
              className={`min-h-[72px] p-1.5 rounded-lg border text-left transition-all
                ${!isCurrentMonth ? 'opacity-30 bg-gray-900/50 border-gray-800/50' :
                isHoliday ? 'bg-amber-900/30 border-amber-600/40' :
                'bg-gray-800 border-gray-700 hover:border-indigo-500'}`}
            >
              <span className={`text-xs font-semibold block mb-1 ${
                isSameDay(day, new Date()) ? 'text-indigo-400' :
                isHoliday ? 'text-amber-400' : 'text-gray-300'
              }`}>{format(day, 'd')}</span>
              <div className="space-y-0.5">
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`text-[9px] truncate px-1 py-0.5 rounded flex items-center justify-between gap-0.5 group
                      ${ev.type === 'HOLIDAY'
                        ? 'bg-amber-900/60 text-amber-200 border border-amber-700/50'
                        : 'bg-indigo-900/50 text-indigo-200 border border-indigo-700/50'}`}
                  >
                    <span className="font-semibold truncate">{ev.title}</span>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 shrink-0 transition"
                      title="Delete"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-amber-400">
            Timetables &amp; Slots
          </h1>
          <p className="text-gray-400 mt-1">Block busy times, mark holidays, or upload timetables. The AI strictly respects these bounds.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => openModal('holiday')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 px-4 py-2 rounded-lg font-medium transition"
          >
            <Sun className="w-4 h-4" /> Mark Holiday
          </button>
          <button
            onClick={() => openModal('busy')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-4 py-2 rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" /> Add Busy Slot
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition"
          >
            {uploadLoading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <UploadCloud className="w-4 h-4" />}
            OCR Upload
          </button>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 gap-1">
            <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-1.5 hover:bg-gray-700 rounded-md text-white"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-gray-700 rounded-md text-white"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-700 rounded"></div><span className="text-gray-400">Busy Slot</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-700 rounded"></div><span className="text-gray-400">Holiday (no classes)</span></div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white p-1 bg-gray-800 rounded-md"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold mb-2 text-white flex items-center gap-2">
              {modalMode === 'holiday' ? <><Sun className="w-5 h-5 text-amber-400" /> Mark Holiday</> : <><Plus className="w-5 h-5 text-indigo-400" /> Add Busy Slot</>}
            </h2>
            {modalMode === 'holiday' && (
              <p className="text-sm text-amber-300/80 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mb-5">
                🗓️ On a holiday, the AI will skip all timetable class slots for that day and may schedule free study time instead.
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">
                  {modalMode === 'holiday' ? 'Holiday Name (optional)' : 'Class/Work Title'}
                </label>
                <input
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder={modalMode === 'holiday' ? 'e.g. Diwali, Christmas' : 'e.g. Math Lecture'}
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                />
              </div>
              {modalMode === 'busy' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-400 mb-1 block">Start Time</label>
                    <input type="time" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" value={manualStart} onChange={e => setManualStart(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-400 mb-1 block">End Time</label>
                    <input type="time" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" value={manualEnd} onChange={e => setManualEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <button
                onClick={handleManualSave}
                className={`w-full py-3 rounded-lg text-white font-medium mt-2 shadow-lg transition-colors ${modalMode === 'holiday' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              >
                {modalMode === 'holiday' ? '🎉 Mark as Holiday' : 'Save Busy Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Preview */}
      {previewEvents && (
        <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Confirm OCR Timetable
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {previewEvents.map((ev, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 p-3 rounded-lg">
                <p className="font-medium text-white">{ev.title}</p>
                <p className="text-sm text-gray-400">{ev.startTime} - {ev.endTime}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPreviewEvents(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-medium">Cancel</button>
            <button onClick={savePreviewEvents} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium">Confirm &amp; Save</button>
          </div>
        </div>
      )}

      {/* Calendars */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {renderMonth(month1start, month1Days)}
        {renderMonth(month2start, month2Days)}
      </div>
    </div>
  );
}
