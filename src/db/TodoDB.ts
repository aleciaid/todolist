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
}

export class TodoDB extends Dexie {
  todos!: Table<Todo>;
  timerRecords!: Table<TimerRecord>;

  constructor() {
    super('TodoDB');
    this.version(3).stores({
      todos: '++id, title, completed, createdAt, dueDate, order, userId',
      timerRecords: '++id, duration, createdAt, userId'
    });
  }
}

export const db = new TodoDB();