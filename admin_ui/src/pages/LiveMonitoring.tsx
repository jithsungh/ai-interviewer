import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { StatCard } from "@/components/StatCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Eye,
  Flag,
  LayoutGrid,
  Loader2,
  PauseCircle,
  PlayCircle,
  Shield,
  SquarePlay,
  Clock,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { proctoringApi } from "@/services/api";
import type {
  ProctoringEventResponse,
  ProctoringMonitoringSessionItemResponse,
  ProctoringRecordingArtifactResponse,
} from "@/types/admin-api";

type WatchMode = "live" | "recording";
type GridSize = 1 | 2 | 3 | 4;
type LiveStatus = "idle" | "connecting" | "connected" | "unsupported" | "failed";
type ViewMode = "live" | "completed";

interface MonitoringSession {
  id: number;
  candidate: string;
  role: string;
  elapsed: string;
  status: "Normal" | "Alert" | "Reviewed";
  submissionStatus: string;
  alerts: number;
  section: string;
  risk: number;
  windowId?: number | null;
  windowName?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
}

const statusColors: Record<string, string> = {
  Normal: "status-badge-success",
  Alert: "status-badge-danger",
  Reviewed: "status-badge-warning",
};

const gridButtonClass = (active: boolean) =>
  `rounded-md border px-3 py-2 text-xs font-medium transition-colors ${active
    ? "border-primary bg-primary/10 text-primary"
    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
  }`;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDuration(ms?: number | null) {
  if (!ms || !Number.isFinite(ms)) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function LiveTile({ session, enabled, onOpen }: { session: MonitoringSession; enabled: boolean; onOpen: () => void }) {
  const live = useWebRtcLiveStream(session.id, enabled);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-xs text-muted-foreground">Submission</div>
          <div className="text-sm font-semibold">#{session.id}</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
          onClick={onOpen}
        >
          Details
        </button>
      </div>
      <video
        ref={live.videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg bg-black aspect-video object-contain"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{session.windowName ?? "Live Session"}</span>
        <span className={live.status === "connected" ? "text-success" : live.status === "unsupported" ? "text-warning" : "text-destructive"}>
          {live.status}
        </span>
      </div>
    </div>
  );
}

function useWebRtcLiveStream(submissionId: number | null, enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTokenRef = useRef(0);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reconnectToken, setReconnectToken] = useState(0);

  const scheduleReconnect = () => {
    if (!enabled || !submissionId) return;
    if (reconnectTimerRef.current) return;
    if (reconnectAttemptRef.current >= 5) {
      setStatus("failed");
      setError("WebRTC reconnect attempts exceeded.");
      return;
    }
    reconnectAttemptRef.current += 1;
    const delayMs = 1000 * reconnectAttemptRef.current;
    setStatus("connecting");
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectTokenRef.current += 1;
      setReconnectToken(reconnectTokenRef.current);
    }, delayMs);
  };

  useEffect(() => {
    const normalizeSignalingBase = (raw?: string) => {
      if (!raw) return raw;
      let base = raw;
      if (base.startsWith("http")) {
        base = base.replace(/^http/, "ws");
      }
      if (window.location.protocol === "https:" && base.startsWith("ws://")) {
        base = base.replace(/^ws:\/\//, "wss://");
      }
      return base;
    };

    const signalingBase = normalizeSignalingBase(
      import.meta.env.VITE_PROCTORING_LIVE_SIGNALING_URL as string | undefined,
    );

    if (!enabled || !submissionId) {
      console.debug('[LiveMonitoring] live stream disabled or missing submission', {
        enabled,
        submissionId,
      });
      setStatus("idle");
      setError(null);
      reconnectAttemptRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    if (!signalingBase) {
      console.warn('[LiveMonitoring] missing signaling base URL');
      setStatus("unsupported");
      setError("Live WebRTC is not configured in this admin build.");
      return;
    }

    if (!window.RTCPeerConnection || !window.WebSocket) {
      console.warn('[LiveMonitoring] WebRTC or WebSocket not available');
      setStatus("unsupported");
      setError("This browser does not support WebRTC playback.");
      return;
    }

    let cleanedUp = false;
    const iceServers = import.meta.env.VITE_PROCTORING_WEBRTC_STUN
      ? [{ urls: [import.meta.env.VITE_PROCTORING_WEBRTC_STUN as string] }]
      : [{ urls: ["stun:stun.l.google.com:19302"] }];

    const signalingUrl = signalingBase.includes(":submissionId")
      ? signalingBase.replace(":submissionId", String(submissionId))
      : `${signalingBase.replace(/\/$/, "")}/${submissionId}`;

    console.debug('[LiveMonitoring] signaling config', {
      signalingBase,
      signalingUrl,
      submissionId,
      enabled,
    });

    const pc = new RTCPeerConnection({ iceServers });
    const ws = new WebSocket(signalingUrl);
    pcRef.current = pc;
    wsRef.current = ws;
    setStatus("connecting");
    setError(null);

    // Ensure we explicitly request inbound media
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } catch (err) {
      console.debug('[LiveMonitoring] addTransceiver failed or unsupported', err);
    }

    pc.ontrack = (event) => {
      console.debug('[LiveMonitoring] ontrack event fired', event);
      const incomingStream = event.streams[0];
      const remoteStream = remoteStreamRef.current ?? new MediaStream();
      remoteStreamRef.current = remoteStream;

      if (incomingStream) {
        console.debug('[LiveMonitoring] incoming stream from track event:', incomingStream.id, incomingStream.getTracks().map((track) => `${track.kind}:${track.id}`));
        incomingStream.getTracks().forEach((track) => {
          if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
      } else {
        console.debug('[LiveMonitoring] no event.streams[0]; attaching track directly', event.track.kind, event.track.id);
        if (!remoteStream.getTracks().some((existing) => existing.id === event.track.id)) {
          remoteStream.addTrack(event.track);
        }
      }

      const videoEl = videoRef.current;
      if (videoEl) {
        console.debug('[LiveMonitoring] assigning remote stream to video element', {
          streamId: remoteStream.id,
          trackCount: remoteStream.getTracks().length,
          videoReadyState: videoEl.readyState,
        });
        videoEl.muted = true;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        if (videoEl.srcObject !== remoteStream) {
          videoEl.srcObject = remoteStream;
        }
        const attemptPlay = async () => {
          try {
            await videoEl.play();
            console.debug('[LiveMonitoring] video.play() resolved');
            setStatus("connected");
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              console.debug('[LiveMonitoring] video.play() was interrupted, will retry on the next track/state change');
              return;
            }
            console.error('[LiveMonitoring] video.play() failed:', err);
          }
        };
        void requestAnimationFrame(() => {
          void attemptPlay();
        });
      } else {
        console.warn('[LiveMonitoring] ontrack: videoRef missing', { streamId: remoteStream.id, videoRef: !!videoRef.current });
      }
    };

    console.debug("[LiveMonitoring] WebRTC: created RTCPeerConnection", { iceServers });

    pc.oniceconnectionstatechange = () => {
      console.debug('[LiveMonitoring] pc.iceConnectionState changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        console.debug('[LiveMonitoring] ICE connection established');
        reconnectAttemptRef.current = 0;
      }
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.error('[LiveMonitoring] ICE connection failed:', pc.iceConnectionState);
        scheduleReconnect();
      }
    };

    pc.onconnectionstatechange = () => {
      console.debug('[LiveMonitoring] pc.connectionState changed:', pc.connectionState);
      if (pc.connectionState === "connected") {
        console.debug('[LiveMonitoring] peer connection connected');
        setStatus("connected");
        reconnectAttemptRef.current = 0;
      }
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.error('[LiveMonitoring] peer connection failed/disconnected:', pc.connectionState);
        setStatus("failed");
        setError("WebRTC connection ended.");
        scheduleReconnect();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        console.debug('[LiveMonitoring] sending ICE candidate');
        ws.send(JSON.stringify({
          type: "candidate",
          submission_id: submissionId,
          candidate: event.candidate,
        }));
      }
    };

    ws.onopen = () => {
      if (cleanedUp) return;
      console.debug("[LiveMonitoring] signaling WS open", signalingUrl);
      ws.send(JSON.stringify({ type: "watch", submission_id: submissionId }));
    };

    ws.onmessage = async (event) => {
      if (cleanedUp) return;

      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        console.warn('[LiveMonitoring] signaling message is not valid JSON');
        return;
      }

      console.debug("[LiveMonitoring] signaling message received", message);

      try {
        // Handle live_unavailable message from signaling stub - fallback to recording playback
        if (message.type === "live_unavailable") {
          setStatus("unsupported");
          setError("Live WebRTC is not available. Please use blob playback.");
          ws.close();
          pc.close();
          return;
        }

        if (message.type === "offer" || message.sdp?.type === "offer") {
          const offer = message.sdp ?? message.offer ?? message;
          console.debug("[LiveMonitoring] setting remote offer", offer);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.debug('[LiveMonitoring] remote description set, waiting for ontrack...');
          const answer = await pc.createAnswer();
          console.debug("[LiveMonitoring] created local answer", answer);
          await pc.setLocalDescription(answer);
          console.debug('[LiveMonitoring] sending answer back to broker');
          ws.send(JSON.stringify({
            type: "answer",
            submission_id: submissionId,
            sdp: pc.localDescription,
          }));
        }

        if (message.type === "candidate" || message.type === "ice-candidate" || message.candidate) {
          const candidate = message.candidate ?? message.ice_candidate;
          if (candidate) {
            console.debug('[LiveMonitoring] adding ICE candidate');
            await pc.addIceCandidate(candidate);
          }
        }

        if (message.type === "stream-ready") {
          setStatus("connecting");
        }
      } catch (err) {
        console.error("[LiveMonitoring] signaling handling error", err);
        setStatus("failed");
        setError(err instanceof Error ? err.message : "WebRTC signaling failed.");
      }
    };

    ws.onerror = () => {
      console.error("[LiveMonitoring] signaling WS error");
      setStatus("failed");
      setError("WebRTC signaling failed.");
      scheduleReconnect();
    };

    ws.onclose = () => {
      console.debug("[LiveMonitoring] signaling WS closed", {
        readyState: ws.readyState,
        cleanedUp,
      });
      if (!cleanedUp) {
        setStatus("failed");
        scheduleReconnect();
      }
    };

    return () => {
      cleanedUp = true;
      ws.close();
      pc.getSenders().forEach((sender) => sender.track?.stop());
      pc.close();
      pcRef.current = null;
      wsRef.current = null;
      remoteStreamRef.current = null;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled, submissionId, reconnectToken]);

  return { videoRef, status, error };
}

const LiveMonitoring = () => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ProctoringMonitoringSessionItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<"all" | "alerts">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [selectedWindowId, setSelectedWindowId] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);
  const [watchMode, setWatchMode] = useState<WatchMode>("live");
  const [gridSize, setGridSize] = useState<GridSize>(2);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<ProctoringRecordingArtifactResponse[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<ProctoringRecordingArtifactResponse | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<ProctoringEventResponse[]>([]);

  const live = useWebRtcLiveStream(selectedSession?.id ?? null, dialogOpen && watchMode === "live");
  const headerFont = { fontFamily: '"Space Grotesk", "Trebuchet MS", sans-serif' };
  const bodyFont = { fontFamily: '"IBM Plex Serif", "Georgia", serif' };

  useEffect(() => {
    if (!accessToken) return;

    const loadQueue = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await proctoringApi.getMonitoringSessions(accessToken, {
          limit: 200,
          offset: 0,
          status: "in_progress,completed,reviewed",
        });
        setItems(response.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load monitoring queue");
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, [accessToken]);

  const sessions = useMemo(() => {
    return items.map((item) => {
      const status = item.reviewed ? "Reviewed" : item.flagged ? "Alert" : "Normal";
      return {
        id: item.submission_id,
        candidate: `Submission #${item.submission_id}`,
        role: `Classification: ${item.classification}`,
        elapsed: `${item.event_count} events`,
        status,
        submissionStatus: item.submission_status,
        alerts: item.flagged ? 1 : 0,
        section: "Live Session",
        risk: item.total_risk,
        windowId: item.window_id ?? null,
        windowName: item.window_name ?? null,
        startedAt: item.started_at ?? null,
        submittedAt: item.submitted_at ?? null,
      } satisfies MonitoringSession;
    });
  }, [items]);

  const windowOptions = useMemo(() => {
    const seen = new Map<number, string>();
    sessions.forEach((session) => {
      if (session.windowId && !seen.has(session.windowId)) {
        seen.set(session.windowId, session.windowName || `Window #${session.windowId}`);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filteredByWindow = useMemo(() => {
    if (selectedWindowId === "all") return sessions;
    return sessions.filter((session) => session.windowId === selectedWindowId);
  }, [sessions, selectedWindowId]);

  const visibleSessions = useMemo(() => {
    const byStatus = filteredByWindow.filter((session) => {
      if (viewMode === "live") return session.submissionStatus === "in_progress";
      return session.submissionStatus === "completed" || session.submissionStatus === "reviewed";
    });

    if (sessionFilter === "alerts") {
      return byStatus.filter((session) => session.status === "Alert");
    }
    return byStatus;
  }, [filteredByWindow, sessionFilter, viewMode]);

  const alertCount = visibleSessions.filter((session) => session.status === "Alert").length;
  const averageRisk = visibleSessions.length
    ? visibleSessions.reduce((total, session) => total + session.risk, 0) / visibleSessions.length
    : 0;

  const openWatch = async (session: MonitoringSession) => {
    setSelectedSession(session);
    setDialogOpen(true);
    setRecordings([]);
    setSelectedRecording(null);
    setRecordingUrl(null);
    setRecentEvents([]);
    setRecordingError(null);

    const hasLiveEndpoint = Boolean(import.meta.env.VITE_PROCTORING_LIVE_SIGNALING_URL);
    const canWatchLive = session.submissionStatus === "in_progress" && hasLiveEndpoint;
    setWatchMode(canWatchLive ? "live" : "recording");

    if (!accessToken) return;

    setRecordingLoading(true);
    try {
      try {
        const artifacts = await proctoringApi.getRecordings(session.id, accessToken);
        setRecordings(artifacts);
        const first = artifacts[0] ?? null;
        setSelectedRecording(first);
        if (first) {
          const playback = await proctoringApi.getPlayback(session.id, first.artifact_id, accessToken);
          if (playback.presigned_url) {
            setRecordingUrl(playback.presigned_url);
          } else {
            setRecordingError(playback.error || "Unable to resolve a playback URL for this recording.");
          }
        }
      } catch (err: any) {
        if (err.statusCode === 404 || err.status === 404) {
          setRecordingError("No blob recording is available for this submission yet.");
        } else {
          throw err;
        }
      }

      try {
        const events = await proctoringApi.getEvents(session.id, accessToken);
        setRecentEvents(events.slice(0, 8));
      } catch {
        setRecentEvents([]);
      }
    } catch (err: any) {
      setRecordingError(err.message || "Failed to load recording metadata.");
    } finally {
      setRecordingLoading(false);
    }
  };

  const videoTitle = watchMode === "live" ? "Live WebRTC" : "Blob playback";
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[gridSize];

  const primaryVideo = watchMode === "live"
    ? live.videoRef
    : undefined;

  // If live mode is unsupported, auto-switch to recording playback
  useEffect(() => {
    if (watchMode === "live" && live.status === "unsupported" && recordingUrl) {
      setWatchMode("recording");
    }
  }, [live.status, watchMode, recordingUrl]);

  const panels = [
    {
      title: videoTitle,
      body: watchMode === "live" ? (
        <>
          <video
            ref={primaryVideo}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg bg-black aspect-video object-contain"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Live status</span>
            <span className={live.status === "connected" ? "text-success" : live.status === "unsupported" ? "text-warning" : "text-destructive"}>
              {live.status}
            </span>
          </div>
          {live.error && <p className="mt-2 text-xs text-destructive">{live.error}</p>}
        </>
      ) : recordingLoading ? (
        <div className="flex h-full min-h-[260px] items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading playback...
        </div>
      ) : recordingUrl ? (
        <video
          src={recordingUrl}
          controls
          autoPlay={false}
          className="w-full rounded-lg bg-black aspect-video object-contain"
        />
      ) : recordingError ? (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-destructive/5 text-sm text-destructive">
          {recordingError}
        </div>
      ) : (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          No blob recording available.
        </div>
      ),
    },
    {
      title: "Submission Summary",
      body: selectedSession ? (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Submission</span><span className="font-medium">{selectedSession.id}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Section</span><span className="font-medium">{selectedSession.section}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Risk</span><span className="font-medium">{selectedSession.risk.toFixed(1)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Alerts</span><span className="font-medium">{selectedSession.alerts}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><Badge variant={selectedSession.status === "Alert" ? "destructive" : "secondary"}>{selectedSession.status}</Badge></div>
        </div>
      ) : null,
    },
    {
      title: "Recording Info",
      body: selectedRecording ? (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Artifact</span><span className="font-mono text-xs">{selectedRecording.artifact_id}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Type</span><span>{selectedRecording.mime_type}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(selectedRecording.file_size_bytes)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Duration</span><span>{formatDuration(selectedRecording.duration_ms)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(selectedRecording.created_at).toLocaleString()}</span></div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">The latest persisted blob will appear here after upload.</div>
      ),
    },
    {
      title: "Recording Segments",
      body: recordings.length ? (
        <div className="space-y-2 text-sm max-h-[260px] overflow-auto pr-1">
          {recordings.map((rec, index) => (
            <button
              key={rec.artifact_id}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${selectedRecording?.artifact_id === rec.artifact_id
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/30 hover:bg-muted"
              }`}
              onClick={async () => {
                if (!accessToken || !selectedSession) return;
                setSelectedRecording(rec);
                setRecordingError(null);
                setRecordingUrl(null);
                try {
                  const playback = await proctoringApi.getPlayback(selectedSession.id, rec.artifact_id, accessToken);
                  if (playback.presigned_url) {
                    setRecordingUrl(playback.presigned_url);
                  } else {
                    setRecordingError(playback.error || "Unable to resolve a playback URL for this recording.");
                  }
                } catch (err: any) {
                  setRecordingError(err.message || "Failed to resolve playback URL.");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Segment {recordings.length - index}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(rec.file_size_bytes)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(rec.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No recording segments available.</div>
      ),
    },
    {
      title: "Recent Events",
      body: recentEvents.length ? (
        <div className="space-y-2 text-sm max-h-[260px] overflow-auto pr-1">
          {recentEvents.map((event) => (
            <div key={event.id} className="rounded-md border border-border bg-muted/30 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{event.event_type}</span>
                <span className="text-xs text-muted-foreground">{event.severity}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(event.occurred_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No proctoring events loaded.</div>
      ),
    },
  ];

  const canWatchLive = Boolean(import.meta.env.VITE_PROCTORING_LIVE_SIGNALING_URL)
    && selectedSession?.submissionStatus === "in_progress";

  const panelCount = gridSize * gridSize;
  const pageSize = gridSize * gridSize;
  const pageCount = Math.max(1, Math.ceil(visibleSessions.length / pageSize));
  const clampedPage = Math.min(currentPage, pageCount);
  const pagedSessions = visibleSessions.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  return (
    <PageWrapper title="Live Monitoring" description="Monitor ongoing interviews in real-time with proctoring alerts">
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12)_0%,_rgba(15,23,42,0)_55%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18)_0%,_rgba(15,23,42,0)_60%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,_rgba(8,12,24,0.96)_0%,_rgba(15,23,42,0.98)_55%,_rgba(8,12,24,1)_100%)]" />
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#111827] p-6 mb-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.18)_0%,_rgba(15,23,42,0)_60%)]" />
        <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.22)_0%,_rgba(15,23,42,0)_70%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300/80" style={headerFont}>Invigilator Desk</p>
              <h1 className="text-2xl font-semibold text-slate-100" style={headerFont}>Live Monitoring Command</h1>
              <p className="text-sm text-slate-300/80 mt-1" style={bodyFont}>Switch between live and completed sessions, then inspect recordings and events.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200" style={headerFont}>
                {viewMode === "live" ? "Live Feed" : "Archive"}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200" style={headerFont}>
                {selectedWindowId === "all" ? "All windows" : `Window #${selectedWindowId}`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Live Sessions" value={loading ? "..." : String(sessions.length)} icon={Activity} iconColor="text-success" />
            <StatCard title="Active Alerts" value={loading ? "..." : String(alertCount)} change="Flagged for review" changeType="negative" icon={AlertTriangle} iconColor="text-destructive" />
            <StatCard title="Avg. Risk" value={loading ? "..." : averageRisk.toFixed(1)} icon={Clock} iconColor="text-info" />
            <StatCard title="Connection Quality" value={watchMode === "live" ? (live.status === "connected" ? "Live" : live.status) : "Blob"} icon={Wifi} iconColor="text-success" />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <div className="text-sm text-muted-foreground" style={bodyFont}>
          {viewMode === "live"
            ? (sessionFilter === "alerts" ? "Showing flagged live sessions" : "Showing all live sessions")
            : (sessionFilter === "alerts" ? "Showing flagged completed sessions" : "Showing all completed sessions")}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "live" ? "default" : "outline"}
            onClick={() => {
              setViewMode("live");
              setCurrentPage(1);
            }}
          >
            Live
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "completed" ? "default" : "outline"}
            onClick={() => {
              setViewMode("completed");
              setCurrentPage(1);
            }}
          >
            Completed
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sessionFilter === "all" ? "default" : "outline"}
            onClick={() => setSessionFilter("all")}
          >
            All Sessions
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sessionFilter === "alerts" ? "default" : "outline"}
            onClick={() => setSessionFilter("alerts")}
          >
            Active Alerts
          </Button>
          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-xs"
            value={selectedWindowId}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedWindowId(value === "all" ? "all" : Number(value));
              setCurrentPage(1);
            }}
            style={headerFont}
          >
            <option value="all">All windows</option>
            {windowOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live monitoring data...
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === "live" ? (
            visibleSessions.length === 0 ? (
              <div className="glass-card p-6 text-sm text-muted-foreground">
                {sessionFilter === "alerts" ? "No active live alerts right now." : "No live sessions available for monitoring."}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LayoutGrid className="h-4 w-4" />
                    <span>{gridSize}x{gridSize} view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((size) => (
                      <button key={size} type="button" className={gridButtonClass(gridSize === size)} onClick={() => {
                        setGridSize(size as GridSize);
                        setCurrentPage(1);
                      }}>
                        {size === 1 ? "1x1" : `${size}x${size}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`grid ${gridClass} gap-3`}>
                  {pagedSessions.map((s) => (
                    <LiveTile
                      key={s.id}
                      session={s}
                      enabled={!dialogOpen}
                      onOpen={() => void openWatch(s)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                    disabled={clampedPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`h-2 w-2 rounded-full ${page === clampedPage ? "bg-primary" : "bg-muted"}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Go to page ${page}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                    disabled={clampedPage === pageCount}
                    onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSessions.length === 0 ? (
                <div className="glass-card p-6 text-sm text-muted-foreground">
                  No completed sessions available for monitoring.
                </div>
              ) : visibleSessions.map((s) => (
                <motion.div key={s.id} variants={itemVariant} className="glass-card p-5 relative overflow-hidden">
                  {s.status === "Alert" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive animate-pulse" />}
                  {s.status === "Normal" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-success" />}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{s.candidate}</h3>
                      <p className="text-xs text-muted-foreground">{s.role}</p>
                    </div>
                    <span className={statusColors[s.status]}>
                      {s.status === "Alert" && <span className="pulse-dot bg-destructive" />}
                      {s.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Window</span><span className="text-foreground">{s.windowName ?? "-"}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Events</span><span className="text-foreground font-mono">{s.elapsed}</span>
                    </div>
                    {s.alerts > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Alerts</span><span className="text-destructive font-medium">{s.alerts}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Risk</span><span className="text-foreground font-medium">{s.risk.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors"
                      onClick={() => void openWatch(s)}
                    >
                      <Eye className="h-3 w-3" /> Watch
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#111827] text-slate-100 border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SquarePlay className="h-5 w-5" />
              Watch Submission {selectedSession ? `#${selectedSession.id}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant={watchMode === "live" ? "default" : "outline"}
                size="sm"
                disabled={!canWatchLive}
                onClick={() => setWatchMode("live")}
              >
                <PlayCircle className="mr-2 h-4 w-4" /> Live WebRTC
              </Button>
              <Button type="button" variant={watchMode === "recording" ? "default" : "outline"} size="sm" onClick={() => setWatchMode("recording")}>
                <SquarePlay className="mr-2 h-4 w-4" /> Blob playback
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              {[1, 2, 3, 4].map((size) => (
                <button key={size} type="button" className={gridButtonClass(gridSize === size)} onClick={() => setGridSize(size as GridSize)}>
                  {size === 1 ? "1x1" : `${size}x${size}`}
                </button>
              ))}
            </div>
          </div>

          {(watchMode === "live" && live.error) || recordingError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{live.error || recordingError}</AlertDescription>
            </Alert>
          ) : null}

          <div className={`grid ${gridClass} gap-3 mt-4 overflow-auto pr-1`}>
            {panels.slice(0, panelCount).map((panel) => (
              <div key={panel.title} className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{panel.title}</h3>
                  {panel.title === videoTitle && watchMode === "recording" && selectedRecording && (
                    <Badge variant="secondary">{formatBytes(selectedRecording.file_size_bytes)}</Badge>
                  )}
                </div>
                {panel.body}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{watchMode === "live" ? "Live mode uses WebRTC when configured, otherwise blob playback is available." : "Playback resolves the latest recording from blob storage."}</span>
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Advisory-only monitoring
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
};

export default LiveMonitoring;
