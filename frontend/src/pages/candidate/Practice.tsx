import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Target, MessageCircle, Repeat, Clock, CheckCircle2, ArrowRight, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPracticeQuestions, type PracticeSkillUI, type PracticeQuestionUI } from '@/services/candidateService';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Map skill categories to template category filters for InterviewLobby
const SKILL_TO_CATEGORY: Record<string, string> = {
  'arrays': 'dsa',
  'trees': 'dsa',
  'dp': 'dsa',
  'system-design': 'system_design',
  'api-design': 'backend',
  'behavioral': 'behavioral',
  'sql': 'backend',
  'oop': 'backend',
};

const Practice = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [practiceSkills, setPracticeSkills] = useState<PracticeSkillUI[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestionUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPracticeQuestions();
        setPracticeSkills(data.skills);
        setPracticeQuestions(data.questions);
      } catch (err) {
        console.error('Failed to load practice data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalQuestions = practiceQuestions.length;
  const completedQuestions = practiceQuestions.filter((q) => q.completed).length;
  const selectedSkillData = practiceSkills.find((skill) => skill.id === selectedSkill) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const filteredQuestions = selectedSkill
    ? practiceQuestions.filter(q => q.skill === selectedSkill)
    : practiceQuestions;

  const filteredCount = filteredQuestions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <CandidateHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
            <CardHeader className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Practice mode</Badge>
                <Badge variant="outline" className="rounded-full border-border/60 text-muted-foreground">
                  {totalQuestions} questions available
                </Badge>
              </div>
              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Sharpen interview skills with low-stakes practice.
                </CardTitle>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Pick a skill area, review the question set, and jump directly into a practice interview aligned with the new design system.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/candidate/interviews')} className="gap-2">
                  Browse interviews
                </Button>
                <Button variant="outline" onClick={() => setSelectedSkill(null)} disabled={!selectedSkill}>
                  Clear filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0 sm:grid-cols-3 sm:p-8 sm:pt-0">
              <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question bank</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{totalQuestions}</div>
                <p className="mt-1 text-xs text-muted-foreground">Adaptive practice prompts across skill areas.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{completedQuestions}</div>
                <p className="mt-1 text-xs text-muted-foreground">Questions already completed in practice mode.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active filter</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{selectedSkillData?.name ?? 'All topics'}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSkillData ? `${selectedSkillData.completedCount}/${selectedSkillData.questionCount} completed` : 'Showing the full practice catalog.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Practice focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {selectedSkillData ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="text-3xl">{selectedSkillData.icon}</div>
                    <div>
                      <div className="font-medium text-foreground">{selectedSkillData.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSkillData.completedCount}/{selectedSkillData.questionCount} completed
                      </div>
                    </div>
                  </div>
                  <Progress value={(selectedSkillData.completedCount / Math.max(selectedSkillData.questionCount, 1)) * 100} className="h-2" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    Focused practice is pre-wired to the matching interview category so you can rehearse with the right topic mix.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
                    <div className="text-sm font-medium text-foreground">No skill selected</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select a topic to narrow the question list and launch a targeted practice interview.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty spread</div>
                      <div className="mt-2 text-sm text-foreground">Easy → Hard</div>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Route</div>
                      <div className="mt-2 text-sm text-foreground">Interview lobby</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mb-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Target className="h-5 w-5" />
                Select a skill area
              </h2>
              <p className="text-sm text-muted-foreground">Use the filter chips below to focus the question bank.</p>
            </div>
            <Badge variant="outline" className="hidden rounded-full border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              {filteredCount} visible
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSkill === null ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedSkill(null)}
            >
              All topics
            </Button>
            {practiceSkills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                    selectedSkill === skill.id
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                  )}
                >
                  <span>{skill.icon}</span>
                  <span>{skill.name}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', selectedSkill === skill.id ? 'bg-white/15' : 'bg-muted text-muted-foreground')}>
                    {skill.completedCount}/{skill.questionCount}
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {practiceSkills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left shadow-sm transition-all',
                    selectedSkill === skill.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="text-3xl">{skill.icon}</div>
                    <Badge variant="outline" className="rounded-full border-border/60 text-xs font-medium text-muted-foreground">
                      {skill.completedCount}/{skill.questionCount}
                    </Badge>
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">{skill.name}</h3>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span>{Math.round((skill.completedCount / Math.max(skill.questionCount, 1)) * 100)}%</span>
                  </div>
                  <Progress value={(skill.completedCount / Math.max(skill.questionCount, 1)) * 100} className="h-1.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageCircle className="h-5 w-5" />
              {selectedSkill
                ? `${selectedSkillData?.name ?? 'Selected'} questions`
                : 'All practice questions'
              }
            </h2>
            <p className="text-sm text-muted-foreground">{filteredCount} question{filteredCount === 1 ? '' : 's'} shown</p>
          </div>

          {filteredQuestions.length === 0 ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="rounded-full bg-muted p-3 text-2xl">🧭</div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">No questions in this filter</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Try another skill area or clear the filter to see the full question bank.</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedSkill(null)}>Show all topics</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {q.completed && <CheckCircle2 className="h-4 w-4 text-success" />}
                            <Badge
                              variant={
                                q.difficulty === 'easy' ? 'default' :
                                q.difficulty === 'medium' ? 'secondary' : 'destructive'
                              }
                              className={cn(
                                'text-xs capitalize',
                                q.difficulty === 'easy' && 'bg-success/10 text-success hover:bg-success/10',
                                q.difficulty === 'medium' && 'bg-warning/10 text-warning hover:bg-warning/10',
                                q.difficulty === 'hard' && 'bg-destructive/10 text-destructive hover:bg-destructive/10'
                              )}
                            >
                              {q.difficulty}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {q.estimatedTime} min
                            </span>
                          </div>
                          <h3 className={cn('text-sm font-medium leading-6 text-foreground sm:text-[15px]', q.completed && 'text-muted-foreground')}>
                            {q.question}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {q.completed ? 'Completed once — retry to build speed and confidence.' : 'New question ready for practice.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-start md:justify-end">
                          <Button
                            size="sm"
                            variant={q.completed ? 'outline' : 'default'}
                            className="gap-1"
                            onClick={() => {
                              const category = SKILL_TO_CATEGORY[q.skill] || 'dsa';
                              navigate(`/interview/lobby?category=${category}`);
                            }}
                          >
                            {q.completed ? (
                              <><Repeat className="h-3 w-3" />Retry</>
                            ) : (
                              <>Start <ArrowRight className="h-3 w-3" /></>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Practice;
