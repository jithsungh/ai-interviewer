import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { UpcomingInterviews } from '@/components/dashboard/UpcomingInterviews';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { RecentInterviews } from '@/components/dashboard/RecentInterviews';
import { Button } from '@/components/ui/button';
import { performanceStats } from '@/data/mockData';
import { Play, Target, Trophy, Clock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Alex 👋</h1>
            <p className="text-muted-foreground">Ready to ace your next interview? Let's practice!</p>
          </div>
          <Link to="/interview/lobby">
            <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow mt-4 md:mt-0">
              <Plus className="mr-2 h-5 w-5" />
              New Interview
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Interviews"
            value={performanceStats.totalInterviews}
            subtitle="Completed sessions"
            icon={Play}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Average Score"
            value={`${performanceStats.averageScore}%`}
            subtitle="Across all interviews"
            icon={Target}
            trend={{ value: 5, isPositive: true }}
          />
          <StatsCard
            title="Best Score"
            value="92%"
            subtitle="System Design"
            icon={Trophy}
          />
          <StatsCard
            title="Practice Time"
            value="18h"
            subtitle="This month"
            icon={Clock}
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <UpcomingInterviews />
          </div>
        </div>

        {/* Recent Interviews */}
        <RecentInterviews />
      </main>
    </div>
  );
};

export default Dashboard;
