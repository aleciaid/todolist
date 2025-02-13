import Dexie, { Table } from 'dexie';

export interface Todo {
  id?: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  dueDate?: Date;
  order: number;
  userId: string;
}

export interface TimerRecord {
  id?: number;
  duration: number;
  createdAt: Date;
  userId: string;
  todoId?: number;
  todoTitle?: string;
}

export interface ActiveTimer {
  id?: number;
  time: number;
  todoTitle: string;
}

export class TodoDB extends Dexie {
  todos!: Table<Todo>;
  timerRecords!: Table<TimerRecord>;
  activeTimer!: Table<ActiveTimer>;

  constructor() {
    super('TodoDB');
    this.version(5).stores({
      todos: '++id, title, completed, createdAt, dueDate, order, userId',
      timerRecords: '++id, duration, createdAt, userId, todoId, todoTitle',
      activeTimer: '++id, time, todoTitle'
    });
  }
}

export const db = new TodoDB();