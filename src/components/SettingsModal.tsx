import React from 'react';
import { Settings, Download, Upload, Trash2, X } from 'lucide-react';
import { db } from '../db/TodoDB';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export function SettingsModal({ isOpen, onClose, userName }: SettingsModalProps) {
  if (!isOpen) return null;

  const exportData = async () => {
    try {
      const todos = await db.todos.where('userId').equals(userName).toArray();
      const timerRecords = await db.timerRecords.where('userId').equals(userName).toArray();
      
      const data = {
        todos,
        timerRecords,
        userName,
        exportDate: new Date().toISOString(),
        version: '2.5.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `todo-timer-backup-${userName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const resetData = async () => {
    if (confirm('Are you sure you want to reset all your data? This cannot be undone!')) {
      try {
        await db.todos.where('userId').equals(userName).delete();
        await db.timerRecords.where('userId').equals(userName).delete();
        await db.activeTimer.clear();
        localStorage.removeItem('userName');
        window.location.reload();
      } catch (error) {
        console.error('Reset failed:', error);
        alert('Failed to reset data. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">About</h3>
            <div className="space-y-2 text-gray-300">
              <p>Version: 2.1.0</p>
              <p>Credit by: Andi Susanto</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export Data
            </button>

            <button
              onClick={resetData}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}