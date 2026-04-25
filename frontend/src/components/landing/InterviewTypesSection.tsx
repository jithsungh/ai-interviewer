import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { interviewTemplates } from '@/data/mockData';
import { Link } from 'react-router-dom';

const typeColors: Record<string, string> = {
  dsa: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'system-design': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  backend: 'bg-green-500/10 text-green-500 border-green-500/20',
  frontend: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  behavioral: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  devops: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
};

export function InterviewTypesSection() {
  return (
    <section id="templates" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Interview Templates for
            <span className="text-gradient"> Every Role</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose from a variety of interview types tailored to different technical roles and skill levels.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {interviewTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-6 rounded-xl bg-card border border-border/50 hover:shadow-card transition-all duration-300"
            >
              <Badge 
                variant="outline" 
                className={`mb-4 ${typeColors[template.type] || 'bg-muted'}`}
              >
                {template.type.replace('-', ' ').toUpperCase()}
              </Badge>
              
              <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{template.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{template.questionCount} questions</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {template.topics.slice(0, 3).map((topic) => (
                  <span 
                    key={topic} 
                    className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
                {template.topics.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    +{template.topics.length - 3}
                  </span>
                )}
              </div>

              <Link to="/interview/lobby">
                <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Start Interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
