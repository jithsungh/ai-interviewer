import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const itemVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function PageWrapper({ children, title, description }: PageWrapperProps) {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={itemVariant} className="page-header">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </motion.div>
      {children}
    </motion.div>
  );
}
