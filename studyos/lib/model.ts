export const kinds = [
  "task",
  "assignment",
  "exam",
  "event",
  "habit",
  "habitLog",
  "note",
  "goal",
  "session",
  "pomodoro",
  "profile",
  "subject",
  "attendance",
  "notification",
] as const;
export type Kind = (typeof kinds)[number];
export type Check = { id: string; title: string; done: boolean };
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  subject: string;
  date: string;
  time: string;
  status: "Pending" | "In Progress" | "Completed";
  priority: "Low" | "Medium" | "High";
  body: string;
  subtype?: string;
  location?: string;
  progress?: number;
  steps?: Check[];
  recurrence?: string;
  parent?: string;
  minutes?: number;
  color?: string;
  pinned?: boolean;
  order?: number;
  attachment?: { name: string; path: string; local?: boolean };
  college?: string;
  branch?: string;
  semester?: string;
  photo?: string;
  credits?: number;
  score?: number;
  attended?: number;
  total?: number;
  completedOn?: string;
  deleted?: boolean;
  updated: string;
  version: number;
};
export type View =
  | "Dashboard"
  | "Calendar"
  | "Assignments"
  | "Exams"
  | "Tasks"
  | "Habits"
  | "Focus timer"
  | "Notes"
  | "Goals"
  | "Attendance"
  | "Analytics"
  | "Study assistant"
  | "Student tools"
  | "Settings";
export function localDay(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function shift(date: string, n: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDay(d);
}
export function daysUntil(date: string, base = localDay()) {
  return Math.round(
    (Date.parse(date + "T12:00:00Z") - Date.parse(base + "T12:00:00Z")) /
      86400000,
  );
}
export function pretty(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) {
  return date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", options)
    : "Unscheduled";
}
export function clock(time: string) {
  if (!time) return "All day";
  const [h, m] = time.split(":").map(Number);
  return (
    (h % 12 || 12) +
    ":" +
    String(m).padStart(2, "0") +
    " " +
    (h >= 12 ? "PM" : "AM")
  );
}
export function duration(mins: number) {
  const m = Math.round(mins);
  return m >= 60
    ? Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "")
    : m + "m";
}
export function makeEntry(
  kind: Kind,
  title = "",
  props: Partial<Entry> = {},
): Entry {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    subject: "",
    date: localDay(),
    time: "",
    status: "Pending",
    priority: "Medium",
    body: "",
    updated: new Date().toISOString(),
    version: 0,
    ...props,
  };
}
export const labels: Record<Kind, string> = {
  task: "Task",
  assignment: "Assignment",
  exam: "Exam",
  event: "Event",
  habit: "Habit",
  habitLog: "Habit log",
  note: "Note",
  goal: "Goal",
  session: "Study session",
  pomodoro: "Focus session",
  profile: "Profile",
  subject: "Subject",
  attendance: "Attendance",
  notification: "Reminder",
};
export const subjectNames = [
  "Mathematics",
  "Computer Science",
  "Physics",
  "English",
];
export function tone(e: Entry) {
  return (
    e.color ||
    (
      {
        task: "blue",
        assignment: "violet",
        exam: "amber",
        event: "mint",
        habit: "amber",
        session: "mint",
        pomodoro: "violet",
      } as Record<string, string>
    )[e.kind] ||
    "violet"
  );
}
export function streak(dates: string[], today = localDay()) {
  const set = new Set(dates);
  let d = set.has(today) ? today : shift(today, -1),
    n = 0;
  while (set.has(d)) {
    n++;
    d = shift(d, -1);
  }
  return n;
}
export function stats(items: Entry[], day = localDay()) {
  const tasks = items.filter((e) => e.kind === "task" && e.date === day),
    done = tasks.filter((e) => e.status === "Completed").length,
    sessions = items.filter(
      (e) =>
        ["pomodoro", "session"].includes(e.kind) && e.status === "Completed",
    ),
    minutes = sessions
      .filter((e) => e.date === day)
      .reduce((n, e) => n + (e.minutes || 0), 0),
    habits = items.filter((e) => e.kind === "habit"),
    logs = items.filter((e) => e.kind === "habitLog" && e.date === day);
  return {
    tasks,
    done,
    minutes,
    sessions,
    habits,
    logs,
    streak: streak(
      sessions.map((e) => e.date),
      day,
    ),
    score: Math.round(
      100 *
        (Math.min(minutes / 120, 1) * 0.4 +
          (tasks.length ? done / tasks.length : 0) * 0.35 +
          (habits.length ? Math.min(logs.length / habits.length, 1) : 0) *
            0.25),
    ),
  };
}
export function seed(): Entry[] {
  const today = localDay();
  const records: Entry[] = [];
  const add = (kind: Kind, title: string, p: Partial<Entry> = {}) => {
    const e = makeEntry(kind, title, p);
    records.push(e);
    return e;
  };
  add("profile", "Alex Morgan", {
    semester: "3",
    branch: "Computer Science",
    body: "Build a consistent study routine.",
  });
  subjectNames.forEach((t) => add("subject", t));
  add("event", "Calculus lecture", {
    subject: "Mathematics",
    time: "09:00",
    subtype: "Class",
    status: "Completed",
    color: "violet",
  });
  add("task", "Review data structures", {
    subject: "Computer Science",
    time: "11:00",
    subtype: "Revision",
    color: "blue",
    priority: "High",
  });
  add("assignment", "Submit physics lab report", {
    subject: "Physics",
    time: "14:30",
    color: "amber",
    priority: "High",
    body: "Review the observations and submit the final lab report.",
  });
  add("event", "Linear algebra practice", {
    subject: "Mathematics",
    time: "16:00",
    subtype: "Study session",
    color: "mint",
  });
  [
    "Read chapter 4",
    "Organize lecture notes",
    "Review flashcards",
    "Practice derivatives",
    "Outline essay",
    "Check lab results",
    "Revise sorting algorithms",
  ].forEach((t, i) =>
    add("task", t, {
      subject: subjectNames[i % 4],
      status: i < 5 ? "Completed" : "Pending",
      order: i + 1,
      completedOn: i < 5 ? today : undefined,
    }),
  );
  add("assignment", "Algorithms problem set", {
    subject: "Computer Science",
    date: shift(today, 2),
    status: "In Progress",
    priority: "High",
  });
  add("exam", "Linear algebra midterm", {
    subject: "Mathematics",
    date: shift(today, 4),
    time: "10:00",
    subtype: "Mid Semester",
    progress: 45,
    location: "Room 204",
    body: "Vector spaces, linear transformations and eigenvalues.",
  });
  add("exam", "Mechanics practical", {
    subject: "Physics",
    date: shift(today, 8),
    time: "13:30",
    subtype: "Practical",
    progress: 20,
  });
  add("assignment", "Critical reading essay", {
    subject: "English",
    date: shift(today, 6),
  });
  const habits = [
    "Revise my notes",
    "Read for 20 minutes",
    "Study for 2 hours",
  ].map((t) => add("habit", t));
  for (let i = 0; i < 7; i++) {
    habits.forEach((h, j) => {
      if ((i === 0 && j < 2) || (i > 0 && (i + j) % 5 !== 0))
        add("habitLog", h.title, { parent: h.id, date: shift(today, -i) });
    });
  }
  [105, 150, 95, 125, 85, 130, 75].forEach((m, i) => {
    add("session", "Independent study", {
      minutes: m,
      date: shift(today, -i),
      subject: subjectNames[i % 4],
      status: "Completed",
    });
  });
  add("pomodoro", "Morning focus", {
    minutes: 25,
    subject: "Mathematics",
    status: "Completed",
  });
  add("note", "Linear algebra essentials", {
    subject: "Mathematics",
    body: "## Vector spaces\nA vector space is closed under addition and scalar multiplication.\n\n**Revision prompt**\nExplain linear independence using two vectors.",
    pinned: true,
  });
  add("goal", "Finish the algorithms unit", {
    subtype: "Academic",
    date: shift(today, 14),
    steps: ["Arrays and strings", "Sorting", "Trees and graphs"].map(
      (title, i) => ({ id: crypto.randomUUID(), title, done: i === 0 }),
    ),
    progress: 33,
  });
  return records;
}
