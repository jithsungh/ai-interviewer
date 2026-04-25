import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, Building2 } from 'lucide-react';
import { upcomingInterviews } from '@/data/mockData';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const typeColors: Record<string, string> = {
  dsa: 'bg-blue-500/10 text-blue-500',
  'system-design': 'bg-purple-500/10 text-purple-500',
  backend: 'bg-green-500/10 text-green-500',
  frontend: 'bg-orange-500/10 text-orange-500',
  behavioral: 'bg-pink-500/10 text-pink-500',
  devops: 'bg-cyan-500/10 text-cyan-500'
};

export function UpcomingInterviews() {
  return (
    <div className="p-6 rounded-xl bg-card border border-border/50 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Upcoming Interviews</h2>
        <Link to="/interviews">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {upcomingInterviews.map((interview) => (
          <div 
            key={interview.id}
            className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{interview.role}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Building2 className="w-4 h-4" />
                  <span>{interview.company}</span>
                </div>
              </div>
              <Badge className={typeColors[interview.type]}>
                {interview.type.replace('-', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(interview.scheduledAt, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{format(interview.scheduledAt, 'h:mm a')}</span>
              </div>
              <span>•</span>
              <span>{interview.duration} min</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Link to="/interview/lobby" className="flex-1">
                <Button size="sm" className="w-full">
                  Join Interview
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                Reschedule
              </Button>
            </div>
          </div>
        ))}

        {upcomingInterviews.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming interviews</p>
            <Link to="/interviews">
              <Button variant="link" className="mt-2">
                Schedule a practice session
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
