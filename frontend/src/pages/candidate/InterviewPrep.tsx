import { useEffect, useMemo, useRef, useState } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Bookmark,
  CheckCircle2,
  Layers3,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trophy,
  LibraryBig,
  Target,
} from 'lucide-react';
import {
  generatePracticeFlashcards,
  getActivePracticeFlashcardDeck,
  getPracticeFlashcardDeck,
  getPracticeFlashcardDeckHistory,
  getPracticeQuestions,
  updatePracticeFlashcardDeckProgress,
  type PracticeQuestionUI,
  type PracticeSkillUI,
} from '@/services/candidateService';
import type {
  APIPracticeFlashcardDeckResponse,
  APIPracticeFlashcardDTO,
  APIPracticeFlashcardDeckSummaryDTO,
} from '@/types/api';
import { format } from 'date-fns';

const INDUSTRIES = [
  'Artificial Intelligence & ML',
  'FinTech',
  'HealthTech',
  'Cybersecurity',
  'EdTech',
  'Product Management',
  'E-commerce & Retail',
  'SaaS & Cloud',
  'Data & Analytics',
  'Telecommunications',
  'Automotive & Mobility',
  'Gaming & Entertainment',
  'Media & Advertising',
  'Logistics & Supply Chain',
  'Manufacturing & Industry 4.0',
  'Energy & Utilities',
  'Travel & Hospitality',
  'Government & Public Sector',
  'Banking & Insurance',
  'Biotech & Pharma',
];
const QUESTION_TYPES = ['technical', 'behavioral', 'situational', 'coding'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DEFAULT_ROLE = 'Software Engineer';
const DEFAULT_INDUSTRY = 'FinTech';
const DEFAULT_QUESTION_TYPE = 'technical';
const DEFAULT_DIFFICULTY = 'medium';
const DEFAULT_COUNT = 12;
const DECK_HISTORY_PAGE_SIZE = 5;
const QUESTION_LIBRARY_PAGE_SIZE = 10;
const QUESTION_LIBRARY_FILTERS = ['all', ...QUESTION_TYPES] as const;

type DeckState = {
  deck: APIPracticeFlashcardDeckResponse | null;
  cardIndex: number;
  mastered: number[];
  bookmarked: number[];
  flipped: boolean;
};

function DeckCard({ card, flipped }: { card: APIPracticeFlashcardDTO; flipped: boolean }) {
  return (
    <div className={cn('flashcard-flip', flipped && 'flipped')} style={{ width: '100%', height: 340 }}>
      <div className="flashcard-inner" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
          className="flashcard-front"
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 28px rgba(9,17,31,0.08)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Badge className="rounded-full px-3 py-1" style={{ background: 'rgba(201,168,76,0.12)', color: '#8A6A17', border: 'none' }}>
              {card.topic}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1" style={{ borderColor: '#E5E7EB', color: '#475569' }}>
              {card.difficulty}
            </Badge>
          </div>
          <div>
            <div
              style={{
                color: '#9CA3AF',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Question
            </div>
            <h3 style={{ color: '#09111F', fontSize: '1.1rem', lineHeight: 1.45, margin: 0, fontWeight: 700 }}>
              {card.question}
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#6B7280', fontSize: '0.72rem' }}>Tap to flip for answer</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#09111F', fontWeight: 900, fontSize: '0.72rem' }}>
              <BookOpenText size={16} /> Study card
            </div>
          </div>
        </div>
        <div
          className="flashcard-back"
          style={{
            background: '#09111F',
            borderRadius: 16,
            boxShadow: '0 10px 28px rgba(9,17,31,0.14)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Badge className="rounded-full px-3 py-1" style={{ background: 'rgba(201,168,76,0.18)', color: '#F8E7B8', border: 'none' }}>
              {card.topic}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1" style={{ borderColor: 'rgba(255,255,255,0.16)', color: '#D1D5DB' }}>
              AI-backed
            </Badge>
          </div>
          <div>
            <div
              style={{
                color: '#9CA3AF',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Answer
            </div>
            <p style={{ color: '#F9FAFB', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>{card.answer}</p>
          </div>
          <div style={{ color: '#D1D5DB', fontSize: '0.78rem' }}>
            {card.hint ? `Hint: ${card.hint}` : 'Use the question bank to reinforce this concept.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const fillColor = value >= 100 ? '#16A34A' : '#C9A84C';
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${value}%`, background: fillColor }} />
    </div>
  );
}

function formatDeckTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy · h:mm a');
}

export default function InterviewPrep() {
  const [skills, setSkills] = useState<PracticeSkillUI[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestionUI[]>([]);
  const [savedDecks, setSavedDecks] = useState<APIPracticeFlashcardDeckSummaryDTO[]>([]);
  const [activeDeck, setActiveDeck] = useState<APIPracticeFlashcardDeckResponse | null>(null);
  const [deckState, setDeckState] = useState<DeckState>({
    deck: null,
    cardIndex: 0,
    mastered: [],
    bookmarked: [],
    flipped: false,
  });
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(DEFAULT_ROLE);
  const [selectedIndustry, setSelectedIndustry] = useState(DEFAULT_INDUSTRY);
  const [selectedQuestionType, setSelectedQuestionType] = useState(DEFAULT_QUESTION_TYPE);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [cardCount, setCardCount] = useState(DEFAULT_COUNT);
  const [vaultQuery, setVaultQuery] = useState('');
  const [deckHistoryPage, setDeckHistoryPage] = useState(1);
  const [questionLibraryPage, setQuestionLibraryPage] = useState(1);
  const [libraryQuestionType, setLibraryQuestionType] = useState<(typeof QUESTION_LIBRARY_FILTERS)[number]>('all');
  const studyDeckRef = useRef<HTMLDivElement | null>(null);

  const currentDeck = deckState.deck ?? activeDeck;
  const currentCards = currentDeck?.flashcards ?? [];
  const currentCard = currentCards[deckState.cardIndex] ?? currentCards[currentDeck?.current_card_index ?? 0];
  const masteredSet = useMemo(() => new Set(deckState.mastered), [deckState.mastered]);
  const bookmarkedSet = useMemo(() => new Set(deckState.bookmarked), [deckState.bookmarked]);
  const progressPercent = currentDeck
    ? Math.min(100, Math.max(0, Math.round((deckState.mastered.length / Math.max(currentDeck.card_count, 1)) * 100)))
    : 0;

  const loadPageData = async () => {
    setLoadingPage(true);
    setError(null);
    try {
      const [practiceData, active, history] = await Promise.all([
        getPracticeQuestions({ page: 1, per_page: 24 }),
        getActivePracticeFlashcardDeck(),
        getPracticeFlashcardDeckHistory({ page: 1, per_page: 12 }),
      ]);

      setSkills(practiceData.skills);
      setQuestions(practiceData.questions);
      setActiveDeck(active);
      setSavedDecks(history.data);

      if (active) {
        setDeckState({
          deck: active,
          cardIndex: active.current_card_index || 0,
          mastered: active.mastered_indices || [],
          bookmarked: active.bookmarked_indices || [],
          flipped: false,
        });
        setSelectedRole(active.role);
        setSelectedIndustry(active.industry);
        setSelectedQuestionType(active.question_type || DEFAULT_QUESTION_TYPE);
        setSelectedDifficulty(active.difficulty || DEFAULT_DIFFICULTY);
        setCardCount(active.card_count || DEFAULT_COUNT);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load interview prep data right now. Please try again.');
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const persistDeckProgress = async (nextCardIndex: number, nextMastered: number[], nextBookmarked: number[]) => {
    if (!currentDeck) return;
    try {
      const updated = await updatePracticeFlashcardDeckProgress(currentDeck.deck_id, {
        current_card_index: nextCardIndex,
        mastered_indices: nextMastered,
        bookmarked_indices: nextBookmarked,
      });
      setActiveDeck(updated);
      setDeckState({
        deck: updated,
        cardIndex: updated.current_card_index,
        mastered: updated.mastered_indices || [],
        bookmarked: updated.bookmarked_indices || [],
        flipped: false,
      });
      setSavedDecks((prev) => {
        const next = prev
          .filter((item) => item.deck_id !== updated.deck_id)
          .map((item) => ({ ...item, is_active: false }));
        const summary: APIPracticeFlashcardDeckSummaryDTO = {
          deck_id: updated.deck_id,
          role: updated.role,
          industry: updated.industry,
          question_type: updated.question_type,
          difficulty: updated.difficulty,
          card_count: updated.card_count,
          current_card_index: updated.current_card_index,
          progress_percent: updated.progress_percent,
          is_active: updated.is_active,
          generation_source: updated.generation_source,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        };
        return [{ ...summary, is_active: true }, ...next];
      });
    } catch (err) {
      console.error(err);
      setError('Could not sync deck progress. Please try again.');
    }
  };

  const openDeck = async (deckId: number) => {
    setLoadingDeck(true);
    setError(null);
    try {
      const deck = await getPracticeFlashcardDeck(deckId);
      setActiveDeck(deck);
      setDeckState({
        deck,
        cardIndex: deck.current_card_index || 0,
        mastered: deck.mastered_indices || [],
        bookmarked: deck.bookmarked_indices || [],
        flipped: false,
      });
      setSelectedRole(deck.role);
      setSelectedIndustry(deck.industry);
      setSelectedQuestionType(deck.question_type || DEFAULT_QUESTION_TYPE);
      setSelectedDifficulty(deck.difficulty || DEFAULT_DIFFICULTY);
      setCardCount(deck.card_count || DEFAULT_COUNT);

      setSavedDecks((prev) =>
        prev.map((item) => ({
          ...item,
          is_active: item.deck_id === deck.deck_id,
        })),
      );
    } catch (err) {
      console.error(err);
      setError('Could not load that saved deck.');
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingDeck(true);
    setError(null);
    try {
      const deck = await generatePracticeFlashcards({
        role: selectedRole,
        industry: selectedIndustry,
        question_type: selectedQuestionType,
        difficulty: selectedDifficulty,
        card_count: cardCount,
        use_cached: true,
      });
      setActiveDeck(deck);
      setDeckState({
        deck,
        cardIndex: 0,
        mastered: [],
        bookmarked: [],
        flipped: false,
      });
      setSavedDecks((prev) => {
        const summary: APIPracticeFlashcardDeckSummaryDTO = {
          deck_id: deck.deck_id,
          role: deck.role,
          industry: deck.industry,
          question_type: deck.question_type,
          difficulty: deck.difficulty,
          card_count: deck.card_count,
          current_card_index: deck.current_card_index,
          progress_percent: deck.progress_percent,
          is_active: deck.is_active,
          generation_source: deck.generation_source,
          created_at: deck.created_at,
          updated_at: deck.updated_at,
        };
        const next = prev
          .filter((item) => item.deck_id !== deck.deck_id)
          .map((item) => ({ ...item, is_active: false }));
        return [{ ...summary, is_active: true }, ...next];
      });
    } catch (err) {
      console.error(err);
      setError('Could not build your interview prep deck right now. Please try again.');
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentDeck) return;
    const currentIdx = deckState.cardIndex;
    const nextBookmarked = bookmarkedSet.has(currentIdx)
      ? deckState.bookmarked.filter((item) => item !== currentIdx)
      : [...deckState.bookmarked, currentIdx].sort((a, b) => a - b);
    setDeckState((prev) => ({ ...prev, bookmarked: nextBookmarked }));
    await persistDeckProgress(deckState.cardIndex, deckState.mastered, nextBookmarked);
  };

  const handleToggleMastered = async () => {
    if (!currentDeck) return;
    const currentIdx = deckState.cardIndex;
    const nextMastered = masteredSet.has(currentIdx)
      ? deckState.mastered.filter((item) => item !== currentIdx)
      : [...deckState.mastered, currentIdx].sort((a, b) => a - b);
    const nextIndex = Math.min(Math.max(currentIdx + 1, 0), Math.max(currentCards.length - 1, 0));
    setDeckState((prev) => ({
      ...prev,
      mastered: nextMastered,
      cardIndex: nextIndex,
      flipped: false,
    }));
    await persistDeckProgress(nextIndex, nextMastered, deckState.bookmarked);
  };

  const handlePrev = async () => {
    if (!currentDeck || deckState.cardIndex <= 0) return;
    const nextIndex = deckState.cardIndex - 1;
    setDeckState((prev) => ({ ...prev, cardIndex: nextIndex, flipped: false }));
    await persistDeckProgress(nextIndex, deckState.mastered, deckState.bookmarked);
  };

  const handleNext = async () => {
    if (!currentDeck || deckState.cardIndex >= currentCards.length - 1) return;
    const nextIndex = deckState.cardIndex + 1;
    setDeckState((prev) => ({ ...prev, cardIndex: nextIndex, flipped: false }));
    await persistDeckProgress(nextIndex, deckState.mastered, deckState.bookmarked);
  };

  const handleResumeStudy = () => {
    if (!currentDeck) return;
    setDeckState((prev) => ({
      ...prev,
      deck: currentDeck,
      cardIndex: currentDeck.current_card_index || 0,
      mastered: currentDeck.mastered_indices || [],
      bookmarked: currentDeck.bookmarked_indices || [],
      flipped: false,
    }));

    setTimeout(() => {
      studyDeckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleRestartDeck = async () => {
    if (!currentDeck) return;
    setLoadingDeck(true);
    setError(null);
    try {
      const updated = await updatePracticeFlashcardDeckProgress(currentDeck.deck_id, {
        current_card_index: 0,
        mastered_indices: [],
        bookmarked_indices: [],
      });

      setActiveDeck(updated);
      setDeckState({
        deck: updated,
        cardIndex: 0,
        mastered: [],
        bookmarked: [],
        flipped: false,
      });

      setSavedDecks((prev) => {
        const next = prev
          .filter((item) => item.deck_id !== updated.deck_id)
          .map((item) => ({ ...item, is_active: false }));
        const summary: APIPracticeFlashcardDeckSummaryDTO = {
          deck_id: updated.deck_id,
          role: updated.role,
          industry: updated.industry,
          question_type: updated.question_type,
          difficulty: updated.difficulty,
          card_count: updated.card_count,
          current_card_index: updated.current_card_index,
          progress_percent: updated.progress_percent,
          is_active: updated.is_active,
          generation_source: updated.generation_source,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        };
        return [{ ...summary, is_active: true }, ...next];
      });

      setTimeout(() => {
        studyDeckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err) {
      console.error(err);
      setError('Could not restart this deck right now. Please try again.');
    } finally {
      setLoadingDeck(false);
    }
  };

  const filteredSavedDecks = savedDecks.filter((deck) => {
    const q = vaultQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      deck.role.toLowerCase().includes(q) ||
      deck.industry.toLowerCase().includes(q) ||
      (deck.question_type || '').toLowerCase().includes(q)
    );
  });

  const totalDeckHistoryPages = Math.max(1, Math.ceil(filteredSavedDecks.length / DECK_HISTORY_PAGE_SIZE));
  const currentDeckHistoryPage = Math.min(deckHistoryPage, totalDeckHistoryPages);
  const pagedDeckHistory = filteredSavedDecks.slice(
    (currentDeckHistoryPage - 1) * DECK_HISTORY_PAGE_SIZE,
    currentDeckHistoryPage * DECK_HISTORY_PAGE_SIZE,
  );

  const questionTypeCounts = useMemo(() => {
    return questions.reduce<Record<string, number>>((acc, item) => {
      acc[item.questionType] = (acc[item.questionType] ?? 0) + 1;
      return acc;
    }, {});
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (libraryQuestionType === 'all') return questions;
    return questions.filter((item) => item.questionType === libraryQuestionType);
  }, [questions, libraryQuestionType]);

  const totalQuestionPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTION_LIBRARY_PAGE_SIZE));
  const currentQuestionPage = Math.min(questionLibraryPage, totalQuestionPages);
  const pagedQuestions = filteredQuestions.slice(
    (currentQuestionPage - 1) * QUESTION_LIBRARY_PAGE_SIZE,
    currentQuestionPage * QUESTION_LIBRARY_PAGE_SIZE,
  );

  useEffect(() => {
    setDeckHistoryPage(1);
  }, [vaultQuery, savedDecks.length]);

  useEffect(() => {
    setQuestionLibraryPage(1);
  }, [filteredQuestions.length, libraryQuestionType]);

  if (loadingPage) {
    return (
      <div className="new-frontend-theme interview-prep-page" style={{ minHeight: '100vh', background: 'var(--surface-low)' }}>
        <div className="prep-header-shell">
          <CandidateHeader />
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={40} style={{ color: '#C9A84C', marginBottom: 14 }} />
            <p style={{ color: '#6B7280', fontWeight: 600 }}>Loading interview prep studio...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-frontend-theme interview-prep-page" style={{ minHeight: '100vh', background: 'var(--surface-low)' }}>
      <div className="prep-header-shell">
        <CandidateHeader />
      </div>

      <div className="prep-hero" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #0F172A 100%)', color: '#fff', padding: '40px 32px 56px' }}>
        <div className="prep-hero-shell" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: 760 }}>
              <Badge style={{ background: 'rgba(201,168,76,0.18)', color: '#F8E7B8', border: 'none', marginBottom: 14 }} className="rounded-full px-3 py-1">
                AI-crafted • Personalized
              </Badge>
              <h1 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 1.08, fontWeight: 700, margin: 0 }}>
                Interview Prep <span style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>Studio</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem', lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>
                Step into an AI-guided flashcard studio designed to sharpen recall, reinforce strengths, and keep every study session focused, polished, and easy to resume.
              </p>
            </div>

            {currentDeck && (
              <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 16, minWidth: 260 }}>
                <div className="prep-active-pill prep-active-pill-dark" style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Active deck</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', marginTop: 8 }}>{currentDeck.role}</div>
                <div style={{ color: 'rgba(255,255,255,0.62)', marginTop: 6, fontSize: '0.84rem' }}>{currentDeck.industry} · {currentDeck.card_count} cards</div>
                <ProgressBar value={progressPercent} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)' }}>
                  <span>{progressPercent}% complete</span>
                  <button
                    onClick={progressPercent >= 100 ? () => void handleRestartDeck() : handleResumeStudy}
                    style={{ color: '#F8E7B8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {progressPercent >= 100 ? 'Restart deck' : 'Resume study'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <div style={{ marginTop: 20, color: '#FCA5A5', fontSize: '0.85rem', fontWeight: 700 }}>{error}</div>}
        </div>
      </div>

      <div className="prep-content-shell" style={{ maxWidth: 1280, margin: '22px auto 64px', padding: '0 32px', display: 'grid', gap: 20 }}>
        <div className="prep-split-grid" style={{ display: 'grid', gap: 20, alignItems: 'start' }}>
          <Card style={{ borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(9,17,31,0.06)' }}>
            <CardHeader>
              <CardTitle className="font-headline" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#09111F' }}>
                <Sparkles size={18} color="#C9A84C" /> Build a deck
              </CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: 18 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Role</span>
                <input
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-field-light"
                  placeholder="Software Engineer"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '0.86rem', fontWeight: 600 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Industry</span>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="form-field-light"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '0.84rem', fontWeight: 600 }}
                >
                  {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Question type</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {QUESTION_TYPES.map((item) => {
                    const isSelected = selectedQuestionType === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSelectedQuestionType(item)}
                        className={cn('prep-chip-btn', isSelected && 'prep-chip-btn-active')}
                        style={{
                          padding: '9px 8px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#09111F' : '#E5E7EB'}`,
                          background: isSelected ? '#09111F' : '#fff',
                          color: isSelected ? '#fff' : '#6B7280',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Difficulty</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {DIFFICULTIES.map((item) => {
                    const isSelected = selectedDifficulty === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSelectedDifficulty(item)}
                        className={cn('prep-chip-btn', isSelected && 'prep-chip-btn-active')}
                        style={{
                          padding: '9px 8px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#09111F' : '#E5E7EB'}`,
                          background: isSelected ? '#09111F' : '#fff',
                          color: isSelected ? '#fff' : '#6B7280',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Deck size</span>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value || DEFAULT_COUNT))}
                  className="form-field-light"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '0.84rem', fontWeight: 600 }}
                />
              </label>

              <Button onClick={handleGenerate} disabled={loadingDeck} className="w-full gap-2 prep-btn-dark" style={{ background: '#09111F', color: '#fff', fontWeight: 800 }}>
                {loadingDeck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate deck
              </Button>
              <div style={{ color: '#6B7280', fontSize: '0.78rem', lineHeight: 1.6 }}>
                AI shapes each deck around your role, industry, and difficulty so every card feels intentional, concise, and interview-ready.
              </div>
            </CardContent>
          </Card>

          <div ref={studyDeckRef}>
            <Card style={{ borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(9,17,31,0.06)' }}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <CardTitle className="font-headline" style={{ color: '#09111F', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Trophy size={18} color="#C9A84C" /> Study deck
                    </CardTitle>
                    <div style={{ color: '#6B7280', fontSize: '0.84rem', marginTop: 6 }}>
                      {currentDeck ? `${currentDeck.role} · ${currentDeck.industry}` : 'Generate or resume a deck to start studying'}
                    </div>
                  </div>
                  {currentDeck && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Badge variant="outline" className="rounded-full">{currentDeck.card_count} cards</Badge>
                      <Badge variant="outline" className="rounded-full">{currentDeck.generation_source.toUpperCase()}</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!currentDeck || currentCards.length === 0 || !currentCard ? (
                  <div style={{ border: '1px dashed #CBD5E1', borderRadius: 14, padding: 28, textAlign: 'center', color: '#64748B' }}>
                    <Layers3 size={28} style={{ margin: '0 auto 12px', color: '#C9A84C' }} />
                    Build a deck to start flipping through study cards.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 700 }}>
                        Card {deckState.cardIndex + 1} of {currentCards.length}
                      </div>
                      <div style={{ color: '#09111F', fontSize: '0.8rem', fontWeight: 900 }}>
                        Progress: {progressPercent}%
                      </div>
                    </div>
                    <ProgressBar value={progressPercent} />

                    <div onClick={() => setDeckState((prev) => ({ ...prev, flipped: !prev.flipped }))} style={{ cursor: 'pointer' }}>
                      <DeckCard card={currentCard} flipped={deckState.flipped} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button variant="outline" onClick={() => void handlePrev()} disabled={deckState.cardIndex === 0} className="gap-2 prep-btn-outline">
                          <ArrowLeft size={16} /> Prev
                        </Button>
                        <Button variant="outline" onClick={() => void handleNext()} disabled={deckState.cardIndex >= currentCards.length - 1} className="gap-2 prep-btn-outline">
                          Next <ArrowRight size={16} />
                        </Button>
                        <Button variant="outline" onClick={() => setDeckState((prev) => ({ ...prev, flipped: !prev.flipped }))} className="gap-2 prep-btn-outline">
                          <RefreshCcw size={16} /> Flip
                        </Button>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button onClick={() => void handleToggleBookmark()} variant={bookmarkedSet.has(deckState.cardIndex) ? 'secondary' : 'outline'} className="gap-2 prep-btn-outline">
                          <Bookmark size={16} /> {bookmarkedSet.has(deckState.cardIndex) ? 'Bookmarked' : 'Bookmark'}
                        </Button>
                        <Button onClick={() => void handleToggleMastered()} className="gap-2 prep-btn-dark" style={{ background: '#09111F', color: '#fff' }}>
                          <CheckCircle2 size={16} /> {masteredSet.has(deckState.cardIndex) ? 'Unmark' : 'Mark mastered'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card style={{ borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(9,17,31,0.06)' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <CardTitle className="font-headline" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#09111F' }}>
                <LibraryBig size={18} color="#C9A84C" /> Deck history
              </CardTitle>
              <input
                value={vaultQuery}
                onChange={(e) => setVaultQuery(e.target.value)}
                placeholder="Search role, industry, or type..."
                className="form-field-light prep-search-input"
                style={{ width: 280, maxWidth: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '0.84rem', fontWeight: 600 }}
              />
            </div>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: 12 }}>
            {savedDecks.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.84rem', padding: '8px 0' }}>No saved decks yet.</div>
            ) : filteredSavedDecks.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.84rem', padding: '8px 0' }}>No decks match your search.</div>
            ) : (
              <>
                {pagedDeckHistory.map((deck) => (
                  <button
                    key={deck.deck_id}
                    onClick={() => void openDeck(deck.deck_id)}
                    className="prep-history-item"
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: 14,
                      paddingRight: 74,
                      textAlign: 'left',
                      background: '#fff',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#09111F', marginBottom: 8 }}>{deck.role}</div>
                      
                      <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{deck.industry}</span>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span>Type</span>
                          <span className="prep-active-pill prep-active-pill-light" style={{ padding: '0.3px 5px', textTransform: 'capitalize' }}>
                            {deck.question_type || 'mixed'}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{deck.card_count} cards</span>
                        <span>·</span>
                        <span>Created {formatDeckTime(deck.created_at)}</span>
                        <span>·</span>
                        <span>Last read {formatDeckTime(deck.updated_at)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}><ProgressBar value={deck.progress_percent} /></div>
                        <span style={{ color: '#09111F', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{deck.progress_percent}% done</span>
                      </div>
                    </div>
                    {deck.is_active && (
                      <span className="prep-active-pill prep-active-pill-light prep-history-active-tag">
                        Active
                      </span>
                    )}
                  </button>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: '#6B7280', fontSize: '0.78rem' }}>Page {currentDeckHistoryPage} of {totalDeckHistoryPages}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button className="prep-btn-outline" variant="outline" size="sm" disabled={currentDeckHistoryPage <= 1} onClick={() => setDeckHistoryPage((prev) => Math.max(1, prev - 1))}>Prev</Button>
                    <Button className="prep-btn-outline" variant="outline" size="sm" disabled={currentDeckHistoryPage >= totalDeckHistoryPages} onClick={() => setDeckHistoryPage((prev) => Math.min(totalDeckHistoryPages, prev + 1))}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card style={{ borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(9,17,31,0.06)', display: 'none' }}>
          <CardHeader>
            <CardTitle className="font-headline" style={{ color: '#09111F', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Target size={18} color="#C9A84C" /> Question Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {skills.slice(0, 6).map((skill) => (
                  <div key={skill.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, background: '#fff' }}>
                    <div style={{ fontWeight: 800, color: '#09111F', fontSize: '0.9rem' }}>{skill.name}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.76rem', marginTop: 6 }}>{skill.completedCount}/{skill.questionCount} completed</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Question type</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {QUESTION_LIBRARY_FILTERS.map((type) => {
                    const isActive = libraryQuestionType === type;
                    const count = type === 'all' ? questions.length : (questionTypeCounts[type] ?? 0);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLibraryQuestionType(type)}
                        className={cn('prep-chip-btn', isActive && 'prep-chip-btn-active')}
                        style={{ padding: '7px 12px', fontSize: '0.72rem' }}
                      >
                        {type === 'all' ? 'All' : type} · {count}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {pagedQuestions.map((q) => (
                  <div key={q.id} className="prep-question-row" style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', background: '#fff' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <Badge style={{ background: 'rgba(201,168,76,0.12)', color: '#8A6A17', border: 'none' }}>{q.skill}</Badge>
                        <Badge variant="outline" style={{ textTransform: 'capitalize' }}>{q.questionType}</Badge>
                        <Badge variant="outline">{q.difficulty}</Badge>
                      </div>
                      <div style={{ color: '#09111F', fontWeight: 700, lineHeight: 1.6 }}>{q.question}</div>
                    </div>
                    <div className="prep-question-status" style={{ display: 'flex', alignItems: 'center', gap: 8, color: q.completed ? '#059669' : '#94A3B8', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {q.completed ? <CheckCircle2 size={15} /> : <BookOpenText size={15} />}
                      {q.completed ? 'Completed' : 'Practice'}
                    </div>
                  </div>
                ))}
                {pagedQuestions.length === 0 && (
                  <div style={{ color: '#94A3B8', fontSize: '0.84rem', padding: '8px 0' }}>
                    No questions available for this question type.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '0.78rem' }}>Page {currentQuestionPage} of {totalQuestionPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button className="prep-btn-outline" variant="outline" size="sm" disabled={currentQuestionPage <= 1} onClick={() => setQuestionLibraryPage((prev) => Math.max(1, prev - 1))}>Prev</Button>
                  <Button className="prep-btn-outline" variant="outline" size="sm" disabled={currentQuestionPage >= totalQuestionPages} onClick={() => setQuestionLibraryPage((prev) => Math.min(totalQuestionPages, prev + 1))}>Next</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div style={{ background: '#09111F', padding: '28px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>SRM AP</div>
            <div style={{ color: '#6B7280', fontSize: '0.65rem', marginTop: 4 }}>© 2026 SRM University AP. The Scholarly Atelier.</div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy Policy', 'Academic Integrity', 'Support'].map((item) => (
              <span key={item} style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loadingDeck && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,17,31,0.35)', display: 'grid', placeItems: 'center', zIndex: 80 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <Loader2 className="animate-spin" size={18} />
            <span style={{ fontWeight: 700, color: '#09111F' }}>Updating your interview prep studio...</span>
          </div>
        </div>
      )}
    </div>
  );
}
