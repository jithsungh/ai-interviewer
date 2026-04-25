import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Video, 
  Mic, 
  Monitor, 
  Lock, 
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface ConsentFormProps {
  onConsent: (consent: ConsentData) => void;
  onCancel: () => void;
  interviewType: string;
  duration: number;
}

export interface ConsentData {
  screenRecording: boolean;
  audioRecording: boolean;
  videoRecording: boolean;
  dataProcessing: boolean;
  termsAccepted: boolean;
  proctoringPolicyAccepted: boolean;
}

type PermissionStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'unsupported';

export const ConsentForm = ({ 
  onConsent, 
  onCancel, 
  interviewType, 
  duration 
}: ConsentFormProps) => {
  const [consent, setConsent] = useState<ConsentData>({
    screenRecording: false,
    audioRecording: false,
    videoRecording: false,
    dataProcessing: false,
    termsAccepted: false,
    proctoringPolicyAccepted: false,
  });
  const [permissions, setPermissions] = useState<Record<'camera' | 'microphone' | 'screen', PermissionStatus>>({
    camera: 'idle',
    microphone: 'idle',
    screen: 'idle',
  });
  const [permissionErrors, setPermissionErrors] = useState<Record<'camera' | 'microphone' | 'screen', string>>({
    camera: '',
    microphone: '',
    screen: '',
  });

  const hasPermissionApi = Boolean(navigator?.mediaDevices?.getUserMedia);

  const isValid = consent.screenRecording
    && consent.audioRecording
    && consent.dataProcessing
    && consent.termsAccepted
    && consent.proctoringPolicyAccepted;

  const allSelected = consent.screenRecording
    && consent.audioRecording
    && consent.videoRecording
    && consent.dataProcessing
    && consent.termsAccepted
    && consent.proctoringPolicyAccepted;

  const handleToggleAll = () => {
    const nextValue = !allSelected;
    setConsent({
      screenRecording: nextValue,
      audioRecording: nextValue,
      videoRecording: nextValue,
      dataProcessing: nextValue,
      termsAccepted: nextValue,
      proctoringPolicyAccepted: nextValue,
    });
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const ensurePermissionsAndContinue = async () => {
      const cameraReady = consent.videoRecording ? await requestCameraPermission() : true;
      const micReady = consent.audioRecording ? await requestMicrophonePermission() : true;
      const screenReady = consent.screenRecording ? await requestScreenPermission() : true;

      if (micReady && cameraReady && screenReady) {
        onConsent(consent);
      }
    };

    void ensurePermissionsAndContinue();
  };

  const updatePermissionStatus = (
    key: 'camera' | 'microphone' | 'screen',
    status: PermissionStatus,
    error = '',
  ) => {
    setPermissions((prev) => ({ ...prev, [key]: status }));
    setPermissionErrors((prev) => ({ ...prev, [key]: error }));
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!hasPermissionApi) {
      updatePermissionStatus('camera', 'unsupported', 'Camera API is unavailable in this browser.');
      return false;
    }

    updatePermissionStatus('camera', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      updatePermissionStatus('camera', 'granted');
      return true;
    } catch (error) {
      updatePermissionStatus('camera', 'denied', error instanceof Error ? error.message : 'Camera permission was denied.');
      return false;
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!hasPermissionApi) {
      updatePermissionStatus('microphone', 'unsupported', 'Microphone API is unavailable in this browser.');
      return false;
    }

    updatePermissionStatus('microphone', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      updatePermissionStatus('microphone', 'granted');
      return true;
    } catch (error) {
      updatePermissionStatus('microphone', 'denied', error instanceof Error ? error.message : 'Microphone permission was denied.');
      return false;
    }
  };

  const requestScreenPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      updatePermissionStatus('screen', 'unsupported', 'Screen-share API is unavailable in this browser.');
      return false;
    }

    updatePermissionStatus('screen', 'checking');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const [track] = stream.getVideoTracks();
      const settings = track?.getSettings?.();
      const displaySurface = settings?.displaySurface;

      if (displaySurface !== 'monitor') {
        stream.getTracks().forEach((t) => t.stop());
        updatePermissionStatus('screen', 'denied', 'Only full-screen sharing is allowed. Please choose Entire Screen.');
        return false;
      }

      stream.getTracks().forEach((track) => track.stop());
      updatePermissionStatus('screen', 'granted');
      return true;
    } catch (error) {
      updatePermissionStatus('screen', 'denied', error instanceof Error ? error.message : 'Screen-share permission was denied.');
      return false;
    }
  };

  const renderPermissionBadge = (status: PermissionStatus) => {
    if (status === 'granted') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 700 }}><CheckCircle2 className="h-4 w-4" />Ready</span>;
    }
    if (status === 'denied') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontWeight: 700 }}><XCircle className="h-4 w-4" />Denied</span>;
    }
    if (status === 'unsupported') {
      return <span style={{ color: '#92400e', fontWeight: 700 }}>Unsupported</span>;
    }
    if (status === 'checking') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontWeight: 700 }}><Loader2 className="h-4 w-4 animate-spin" />Checking</span>;
    }
    return <span style={{ color: '#64748B', fontWeight: 700 }}>Not Checked</span>;
  };

  const consentItems = [
    {
      key: 'screenRecording' as keyof ConsentData,
      icon: Monitor,
      title: 'Screen Recording',
      description: 'Share your full screen (entire display) for interview integrity and proctoring.',
      required: true
    },
    {
      key: 'audioRecording' as keyof ConsentData,
      icon: Mic,
      title: 'Audio Recording',
      description: 'Enable voice-based interaction with the AI interviewer. Required for the interview.',
      required: true
    },
    {
      key: 'videoRecording' as keyof ConsentData,
      icon: Video,
      title: 'Video Recording',
      description: 'Record video for proctoring and behavioral analysis (optional).',
      required: false
    },
    {
      key: 'dataProcessing' as keyof ConsentData,
      icon: Lock,
      title: 'Data Processing',
      description: 'Allow processing of your responses by AI for evaluation and feedback.',
      required: true
    },
    {
      key: 'termsAccepted' as keyof ConsentData,
      icon: Shield,
      title: 'Terms & Conditions',
      description: 'I agree to the interview terms, privacy policy, and fair use guidelines.',
      required: true
    },
    {
      key: 'proctoringPolicyAccepted' as keyof ConsentData,
      icon: AlertTriangle,
      title: 'Proctoring Policy Acknowledgement',
      description: 'I understand focus/tab switches, permission failures, and integrity events may be recorded for review.',
      required: true
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: 68,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: '#09111F',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '999px',
              background: 'rgba(201,168,76,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(201,168,76,0.4)',
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#C9A84C' }} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>InterviewAI</span>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          {interviewType} • {duration} minutes
        </span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: 940, width: '100%' }}
        >
          <div
            style={{
              background: '#0A1629',
              borderRadius: 20,
              padding: '36px 32px',
              marginBottom: 24,
              boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '999px',
                  background: 'rgba(201,168,76,0.14)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield className="w-7 h-7" style={{ color: '#C9A84C' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', color: '#C9A84C', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Pre-Interview Consent
                </p>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Before We Begin</h1>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 640 }}>
              Please review and accept the following permissions to start your interview.
            </p>
          </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              padding: 28,
              marginBottom: 20,
            }}
          >
            <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#09111F', marginBottom: 10 }}>Permission Onboarding</h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 14, lineHeight: 1.6 }}>
                Verify permissions before starting. Required modes must be granted to proceed.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#09111F' }}>Camera</span>
                    {renderPermissionBadge(permissions.camera)}
                  </div>
                  <Button variant="outline" size="sm" onClick={requestCameraPermission}>Check Camera</Button>
                  {permissionErrors.camera && <p style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: 8 }}>{permissionErrors.camera}</p>}
                </div>

                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#09111F' }}>Microphone</span>
                    {renderPermissionBadge(permissions.microphone)}
                  </div>
                  <Button variant="outline" size="sm" onClick={requestMicrophonePermission}>Check Microphone</Button>
                  {permissionErrors.microphone && <p style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: 8 }}>{permissionErrors.microphone}</p>}
                </div>

                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#09111F' }}>Screen Share</span>
                    {renderPermissionBadge(permissions.screen)}
                  </div>
                  <Button variant="outline" size="sm" onClick={requestScreenPermission}>Check Screen</Button>
                  <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 6 }}>
                    Only Entire Screen is accepted (window/tab sharing will be rejected).
                  </p>
                  {permissionErrors.screen && <p style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: 8 }}>{permissionErrors.screen}</p>}
                </div>
              </div>

              {(permissions.camera === 'denied' || permissions.microphone === 'denied' || permissions.screen === 'denied') && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
                  <p style={{ fontSize: '0.82rem', color: '#991B1B', lineHeight: 1.6 }}>
                    Camera, microphone, or screen access failed. You can retry checks above before continuing.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {consentItems.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: 16,
                    borderRadius: 14,
                    transition: 'all 0.2s ease',
                    border: consent[item.key] ? '1px solid rgba(201,168,76,0.28)' : '1px solid #EEF2F7',
                    background: consent[item.key] ? 'rgba(201,168,76,0.08)' : '#F8FAFC',
                  }}
                >
                  <Checkbox
                    id={item.key}
                    checked={consent[item.key]}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, [item.key]: checked === true }))
                    }
                    className="mt-1"
                  />
                  <div style={{ flex: 1 }}>
                    <Label
                      htmlFor={item.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.98rem', fontWeight: 700, cursor: 'pointer', color: '#09111F' }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: '#64748B' }} />
                      {item.title}
                      {item.required && (
                        <span style={{ fontSize: '0.68rem', color: '#B45309', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>*Required</span>
                      )}
                    </Label>
                    <p style={{ fontSize: '0.86rem', color: '#64748B', marginTop: 6, lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
                style={{
                  borderRadius: 10,
                  borderColor: '#D1D5DB',
                  color: '#09111F',
                  fontWeight: 700,
                }}
              >
                <CheckCheck className="h-4 w-4" />
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 16,
              borderRadius: 12,
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              marginBottom: 20,
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: '#C9A84C', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.85rem' }}>
              <p style={{ fontWeight: 700, color: '#8a6a17', marginBottom: 4 }}>Important Notice</p>
              <p style={{ color: '#64748B', lineHeight: 1.6 }}>
                Your interview session will be monitored for integrity. Any suspicious activity 
                may be flagged for review. Please ensure you're in a quiet environment.
              </p>
              <p style={{ color: '#64748B', lineHeight: 1.6, marginTop: 8 }}>
                Proctoring artifacts are retained for limited audit and dispute-resolution purposes per policy.
              </p>
            </div>
          </motion.div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              variant="outline"
              size="lg"
              onClick={onCancel}
              style={{
                flex: 1,
                borderRadius: 12,
                height: 46,
                borderColor: '#D1D5DB',
                color: '#09111F',
                fontWeight: 700,
              }}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={!isValid}
              onClick={handleSubmit}
              style={{
                flex: 1,
                borderRadius: 12,
                height: 46,
                background: isValid ? '#09111F' : '#CBD5E1',
                color: '#fff',
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: isValid ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Start Interview
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p style={{ fontSize: '0.74rem', textAlign: 'center', color: '#94A3B8', marginTop: 14 }}>
            By proceeding, you confirm that you have read and understood our privacy policy.
          </p>
        </motion.div>
      </main>
    </div>
  );
};
