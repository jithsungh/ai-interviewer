import { useCallback, useEffect, useMemo, useState } from 'react';
import { ingestProctoringEvent } from '@/services/candidateService';

export type IntegrityLevel = 'good' | 'warning' | 'critical';

export interface ProctoringNotice {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: string;
}

interface UseProctoringMonitorOptions {
  submissionId: number | null;
  enabled: boolean;
}

export function useProctoringMonitor({ submissionId, enabled }: UseProctoringMonitorOptions) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [focusLossCount, setFocusLossCount] = useState(0);
  const [notices, setNotices] = useState<ProctoringNotice[]>([]);

  const reportEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high',
    message: string,
    metadata?: Record<string, unknown>,
  ) => {
    const notice: ProctoringNotice = {
      id: `${eventType}-${Date.now()}`,
      eventType,
      severity,
      message,
      createdAt: new Date().toISOString(),
    };

    setNotices((prev) => [notice, ...prev].slice(0, 5));

    if (!enabled || !submissionId) {
      return;
    }

    try {
      await ingestProctoringEvent({
        submission_id: submissionId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        metadata: {
          severity,
          message,
          ...metadata,
        },
      });
    } catch (error) {
      console.warn('Failed to ingest proctoring event:', error);
    }
  }, [enabled, submissionId]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        reportEvent(
          'tab_switch',
          'medium',
          'Tab switch detected. Keep this interview tab active to avoid integrity warnings.',
          { hidden: true },
        );
      }
    };

    const handleWindowBlur = () => {
      setFocusLossCount((prev) => prev + 1);
      reportEvent(
        'window_switch',
        'low',
        'Focus moved away from the interview window.',
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, reportEvent]);

  const integrityLevel = useMemo<IntegrityLevel>(() => {
    const totalSignals = tabSwitchCount + focusLossCount;
    if (totalSignals >= 4) return 'critical';
    if (totalSignals >= 1) return 'warning';
    return 'good';
  }, [tabSwitchCount, focusLossCount]);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  return {
    integrityLevel,
    notices,
    tabSwitchCount,
    focusLossCount,
    dismissNotice,
    reportEvent,
  };
}
