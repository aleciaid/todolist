import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { TodoList } from './components/TodoList';
import { SettingsModal } from './components/SettingsModal';
import { X, Settings, Upload } from 'lucide-react';
import { db } from './db/TodoDB';

function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsActive(true);
    const handleMouseUp = () => setIsActive(false);

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className={`custom-cursor ${isActive ? 'active' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) scale(${isActive ? 0.5 : 1})`,
      }}
    />
  );
}

function FloatingSquares() {
  useEffect(() => {
    const createSquare = () => {
      const squares = document.querySelector('.floating-squares');
      if (!squares) return;

      const square = document.createElement('div');
      const size = Math.random() * 50 + 10;
      const startPosition = Math.random() * window.innerWidth;
      const delay = Math.random() * 2;
      const duration = Math.random() * 8 + 12;

      square.className = 'square';
      square.style.width = `${size}px`;
      square.style.height = `${size}px`;
      square.style.left = `${startPosition}px`;
      square.style.animationDelay = `${delay}s`;
      square.style.animationDuration = `${duration}s`;

      squares.appendChild(square);

      setTimeout(() => {
        squares.removeChild(square);
      }, duration * 1000);
    };

    const interval = setInterval(createSquare, 300);
    return () => clearInterval(interval);
  }, []);

  return <div className="floating-squares" />;
}

function App() {
  const [userName, setUserName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setShowNamePrompt(false);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName);
      setShowNamePrompt(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.userName || !data.todos || !data.timerRecords) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing data
      await db.todos.where('userId').equals(data.userName).delete();
      await db.timerRecords.where('userId').equals(data.userName).delete();
      await db.activeTimer.clear();

      // Import new data
      await db.todos.bulkAdd(data.todos);
      await db.timerRecords.bulkAdd(data.timerRecords);

      // Set username and reload
      localStorage.setItem('userName', data.userName);
      window.location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please check the file format and try again.');
    }
  };

  return (
    <>
      <CustomCursor />
      <FloatingSquares />
      
      {showNamePrompt ? (
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center relative z-10">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-center mb-6">Selamat Datang!</h2>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Siapa nama Anda?
                </label>
                <input
                  type="text"
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Masukkan nama Anda"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
              >
                Mulai
              </button>
              <div className="text-center">
                <label className="text-blue-400 hover:text-blue-500 cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Import Data</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImport(file);
                    }}
                  />
                </label>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-transparent text-white p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Todo List & Timer
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowEndDayModal(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  End Day
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-8">
              <Timer userName={userName} showEndDayModal={showEndDayModal} setShowEndDayModal={setShowEndDayModal} />
              <TodoList />
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userName={userName}
      />
    </>
  );
}

export default App;