import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockInterviewHistory } from '@/data/mockData';
import { format } from 'date-fns';
import { ArrowRight, FileText, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  scheduled: 'bg-primary/10 text-primary',
  'in-progress': 'bg-warning/10 text-warning',
  cancelled: 'bg-destructive/10 text-destructive'
};

const typeColors: Record<string, string> = {
  dsa: 'bg-blue-500/10 text-blue-500',
  'system-design': 'bg-purple-500/10 text-purple-500',
  backend: 'bg-green-500/10 text-green-500',
  frontend: 'bg-orange-500/10 text-orange-500',
  behavioral: 'bg-pink-500/10 text-pink-500',
  devops: 'bg-cyan-500/10 text-cyan-500'
};

export function RecentInterviews() {
  const completedInterviews = mockInterviewHistory.filter(i => i.status === 'completed');

  return (
    <div className="p-6 rounded-xl bg-card border border-border/50 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Recent Interviews</h2>
        <Link to="/reports">
          <Button variant="ghost" size="sm">
            View All Reports
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
              <th className="pb-3 font-medium">Interview</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Score</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {completedInterviews.map((interview) => (
              <tr key={interview.id} className="border-b border-border/30 last:border-0">
                <td className="py-4">
                  <div>
                    <p className="font-medium">{interview.role}</p>
                    <p className="text-sm text-muted-foreground">{interview.company}</p>
                  </div>
                </td>
                <td className="py-4">
                  <Badge className={typeColors[interview.type]}>
                    {interview.type.replace('-', ' ')}
                  </Badge>
                </td>
                <td className="py-4 text-sm text-muted-foreground">
                  {format(interview.scheduledAt, 'MMM d, yyyy')}
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          interview.overallScore! >= 80 ? "bg-success" :
                          interview.overallScore! >= 60 ? "bg-warning" : "bg-destructive"
                        )}
                        style={{ width: `${interview.overallScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{interview.overallScore}%</span>
                  </div>
                </td>
                <td className="py-4">
                  <Badge className={statusColors[interview.status]}>
                    {interview.status}
                  </Badge>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/reports/${interview.id}`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
