import { performanceStats } from '@/data/mockData';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export function PerformanceChart() {
  const radarData = Object.entries(performanceStats.skillBreakdown).map(([skill, value]) => ({
    skill,
    value
  }));

  const trendData = performanceStats.recentScores.map((score, index) => ({
    name: `Interview ${index + 1}`,
    score
  }));

  return (
    <div className="p-6 rounded-xl bg-card border border-border/50 shadow-card">
      <h2 className="text-lg font-semibold mb-6">Performance Overview</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Skill Radar */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Skill Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="skill" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Trend */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Scores</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strong & Improvement Areas */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border/50">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Strong Areas</h3>
          <div className="flex flex-wrap gap-2">
            {performanceStats.strongAreas.map((area) => (
              <span 
                key={area}
                className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Areas to Improve</h3>
          <div className="flex flex-wrap gap-2">
            {performanceStats.improvementAreas.map((area) => (
              <span 
                key={area}
                className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
