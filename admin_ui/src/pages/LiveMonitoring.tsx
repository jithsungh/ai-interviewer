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
  LatestProctoringRecordingResponse,
  ProctoringEventResponse,
  ProctoringReviewQueueItemResponse,
} from "@/types/admin-api";

type WatchMode = "live" | "recording";
type GridSize = 1 | 2 | 3 | 4;
type LiveStatus = "idle" | "connecting" | "connected" | "unsupported" | "failed";

interface MonitoringSession {
  id: number;
  candidate: string;
  role: string;
  elapsed: string;
  status: "Normal" | "Alert" | "Reviewed";
  alerts: number;
  section: string;
  risk: number;
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

function useWebRtcLiveStream(submissionId: number | null, enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const signalingBase = import.meta.env.VITE_PROCTORING_LIVE_SIGNALING_URL as string | undefined;

    if (!enabled || !submissionId) {
      setStatus("idle");
      setError(null);
      return;
    }

    if (!signalingBase) {
      setStatus("unsupported");
      setError("Live WebRTC is not configured in this admin build.");
      return;
    }

    if (!window.RTCPeerConnection || !window.WebSocket) {
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
      }
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.error('[LiveMonitoring] ICE connection failed:', pc.iceConnectionState);
      }
    };

    pc.onconnectionstatechange = () => {
      console.debug('[LiveMonitoring] pc.connectionState changed:', pc.connectionState);
      if (pc.connectionState === "connected") {
        console.debug('[LiveMonitoring] peer connection connected');
        setStatus("connected");
      }
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.error('[LiveMonitoring] peer connection failed/disconnected:', pc.connectionState);
        setStatus("failed");
        setError("WebRTC connection ended.");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
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
    };

    ws.onclose = () => {
      console.debug("[LiveMonitoring] signaling WS closed");
      if (!cleanedUp) {
        setStatus("failed");
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
  }, [enabled, submissionId]);

  return { videoRef, status, error };
}

const LiveMonitoring = () => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ProctoringReviewQueueItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<"all" | "alerts">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);
  const [watchMode, setWatchMode] = useState<WatchMode>("live");
  const [gridSize, setGridSize] = useState<GridSize>(2);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [latestRecording, setLatestRecording] = useState<LatestProctoringRecordingResponse | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<ProctoringEventResponse[]>([]);

  const live = useWebRtcLiveStream(selectedSession?.id ?? null, dialogOpen && watchMode === "live");

  useEffect(() => {
    if (!accessToken) return;

    const loadQueue = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await proctoringApi.getMonitoringSessions(accessToken, { limit: 100, offset: 0 });
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
        alerts: item.flagged ? 1 : 0,
        section: "Live Session",
        risk: item.total_risk,
      } satisfies MonitoringSession;
    });
  }, [items]);

  const visibleSessions = useMemo(() => {
    if (sessionFilter === "alerts") {
      return sessions.filter((session) => session.status === "Alert");
    }
    return sessions;
  }, [sessionFilter, sessions]);

  const alertCount = sessions.filter((session) => session.status === "Alert").length;
  const averageRisk = sessions.length
    ? sessions.reduce((total, session) => total + session.risk, 0) / sessions.length
    : 0;

  const openWatch = async (session: MonitoringSession) => {
    setSelectedSession(session);
    setDialogOpen(true);
    setLatestRecording(null);
    setRecordingUrl(null);
    setRecentEvents([]);
    setRecordingError(null);

    const hasLiveEndpoint = Boolean(import.meta.env.VITE_PROCTORING_LIVE_SIGNALING_URL);
    setWatchMode(hasLiveEndpoint ? "live" : "recording");

    if (!accessToken) return;

    setRecordingLoading(true);
    try {
      try {
        const latest = await proctoringApi.getLatestRecording(session.id, accessToken);
        setLatestRecording(latest);
        const playback = await proctoringApi.getPlayback(session.id, latest.artifact_id, accessToken);
        if (playback.presigned_url) {
          setRecordingUrl(playback.presigned_url);
        } else {
          setRecordingError(playback.error || "Unable to resolve a playback URL for this recording.");
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
      body: latestRecording ? (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Artifact</span><span className="font-mono text-xs">{latestRecording.artifact_id}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Type</span><span>{latestRecording.mime_type}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(latestRecording.file_size_bytes)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(latestRecording.created_at).toLocaleString()}</span></div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">The latest persisted blob will appear here after upload.</div>
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

  const panelCount = gridSize * gridSize;

  return (
    <PageWrapper title="Live Monitoring" description="Monitor ongoing interviews in real-time with proctoring alerts">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Live Sessions" value={loading ? "..." : String(sessions.length)} icon={Activity} iconColor="text-success" />
        <StatCard title="Active Alerts" value={loading ? "..." : String(alertCount)} change="Flagged for review" changeType="negative" icon={AlertTriangle} iconColor="text-destructive" />
        <StatCard title="Avg. Risk" value={loading ? "..." : averageRisk.toFixed(1)} icon={Clock} iconColor="text-info" />
        <StatCard title="Connection Quality" value={watchMode === "live" ? (live.status === "connected" ? "Live" : live.status) : "Blob"} icon={Wifi} iconColor="text-success" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="text-sm text-muted-foreground">
          {sessionFilter === "alerts"
            ? "Showing flagged sessions only"
            : "Showing all live sessions"}
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live monitoring data...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSessions.length === 0 ? (
            <div className="glass-card p-6 text-sm text-muted-foreground">
              {sessionFilter === "alerts" ? "No active alerts right now." : "No live sessions available for monitoring."}
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
                  <span>Section</span><span className="text-foreground">{s.section}</span>
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
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-warning/20 text-warning hover:bg-warning/30 rounded-lg text-xs transition-colors" disabled>
                  <PauseCircle className="h-3 w-3" /> Pause
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-lg text-xs transition-colors" disabled>
                  <Flag className="h-3 w-3" /> Flag
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SquarePlay className="h-5 w-5" />
              Watch Submission {selectedSession ? `#${selectedSession.id}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" variant={watchMode === "live" ? "default" : "outline"} size="sm" onClick={() => setWatchMode("live")}>
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
              <div key={panel.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{panel.title}</h3>
                  {panel.title === videoTitle && watchMode === "recording" && latestRecording && (
                    <Badge variant="secondary">{formatBytes(latestRecording.file_size_bytes)}</Badge>
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
