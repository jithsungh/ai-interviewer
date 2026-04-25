import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Target, MessageCircle, Repeat, Clock, CheckCircle2, ArrowRight, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Practice Mode</h1>
          <p className="text-muted-foreground">Sharpen your skills with non-consequential practice sessions.</p>
        </div>

        {/* Skill Selection Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />Select a Skill Area
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {practiceSkills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    selectedSkill === skill.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border/50 hover:border-primary/30 bg-card'
                  )}
                >
                  <div className="text-2xl mb-2">{skill.icon}</div>
                  <h3 className="font-medium text-sm mb-1">{skill.name}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{skill.completedCount}/{skill.questionCount}</span>
                    <span>{Math.round((skill.completedCount / skill.questionCount) * 100)}%</span>
                  </div>
                  <Progress
                    value={(skill.completedCount / skill.questionCount) * 100}
                    className="h-1.5"
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Practice Questions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedSkill
              ? `${practiceSkills.find(s => s.id === selectedSkill)?.name} Questions`
              : 'All Practice Questions'
            }
          </h2>

          <div className="space-y-3">
            {filteredQuestions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-card transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          {q.completed && <CheckCircle2 className="h-4 w-4 text-success" />}
                          <h3 className={cn('font-medium text-sm', q.completed && 'text-muted-foreground')}>
                            {q.question}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant={
                            q.difficulty === 'easy' ? 'default' :
                            q.difficulty === 'medium' ? 'secondary' : 'destructive'
                          } className={cn(
                            'text-xs',
                            q.difficulty === 'easy' && 'bg-success/10 text-success',
                            q.difficulty === 'medium' && 'bg-warning/10 text-warning',
                            q.difficulty === 'hard' && 'bg-destructive/10 text-destructive'
                          )}>
                            {q.difficulty}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{q.estimatedTime} min
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={q.completed ? 'outline' : 'default'}
                        className="gap-1"
                        onClick={() => {
                          // Navigate to InterviewLobby with the skill category pre-selected
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
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Practice;
