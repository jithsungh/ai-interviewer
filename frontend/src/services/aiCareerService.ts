const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const DIRECT_GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

const MODEL_FAST = 'llama-3.1-8b-instant';

type ChatMessage = { role: 'user' | 'system' | 'assistant'; content: string };

async function groqChat(
  messages: ChatMessage[],
  { model = MODEL_FAST, temperature = 0.7, max_tokens = 2048 } = {},
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key missing. Set VITE_GROQ_API_KEY in frontend/.env');
  }

  const res = await fetch(DIRECT_GROQ_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function parseJSON<T>(text: string): T {
  const clean = text
    .replace(/^```(?:json)?[\s\n]*/i, '')
    .replace(/[\s\n]*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]) as T;
    }
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

export type MarketInsight = {
  role: string;
  industryTag: string;
  icon: string;
  skills: string[];
  minPackage: number;
  maxPackage: number;
  growth: number;
  trend: 'up' | 'stable' | 'down';
};

export type RoleRoadmapStep = {
  level: number;
  levelLabel: 'INTERN' | 'JUNIOR' | 'SENIOR' | 'EXECUTIVE';
  roleTitle: string;
  requiredCourses: string[];
  keyLearning: string;
  certification: string;
};

export type Flashcard = {
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  question: string;
  answer: string;
  tags: string[];
};

export async function generateMarketInsights(industry: string, seniority: string): Promise<MarketInsight[]> {
  const prompt = `You are a career market analyst. Generate 5 relevant job roles for a ${seniority}-level professional in ${industry}. Return ONLY a valid JSON array. Schema per object: {"role":"<Job Title>","industryTag":"<Industry | Sub-Sector>","icon":"<one of: smart_toy|account_balance|security|school|shopping_cart|local_hospital|sports_esports|currency_bitcoin|engineering|analytics>","skills":["<TAG1>","<TAG2>"],"minPackage":<number LPA>,"maxPackage":<number LPA>,"growth":<integer 5-30>,"trend":"<up|stable|down>"}. Make packages realistic for Indian market at ${seniority} level. Return exactly 5 objects.`;
  const raw = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.7, max_tokens: 2048 });
  return parseJSON<MarketInsight[]>(raw);
}

export async function generateRoleRoadmap(role: string, industry: string): Promise<RoleRoadmapStep[]> {
  const prompt = `You are a career progression expert. Generate a 4-level career ladder for "${role}" in ${industry}. Levels: Intern, Junior, Senior, Executive. Return ONLY a valid JSON array with exactly 4 objects. Schema: {"level":<1-4>,"levelLabel":"<INTERN|JUNIOR|SENIOR|EXECUTIVE>","roleTitle":"<Specific title at this level>","requiredCourses":["<course 1>","<course 2>","<course 3>"],"keyLearning":"<1 sentence describing mastery>","certification":"CERT: <relevant certification>"}. Make everything specific to "${role}" in ${industry}.`;
  const raw = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.6, max_tokens: 2048 });
  return parseJSON<RoleRoadmapStep[]>(raw);
}

async function generateFlashcardBatch(industry: string, role: string, count: number, batchNum: number): Promise<Flashcard[]> {
  const prompt = `You are a tech interviewer at a ${industry} company. Generate exactly ${count} interview flashcards for a ${role} role.

Return ONLY a JSON array. No markdown. Each object:
{"topic":"<topic>","difficulty":"<Easy|Medium|Hard>","question":"<specific question>","answer":"<2 sentence answer>","tags":["<2 tags>"]}

Keep answers SHORT (max 2 sentences). Batch ${batchNum} - vary the topics.`;
  const raw = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.8, max_tokens: 4096 });
  return parseJSON<Flashcard[]>(raw);
}

export async function generateFlashcards(industry: string, role: string, count = 10): Promise<Flashcard[]> {
  const allCards: Flashcard[] = [];
  let attempts = 0;

  while (allCards.length < count && attempts < 5) {
    const needed = count - allCards.length;
    const batchCount = Math.min(5, needed);
    try {
      const cards = await generateFlashcardBatch(industry, role, batchCount, attempts + 1);
      if (Array.isArray(cards)) {
        allCards.push(...cards);
      }
    } catch {
      // Continue retries
    }
    attempts += 1;
  }

  while (allCards.length < count) {
    allCards.push({
      topic: 'Bonus Question',
      difficulty: 'Medium',
      question: 'Explain a core concept in your field.',
      answer: 'Core concepts require fundamental understanding and practical application experience.',
      tags: ['General'],
    });
  }

  return allCards.slice(0, count);
}