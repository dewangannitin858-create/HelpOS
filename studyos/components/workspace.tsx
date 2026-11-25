"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  CheckSquare,
  Flame,
  Timer,
  NotebookPen,
  Target,
  ChartNoAxesCombined,
  Sparkles,
  Calculator,
  Settings2,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  PanelLeft,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  ArrowRight,
  Home,
  Clock3,
  Command,
  X,
  Check,
  Layers,
  ChevronsLeft,
  BookOpen,
  PanelLeftClose, CalendarCheck,
} from "lucide-react";
import {
  Entry,
  Kind,
  View,
  localDay,
  daysUntil,
  pretty,
  clock,
  labels,
  makeEntry,
} from "@/lib/model";
import { active, useStudy } from "@/lib/store";
import { useWorkspace } from "@/lib/use-workspace";
import { Dashboard } from "./dashboard";
import { Actions, Button, Modal, Empty, TypeIcon } from "./ui";
import { Editor, EditorSpec } from "./editor";
import { useFocus, FocusView } from "./focus";
import { Planner, Calendar, Habits } from "./planner";
import { Notes } from "./notes";
import { Analytics, Assistant, Utilities } from "./insights";
import { Settings } from "./settings"; import { Attendance } from "./attendance";
const groups: { name: string; items: View[] }[] = [
  { name: "Workspace", items: ["Dashboard", "Calendar", "Tasks", "Notes"] },
  { name: "Academics", items: ["Assignments", "Exams", "Goals", "Attendance"] },
  { name: "Productivity", items: ["Focus timer", "Habits", "Analytics"] },
];
const navIcons = {
  Dashboard: LayoutDashboard,
  Calendar: CalendarDays,
  Assignments: ClipboardList,
  Exams: GraduationCap,
  Tasks: CheckSquare,
  Habits: Flame,
  "Focus timer": Timer,
  Notes: NotebookPen,
  Goals: Target,
  Analytics: ChartNoAxesCombined,
  "Study assistant": Sparkles,
  "Student tools": Calculator,
  Settings: Settings2, Attendance: CalendarCheck,
};
const createKinds: Partial<Record<View, Kind>> = {
  Calendar: "event",
  Assignments: "assignment",
  Exams: "exam",
  Tasks: "task",
  Habits: "habit",
  Notes: "note",
  Goals: "goal",
};
const subtitles: Partial<Record<View, string>> = {
  Calendar: "Your academic schedule in one place.",
  Tasks: "Organize your daily work and track what’s done.",
  Assignments: "Keep coursework and upcoming deadlines in view.",
  Exams: "Plan your revision and track exam preparation.",
  Habits: "Build a consistent daily study routine.",
  Goals: "Track milestones for your academic and personal goals.",
  Notes: "Your subject folders, quick notes, and revisions.",
  "Focus timer": "Make time for uninterrupted study.",
  Analytics: "Explore your study time, progress, and consistency.",
  "Student tools": "Calculate grades and track semester performance.",
  Settings: "Manage your profile, preferences, and workspace data.",
  "Study assistant": "Study plans and revision support for your workspace.", Attendance: "Track your semester classes and daily lecture attendance.",
};
const viewSlug = (v: View) => v.toLowerCase().replaceAll(" ", "-");
export function Workspace() {
  const { entries: raw, owner, ready, error } = useStudy(),
    entries = useMemo(() => active(raw), [raw]),
    cloudState = useWorkspace();
  const [view, setView] = useState<View>("Dashboard"),
    [mini, collapse] = useState(false),
    [mobile, drawer] = useState(false),
    [dark, setDark] = useState(false),
    [now, setNow] = useState(() => new Date()),
    [editor, openEditor] = useState<EditorSpec | null>(null),
    [overlay, modal] = useState(""),
    [q, query] = useState(""),
    [message, setMessage] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((msg: string) => {
    setMessage(msg);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setMessage(""), 3500);
  }, []);
  const f = useFocus(owner, notify);
  const go = useCallback((v: View) => {
    setView(v);
    if (location.hash !== "#" + viewSlug(v)) location.hash = viewSlug(v);
    drawer(false);
    modal("");
    window.scrollTo({ top: 0 });
  }, []);
  const edit = useCallback(
    (kind: Kind, entry?: Entry, defaults?: Partial<Entry>) => {
      modal("");
      openEditor({ kind, entry, defaults });
    },
    [],
  );
  const actions: Actions = { go, edit, notify };
  useEffect(() => {
    function read() {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      const v = (Object.keys(navIcons) as View[]).find(
        (k) => viewSlug(k) === slug,
      );
      if (v) setView(v);
    }
    read();
    window.addEventListener("hashchange", read);
    setDark(localStorage.getItem("studyos.theme") === "dark");
    const t = setInterval(() => setNow(new Date()), 1000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      clearInterval(t);
      window.removeEventListener("hashchange", read);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  function theme() {
    localStorage.setItem("studyos.theme", dark ? "light" : "dark");
    setDark(!dark);
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        query("");
        modal((s) => (s === "search" ? "" : "search"));
      } else if (e.key === "Escape") {
        drawer(false);
      } else if (
        e.key.toLowerCase() === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !editor &&
        !overlay &&
        !(e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]",
        )
      ) {
        e.preventDefault();
        edit("task");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [edit, editor, overlay]);
  const day = localDay(now),
    profile = entries.find((e) => e.kind === "profile");
  const reminders = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.status !== "Completed" &&
            ((["assignment", "exam", "notification"].includes(e.kind) &&
              daysUntil(e.date, day) <= 3) ||
              (e.kind === "habit" &&
                !entries.some(
                  (l) =>
                    l.kind === "habitLog" &&
                    l.parent === e.id &&
                    l.date === day,
                )) ||
              (e.kind === "event" && e.date === day)),
        )
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [entries, day],
  );
  const minute = now.toTimeString().slice(0, 5);
  useEffect(() => {
    if (
      !ready ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    for (const e of reminders) {
      const key = ["studyos.reminded", owner, day, e.id].join(".");
      if (
        localStorage.getItem(key) ||
        (e.time && e.date === day && e.time > minute)
      )
        continue;
      new Notification(
        e.kind === "habit" ? "Daily habit" : "StudyOS reminder",
        { body: e.title + (e.kind === "habit" ? "" : " · " + pretty(e.date)) },
      );
      localStorage.setItem(key, "1");
    }
  }, [minute, day, ready, reminders, owner]);
  const navItem = (v: View) => {
    const I = navIcons[v];
    return (
      <button
        key={v}
        title={v}
        aria-current={view === v ? "page" : undefined}
        className={
          "nav-item " +
          (view === v ? "active" : "") +
          (v === "Study assistant" ? " assistant-nav" : "")
        }
        onClick={() => go(v)}
      >
        <I size={18} />
        <span>{v}</span>
        {v === "Study assistant" && (
          <Sparkles className="little-spark" size={12} />
        )}
      </button>
    );
  };
  const resultViews = (Object.keys(navIcons) as View[]).filter((v) =>
      v.toLowerCase().includes(q.toLowerCase()),
    ),
    found = q.trim()
      ? entries
          .filter(
            (e) =>
              [
                "task",
                "assignment",
                "exam",
                "note",
                "goal",
                "habit",
                "event",
              ].includes(e.kind) &&
              (e.title + " " + e.subject)
                .toLowerCase()
                .includes(q.toLowerCase()),
          )
          .slice(0, 10)
      : [];
  const create = createKinds[view];
  return (
    <div
      className={
        "shell " + (mini ? "compact " : "") + (mobile ? "mobile-open" : "")
      }
    >
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => drawer(false)}
        />
      )}
      <aside className="sidebar">
        <div className="brand-row">
          <button
            className="brand"
            onClick={() => go("Dashboard")}
            aria-label="StudyOS home"
          >
            <span className="brand-icon">
              <GraduationCap size={23} />
            </span>
            <b>
              Study<span>OS</span>
            </b>
          </button>
          <button
            className="collapse-button"
            aria-label="Collapse sidebar"
            onClick={() => {
              if (window.innerWidth < 800) drawer(false);
              else collapse(!mini);
            }}
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
        <div className="nav-scroll">
          {groups.map((g) => (
            <div className="nav-group" key={g.name}>
              <p>{g.name}</p>
              {g.items.map(navItem)}
            </div>
          ))}
          <div className="nav-utilities">
            {navItem("Study assistant")}
            {navItem("Student tools")}
          </div>
        </div>
        <div className="sidebar-bottom">
          {navItem("Settings")}
          <button
            className="user-card"
            onClick={() => go("Settings")}
            aria-label="Open student profile"
          >
            <span className="avatar">
              {profile?.photo ? (
                <img src={profile.photo} alt="" />
              ) : (
                (profile?.title || "Student")
                  .split(" ")
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")
              )}
            </span>
            <span>
              <strong>{profile?.title || "Student"}</strong>
              <small>Personal workspace</small>
            </span>
            <ChevronsUpDown size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="icon-button mobile-menu"
            onClick={() => drawer(true)}
          >
            <Menu size={19} />
          </button>
          {mini && (
            <button
              className="icon-button desktop-only"
              aria-label="Expand sidebar"
              onClick={() => collapse(false)}
            >
              <PanelLeft size={16} />
            </button>
          )}
          <div className="breadcrumb">
            <Layers size={15} />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="top-tools">
            <button
              className="search-trigger"
              onClick={() => {
                query("");
                modal("search");
              }}
            >
              <Search size={15} />
              <span>Search workspace</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={theme}
            >
              {dark ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-button bell"
              aria-label="Open notifications"
              onClick={() => modal("notifications")}
            >
              <Bell size={18} />
              {reminders.length > 0 && <i />}
            </button>
          </div>
        </header>
        <main>
          {!ready ? (
            <div className="panel">Loading your workspace…</div>
          ) : (
            <motion.div
              key={view}
              initial={{ opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {view === "Dashboard" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <h2>Dashboard</h2>
                    </div>
                    <div className="live-clock">
                      <Clock3 size={14} />
                      <time suppressHydrationWarning>
                        {now.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                  <Dashboard
                    entries={entries}
                    actions={actions}
                    f={f}
                    now={now}
                  />
                </>
              ) : (
                <>
                  <div className="page-heading interior">
                    <div>
                      <h1>{view}</h1>
                      <p>{subtitles[view]}</p>
                    </div>
                    {create && (
                      <Button onClick={() => edit(create)}>
                        <Plus size={15} />
                        New {labels[create].toLowerCase()}
                      </Button>
                    )}
                  </div>
                  {view === "Calendar" ? (
                    <Calendar entries={entries} actions={actions} />
                  ) : view === "Habits" ? (
                    <Habits entries={entries} actions={actions} />
                  ) : view === "Notes" ? (
                    <Notes entries={entries} actions={actions} />
                  ) : view === "Focus timer" ? (
                    <FocusView entries={entries} f={f} />
                  ) : view === "Analytics" ? (
                    <Analytics entries={entries} actions={actions} />
                  ) : view === "Study assistant" ? (
                    <Assistant entries={entries} actions={actions} />
                  ) : view === "Student tools" ? (
                    <Utilities entries={entries} actions={actions} /> 
                  ) : view === "Attendance" ? ( <Attendance />)
                    : view === "Settings" ? (
                    <Settings
                      entries={entries}
                      actions={actions}
                      dark={dark}
                      theme={theme}
                      syncState={cloudState.status}
                      retry={cloudState.retry}
                    />
                  ) : create ? (
                    <Planner
                      key={view}
                      entries={entries}
                      kind={create}
                      actions={actions}
                    />
                  ) : null}
                </>
              )}
            </motion.div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </main>
      </div>
      {editor && (
        <Editor spec={editor} close={() => openEditor(null)} notify={notify} />
      )}
      {overlay === "notifications" && (
        <Modal title="Notifications" onClose={() => modal("")}>
          {reminders.length ? (
            reminders.map((e) => (
              <button
                className="data-row notification-row"
                key={e.id}
                onClick={() =>
                  e.kind === "habit" ? go("Habits") : edit(e.kind, e)
                }
              >
                <TypeIcon entry={e} />
                <div className="grow">
                  <strong>{e.title}</strong>
                  <small>
                    {e.kind === "habit"
                      ? "Daily habit reminder"
                      : daysUntil(e.date) < 0
                        ? "Overdue · " + pretty(e.date)
                        : pretty(e.date) + " · " + clock(e.time)}
                  </small>
                </div>
                <ChevronRight size={14} />
              </button>
            ))
          ) : (
            <Empty>You’re all caught up.</Empty>
          )}
        </Modal>
      )}
      {overlay === "search" && (
        <Modal title="Search workspace" onClose={() => modal("")}>
          <label className="search-field palette-input">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search pages, tasks, and notes…"
              value={q}
              onChange={(e) => query(e.target.value)}
            />
          </label>
          <div className="palette-results">
            {found.map((e) => (
              <button key={e.id} onClick={() => edit(e.kind, e)}>
                <TypeIcon entry={e} />
                <strong>{e.title}</strong>
                <small>{labels[e.kind]}</small>
              </button>
            ))}
            {resultViews.map((v) => {
              const I = navIcons[v];
              return (
                <button key={v} onClick={() => go(v)}>
                  <I size={16} />
                  <span>{v}</span>
                  <ArrowRight className="push" size={14} />
                </button>
              );
            })}
            {!resultViews.length && !found.length && (
              <Empty>No matching pages or entries.</Empty>
            )}
          </div>
        </Modal>
      )}
      {message && (
        <div role="status" className="toast">
          <Check size={16} />
          {message}
        </div>
      )}
    </div>
  );
}
