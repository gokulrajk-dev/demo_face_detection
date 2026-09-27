import { useEffect, useMemo, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import "./StudentAttendanceDashboard.css";

const MIN_ATTENDANCE = 75; // college minimum
const GOOD_FROM = 85; // at or above this = "Good"

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_ATTENDANCE_PERIOD = 5;

const STUDENT = {
  name: "Gokul",
  registerNo: "24MCA001",
  program: "MCA",
  department: "Computer Applications",
  semester: "Semester 3",
  photo: null,
};

const SUBJECTS = [
  { code: "MCA101", name: "Python Programming", total: 26, present: 24 },
  { code: "MCA102", name: "Artificial Intelligence", total: 20, present: 17 },
  { code: "MCA103", name: "Cloud Computing", total: 18, present: 14 },
  { code: "MCA104", name: "Data Structures", total: 22, present: 20 },
  { code: "MCA105", name: "Database Management", total: 20, present: 18 },
  { code: "MCA106", name: "Web Technologies", total: 14, present: 12 },
];

const TIMETABLE = [
  { period: 1, subject: "Python Programming", teacher: "Dr. R. Meenakshi", start: "09:00", end: "09:50" },
  { period: 2, subject: "Artificial Intelligence", teacher: "Prof. S. Karthik", start: "09:50", end: "10:40" },
  { period: 3, subject: "Cloud Computing", teacher: "Dr. A. Farhana", start: "10:55", end: "11:45" },
  { period: 4, subject: "Data Structures", teacher: "Prof. M. Vignesh", start: "11:45", end: "12:35" },
  { period: 5, subject: "Database Management", teacher: "Dr. K. Lakshmi", start: "13:30", end: "14:20" },
  { period: 6, subject: "Web Technologies", teacher: "Prof. T. Arun", start: "14:20", end: "15:10" },
];

const RECENT = [
  { id: 1, date: "2026-09-21", subject: "Artificial Intelligence", period: 2, time: "09:51", present: true, confidence: 98.4 },
  { id: 2, date: "2026-09-21", subject: "Python Programming", period: 1, time: "09:02", present: true, confidence: 97.1 },
  { id: 3, date: "2026-09-18", subject: "Web Technologies", period: 6, time: "14:22", present: true, confidence: 96.2 },
  { id: 4, date: "2026-09-18", subject: "Database Management", period: 5, time: "13:31", present: true, confidence: 97.8 },
  { id: 5, date: "2026-09-18", subject: "Cloud Computing", period: 3, time: "10:58", present: false, confidence: null },
  { id: 6, date: "2026-09-17", subject: "Data Structures", period: 4, time: "11:48", present: true, confidence: 95.6 },
  { id: 7, date: "2026-09-17", subject: "Artificial Intelligence", period: 2, time: "09:52", present: true, confidence: 94.9 },
  { id: 8, date: "2026-09-16", subject: "Cloud Computing", period: 3, time: "10:57", present: false, confidence: null },
];


const TODAY_STUDENTS = [
  { id: 1, name: "Gokul", registerNo: "24MCA001", status: "-", time: "-", photo: null },
  { id: 2, name: "Arun Kumar", registerNo: "24MCA002", status: "-", time: "-", photo: null },
  { id: 3, name: "Divya S", registerNo: "24MCA003", status: "-", time: "-", photo: null },
  { id: 4, name: "Harish V", registerNo: "24MCA004", status: "-", time: "-", photo: null },
  { id: 5, name: "Keerthana R", registerNo: "24MCA005", status: "-", time: "-", photo: null },
  { id: 6, name: "Lokesh M", registerNo: "24MCA006", status: "-", time: "-", photo: null },
  { id: 7, name: "Monisha P", registerNo: "24MCA007", status: "-", time: "-", photo: null },
  { id: 8, name: "Naveen S", registerNo: "24MCA008", status: "-", time: "-", photo: null },
  { id: 9, name: "Priya K", registerNo: "24MCA009", status: "-", time: "-", photo: null },
  { id: 10, name: "Sanjay R", registerNo: "24MCA010", status: "-", time: "-", photo: null },
];

const NOTIFICATIONS = [
  { id: 1, type: "warning", title: "Cloud Computing is close to the limit", text: "You are at 77.8%. Attend every class to stay above 75%.", time: "1 hour ago", read: false },
  { id: 2, type: "success", title: "Attendance marked", text: "Artificial Intelligence, period 2, recognised with 98.4% confidence.", time: "Today", read: false },
  { id: 3, type: "info", title: "Session update", text: "Data Structures on Wednesday moves to Lab 2.", time: "Yesterday", read: true },
];

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", target: null },
  {
    id: "today-attendance",
    label: "Today Attendance",
    icon: "camera",
    target: "today-attendance",
  },
  { id: "attendance", label: "Attendance", icon: "check", target: "recent-attendance" },
  { id: "timetable", label: "Timetable", icon: "clock", target: "todays-timetable" },
  { id: "subjects", label: "Subjects", icon: "book", target: "subject-attendance" },
  { id: "profile", label: "Profile", icon: "user", target: "student-profile" },
];

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const percent = (part, whole) => (whole ? (part / whole) * 100 : 0);

function toneOf(pct) {
  if (pct >= GOOD_FROM) return "good";
  if (pct >= MIN_ATTENDANCE) return "warning";
  return "critical";
}

const TONE_LABEL = { good: "Good", warning: "Warning", critical: "Critical" };
const TONE_LONG = { good: "Good attendance", warning: "Attendance warning", critical: "Critical attendance" };

function marginInfo(present, total) {
  const need = MIN_ATTENDANCE / 100;
  if (present / total >= need) {
    return { ok: true, n: Math.floor(present / need - total + 1e-9) };
  }
  return { ok: false, n: Math.ceil((need * total - present) / (1 - need) - 1e-9) };
}

const to12h = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function slotStates(slots, nowMin) {
  let nextTaken = false;
  return slots.map((s) => {
    if (nowMin >= toMinutes(s.end)) return "done";
    if (nowMin >= toMinutes(s.start)) return "live";
    if (!nextTaken) {
      nextTaken = true;
      return "next";
    }
    return "later";
  });
}

const greetingFor = (date) => {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const initialsOf = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function useReady(delay = 80) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return ready;
}

/** Counts from 0 up to `target`. Returns a formatted string. */
function useCountUp(target, { duration = 1000, decimals = 0, delay = 0 } = {}) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setValue(target);
      return undefined;
    }
    let raf;
    let start;
    const timer = setTimeout(() => {
      const tick = (t) => {
        if (start === undefined) start = t;
        const p = Math.min((t - start) / duration, 1);
        setValue(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value.toFixed(decimals);
}

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  check: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  book: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
};

function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

function Avatar({ student, large = false }) {
  const cls = `sa-avatar${large ? " sa-avatar-lg" : ""}`;
  return student.photo ? (
    <img className={cls} src={student.photo} alt={`${student.name}'s profile`} />
  ) : (
    <span className={cls} aria-hidden="true">
      {initialsOf(student.name)}
    </span>
  );
}

function Ring({ value, tone, ready }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const shown = useCountUp(value, { decimals: 1, duration: 1400, delay: 150 });
  return (
    <div className={`sa-ring is-${tone}`} role="img" aria-label={`Overall attendance ${value.toFixed(1)} percent`}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="sa-ring-track" cx="64" cy="64" r={r} />
        <circle
          className="sa-ring-fill"
          cx="64"
          cy="64"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={ready ? c * (1 - value / 100) : c}
        />
      </svg>
      <div className="sa-ring-label">
        <strong>{shown}</strong>
        <span>%</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, delay }) {
  const shown = useCountUp(value, { duration: 900, delay });
  return (
    <article className={`sa-card sa-stat is-${tone}`}>
      <p className="sa-stat-label">{label}</p>
      <p className="sa-stat-value">{shown}</p>
    </article>
  );
}

function Bar({ pct, tone, ready, index, label }) {
  return (
    <div
      className={`sa-bar is-${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span
        className="sa-bar-fill"
        style={{ transform: `scaleX(${ready ? pct / 100 : 0})`, transitionDelay: `${350 + index * 90}ms` }}
      />
      <i className="sa-bar-min" style={{ left: `${MIN_ATTENDANCE}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function NotificationBell({ items, setItems }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = (id) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems((list) => list.map((n) => ({ ...n, read: true })));
  const toneFor = { warning: "warning", success: "good", info: "info" };

  return (
    <div className="sa-notif" ref={wrapRef}>
      <button
        type="button"
        className="sa-icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="sa-badge">{unread}</span>}
      </button>

      {open && (
        <div className="sa-notif-panel" role="region" aria-label="Notifications">
          <div className="sa-notif-head">
            <h2>Notifications</h2>
            <button type="button" className="sa-link-btn" onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </div>
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`sa-notif-item is-${toneFor[n.type] ?? "info"}${n.read ? "" : " is-unread"}`}
                  onClick={() => markRead(n.id)}
                >
                  <i className="sa-notif-dot" />
                  <span>
                    <strong>{n.title}</strong>
                    <span className="sa-notif-text">{n.text}</span>
                    <span className="sa-notif-time">{n.time}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Timetable({ slots, now }) {
  const states = slotStates(slots, now.getHours() * 60 + now.getMinutes());
  const tag = { done: "Finished", live: "Live now", next: "Up next", later: "" };
  return (
    <ol className="sa-slots">
      {slots.map((s, i) => (
        <li key={s.period} className={`sa-slot is-${states[i]}`} aria-current={states[i] === "live" ? "true" : undefined}>
          <div className="sa-slot-time">
            <strong>{to12h(s.start)}</strong>
            <span>{to12h(s.end)}</span>
          </div>
          <div>
            <h3>{s.subject}</h3>
            <p>
              {s.teacher}, period {s.period}
            </p>
          </div>
          {tag[states[i]] && (
            <span className="sa-slot-tag">
              {states[i] === "live" && <i className="sa-live-dot" />}
              {tag[states[i]]}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function normalizeStudentPhoto(photo) {
  if (!photo) return null;
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  return `${API_BASE_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
}

function formatAttendanceTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchTodayStudents(period = 1) {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // The Student Details API already returns each student's attendance
  // inside `studentAttendance`. Use that response as the source of truth.
  const response = await fetch(
    `${API_BASE_URL}/student/student_detials/`
  );

  if (!response.ok) {
    throw new Error(`Student API failed: ${response.status}`);
  }

  const payload = await response.json();

  const students = Array.isArray(payload)
    ? payload
    : payload.results || [];

  return students.map((student) => {
    const attendanceRecords = Array.isArray(student.studentAttendance)
      ? student.studentAttendance
      : [];

    // Only use attendance for today's date and the currently selected period.
    const matchingRecords = attendanceRecords.filter((record) => {
      return (
        Number(record.period) === Number(period) &&
        record.timing === todayIso
      );
    });

    // If duplicate records somehow exist, use the latest update_time.
    const latest = [...matchingRecords].sort(
      (a, b) =>
        new Date(b.update_time || 0) -
        new Date(a.update_time || 0)
    )[0];

    const status =
      latest?.status === "P"
        ? "P"
        : latest?.status === "A"
          ? "A"
          : "-";

    return {
      id: student.id,
      name: student.student_name,
      registerNo: String(student.register_no),
      status,
      present: status === "P",
      time: latest
        ? formatAttendanceTime(latest.update_time)
        : "-",
      photo: normalizeStudentPhoto(student.stu_photo),
      sNo: student.s_no,
    };
  });
}

function CameraAttendanceCard({
  now,
  students = TODAY_STUDENTS,
  selectedPeriod,
  onPreviousPeriod,
  onNextPeriod,
  currentSession,
  onAttendanceMarked,
  recentlyMarkedStudentId,
}) {
  const entryVideoRef = useRef(null);
  const exitVideoRef = useRef(null);
  const entryStreamRef = useRef(null);
  const exitStreamRef = useRef(null);
  const canvasRef = useRef(null);

  // Browser-side face detection is only used to decide WHEN to capture.
  // Django remains responsible for identity recognition and attendance.
  // Each camera has its own MediaPipe detector. Sharing one VIDEO-mode
  // detector between two independent video streams can cause timestamp/state
  // conflicts and stop the second detection loop after the first capture.
  const entryFaceDetectorRef = useRef(null);
  const exitFaceDetectorRef = useRef(null);
  const captureFrameRef = useRef(null);
  const detectionFrameRef = useRef({ entry: null, exit: null });
  const detectionTimingRef = useRef({ entry: 0, exit: 0 });
  const consecutiveFacesRef = useRef({ entry: 0, exit: 0 });
  const processingRef = useRef({ entry: false, exit: false });
  const lastCaptureTimeRef = useRef({ entry: 0, exit: 0 });

  const FACE_DETECTION_INTERVAL_MS = 150;
  const FACE_CONFIRMATION_FRAMES = 2;
  const CAPTURE_COOLDOWN_MS = 5000;

  const [faceDetectorReady, setFaceDetectorReady] = useState(false);
  const [entryCameraState, setEntryCameraState] = useState("idle");
  const [exitCameraState, setExitCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [cameraDevices, setCameraDevices] = useState([]);
  const [entryDeviceId, setEntryDeviceId] = useState("");
  const [exitDeviceId, setExitDeviceId] = useState("");
  const [changingCamera, setChangingCamera] = useState(null);
  const [captureMessage, setCaptureMessage] = useState("");
  const [verificationState, setVerificationState] = useState("idle");
  const [matchedStudent, setMatchedStudent] = useState(null);

  const todayLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const presentCount = students.filter((student) => student.status === "P").length;
  const absentCount = students.filter((student) => student.status === "A").length;
  const pendingCount = students.filter((student) => student.status === "-").length;

  const stopStream = (streamRef, videoRef) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startTwoCameras = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setEntryCameraState("error");
      setExitCameraState("error");
      setCameraError("Camera access is not supported by this browser.");
      return;
    }

    try {
      setCameraError("");
      setCaptureMessage("");
      setEntryCameraState("requesting");
      setExitCameraState("requesting");

      // Ask for permission first. This also makes camera labels available
      // on browsers that hide them before permission is granted.
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      permissionStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");

      setCameraDevices(cameras);
      console.log("Available browser cameras:", cameras);

      if (cameras.length < 2) {
        setEntryCameraState(cameras.length === 1 ? "active" : "error");
        setExitCameraState("error");
        setCameraError(
          cameras.length === 1
            ? "Only one camera was detected. Connect your second webcam and reload the page."
            : "No cameras were detected."
        );

        // If exactly one camera exists, keep it available as the entry camera.
        if (cameras.length === 1) {
          const entryStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: cameras[0].deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          entryStreamRef.current = entryStream;
          setEntryDeviceId(cameras[0].deviceId);
          if (entryVideoRef.current) {
            entryVideoRef.current.srcObject = entryStream;
            await entryVideoRef.current.play().catch(() => {});
          }
        }
        return;
      }

      // Browser camera ordering is not guaranteed to match OpenCV indices.
      // For this prototype we use the first two detected video devices.
      const entryStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: cameras[0].deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const exitStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: cameras[1].deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      entryStreamRef.current = entryStream;
      exitStreamRef.current = exitStream;
      setEntryDeviceId(cameras[0].deviceId);
      setExitDeviceId(cameras[1].deviceId);

      if (entryVideoRef.current) {
        entryVideoRef.current.srcObject = entryStream;
        await entryVideoRef.current.play().catch(() => {});
      }

      if (exitVideoRef.current) {
        exitVideoRef.current.srcObject = exitStream;
        await exitVideoRef.current.play().catch(() => {});
      }

      setEntryCameraState("active");
      setExitCameraState("active");
    } catch (error) {
      console.error("Two-camera access error:", error);

      stopStream(entryStreamRef, entryVideoRef);
      stopStream(exitStreamRef, exitVideoRef);

      setEntryCameraState("error");
      setExitCameraState("error");

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser and try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("One or both cameras could not be found.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setCameraError("One or both cameras are already being used by another application.");
      } else {
        setCameraError("Unable to access both cameras. Check the webcams and browser permissions.");
      }
    }
  };

  const changeCamera = async (cameraRole) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by this browser.");
      return;
    }

    if (changingCamera) return;

    try {
      setChangingCamera(cameraRole);
      setCameraError("");

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setCameraDevices(cameras);

      if (cameras.length < 2) {
        setCameraError(
          "Only one camera is available. Connect another webcam to change cameras."
        );
        return;
      }

      const currentDeviceId =
        cameraRole === "entry" ? entryDeviceId : exitDeviceId;
      const otherDeviceId =
        cameraRole === "entry" ? exitDeviceId : entryDeviceId;

      const currentIndex = cameras.findIndex(
        (device) => device.deviceId === currentDeviceId
      );

      let nextDevice = null;

      for (let step = 1; step <= cameras.length; step += 1) {
        const candidate =
          cameras[(currentIndex + step + cameras.length) % cameras.length];

        if (candidate.deviceId !== otherDeviceId) {
          nextDevice = candidate;
          break;
        }
      }

      if (!nextDevice) {
        setCameraError("No different camera is available.");
        return;
      }

      const isEntry = cameraRole === "entry";
      const streamRef = isEntry ? entryStreamRef : exitStreamRef;
      const videoRef = isEntry ? entryVideoRef : exitVideoRef;
      const setState = isEntry ? setEntryCameraState : setExitCameraState;
      const setDeviceId = isEntry ? setEntryDeviceId : setExitDeviceId;

      stopStream(streamRef, videoRef);
      setState("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: nextDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setDeviceId(nextDevice.deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setState("active");
      setCaptureMessage(
        `${isEntry ? "Entry" : "Exit"} camera changed to ${
          nextDevice.label || "another camera"
        }.`
      );
      setVerificationState("idle");
      setMatchedStudent(null);
    } catch (error) {
      console.error(`Change ${cameraRole} camera error:`, error);

      const isEntry = cameraRole === "entry";
      const setState = isEntry ? setEntryCameraState : setExitCameraState;
      setState("error");

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Camera permission was denied. Allow camera access and try again."
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setCameraError("The selected camera could not be found.");
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        setCameraError(
          "That camera is already being used by another application."
        );
      } else {
        setCameraError("Unable to switch to the selected camera.");
      }
    } finally {
      setChangingCamera(null);
    }
  };

  const stopAllCameras = () => {
    if (detectionFrameRef.current.entry !== null) {
      cancelAnimationFrame(detectionFrameRef.current.entry);
      detectionFrameRef.current.entry = null;
    }
    if (detectionFrameRef.current.exit !== null) {
      cancelAnimationFrame(detectionFrameRef.current.exit);
      detectionFrameRef.current.exit = null;
    }

    consecutiveFacesRef.current = { entry: 0, exit: 0 };
    processingRef.current = { entry: false, exit: false };

    stopStream(entryStreamRef, entryVideoRef);
    stopStream(exitStreamRef, exitVideoRef);
    setEntryCameraState("idle");
    setExitCameraState("idle");
    setEntryDeviceId("");
    setExitDeviceId("");
    setCaptureMessage("");
    setVerificationState("idle");
    setMatchedStudent(null);
  };

  const captureFrame = async (cameraRole = "entry") => {
    const video = cameraRole === "entry" ? entryVideoRef.current : exitVideoRef.current;
    const cameraState = cameraRole === "entry" ? entryCameraState : exitCameraState;

    if (!video || cameraState !== "active") return;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    canvasRef.current = canvas;

    setMatchedStudent(null);
    setVerificationState("checking");
    setCaptureMessage(
      `${cameraRole === "entry" ? "Entry" : "Exit"} camera captured — checking with the student photos...`
    );

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Unable to create captured image."));
          },
          "image/jpeg",
          0.90
        );
      });

      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const formData = new FormData();
      formData.append("image", blob, `${cameraRole}_live_capture.jpg`);
      formData.append("timing", todayIso);
      formData.append("period", String(selectedPeriod));
      formData.append("camera_role", cameraRole);

      const response = await fetch(
        `${API_BASE_URL}/student/verify-student-face/`,
        {
          method: "POST",
          body: formData,
        }
      );

      let data = {};
      try {
        data = await response.json();
      } catch {
        throw new Error(`Backend returned an invalid response (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Face verification failed (${response.status}).`
        );
      }

      if (data.matched && data.student) {
        setMatchedStudent(data.student);
        setVerificationState("matched");
        setCaptureMessage(
          `Face matched — ${data.student.student_name} (${data.student.register_no}). Attendance marked Present for Period ${selectedPeriod}.`
        );

        if (data.attendance && onAttendanceMarked) {
          onAttendanceMarked({
            student: data.student,
            attendance: data.attendance,
          });
        }
      } else {
        setMatchedStudent(null);
        setVerificationState("not-matched");
        setCaptureMessage(data.message || "No matching student found.");
      }
    } catch (error) {
      console.error("Face verification error:", error);
      setMatchedStudent(null);
      setVerificationState("error");
      setCaptureMessage(
        error.message || "Unable to verify the captured face."
      );
    }
  };

  // Load one lightweight MediaPipe detector per camera. The detector only answers
  // "is there a face?". Django still performs the actual identity recognition.
  // Keeping separate VIDEO-mode detectors prevents the two camera streams from
  // interfering with each other's timestamps/state.
  useEffect(() => {
    let cancelled = false;

    const loadFaceDetectors = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const detectorOptions = {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.60,
        };

        const [entryDetector, exitDetector] = await Promise.all([
          FaceDetector.createFromOptions(vision, detectorOptions),
          FaceDetector.createFromOptions(vision, detectorOptions),
        ]);

        if (cancelled) {
          entryDetector.close();
          exitDetector.close();
          return;
        }

        entryFaceDetectorRef.current = entryDetector;
        exitFaceDetectorRef.current = exitDetector;
        setFaceDetectorReady(true);
      } catch (error) {
        console.error("Face detector initialization error:", error);

        if (!cancelled) {
          setFaceDetectorReady(false);
          setCameraError(
            "Unable to load automatic face detection. Check your internet connection and reload the page."
          );
        }
      }
    };

    loadFaceDetectors();

    return () => {
      cancelled = true;
      setFaceDetectorReady(false);

      if (entryFaceDetectorRef.current) {
        entryFaceDetectorRef.current.close();
        entryFaceDetectorRef.current = null;
      }

      if (exitFaceDetectorRef.current) {
        exitFaceDetectorRef.current.close();
        exitFaceDetectorRef.current = null;
      }
    };
  }, []);

  // Keep the latest capture function available to the detection loop without
  // restarting requestAnimationFrame every time React state changes.
  captureFrameRef.current = captureFrame;

  // Watch each camera continuously. A face must be detected in two consecutive
  // checks before capture. After a capture, that camera waits five seconds
  // before allowing another automatic capture.
  useEffect(() => {
    if (!faceDetectorReady) return undefined;

    const startDetection = (cameraRole) => {
      const isEntry = cameraRole === "entry";
      const getVideo = () => (isEntry ? entryVideoRef.current : exitVideoRef.current);
      const getState = () => (isEntry ? entryCameraState : exitCameraState);
      const getDetector = () =>
        isEntry ? entryFaceDetectorRef.current : exitFaceDetectorRef.current;

      if (!getVideo() || !getDetector()) return;

      const detect = (timestamp) => {
        const currentVideo = getVideo();
        const currentState = getState();
        const detector = getDetector();

        if (!currentVideo || currentState !== "active" || !detector) {
          detectionFrameRef.current[cameraRole] = null;
          return;
        }

        const lastDetection = detectionTimingRef.current[cameraRole];
        if (timestamp - lastDetection < FACE_DETECTION_INTERVAL_MS) {
          detectionFrameRef.current[cameraRole] = requestAnimationFrame(detect);
          return;
        }

        detectionTimingRef.current[cameraRole] = timestamp;

        if (
          currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          currentVideo.videoWidth > 0 &&
          currentVideo.videoHeight > 0
        ) {
          try {
            // requestAnimationFrame timestamps are monotonic. Each camera has
            // its own detector, so timestamps cannot conflict between streams.
            const result = detector.detectForVideo(currentVideo, timestamp);
            const hasFace = (result.detections || []).length > 0;

            consecutiveFacesRef.current[cameraRole] = hasFace
              ? consecutiveFacesRef.current[cameraRole] + 1
              : 0;

            if (hasFace && consecutiveFacesRef.current[cameraRole] >= FACE_CONFIRMATION_FRAMES) {
              const nowMs = Date.now();
              const cooldownPassed =
                nowMs - lastCaptureTimeRef.current[cameraRole] >= CAPTURE_COOLDOWN_MS;

              if (!processingRef.current[cameraRole] && cooldownPassed) {
                // Reserve the cooldown BEFORE starting the request so a second
                // animation frame cannot trigger another request.
                lastCaptureTimeRef.current[cameraRole] = nowMs;
                processingRef.current[cameraRole] = true;
                consecutiveFacesRef.current[cameraRole] = 0;

                setCaptureMessage(
                  `${isEntry ? "Entry" : "Exit"} camera detected a face — capturing automatically...`
                );

                const capturePromise = captureFrameRef.current?.(cameraRole);

                Promise.resolve(capturePromise)
                  .catch((error) => {
                    console.error(`${cameraRole} automatic capture error:`, error);
                  })
                  .finally(() => {
                    processingRef.current[cameraRole] = false;
                  });
              }
            }
          } catch (error) {
            console.error(`${cameraRole} face detection error:`, error);
          }
        }

        detectionFrameRef.current[cameraRole] = requestAnimationFrame(detect);
      };

      detectionFrameRef.current[cameraRole] = requestAnimationFrame(detect);
    };

    if (entryCameraState === "active") startDetection("entry");
    if (exitCameraState === "active") startDetection("exit");

    return () => {
      if (detectionFrameRef.current.entry !== null) {
        cancelAnimationFrame(detectionFrameRef.current.entry);
        detectionFrameRef.current.entry = null;
      }

      if (detectionFrameRef.current.exit !== null) {
        cancelAnimationFrame(detectionFrameRef.current.exit);
        detectionFrameRef.current.exit = null;
      }

      consecutiveFacesRef.current = { entry: 0, exit: 0 };
    };
  }, [faceDetectorReady, entryCameraState, exitCameraState]);

  useEffect(() => {
    startTwoCameras();

    return () => {
      if (detectionFrameRef.current.entry !== null) {
        cancelAnimationFrame(detectionFrameRef.current.entry);
      }
      if (detectionFrameRef.current.exit !== null) {
        cancelAnimationFrame(detectionFrameRef.current.exit);
      }
      stopStream(entryStreamRef, entryVideoRef);
      stopStream(exitStreamRef, exitVideoRef);
    };
    // Cameras are intentionally requested once when this section mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cameraStatusText = (state) => {
    if (state === "active") return "Camera Active";
    if (state === "requesting") return "Requesting...";
    if (state === "error") return "Camera Error";
    return "Camera Off";
  };

  const renderCamera = ({
    title,
    number,
    role,
    roleLabel,
    cameraKey,
    videoRef,
    state,
    colorClass,
  }) => (
    <div className="sa-dual-camera-panel">
      <div className="sa-dual-camera-head">
        <div className="sa-dual-camera-title">
          <div className={`sa-dual-camera-icon ${colorClass}`}>{role}</div>
          <div>
            <h3>{title}</h3>
            <p>Camera {number} • {roleLabel}</p>
          </div>
        </div>

        <span className={`sa-camera-status is-${state}`}>
          {cameraStatusText(state)}
        </span>
      </div>

      <div className="sa-dual-camera-frame">
        {state !== "active" && (
          <div className="sa-camera-placeholder">
            <div className="sa-camera-placeholder-icon">
              <Icon name="camera" size={38} />
            </div>
            <h3>{state === "requesting" ? "Connecting camera..." : "Camera unavailable"}</h3>
            <p>
              {state === "requesting"
                ? "Please allow camera access."
                : "Check the webcam connection and browser permission."}
            </p>
          </div>
        )}

        <video
          ref={videoRef}
          className={`sa-camera-video ${state === "active" ? "is-visible" : ""}`}
          autoPlay
          playsInline
          muted
        />

        {state === "active" && (
          <div className="sa-dual-camera-overlay">
            <span>CAMERA {number}</span>
            <strong>{roleLabel.toUpperCase()}</strong>
          </div>
        )}
      </div>

      <div className="sa-dual-camera-footer">
        <span className="sa-dual-camera-connection">
          <i className={state === "active" ? "is-online" : "is-offline"} />
          {state === "active" ? "Live stream" : cameraStatusText(state)}
        </span>

        {state === "active" && (
          <div className="sa-dual-camera-actions">
            <button
              type="button"
              className="sa-mini-change-btn"
              onClick={() => changeCamera(cameraKey)}
              disabled={
                verificationState === "checking" ||
                changingCamera !== null ||
                cameraDevices.length < 2
              }
              title={
                cameraDevices.length < 2
                  ? "Connect at least two cameras to change camera"
                  : "Switch this camera to another connected webcam"
              }
            >
              <span className="sa-change-camera-icon" aria-hidden="true">↻</span>
              {changingCamera === cameraKey ? "Changing..." : "Change Camera"}
            </button>

            <span className="sa-auto-detect-status" title="Face detection is handled in the browser; identity verification is sent to Django.">
              <i className="sa-auto-detect-dot" />
              {faceDetectorReady ? "Auto detection ON" : "Loading detector..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section
      className="sa-today-page"
      id="today-attendance"
      aria-labelledby="today-attendance-title"
    >
      <div className="sa-today-page-head">
        <div>
          <h2 id="today-attendance-title">Today Attendance</h2>
          <p>Monitor entry and exit cameras and verify student faces</p>
        </div>

        <strong className="sa-today-date-head">{todayLabel}</strong>
      </div>

      <div className="sa-today-workspace sa-two-camera-workspace">
        {/* LEFT: TWO CAMERAS */}
        <div className="sa-today-left">
          <section className="sa-camera-card sa-dual-camera-card">
            <div className="sa-camera-card-head">
              <div className="sa-camera-title">
                <Icon name="camera" size={22} />
                <h3>Live Camera Monitoring</h3>
              </div>

              <span
                className={`sa-camera-status ${
                  entryCameraState === "active" && exitCameraState === "active"
                    ? "is-active"
                    : "is-error"
                }`}
              >
                {entryCameraState === "active" && exitCameraState === "active"
                  ? "2 Cameras Active"
                  : "Check Cameras"}
              </span>
            </div>

            <div className="sa-dual-camera-grid">
              {renderCamera({
                title: "Entry Camera",
                number: "01",
                role: "IN",
                roleLabel: "Entrance",
                cameraKey: "entry",
                videoRef: entryVideoRef,
                state: entryCameraState,
                colorClass: "is-entry",
              })}

              {renderCamera({
                title: "Exit Camera",
                number: "02",
                role: "OUT",
                roleLabel: "Exit",
                cameraKey: "exit",
                videoRef: exitVideoRef,
                state: exitCameraState,
                colorClass: "is-exit",
              })}
            </div>

            {cameraError && (
              <div className="sa-camera-error" role="alert">
                {cameraError}
              </div>
            )}

            <div className="sa-camera-actions sa-camera-actions-two">
              <button
                type="button"
                className="sa-camera-btn is-start"
                onClick={startTwoCameras}
                disabled={entryCameraState === "requesting" || exitCameraState === "requesting"}
              >
                <Icon name="camera" size={18} />
                Restart Cameras
              </button>

              <button
                type="button"
                className="sa-camera-btn is-stop"
                onClick={stopAllCameras}
                disabled={entryCameraState === "idle" && exitCameraState === "idle"}
              >
                <span className="sa-stop-icon" />
                Stop Cameras
              </button>
            </div>

            <div className={`sa-camera-info is-${verificationState}`}>
              <span>
                {verificationState === "matched"
                  ? "✓"
                  : verificationState === "not-matched" || verificationState === "error"
                    ? "!"
                    : "i"}
              </span>
              <p>
                {captureMessage || "Both cameras are monitored independently. A face is detected automatically and sent to Django for verification."}
              </p>
            </div>

            {matchedStudent && (
              <div className="sa-verification-result is-matched">
                <div className="sa-verification-result-head">
                  <strong>Face Match Successful</strong>
                  <span>Matched</span>
                </div>

                <div className="sa-verification-student">
                  <Avatar
                    student={{
                      name: matchedStudent.student_name,
                      photo: matchedStudent.stu_photo || null,
                    }}
                  />

                  <div>
                    <strong>{matchedStudent.student_name}</strong>
                    <p>Register No. {matchedStudent.register_no}</p>
                    <p>S.No. {matchedStudent.s_no}</p>
                  </div>
                </div>

                {matchedStudent?.verification && (
                  <div className="sa-verification-meta">
                    <span>
                      Distance: {Number(matchedStudent.verification.distance).toFixed(4)}
                    </span>
                    {matchedStudent.verification.confidence != null && (
                      <span>
                        Confidence: {matchedStudent.verification.confidence}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {verificationState === "not-matched" && (
              <div className="sa-verification-result is-not-matched">
                <strong>No matching student found</strong>
                <p>The captured face did not match any registered student photo.</p>
              </div>
            )}

            {verificationState === "error" && (
              <div className="sa-verification-result is-error">
                <strong>Verification failed</strong>
                <p>{captureMessage}</p>
              </div>
            )}
          </section>

          <section className="sa-session-card">
            <div className="sa-session-card-head">
              <div className="sa-session-title">
                <Icon name="book" size={22} />
                <h3>Current Session</h3>
              </div>
              <span className="sa-session-live">Ongoing</span>
            </div>

            <h2>{currentSession.subject}</h2>
            <p>Period {selectedPeriod}&nbsp; · &nbsp;{to12h(currentSession.start)} – {to12h(currentSession.end)}</p>
            <p>Professor: {currentSession.teacher}</p>
          </section>
        </div>

        {/* RIGHT: STUDENT TABLE */}
        <section className="sa-students-card">
          <div className="sa-students-head">
            <div className="sa-students-title">
              <Icon name="users" size={23} />
              <h3>Students in Class</h3>
            </div>

            <div className="sa-period-control" aria-label="Attendance period selector">
              <button
                type="button"
                onClick={onPreviousPeriod}
                disabled={selectedPeriod <= 1}
                aria-label="Previous period"
              >
                ‹
              </button>
              <strong>Period {selectedPeriod}</strong>
              <button
                type="button"
                onClick={onNextPeriod}
                disabled={selectedPeriod >= MAX_ATTENDANCE_PERIOD}
                aria-label="Next period"
              >
                ›
              </button>
            </div>

            <div className="sa-students-summary">
              <span>Total: {students.length}</span>
              <span>Present: {presentCount}</span>
              <span>Absent: {absentCount}</span>
              <span>Pending: {pendingCount}</span>
            </div>
          </div>

          <div className="sa-roster-wrap">
            <table className="sa-roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Register No.</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={student.id ?? student.registerNo}
                    className={
                      Number(student.id) === Number(recentlyMarkedStudentId)
                        ? "is-just-marked"
                        : undefined
                    }
                  >
                    <td>{index + 1}</td>
                    <td><Avatar student={student} /></td>
                    <td className="sa-roster-name">{student.name}</td>
                    <td>{student.registerNo}</td>
                    <td>
                      <span
                        className={`sa-attendance-pill ${
                          student.status === "P"
                            ? "is-present"
                            : student.status === "A"
                              ? "is-absent"
                              : "is-pending"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className={student.status === "-" ? "sa-muted" : ""}>{student.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sa-pagination">
            <button type="button" aria-label="Previous page">‹</button>
            <button type="button" className="is-active" aria-current="page">1</button>
            <button type="button">2</button>
            <button type="button" aria-label="Next page">›</button>
          </div>
        </section>
      </div>
    </section>
  );
}

/**
 * Mock day status. Replace with a lookup built from your attendance API,
 * e.g. { "2026-09-04": "absent", "2026-09-07": "present", ... }
 */
function mockDayStatus(year, month, day, today) {
  const dow = new Date(year, month, day).getDay();
  if (dow === 0 || dow === 6) return "off";
  if (year !== today.getFullYear() || month !== today.getMonth()) return null;
  if (day > today.getDate()) return null;
  if (day === 14) return "holiday";
  if ([4, 10, 16].includes(day)) return "absent";
  return "present";
}

const GLYPH = { present: "✓", absent: "✕", holiday: "•" };
const DAY_LABEL = { present: "Present", absent: "Absent", holiday: "Holiday", off: "No class" };

function CalendarCard({ now }) {
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const { cells, presentDays, absentDays } = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // week starts on Monday
    const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const list = Array(lead).fill(null);
    let p = 0;
    let a = 0;
    for (let d = 1; d <= count; d += 1) {
      const status = mockDayStatus(cursor.y, cursor.m, d, now);
      if (status === "present") p += 1;
      if (status === "absent") a += 1;
      list.push({ d, status });
    }
    return { cells: list, presentDays: p, absentDays: a };
  }, [cursor, now]);

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shift = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <section className="sa-card" aria-labelledby="cal-title">
      <div className="sa-card-head">
        <div>
          <h2 id="cal-title">Attendance calendar</h2>
          <p>
            {presentDays} days present, {absentDays} absent this month
          </p>
        </div>
      </div>

      <div className="sa-cal-nav">
        <button type="button" className="sa-icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
          <Icon name="left" />
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          className="sa-icon-btn"
          onClick={() => shift(1)}
          aria-label="Next month"
          disabled={isCurrentMonth}
        >
          <Icon name="right" />
        </button>
      </div>

      <div className="sa-cal-grid" key={title}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="sa-cal-dow">
            {d}
          </span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <span
              key={cell.d}
              className={`sa-day is-${cell.status ?? "none"}${
                isCurrentMonth && cell.d === now.getDate() ? " is-today" : ""
              }`}
            >
              <span>{cell.d}</span>
              <span className="sa-day-mark" aria-hidden="true">
                {GLYPH[cell.status] ?? ""}
              </span>
              {cell.status && <span className="sa-sr">{DAY_LABEL[cell.status]}</span>}
            </span>
          )
        )}
      </div>

      <ul className="sa-legend">
        <li>
          <i className="sa-swatch is-present">✓</i> Present
        </li>
        <li>
          <i className="sa-swatch is-absent">✕</i> Absent
        </li>
        <li>
          <i className="sa-swatch is-holiday">•</i> Holiday
        </li>
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StudentAttendanceDashboard({
  student = STUDENT,
  subjects = SUBJECTS,
  timetable = TIMETABLE,
  recent = RECENT,
  initialNotifications = NOTIFICATIONS,
  showConfidence = true, // hide the AI recognition column if you don't want to expose it
  onLogout = () => {},
}) {
  const now = useNow();
  const ready = useReady();
  const [active, setActive] = useState("dashboard");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [todayStudents, setTodayStudents] = useState(TODAY_STUDENTS);
  const [studentsError, setStudentsError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [recentlyMarkedStudentId, setRecentlyMarkedStudentId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        setStudentsError("");
        const data = await fetchTodayStudents(selectedPeriod);
        if (!cancelled) setTodayStudents(data);
      } catch (error) {
        console.error("Unable to load today's students:", error);
        if (!cancelled) {
          setStudentsError(
            "Unable to load students from Django. Showing the existing frontend data."
          );
        }
      }
    };

    loadStudents();

    // Refresh the selected period automatically so newly marked attendance
    // appears without changing the date or reloading the page.
    const refreshId = setInterval(loadStudents, 15000);

    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, [selectedPeriod, now.getFullYear(), now.getMonth(), now.getDate()]);

  const handleAttendanceMarked = ({ student, attendance }) => {
    if (!student) return;

    const attendancePeriod = Number(
      attendance?.period ?? selectedPeriod
    );

    // Only update the visible table if the returned attendance belongs
    // to the period currently displayed.
    if (attendancePeriod !== Number(selectedPeriod)) return;

    const status = attendance?.status === "A" ? "A" : "P";
    const attendanceTime = attendance?.update_time
      ? formatAttendanceTime(attendance.update_time)
      : formatAttendanceTime(new Date().toISOString());

    setTodayStudents((currentStudents) =>
      currentStudents.map((item) =>
        Number(item.id) === Number(student.id)
          ? {
              ...item,
              status,
              present: status === "P",
              time: attendanceTime,
            }
          : item
      )
    );

    setRecentlyMarkedStudentId(Number(student.id));

    window.setTimeout(() => {
      setRecentlyMarkedStudentId((current) =>
        current === Number(student.id) ? null : current
      );
    }, 1600);
  };


  const totals = useMemo(() => {
    const total = subjects.reduce((s, x) => s + x.total, 0);
    const present = subjects.reduce((s, x) => s + x.present, 0);
    return { total, present, absent: total - present, pct: percent(present, total) };
  }, [subjects]);

  const overallTone = toneOf(totals.pct);
  const overallMargin = marginInfo(totals.present, totals.total);

  const go = (item) => {
    setActive(item.id);
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (!item.target) {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    document.getElementById(item.target)?.scrollIntoView({ behavior, block: "start" });
  };

  const navButtons = (className) =>
    NAV.map((item) => (
      <button
        key={item.id}
        type="button"
        className={className}
        aria-current={active === item.id ? "true" : undefined}
        onClick={() => go(item)}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </button>
    ));

  return (
    <div className="sa-app">
      <header className="sa-topbar">
        <div className="sa-brand">
          <span className="sa-brand-mark" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          Attendance System
        </div>
        <div className="sa-topbar-actions">
          <NotificationBell items={notifications} setItems={setNotifications} />
          <button
            type="button"
            className="sa-profile-btn"
            onClick={() => go(NAV.find((item) => item.id === "profile"))}
          >
            <Avatar student={student} />
            <span className="sa-profile-name">Profile</span>
          </button>
        </div>
      </header>

      <div className="sa-shell">
        <aside className="sa-sidebar" aria-label="Main navigation">
          <nav className="sa-nav">{navButtons("sa-nav-btn")}</nav>
          <button type="button" className="sa-nav-btn sa-logout" onClick={onLogout}>
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </aside>

        <main className="sa-main">
          {/* Student profile */}
          <section className="sa-card sa-hero" id="student-profile" aria-labelledby="greeting">
            <Avatar student={student} large />
            <div>
              <h1 id="greeting">
                {greetingFor(now)}, {student.name}
              </h1>
              <p className="sa-hero-sub">Register no. {student.registerNo}</p>
            </div>
            <dl className="sa-facts">
              <div>
                <dt>Program</dt>
                <dd>{student.program}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{student.department}</dd>
              </div>
              <div>
                <dt>Current semester</dt>
                <dd>{student.semester}</dd>
              </div>
            </dl>
          </section>

          {/* Today attendance / camera */}
          {studentsError && (
            <div className="sa-api-warning" role="status">
              {studentsError}
            </div>
          )}
          <CameraAttendanceCard
            now={now}
            students={todayStudents}
            selectedPeriod={selectedPeriod}
            onPreviousPeriod={() => setSelectedPeriod((p) => Math.max(1, p - 1))}
            onNextPeriod={() => setSelectedPeriod((p) => Math.min(MAX_ATTENDANCE_PERIOD, p + 1))}
            currentSession={timetable.find((slot) => Number(slot.period) === Number(selectedPeriod)) || timetable[0] || { subject: "No subject", teacher: "-", start: "00:00", end: "00:00" }}
            onAttendanceMarked={handleAttendanceMarked}
            recentlyMarkedStudentId={recentlyMarkedStudentId}
          />

          {/* Overall attendance */}
          <section className="sa-stats" aria-label="Attendance summary">
            <article className={`sa-card sa-overall is-${overallTone}`}>
              <Ring value={totals.pct} tone={overallTone} ready={ready} />
              <div>
                <h2>Overall attendance</h2>
                <span className="sa-chip">{TONE_LONG[overallTone]}</span>
                <p className="sa-overall-note">
                  {overallMargin.ok
                    ? `You can miss ${overallMargin.n} more ${overallMargin.n === 1 ? "class" : "classes"} and stay above ${MIN_ATTENDANCE}%.`
                    : `Attend the next ${overallMargin.n} ${overallMargin.n === 1 ? "class" : "classes"} to get back to ${MIN_ATTENDANCE}%.`}
                </p>
              </div>
            </article>
            <Stat label="Present" value={totals.present} tone="good" delay={300} />
            <Stat label="Absent" value={totals.absent} tone="critical" delay={380} />
            <Stat label="Total classes" value={totals.total} tone="muted" delay={460} />
          </section>

          <div className="sa-split">
            {/* Subject-wise attendance */}
            <section className="sa-card" id="subject-attendance" aria-labelledby="subjects-title">
              <div className="sa-card-head">
                <h2 id="subjects-title">Subject-wise attendance</h2>
                <p>The line on each bar marks {MIN_ATTENDANCE}%</p>
              </div>
              <ul className="sa-subjects">
                {subjects.map((s, i) => {
                  const pct = percent(s.present, s.total);
                  const tone = toneOf(pct);
                  const margin = marginInfo(s.present, s.total);
                  let hint;
                  if (margin.ok) hint = margin.n === 0 ? "Attend every class" : `Can miss ${margin.n} more`;
                  else hint = `Attend next ${margin.n} to recover`;
                  return (
                    <li key={s.code} className={`sa-subject is-${tone}`}>
                      <div className="sa-subject-head">
                        <div>
                          <h3>
                            {s.name}
                            <span className="sa-chip sa-chip-sm">{TONE_LABEL[tone]}</span>
                          </h3>
                          <p className="sa-code">{s.code}</p>
                        </div>
                        <span className="sa-pct">{pct.toFixed(1)}%</span>
                      </div>
                      <Bar pct={pct} tone={tone} ready={ready} index={i} label={`${s.name} attendance`} />
                      <p className="sa-subject-foot">
                        <span>{s.present} present</span>
                        <span>{s.total - s.present} absent</span>
                        <span>{s.total} total</span>
                        <span className="sa-hint">{hint}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Today's timetable */}
            <section className="sa-card" id="todays-timetable" aria-labelledby="tt-title">
              <div className="sa-card-head">
                <h2 id="tt-title">Today's timetable</h2>
                <p>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <Timetable slots={timetable} now={now} />
            </section>
          </div>


          <div className="sa-split">
            {/* Recent attendance */}
            <section className="sa-card" id="recent-attendance" aria-labelledby="recent-title">
              <div className="sa-card-head">
                <h2 id="recent-title">Recent attendance</h2>
                <p>Latest {recent.length} records</p>
              </div>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Period</th>
                      <th scope="col">Time</th>
                      <th scope="col">Status</th>
                      {showConfidence && <th scope="col">Recognition</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.subject}</td>
                        <td>{r.period}</td>
                        <td>{to12h(r.time)}</td>
                        <td>
                          <span className={`sa-status ${r.present ? "is-good" : "is-critical"}`}>
                            {r.present ? "✓ Present" : "✕ Absent"}
                          </span>
                        </td>
                        {showConfidence && (
                          <td className={r.confidence == null ? "sa-muted" : undefined}>
                            {r.confidence == null ? "Not detected" : `${r.confidence.toFixed(1)}%`}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Attendance calendar */}
            <CalendarCard now={now} />
          </div>
        </main>
      </div>

      {/* Mobile navigation */}
      <nav className="sa-bottomnav" aria-label="Main navigation">
        {navButtons("sa-bottom-btn")}
        <button type="button" className="sa-bottom-btn" onClick={onLogout}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}


