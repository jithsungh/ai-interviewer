import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { itemVariant } from "./PageWrapper";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor = "text-primary" }: StatCardProps) {
  return (
    <motion.div variants={itemVariant} className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {change && (
            <p className={`text-xs mt-2 ${
              changeType === "positive" ? "text-success" :
              changeType === "negative" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-muted/50 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
