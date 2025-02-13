import Dexie, { Table } from 'dexie';

export interface Todo {
  id?: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface TimerRecord {
  id?: number;
  duration: number;
  createdAt: Date;
}

export class TodoDB extends Dexie {
  todos!: Table<Todo>;
  timerRecords!: Table<TimerRecord>;

  constructor() {
    super('TodoDB');
    this.version(2).stores({
      todos: '++id, title, completed, createdAt',
      timerRecords: '++id, duration, createdAt'
    });
  }
}

export const db = new TodoDB();