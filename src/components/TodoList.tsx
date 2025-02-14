import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/TodoDB';
import { format, isEqual, startOfDay } from 'date-fns';
import { Plus, Check, Trash2, Search, ListFilter, GripVertical, Calendar, Edit2, X, Play, StopCircle } from 'lucide-react';
import { clsx } from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItemProps {
  todo: any;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  updateTodo: (id: number, title: string) => void;
  isAnyTimerRunning: boolean;
}

function SortableTodoItem({ todo, toggleTodo, deleteTodo, updateTodo, isAnyTimerRunning }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.title);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [time, setTime] = useState(0);
  const userId = localStorage.getItem('userName') || '';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editValue.trim() && todo.id) {
      updateTodo(todo.id, editValue.trim());
      setIsEditing(false);
    }
  };

  // Check if this todo has an active timer
  const activeTimer = useLiveQuery(
    () => db.activeTimer
      .where('todoId')
      .equals(todo.id || 0)
      .first()
  );

  useEffect(() => {
    if (activeTimer) {
      setIsTimerRunning(true);
      const elapsedTime = Math.floor((Date.now() - activeTimer.startTime) / 1000);
      setTime(elapsedTime);
    }
  }, [activeTimer]);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (activeTimer) {
          const elapsedTime = Math.floor((Date.now() - activeTimer.startTime) / 1000);
          setTime(elapsedTime);
          // Update the active timer in the database
          db.activeTimer.update(activeTimer.id!, {
            time: elapsedTime
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTimer]);

  const startTimer = async () => {
    if (!isAnyTimerRunning && !todo.completed && todo.id) {
      const startTime = Date.now();
      await db.activeTimer.add({
        time: 0,
        todoTitle: todo.title,
        startTime,
        todoId: todo.id,
        userId
      });
      setIsTimerRunning(true);
    }
  };

  const stopTimer = async () => {
    if (activeTimer && todo.id) {
      const elapsedTime = Math.floor((Date.now() - activeTimer.startTime) / 1000);
      await db.timerRecords.add({
        duration: elapsedTime,
        createdAt: new Date(),
        userId,
        todoId: todo.id,
        todoTitle: todo.title
      });
      await db.activeTimer.delete(activeTimer.id!);
      setTime(0);
      setIsTimerRunning(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-3 bg-gray-800 p-4 rounded-lg transition-all hover:bg-gray-750",
        todo.completed && "opacity-60"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <button
        onClick={() => todo.id && toggleTodo(todo.id)}
        className={clsx(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          todo.completed ? "border-green-500 bg-green-500" : "border-gray-400"
        )}
      >
        {todo.completed && <Check className="w-4 h-4 text-white" />}
      </button>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
            onBlur={handleSubmit}
          />
        </form>
      ) : (
        <>
          <span className={clsx(
            "flex-1 text-white",
            todo.completed && "line-through"
          )}>
            {todo.title}
            {todo.dueDate && (
              <span className="ml-2 text-sm text-gray-400">
                ({format(todo.dueDate, 'MMM d, yyyy')})
              </span>
            )}
            {isTimerRunning && (
              <span className="ml-2 text-sm text-blue-400 font-mono">
                {formatTime(time)}
              </span>
            )}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </>
      )}

      {!todo.completed && (
        isTimerRunning ? (
          <button
            onClick={stopTimer}
            className="text-yellow-500 hover:text-yellow-600 transition-colors"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={startTimer}
            className={clsx(
              "text-blue-400 transition-colors",
              isAnyTimerRunning 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:text-blue-500"
            )}
            disabled={isAnyTimerRunning}
          >
            <Play className="w-5 h-5" />
          </button>
        )
      )}

      <button
        onClick={async () => {
          if (todo.id) {
            // Delete associated timer records first
            await db.timerRecords
              .where('todoId')
              .equals(todo.id)
              .delete();
            // Then delete the todo
            await deleteTodo(todo.id);
          }
        }}
        className="text-red-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export function TodoList() {
  const [newTodo, setNewTodo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'active'>('all');
  const [dueDate, setDueDate] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  
  const userId = localStorage.getItem('userName') || '';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if any timer is currently running
  const activeTimer = useLiveQuery(
    () => db.activeTimer.toArray(),
    []
  );
  const isAnyTimerRunning = activeTimer && activeTimer.length > 0;

  const todos = useLiveQuery(
    async () => {
      let collection = await db.todos
        .where('userId')
        .equals(userId)
        .toArray();
      
      // Sort by order
      collection = collection.sort((a, b) => a.order - b.order);
      
      // Filter based on activeTab
      if (activeTab === 'completed') {
        collection = collection.filter(todo => todo.completed);
      } else if (activeTab === 'active') {
        collection = collection.filter(todo => !todo.completed);
      }

      // Filter based on search query
      collection = collection.filter(todo => 
        todo.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Filter based on selected date
      if (filterDate) {
        const selectedDate = startOfDay(new Date(filterDate));
        collection = collection.filter(todo => {
          const todoDate = todo.dueDate 
            ? startOfDay(new Date(todo.dueDate))
            : startOfDay(new Date(todo.createdAt));
          return isEqual(todoDate, selectedDate);
        });
      }

      return collection;
    },
    [searchQuery, activeTab, userId, filterDate]
  );

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const maxOrder = await db.todos.where('userId').equals(userId).reverse().first();
    const nextOrder = maxOrder ? maxOrder.order + 1 : 0;

    await db.todos.add({
      title: newTodo.trim(),
      completed: false,
      createdAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      order: nextOrder,
      userId
    });
    setNewTodo('');
    setDueDate('');
  };

  const toggleTodo = async (id: number) => {
    const todo = await db.todos.get(id);
    if (todo) {
      await db.todos.update(id, { completed: !todo.completed });
    }
  };

  const updateTodo = async (id: number, title: string) => {
    await db.todos.update(id, { title });
  };

  const deleteTodo = async (id: number) => {
    await db.todos.delete(id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = todos?.findIndex(t => t.id === active.id);
      const newIndex = todos?.findIndex(t => t.id === over.id);
      
      if (oldIndex !== undefined && newIndex !== undefined && todos) {
        const newTodos = arrayMove(todos, oldIndex, newIndex);
        
        // Update orders in database
        await Promise.all(
          newTodos.map((todo, index) => 
            db.todos.update(todo.id!, { order: index })
          )
        );
      }
    }
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = todos ? Math.ceil(todos.length / ITEMS_PER_PAGE) : 0;
  const paginatedTodos = todos?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const groupedTodos = paginatedTodos?.reduce((groups, todo) => {
    const date = todo.dueDate 
      ? format(todo.dueDate, 'yyyy-MM-dd')
      : format(todo.createdAt, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(todo);
    return groups;
  }, {} as Record<string, typeof paginatedTodos>);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-2xl">
      <form onSubmit={addTodo} className="mb-6 space-y-4">
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
        <div className="flex gap-2 items-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
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

        <div className="flex gap-2 items-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {groupedTodos && Object.entries(groupedTodos).map(([date, todosForDate]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <ListFilter className="w-5 h-5" />
                {format(new Date(date), 'MMMM d, yyyy')}
              </h3>
              <SortableContext
                items={todosForDate?.map(t => t.id!) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {todosForDate?.map((todo) => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      toggleTodo={toggleTodo}
                      deleteTodo={deleteTodo}
                      updateTodo={updateTodo}
                      isAnyTimerRunning={isAnyTimerRunning}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
          {(!groupedTodos || Object.keys(groupedTodos).length === 0) && (
            <p className="text-gray-500 text-center py-4">No todos found</p>
          )}
        </div>
      </DndContext>

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