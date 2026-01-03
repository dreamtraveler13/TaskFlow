export enum SubjectType {
  MATH = 'Math',
  LANGUAGE = 'Language',
  SCIENCE = 'Science',
  ART = 'Art',
  OTHER = 'Other'
}

export interface TaskStep {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  subject: SubjectType;
  estimatedMinutes: number;
  steps: TaskStep[];
  status: 'pending' | 'active' | 'completed';
  createdAt: number;
}

export interface AITaskResponse {
  subject: string;
  title: string;
  estimatedMinutes: number;
  steps: string[];
}

export type AppMode = 'planning' | 'focus' | 'success';