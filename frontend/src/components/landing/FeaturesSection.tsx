import { motion } from 'framer-motion';
import { 
  Code2, 
  MessageSquare, 
  BarChart3, 
  Video, 
  Brain, 
  FileText,
  Shield,
  Zap
} from 'lucide-react';

const features = [
  {
    icon: Code2,
    title: 'Integrated Code Editor',
    description: 'Full-featured IDE with syntax highlighting, code execution, and test case validation for DSA problems.',
    color: 'text-blue-500'
  },
  {
    icon: MessageSquare,
    title: 'Voice & Text Interviews',
    description: 'Conduct interviews through text chat or voice with real-time speech-to-text transcription.',
    color: 'text-green-500'
  },
  {
    icon: Brain,
    title: 'AI-Powered Evaluation',
    description: 'Advanced LLM evaluation for technical accuracy, communication quality, and code structure.',
    color: 'text-purple-500'
  },
  {
    icon: BarChart3,
    title: 'Detailed Analytics',
    description: 'Track your progress with comprehensive performance metrics and skill breakdowns.',
    color: 'text-orange-500'
  },
  {
    icon: Video,
    title: 'Video Proctoring',
    description: 'Optional AI proctoring to ensure interview integrity with privacy-first approach.',
    color: 'text-pink-500'
  },
  {
    icon: FileText,
    title: 'Downloadable Reports',
    description: 'Generate detailed interview reports with scores, feedback, and improvement suggestions.',
    color: 'text-cyan-500'
  },
  {
    icon: Shield,
    title: 'Bias-Aware Assessment',
    description: 'Fair evaluation mechanisms designed to avoid bias based on accent, gender, or background.',
    color: 'text-emerald-500'
  },
  {
    icon: Zap,
    title: 'Adaptive Difficulty',
    description: 'Questions dynamically adjust based on your performance for optimal learning.',
    color: 'text-amber-500'
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to
            <span className="text-gradient"> Ace Your Interview</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform designed to simulate real interview experiences 
            with cutting-edge AI technology.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-xl bg-card border border-border/50 hover:shadow-card transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
