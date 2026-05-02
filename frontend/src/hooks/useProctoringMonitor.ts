import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface PersistedProctoringCounters {
  tabSwitchCount: number;
  focusLossCount: number;
}

const DEVTOOLS_WIDTH_THRESHOLD = 160;
const DEVTOOLS_HEIGHT_THRESHOLD = 160;

export function useProctoringMonitor({ submissionId, enabled }: UseProctoringMonitorOptions) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [focusLossCount, setFocusLossCount] = useState(0);
  const [notices, setNotices] = useState<ProctoringNotice[]>([]);
  const devtoolsReportedAtRef = useRef(0);

  const persistenceKey = useMemo(
    () => (submissionId ? `proctoring_counts_${submissionId}` : null),
    [submissionId],
  );

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
    if (!persistenceKey) {
      setTabSwitchCount(0);
      setFocusLossCount(0);
      return;
    }

    try {
      const raw = localStorage.getItem(persistenceKey);
      if (!raw) {
        setTabSwitchCount(0);
        setFocusLossCount(0);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedProctoringCounters>;
      setTabSwitchCount(Number(parsed.tabSwitchCount ?? 0));
      setFocusLossCount(Number(parsed.focusLossCount ?? 0));
    } catch {
      setTabSwitchCount(0);
      setFocusLossCount(0);
    }
  }, [persistenceKey]);

  useEffect(() => {
    if (!persistenceKey) return;
    try {
      const payload: PersistedProctoringCounters = {
        tabSwitchCount,
        focusLossCount,
      };
      localStorage.setItem(persistenceKey, JSON.stringify(payload));
    } catch {
    }
  }, [tabSwitchCount, focusLossCount, persistenceKey]);

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

  useEffect(() => {
    if (!enabled || import.meta.env.DEV) return;

    const emitDevtoolsWarning = (source: 'shortcut' | 'dock-check') => {
      const now = Date.now();
      if (now - devtoolsReportedAtRef.current < 15000) return;
      devtoolsReportedAtRef.current = now;

      reportEvent(
        'devtools_opened',
        'high',
        'Developer tools activity detected. Please close developer tools to continue the interview.',
        { source },
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const opensDevtoolsShortcut =
        key === 'f12'
        || (event.ctrlKey && event.shiftKey && (key === 'i' || key === 'j' || key === 'c'));

      if (opensDevtoolsShortcut) {
        event.preventDefault();
        emitDevtoolsWarning('shortcut');
      }
    };

    const dockCheckInterval = window.setInterval(() => {
      const widthDelta = Math.abs(window.outerWidth - window.innerWidth);
      const heightDelta = Math.abs(window.outerHeight - window.innerHeight);
      if (widthDelta > DEVTOOLS_WIDTH_THRESHOLD || heightDelta > DEVTOOLS_HEIGHT_THRESHOLD) {
        emitDevtoolsWarning('dock-check');
      }
    }, 2500);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearInterval(dockCheckInterval);
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
