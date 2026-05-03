import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function ContentBreadcrumb({ current }: { current: string }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 mb-4 text-sm"
    >
      <button
        onClick={() => navigate("/content")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Content Management
      </button>
      <span className="text-muted-foreground">/</span>
      <span className="text-foreground font-medium">{current}</span>
    </motion.div>
  );
}
