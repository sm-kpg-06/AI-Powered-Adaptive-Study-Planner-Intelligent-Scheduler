import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('school');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { name, email, password, age, profession });
      login(res.data.token, res.data.user);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center group">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
             <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg border border-indigo-500/30">
               <Sparkles className="w-8 h-8 text-white" />
             </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Create Account</h2>
        <p className="mt-2 text-center text-sm text-gray-400">Join the next generation of study planning</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-4 shadow-2xl sm:rounded-2xl border border-gray-800/60 sm:px-10 backdrop-blur-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/50 text-red-200 rounded-lg text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-300">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-gray-950/50 border border-gray-800 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full bg-gray-950/50 border border-gray-800 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-300">Age</label>
                 <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 block w-full bg-gray-950/50 border border-gray-800 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-300">Profession</label>
                 <select value={profession} onChange={(e) => setProfession(e.target.value)} className="mt-1 block w-full bg-gray-950/50 border border-gray-800 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                    <option value="school">School Student</option>
                    <option value="college">College Student</option>
                    <option value="working">Working Professional</option>
                    <option value="other">Other</option>
                 </select>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-gray-950/50 border border-gray-800 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <button type="submit" className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-all">
              Sign Up
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-400">Already a member? </span>
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">Sign in securely</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
