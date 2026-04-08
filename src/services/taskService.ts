import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface Task {
  id?: string;
  title: string;
  deadline: Date | null;
  priority: 'low' | 'medium' | 'high' | 'unassigned';
  category: 'work' | 'personal' | 'study' | 'other';
  status: 'pending' | 'completed';
  userId: string;
  createdAt: Date;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const addTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const path = 'tasks';
  try {
    const newTask = {
      ...taskData,
      userId: auth.currentUser.uid,
      createdAt: Timestamp.now(),
      deadline: taskData.deadline ? Timestamp.fromDate(taskData.deadline) : null,
    };
    const docRef = await addDoc(collection(db, path), newTask);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => {
  const path = `tasks/${taskId}`;
  try {
    const updateData: any = { ...updates };
    if (updates.deadline !== undefined) {
      updateData.deadline = updates.deadline ? Timestamp.fromDate(updates.deadline) : null;
    }
    await updateDoc(doc(db, 'tasks', taskId), updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteTask = async (taskId: string) => {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  if (!auth.currentUser) return () => {};
  
  const path = 'tasks';
  const q = query(collection(db, path), where("userId", "==", auth.currentUser.uid));
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        deadline: data.deadline?.toDate() || null,
      } as Task;
    });
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
