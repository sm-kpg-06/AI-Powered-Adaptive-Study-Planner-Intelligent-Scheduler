import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Clock, Calendar, CheckCircle } from 'lucide-react';

export default function Onboarding() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    wakeTime: '07:00',
    sleepTime: '23:00',
    isWeekendDifferent: false,
    weekendWakeTime: '09:00',
    weekendSleepTime: '23:59',
    breakfastTime: '08:00',
    lunchTime: '13:00',
    dinnerTime: '19:00'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleComplete = async () => {
    try {
      await api.put('/routine', formData);
      const res = await api.post('/auth/onboarding/complete');
      const token = localStorage.getItem('token');
      if (token && res.data.user) {
         login(token, res.data.user);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-8 space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome to AI Planner, {user?.name?.split(' ')[0]}!</h2>
          <p className="text-gray-400">Let's set up your ultimate intelligent routine.</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl text-blue-400 flex items-center gap-2"><Clock /> Base Sleep Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Wake up time</label>
                  <input type="time" name="wakeTime" value={formData.wakeTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bedtime</label>
                  <input type="time" name="sleepTime" value={formData.sleepTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
               </div>
            </div>
            
            <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
               <input type="checkbox" name="isWeekendDifferent" checked={formData.isWeekendDifferent} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-500" />
               <span>My schedule is different on weekends</span>
            </label>

            {formData.isWeekendDifferent && (
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-yellow-500 mb-1">Weekend Wake up</label>
                    <input type="time" name="weekendWakeTime" value={formData.weekendWakeTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-yellow-500 mb-1">Weekend Bedtime</label>
                    <input type="time" name="weekendSleepTime" value={formData.weekendSleepTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
                 </div>
              </div>
            )}
            
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">Next: Meal Times</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
             <h3 className="text-xl text-emerald-400 flex items-center gap-2"><Calendar /> Daily Blocks (Meals)</h3>
             <p className="text-sm text-gray-400">The AI will never schedule tasks during these times.</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1">Breakfast</label>
                   <input type="time" name="breakfastTime" value={formData.breakfastTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1">Lunch</label>
                   <input type="time" name="lunchTime" value={formData.lunchTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1">Dinner</label>
                   <input type="time" name="dinnerTime" value={formData.dinnerTime} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white" />
                </div>
             </div>
             
             <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="w-1/3 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors">Back</button>
                <button onClick={handleComplete} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 font-medium py-3 rounded-lg transition-colors">
                  <CheckCircle className="w-5 h-5" /> Complete Setup
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
