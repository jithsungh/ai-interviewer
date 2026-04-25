export type InterviewType = 
  | 'dsa' 
  | 'system-design' 
  | 'backend' 
  | 'frontend' 
  | 'fullstack' 
  | 'devops' 
  | 'ml' 
  | 'behavioral';

export type InterviewStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionType = 'mcq' | 'coding' | 'open-ended' | 'system-design';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  difficulty: DifficultyLevel;
  topic: string;
  timeLimit: number; // in seconds
  hints?: string[];
  codeTemplate?: string;
  testCases?: TestCase[];
  expectedAnswer?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Answer {
  questionId: string;
  content: string;
  code?: string;
  language?: string;
  timeTaken: number;
  submittedAt: Date;
}

export interface Evaluation {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  technicalAccuracy: number;
  communicationQuality: number;
  codeQuality?: number;
}

export interface Interview {
  id: string;
  candidateId: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration: number; // in minutes
  role: string;
  company?: string;
  experienceLevel: string;
  questions: Question[];
  answers: Answer[];
  evaluations: Evaluation[];
  overallScore?: number;
  overallFeedback?: string;
  proctoring?: ProctoringData;
}

export interface ProctoringData {
  tabSwitchCount: number;
  faceDetectionIssues: number;
  audioAnomalies: number;
  riskScore: number;
  events: ProctoringEvent[];
}

export interface ProctoringEvent {
  type: 'tab-switch' | 'face-missing' | 'multiple-faces' | 'audio-anomaly';
  timestamp: Date;
  description: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  experienceYears: number;
  cgpa?: number;
  skills: string[];
  profileImage?: string;
}

export interface InterviewTemplate {
  id: string;
  name: string;
  type: InterviewType;
  description: string;
  duration: number;
  questionCount: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  topics: string[];
}
