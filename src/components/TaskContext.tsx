import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task } from '../types';
import { subscribeToTasks } from '../lib/tasks';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
}

const TaskContext = createContext<TaskContextType>({ tasks: [], loading: true });

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
      window.dispatchEvent(new CustomEvent('tasksUpdated'));
    });
    return () => unsubscribe();
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, loading }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => useContext(TaskContext);
