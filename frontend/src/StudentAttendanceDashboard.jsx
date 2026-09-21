import { useEffect, useMemo, useRef, useState } from "react";
import "./StudentAttendanceDashboard.css";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/*  Replace these with your Django REST responses later. The           */
/*  component accepts every one of them as a prop (see bottom of the   */
/*  component signature), so you can fetch in a parent and pass down.  */
/* ------------------------------------------------------------------ */

const MIN_ATTENDANCE = 75; // college minimum
const GOOD_FROM = 85; // at or above this = "Good"

// Django REST API
// Change this only if your Django server runs on another host/port.
const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_ATTENDANCE_PERIOD = 5;

const STUDENT = {
  name: "Gokul",
  registerNo: "24MCA001",
  program: "MCA",
  department: "Computer Applications",
  semester: "Semester 3",
  photo: null, // put an image URL here to replace the initials avatar
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/** How many classes can be missed (or must be attended) to stay at the minimum. */
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

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Flips to true shortly after mount so CSS transitions have a start state. */
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

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraState, setCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");
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

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraError("Camera access is not supported by this browser.");
      return;
    }

    try {
      setCameraError("");
      setCaptureMessage("");
      setCameraState("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraState("active");
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraState("error");

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser and try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setCameraError("The camera is already being used by another application.");
      } else {
        setCameraError("Unable to access the camera. Please check your camera and browser permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState("idle");
    setCaptureMessage("");
    setVerificationState("idle");
    setMatchedStudent(null);
  };

  const captureFrame = async () => {
    if (!videoRef.current || cameraState !== "active") return;
    if (verificationState === "checking") return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Capture the same mirrored image shown in the live camera preview.
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    canvasRef.current = canvas;

    setMatchedStudent(null);
    setVerificationState("checking");
    setCaptureMessage("Face captured — checking with the student photos...");

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
      formData.append("image", blob, "live_capture.jpg");
      formData.append("timing", todayIso);
      formData.append("period", String(selectedPeriod));

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

        // Immediately update the visible table from the successful backend response.
        // This changes only the matched student's row from '-' to 'P'.
        if (data.attendance && onAttendanceMarked) {
          onAttendanceMarked({
            student: data.student,
            attendance: data.attendance,
          });
        }
      } else {
        setMatchedStudent(null);
        setVerificationState("not-matched");
        setCaptureMessage(
          data.message || "No matching student found."
        );
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

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // Camera is intentionally requested once when this section mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="sa-today-page"
      id="today-attendance"
      aria-labelledby="today-attendance-title"
    >
      <div className="sa-today-page-head">
        <div>
          <h2 id="today-attendance-title">Today Attendance</h2>
          <p>Capture and verify student faces to mark attendance</p>
        </div>

        <strong className="sa-today-date-head">{todayLabel}</strong>
      </div>

      <div className="sa-today-workspace">
        {/* LEFT: CAMERA */}
        <div className="sa-today-left">
          <section className="sa-camera-card">
            <div className="sa-camera-card-head">
              <div className="sa-camera-title">
                <Icon name="camera" size={22} />
                <h3>Live Camera</h3>
              </div>

              <span className={`sa-camera-status is-${cameraState}`}>
                {cameraState === "active"
                  ? "Camera Active"
                  : cameraState === "requesting"
                    ? "Requesting..."
                    : cameraState === "error"
                      ? "Camera Error"
                      : "Camera Off"}
              </span>
            </div>

            <div className="sa-camera-frame sa-camera-frame-large">
              {cameraState !== "active" && (
                <div className="sa-camera-placeholder">
                  <div className="sa-camera-placeholder-icon">
                    <Icon name="camera" size={42} />
                  </div>
                  <h3>Camera access required</h3>
                  <p>Allow camera access to display the live camera.</p>
                </div>
              )}

              <video
                ref={videoRef}
                className={`sa-camera-video ${cameraState === "active" ? "is-visible" : ""}`}
                autoPlay
                playsInline
                muted
              />

              {cameraState === "active" && (
                <div className="sa-camera-frame-guide" aria-hidden="true">
                  <span className="corner top-left" />
                  <span className="corner top-right" />
                  <span className="corner bottom-left" />
                  <span className="corner bottom-right" />
                </div>
              )}
            </div>

            {cameraError && (
              <div className="sa-camera-error" role="alert">
                {cameraError}
              </div>
            )}

            <div className="sa-camera-actions sa-camera-actions-two">
              {cameraState === "active" ? (
                <button type="button" className="sa-camera-btn is-stop" onClick={stopCamera}>
                  <span className="sa-stop-icon" />
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  className="sa-camera-btn is-start"
                  onClick={startCamera}
                  disabled={cameraState === "requesting"}
                >
                  <Icon name="camera" size={18} />
                  {cameraState === "requesting" ? "Requesting Camera..." : "Start Camera"}
                </button>
              )}

              <button
                type="button"
                className="sa-camera-btn is-capture"
                onClick={captureFrame}
                disabled={cameraState !== "active" || verificationState === "checking"}
              >
                <Icon name="camera" size={18} />
                {verificationState === "checking" ? "Verifying..." : "Capture"}
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
                {captureMessage || "Camera is active. Click \"Capture\" to verify and mark attendance."}
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
                    <td>
                      <Avatar student={student} />
                    </td>
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
