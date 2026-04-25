import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl' }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'gradient-primary rounded-lg flex items-center justify-center',
        sizes[size].icon
      )}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" className="fill-primary-foreground/20 stroke-primary-foreground" />
          <path d="M2 17l10 5 10-5" className="stroke-primary-foreground" />
          <path d="M2 12l10 5 10-5" className="stroke-primary-foreground" />
        </svg>
      </div>
      {showText && (
        <span className={cn('font-semibold tracking-tight', sizes[size].text)}>
          InterviewAI
        </span>
      )}
    </div>
  );
}
