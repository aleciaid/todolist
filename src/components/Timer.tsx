import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timer as TimerIcon, History, X, CheckCircle, Clock, Calendar, Download } from 'lucide-react';
import { db } from '../db/TodoDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays } from 'date-fns';
import { clsx } from 'clsx';
import * as htmlToImage from 'html-to-image';

interface TimerProps {
  userName: string;
  showEndDayModal: boolean;
  setShowEndDayModal: (show: boolean) => void;
}

export function Timer({ userName, showEndDayModal, setShowEndDayModal }: TimerProps) {
  const [activeHistoryTab, setActiveHistoryTab] = useState<'today' | 'yesterday'>('today');
  const summaryRef = useRef<HTMLDivElement>(null);

  const timerRecords = useLiveQuery(
    async () => {
      const records = await db.timerRecords
        .where('userId')
        .equals(userName)
        .toArray();
      
      // Sort records by createdAt in descending order
      return records.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    [userName]
  );

  // Subscribe to active timer from any task
  const activeTimer = useLiveQuery(
    () => db.activeTimer.toArray(),
    []
  );

  const currentTime = activeTimer?.[0]?.time || 0;
  const currentTask = activeTimer?.[0]?.todoTitle || '';

  const todaysTodos = useLiveQuery(
    () => db.todos
      .where('userId').equals(userName)
      .filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate > new Date(new Date().setHours(0, 0, 0, 0));
      })
      .toArray()
  );

  const yesterdaysTodos = useLiveQuery(
    () => db.todos
      .where('userId').equals(userName)
      .filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate > new Date(new Date().setHours(0, 0, 0, 0) - 86400000) &&
               todoDate < new Date(new Date().setHours(0, 0, 0, 0));
      })
      .toArray()
  );

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Selamat Pagi';
    if (hour >= 12 && hour < 17) return 'Selamat Siang';
    if (hour >= 17 && hour < 20) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const downloadSummary = useCallback(async () => {
    if (summaryRef.current) {
      try {
        const dataUrl = await htmlToImage.toPng(summaryRef.current);
        const link = document.createElement('a');
        link.download = `daily-summary-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error generating image:', error);
      }
    }
  }, []);

  const filterRecordsByDate = (records: any[] | undefined, date: Date) => {
    return records?.filter(record => {
      const recordDate = new Date(record.createdAt);
      return (
        recordDate.getDate() === date.getDate() &&
        recordDate.getMonth() === date.getMonth() &&
        recordDate.getFullYear() === date.getFullYear()
      );
    }) || [];
  };

  const todaysRecords = filterRecordsByDate(timerRecords, new Date());
  const yesterdaysRecords = filterRecordsByDate(timerRecords, subDays(new Date(), 1));

  const getTotalDuration = (records: any[]) => {
    return records.reduce((acc, record) => acc + record.duration, 0);
  };

  const todaysTotalDuration = getTotalDuration(todaysRecords);
  const yesterdaysTotalDuration = getTotalDuration(yesterdaysRecords);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TimerIcon className="w-8 h-8 text-blue-400 mr-2" />
              <h2 className="text-2xl font-bold text-white">Stopwatch</h2>
            </div>
            <p className="text-blue-400">{getGreeting()}, {userName}!</p>
          </div>

          <div className="text-6xl font-mono text-center mb-4 text-blue-400">
            {formatTime(currentTime)}
          </div>
          {currentTask && (
            <p className="text-center text-gray-400">
              Current Task: {currentTask}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-xl mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <History className="w-5 h-5" />
              Sessions History
            </h3>
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveHistoryTab('today')}
                className={clsx(
                  "px-4 py-1 rounded-md transition-colors",
                  activeHistoryTab === 'today' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Today
              </button>
              <button
                onClick={() => setActiveHistoryTab('yesterday')}
                className={clsx(
                  "px-4 py-1 rounded-md transition-colors",
                  activeHistoryTab === 'yesterday' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Yesterday
              </button>
            </div>
          </div>

          <div className="mb-4 bg-gray-800/50 p-3 rounded-lg">
            <p className="text-gray-400">
              Total Duration: {' '}
              <span className="text-blue-400 font-mono">
                {formatTime(activeHistoryTab === 'today' ? todaysTotalDuration : yesterdaysTotalDuration)}
              </span>
            </p>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {(activeHistoryTab === 'today' ? todaysRecords : yesterdaysRecords).map((record) => (
              <div key={record.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-gray-400">
                    {format(new Date(record.createdAt), 'HH:mm:ss')}
                  </span>
                  {record.todoTitle && (
                    <span className="text-sm text-gray-500">
                      {record.todoTitle}
                    </span>
                  )}
                </div>
                <span className="text-blue-400 font-mono">
                  {formatTime(record.duration)}
                </span>
              </div>
            ))}
            {(activeHistoryTab === 'today' ? todaysRecords : yesterdaysRecords).length === 0 && (
              <p className="text-gray-500 text-center py-4">No sessions recorded {activeHistoryTab === 'today' ? 'today' : 'yesterday'}</p>
            )}
          </div>
        </div>
      </div>

      {showEndDayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Day Summary</h2>
              <button
                onClick={() => setShowEndDayModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div ref={summaryRef} className="space-y-6 bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-blue-400 mb-2">Hai {userName}!</h3>
                <p className="text-gray-300">Terima kasih untuk hari ini</p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-400" />
                  <span className="text-white text-lg">
                    {format(new Date(), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">
                    Completed Tasks: {todaysTodos?.filter(todo => todo.completed).length || 0}/{todaysTodos?.length || 0}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <span className="text-white">
                    Total Time Today: {formatTime(todaysTotalDuration)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Today's Tasks</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {todaysTodos?.map((todo) => (
                    <div
                      key={todo.id}
                      className={clsx(
                        "flex items-center gap-3 bg-gray-800 p-3 rounded-lg",
                        todo.completed && "opacity-60"
                      )}
                    >
                      <div className={clsx(
                        "w-2 h-2 rounded-full",
                        todo.completed ? "bg-green-500" : "bg-yellow-500"
                      )} />
                      <span className={clsx(
                        "text-white",
                        todo.completed && "line-through"
                      )}>
                        {todo.title}
                      </span>
                    </div>
                  ))}
                  {(!todaysTodos || todaysTodos.length === 0) && (
                    <p className="text-gray-500 text-center py-2">No tasks for today</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={downloadSummary}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Save as Image
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('userName');
                  window.location.reload();
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
              >
                Start New Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}