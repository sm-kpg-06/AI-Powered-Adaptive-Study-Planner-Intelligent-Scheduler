import { useState, useEffect } from 'react';
import api from '../api/client';
import { BookOpen, Plus, Trash2, ChevronDown, ChevronRight, Hash } from 'lucide-react';

const Subjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState({ title: '', difficulty: 'Medium', subjectId: '' });
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const fetchSubjects = async () => {
    const res = await api.get('/subjects');
    setSubjects(res.data);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject) return;
    await api.post('/subjects', { name: newSubject });
    setNewSubject('');
    fetchSubjects();
  };

  const addTopic = async (e: React.FormEvent, subjectId: string) => {
    e.preventDefault();
    if (!newTopic.title) return;
    await api.post('/topics', { ...newTopic, subjectId });
    setNewTopic({ title: '', difficulty: 'Medium', subjectId: '' });
    fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    await api.delete(`/subjects/${id}`);
    fetchSubjects();
  };

  const deleteTopic = async (id: string) => {
    await api.delete(`/topics/${id}`);
    fetchSubjects();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subjects & Topics</h1>
        <p className="text-slate-500 mt-1">Manage what you need to study.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <form onSubmit={addSubject} className="flex gap-4">
          <input 
            type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
            placeholder="New Subject (e.g., Mathematics, Physics)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
            <Plus className="w-5 h-5" /> Add
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {subjects.map(subject => (
          <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
            >
              <div className="flex items-center gap-3">
                {expandedSubject === subject.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">{subject.name}</h3>
                <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                  {subject.topics.length} topics
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {expandedSubject === subject.id && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <form 
                  onSubmit={(e) => addTopic(e, subject.id)}
                  className="flex flex-col sm:flex-row gap-4 mb-6"
                >
                  <input 
                    type="text" 
                    value={newTopic.subjectId === subject.id ? newTopic.title : ''} 
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value, subjectId: subject.id })}
                    placeholder="Topic title (e.g., Differential Equations)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <select 
                    value={newTopic.subjectId === subject.id ? newTopic.difficulty : 'Medium'}
                    onChange={(e) => setNewTopic({ ...newTopic, difficulty: e.target.value, subjectId: subject.id })}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm active:scale-95">
                    Add Topic
                  </button>
                </form>

                <ul className="space-y-2">
                  {subject.topics.length === 0 ? (
                     <p className="text-center text-slate-500 text-sm py-4">No topics added yet.</p>
                  ) : subject.topics.map((topic: any) => (
                    <li key={topic.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 gap-4">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-slate-400" />
                        <span className={`font-medium text-slate-800 dark:text-slate-200 ${topic.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{topic.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                          topic.difficulty === 'Hard' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                          topic.difficulty === 'Medium' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 
                          'bg-green-100 text-green-600 dark:bg-green-900/30'
                        }`}>
                          {topic.difficulty}
                        </span>
                      </div>
                      <button 
                        onClick={() => deleteTopic(topic.id)}
                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subjects;
