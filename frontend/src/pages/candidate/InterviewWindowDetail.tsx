import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar, Clock, Building2, ArrowLeft, ArrowRight, Play,
  AlertCircle, CheckCircle2, Info, FileText, Shield, Loader2
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCandidateWindows, getCandidateSubmissions } from '@/services/candidateService';
import type { InterviewSubmissionWindow, InterviewSubmission } from '@/types/database';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const InterviewWindowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [window, setWindow] = useState<InterviewSubmissionWindow | null>(null);
  const [submission, setSubmission] = useState<InterviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: windows }, { data: subs }] = await Promise.all([
          getCandidateWindows(),
          getCandidateSubmissions(),
        ]);
        const found = windows.find(w => w.id === Number(id));
        setWindow(found ?? windows[0] ?? null);
        // Find a pending submission for this window
        const matchingSub = subs.find(s => s.window?.id === Number(id) && s.status === 'pending');
        setSubmission(matchingSub ?? null);
      } catch (err) {
        console.error('Failed to load window details', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading || !window) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const roleTemplate = window.role_templates?.[0];

  const instructions = [
    'Ensure you are in a quiet, well-lit environment.',
    'Have a stable internet connection throughout the interview.',
    'Keep your microphone and camera (if required) ready.',
    'Do not switch tabs or windows during the interview.',
    'The interview will have multiple sections: Self Introduction, Technical Questions, Coding Challenge, and Complexity Analysis.',
    'You will be asked to provide consent for recording before the interview begins.',
    'Once started, the interview cannot be paused or restarted.',
    'Your submission will be locked after completion and cannot be modified.',
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateHeader />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/candidate/interviews">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{window.name}</h1>
            <p className="text-sm text-muted-foreground">{window.organization?.name}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Window Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interview Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">Organization</span>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4" />{window.organization?.name}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <div className="font-medium mt-1">{roleTemplate?.role?.name || 'General'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">Window Period</span>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(window.start_time), 'MMM d')} - {format(new Date(window.end_time), 'MMM d')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">Duration</span>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      {roleTemplate?.template?.total_estimated_time_minutes || 60} minutes
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Badge variant="outline">{window.scope}</Badge>
                  <Badge variant="outline">Max {window.max_allowed_submissions} submission(s)</Badge>
                  {window.allow_resubmission && <Badge variant="secondary">Resubmission allowed</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {instructions.map((instruction, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      {instruction}
                    </motion.li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Start Interview Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-primary-foreground ml-1" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ready to Start?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Make sure you've read all instructions before beginning.
                </p>
                <Button
                  size="lg"
                  className="w-full gradient-primary text-primary-foreground shadow-glow gap-2"
                  disabled={!submission}
                  onClick={() => submission && navigate(`/interview/session?submission_id=${submission.id}`)}
                >
                  Start Interview
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  You will be asked for consent before the interview begins.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Proctoring Enabled</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This interview includes AI-based proctoring. Tab switching and suspicious activity will be monitored.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />Interview Sections
                </h4>
                <div className="space-y-2 text-xs">
                  {['Self Introduction', 'Technical Q&A', 'Coding Challenge', 'Complexity Analysis'].map((section, i) => (
                    <div key={section} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{i + 1}</span>
                      {section}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewWindowDetail;
