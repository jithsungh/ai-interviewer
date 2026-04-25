import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Trophy, 
  FileText, 
  RotateCcw,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const InterviewComplete = () => {
  const [showConfetti, setShowConfetti] = useState(true);
  const interviewThemeVars: CSSProperties = {
    ['--primary' as any]: '#001938',
    ['--primary-foreground' as any]: '#ffffff',
    ['--secondary' as any]: '#E9C349',
    ['--secondary-foreground' as any]: '#001938',
    ['--accent' as any]: '#7697CC',
    ['--background' as any]: '#FAFAFA',
    ['--surface' as any]: '#F5F7FA',
    ['--card' as any]: '#ffffff',
    ['--muted' as any]: '#f3f3f3',
    ['--muted-foreground' as any]: '#64748B',
    ['--border' as any]: 'rgba(0,25,56,0.10)',
    ['--ring' as any]: '#E9C349',
    ['--gradient-primary' as any]: 'linear-gradient(135deg, #E9C349 0%, #F7E6A0 100%)',
    ['--gradient-hero' as any]: 'linear-gradient(180deg, #FAFAFA 0%, rgba(233,195,73,0.08) 100%)',
    ['--gradient-card' as any]: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    ['--shadow-glow' as any]: '0 0 40px rgba(233,195,73,0.22)',
    ['--shadow-card' as any]: '0 4px 24px rgba(0,25,56,0.08)',
    ['--shadow-elevated' as any]: '0 8px 32px rgba(0,25,56,0.12)',
  };
  const location = useLocation();
  const locationState = location.state as {
    submissionId?: number;
    completionData?: { final_score?: number; total_questions_answered?: number };
    questionsCompleted?: number;
    totalQuestions?: number;
  } | null;

  const submissionId = locationState?.submissionId;
  const questionsCompleted = locationState?.completionData?.total_questions_answered ?? locationState?.questionsCompleted ?? 0;
  const totalQuestions = locationState?.totalQuestions ?? questionsCompleted;
  const finalScore = locationState?.completionData?.final_score;

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="new-frontend-theme min-h-screen bg-gradient-hero flex items-center justify-center p-4" style={interviewThemeVars}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-card rounded-2xl border border-[var(--border)] shadow-elevated p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-[rgba(233,195,73,0.18)] flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-[var(--secondary-dark)]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-2"
          >
            Interview Completed! 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-8"
          >
            Great job! Your responses are being evaluated by our AI.
          </motion.p>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">{totalQuestions || '—'}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">{finalScore != null ? `${finalScore}%` : '—'}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-success">{questionsCompleted}/{totalQuestions || '?'}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </motion.div>

          {/* Processing Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 rounded-lg bg-[rgba(233,195,73,0.10)] border border-[rgba(233,195,73,0.35)] mb-8"
          >
            <div className="flex items-center justify-center gap-2 text-[var(--primary)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-medium">AI is analyzing your performance...</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Detailed feedback will be ready in a few moments
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link to={submissionId ? `/candidate/reports/${submissionId}` : '/candidate/reports'} className="flex-1">
              <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/95 text-[var(--primary-foreground)]">
                <FileText className="mr-2 h-4 w-4" />
                View Detailed Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/candidate/practice" className="flex-1">
              <Button variant="outline" className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Practice Again
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <Link to="/candidate/dashboard">
              <Button variant="link" className="text-muted-foreground">
                Return to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewComplete;
