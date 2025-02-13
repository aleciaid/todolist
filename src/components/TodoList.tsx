import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/TodoDB';
import { format } from 'date-fns';
import { Plus, Check, Trash2, Search, ListFilter } from 'lucide-react';
import { clsx } from 'clsx';

const ITEMS_PER_PAGE = 10;

export function TodoList() {
  const [newTodo, setNewTodo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'active'>('all');

  const todos = useLiveQuery(async () => {
    let collection = db.todos.orderBy('createdAt').reverse();
    
    if (activeTab === 'completed') {
      collection = collection.filter(todo => todo.completed);
    } else if (activeTab === 'active') {
      collection = collection.filter(todo => !todo.completed);
    }

    const allTodos = await collection.toArray();
    return allTodos.filter(todo => 
      todo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    await db.todos.add({
      title: newTodo.trim(),
      completed: false,
      createdAt: new Date()
    });
    setNewTodo('');
  };

  const toggleTodo = async (id: number) => {
    const todo = await db.todos.get(id);
    if (todo) {
      await db.todos.update(id, { completed: !todo.completed });
    }
  };

  const deleteTodo = async (id: number) => {
    await db.todos.delete(id);
  };

  const totalPages = todos ? Math.ceil(todos.length / ITEMS_PER_PAGE) : 0;
  const paginatedTodos = todos?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const groupedTodos = paginatedTodos?.reduce((groups, todo) => {
    const date = format(todo.createdAt, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(todo);
    return groups;
  }, {} as Record<string, typeof paginatedTodos>);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-2xl">
      <form onSubmit={addTodo} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add new todo..."
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>
      </form>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos..."
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                "px-4 py-1 rounded-md transition-colors",
                activeTab === 'all' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={clsx(
                "px-4 py-1 rounded-md transition-colors",
                activeTab === 'active' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={clsx(
                "px-4 py-1 rounded-md transition-colors",
                activeTab === 'completed' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {groupedTodos && Object.entries(groupedTodos).map(([date, todosForDate]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <ListFilter className="w-5 h-5" />
              {format(new Date(date), 'MMMM d, yyyy')}
            </h3>
            <div className="space-y-2">
              {todosForDate?.map((todo) => (
                <div
                  key={todo.id}
                  className={clsx(
                    "flex items-center gap-3 bg-gray-800 p-4 rounded-lg transition-all hover:bg-gray-750",
                    todo.completed && "opacity-60"
                  )}
                >
                  <button
                    onClick={() => todo.id && toggleTodo(todo.id)}
                    className={clsx(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      todo.completed ? "border-green-500 bg-green-500" : "border-gray-400"
                    )}
                  >
                    {todo.completed && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span className={clsx(
                    "flex-1 text-white",
                    todo.completed && "line-through"
                  )}>
                    {todo.title}
                  </span>
                  <button
                    onClick={() => todo.id && deleteTodo(todo.id)}
                    className="text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              )}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}