export type InterviewAvatarGender = 'male' | 'female';
export type InterviewVoiceType = InterviewAvatarGender | 'neutral';

export interface InterviewAvatarRecord {
  id: string;
  name: string;
  gender: InterviewAvatarGender;
  modelPath: string;
  imagePath: string;
}

export interface InterviewCustomization {
  avatarId: string;
  avatarGender: InterviewAvatarGender;
  avatarName: string;
  avatarModelPath: string;
  avatarImagePath: string;
  voiceType: InterviewVoiceType;
  voiceName: string | null;
  wordsPerMinute: number;
}

export const INTERVIEW_AVATAR_CATALOG: InterviewAvatarRecord[] = [
  {
    id: 'maya',
    name: 'Maya',
    gender: 'female',
    modelPath: '/models/maya.glb',
    imagePath: '/interview-avatars/maya.png',
  },
  {
    id: 'rahul',
    name: 'Rahul',
    gender: 'male',
    modelPath: '/models/rahul.glb',
    imagePath: '/interview-avatars/rahul.png',
  },
];

export const DEFAULT_INTERVIEW_CUSTOMIZATION: InterviewCustomization = {
  avatarId: INTERVIEW_AVATAR_CATALOG[0].id,
  avatarGender: INTERVIEW_AVATAR_CATALOG[0].gender,
  avatarName: INTERVIEW_AVATAR_CATALOG[0].name,
  avatarModelPath: INTERVIEW_AVATAR_CATALOG[0].modelPath,
  avatarImagePath: INTERVIEW_AVATAR_CATALOG[0].imagePath,
  voiceType: 'female',
  voiceName: null,
  wordsPerMinute: 160,
};

export const resolveAvatarCustomization = (avatarId: string): InterviewAvatarRecord => {
  return INTERVIEW_AVATAR_CATALOG.find((avatar) => avatar.id === avatarId) ?? INTERVIEW_AVATAR_CATALOG[0];
};

export const interviewCustomizationStorageKey = (submissionId: number) =>
  `interview_customization_${submissionId}`;

export const draftInterviewCustomizationStorageKey = 'interview_customization_draft';
