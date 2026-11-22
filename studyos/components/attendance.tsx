"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Settings2,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";

type Status = "present" | "absent" | "cancelled";

interface Subject {
  id: string;
  name: string;
}

interface TimetableSlot {
  id: string;
  subjectId: string;
}

interface AttendanceData {
  semesterName: string;
  startDate: string;
  endDate: string;
  targetPercent: number;
  subjects: Subject[];
  // 0 = Sun, 1 = Mon, ..., 6 = Sat
  timetable: Record<number, TimetableSlot[]>;
  // key: "YYYY-MM-DD" -> { [slotId]: Status }
  records: Record<string, Record<string, Status>>;
}

const STORAGE_KEY = "helpos.attendance.v1";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_DATA: AttendanceData = {
  semesterName: "Semester 1",
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10),
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 4, 30)
    .toISOString()
    .slice(0, 10),
  targetPercent: 75,
  subjects: [
    { id: "sub-1", name: "Mathematics" },
    { id: "sub-2", name: "Electronics" },
    { id: "sub-3", name: "Programming" },
  ],
  timetable: {
    0: [],
    1: [{ id: "m1", subjectId: "sub-1" }, { id: "m2", subjectId: "sub-2" }],
    2: [{ id: "t1", subjectId: "sub-2" }, { id: "t2", subjectId: "sub-3" }],
    3: [{ id: "w1", subjectId: "sub-1" }, { id: "w2", subjectId: "sub-3" }],
    4: [{ id: "th1", subjectId: "sub-2" }],
    5: [{ id: "f1", subjectId: "sub-1" }, { id: "f2", subjectId: "sub-3" }],
    6: [],
  },
  records: {},
};

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Attendance() {
  const [data, setData] = useState<AttendanceData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"calendar" | "setup">("calendar");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [newSubject, setNewSubject] = useState("");
  const [selectedDayForSlot, setSelectedDayForSlot] = useState<number>(1);
  const [selectedSubjectForSlot, setSelectedSubjectForSlot] = useState<string>("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw));
      }
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }, [data, loaded]);

  const subjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    data.subjects.forEach((s) => (map[s.id] = s.name));
    return map;
  }, [data.subjects]);

  // Calculate subject-wise and overall stats
  const stats = useMemo(() => {
    const perSubject: Record<string, { present: number; total: number }> = {};
    data.subjects.forEach((s) => {
      perSubject[s.id] = { present: 0, total: 0 };
    });

    Object.entries(data.records).forEach(([dateKey, dayRecs]) => {
      const [y, m, d] = dateKey.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const slots = data.timetable[dow] || [];

      slots.forEach((slot) => {
        const status = dayRecs[slot.id];
        if (!status || status === "cancelled") return;
        if (!perSubject[slot.subjectId]) {
          perSubject[slot.subjectId] = { present: 0, total: 0 };
        }
        perSubject[slot.subjectId].total += 1;
        if (status === "present") {
          perSubject[slot.subjectId].present += 1;
        }
      });
    });

    let totalPresent = 0;
    let totalClasses = 0;
    Object.values(perSubject).forEach((s) => {
      totalPresent += s.present;
      totalClasses += s.total;
    });

    const overallPercent =
      totalClasses === 0 ? 100 : Math.round((totalPresent / totalClasses) * 100);

    return { perSubject, totalPresent, totalClasses, overallPercent };
  }, [data]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [currentMonth]);

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const selectedDaySlots = data.timetable[selectedDateObj.getDay()] || [];
  const selectedDayRecords = data.records[selectedDate] || {};

  const setLectureStatus = (slotId: string, status: Status) => {
    setData((prev) => ({
      ...prev,
      records: {
        ...prev.records,
        [selectedDate]: {
          ...(prev.records[selectedDate] || {}),
          [slotId]: status,
        },
      },
    }));
  };

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    const id = `sub-${Date.now()}`;
    setData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { id, name: trimmed }],
    }));
    setNewSubject("");
  };

  const removeSubject = (id: string) => {
    setData((prev) => {
      const nextTimetable: Record<number, TimetableSlot[]> = {};
      Object.entries(prev.timetable).forEach(([day, slots]) => {
        nextTimetable[Number(day)] = slots.filter((s) => s.subjectId !== id);
      });
      return {
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== id),
        timetable: nextTimetable,
      };
    });
  };

  const addTimetableSlot = () => {
    const subId = selectedSubjectForSlot || data.subjects[0]?.id;
    if (!subId) return;
    const newSlot: TimetableSlot = {
      id: `slot-${Date.now()}`,
      subjectId: subId,
    };
    setData((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [selectedDayForSlot]: [...(prev.timetable[selectedDayForSlot] || []), newSlot],
      },
    }));
  };

  const removeTimetableSlot = (day: number, slotId: string) => {
    setData((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [day]: (prev.timetable[day] || []).filter((s) => s.id !== slotId),
      },
    }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalendarCheck className="h-6 w-6 text-emerald-500" />
            Attendance Tracker
          </h1>
          <p className="text-sm opacity-70">
            {data.semesterName} • Target {data.targetPercent}% • Saved locally on your device
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("calendar")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === "calendar"
                ? "bg-emerald-600 text-white"
                : "border border-current/20 opacity-80 hover:opacity-100"
            }`}
          >
            Calendar & Daily
          </button>
          <button
            onClick={() => setTab("setup")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === "setup"
                ? "bg-emerald-600 text-white"
                : "border border-current/20 opacity-80 hover:opacity-100"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Edit Semester & Timetable
          </button>
        </div>
      </div>

      {/* Overall Summary Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-current/15 p-4">
          <div className="text-xs uppercase tracking-wider opacity-60">Overall Attendance</div>
          <div
            className={`mt-1 text-3xl font-bold ${
              stats.overallPercent >= data.targetPercent ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {stats.overallPercent}%
          </div>
          <div className="mt-1 text-xs opacity-70">
            {stats.totalPresent} / {stats.totalClasses} lectures attended
          </div>
        </div>

        <div className="rounded-xl border border-current/15 p-4 sm:col-span-2">
          <div className="mb-2 text-xs uppercase tracking-wider opacity-60">
            Subject-wise Breakdown
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.subjects.map((sub) => {
              const s = stats.perSubject[sub.id] || { present: 0, total: 0 };
              const pct = s.total === 0 ? 100 : Math.round((s.present / s.total) * 100);
              const isSafe = pct >= data.targetPercent;
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-current/10 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{sub.name}</div>
                    <div className="text-xs opacity-60">
                      {s.present}/{s.total} classes
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      isSafe
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-rose-500/15 text-rose-500"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tab === "calendar" ? (
        <div className="grid gap-6 md:grid-cols-5">
          {/* Calendar Grid */}
          <div className="rounded-xl border border-current/15 p-4 md:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }
                className="rounded-lg border border-current/15 p-1.5 hover:bg-current/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="font-semibold">
                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </div>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }
                className="rounded-lg border border-current/15 p-1.5 hover:bg-current/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium opacity-60">
              {DAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const key = toDateKey(date);
                const isSelected = key === selectedDate;
                const recs = data.records[key];
                const statuses = recs ? Object.values(recs) : [];
                const hasAbsent = statuses.includes("absent");
                const hasPresent = statuses.includes("present");

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition ${
                      isSelected
                        ? "bg-emerald-600 font-semibold text-white"
                        : "hover:bg-current/10"
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {statuses.length > 0 && (
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                          hasAbsent
                            ? "bg-rose-400"
                            : hasPresent
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Lectures */}
          <div className="rounded-xl border border-current/15 p-4 md:col-span-2">
            <div className="mb-3">
              <div className="text-sm font-semibold">
                {selectedDateObj.toLocaleDateString("default", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div className="text-xs opacity-60">Mark each lecture ON (Present) or OFF (Absent)</div>
            </div>

            {selectedDaySlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-current/20 p-6 text-center text-sm opacity-70">
                No lectures scheduled for {DAYS[selectedDateObj.getDay()]}.
                <br />
                Go to <b>Edit Semester & Timetable</b> to add lectures.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDaySlots.map((slot, i) => {
                  const status = selectedDayRecords[slot.id];
                  return (
                    <div
                      key={slot.id}
                      className="rounded-lg border border-current/15 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {i + 1}. {subjectMap[slot.subjectId] || "Unknown Subject"}
                        </span>
                        {status && (
                          <span className="text-xs capitalize opacity-70">{status}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <button
                          onClick={() => setLectureStatus(slot.id, "present")}
                          className={`flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${
                            status === "present"
                              ? "bg-emerald-600 text-white"
                              : "border border-current/15 hover:bg-emerald-500/10"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> ON
                        </button>
                        <button
                          onClick={() => setLectureStatus(slot.id, "absent")}
                          className={`flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${
                            status === "absent"
                              ? "bg-rose-600 text-white"
                              : "border border-current/15 hover:bg-rose-500/10"
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5" /> OFF
                        </button>
                        <button
                          onClick={() => setLectureStatus(slot.id, "cancelled")}
                          className={`flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${
                            status === "cancelled"
                              ? "bg-amber-600 text-white"
                              : "border border-current/15 hover:bg-amber-500/10"
                          }`}
                        >
                          <MinusCircle className="h-3.5 w-3.5" /> Holiday
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Semester & Timetable Setup */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Semester Details & Subjects */}
          <div className="space-y-4 rounded-xl border border-current/15 p-4">
            <h2 className="font-semibold">Semester Settings</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="opacity-70">Semester Name</span>
                <input
                  value={data.semesterName}
                  onChange={(e) => setData({ ...data, semesterName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="opacity-70">Target Attendance (%)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={data.targetPercent}
                  onChange={(e) =>
                    setData({ ...data, targetPercent: Number(e.target.value) || 75 })
                  }
                  className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-1.5 text-sm"
                />
              </label>
            </div>

            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold">Subjects</h3>
              <div className="flex gap-2">
                <input
                  placeholder="Add subject (e.g. Digital Electronics)"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  className="flex-1 rounded-lg border border-current/20 bg-transparent px-3 py-1.5 text-sm"
                />
                <button
                  onClick={addSubject}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {data.subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-current/10 px-3 py-1.5 text-sm"
                  >
                    <span>{s.name}</span>
                    <button
                      onClick={() => removeSubject(s.id)}
                      className="text-rose-500 opacity-70 hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Timetable */}
          <div className="space-y-4 rounded-xl border border-current/15 p-4">
            <h2 className="font-semibold">Weekly Timetable</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedDayForSlot}
                onChange={(e) => setSelectedDayForSlot(Number(e.target.value))}
                className="rounded-lg border border-current/20 bg-transparent px-2 py-1.5 text-sm"
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i} className="text-black">
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={selectedSubjectForSlot || data.subjects[0]?.id || ""}
                onChange={(e) => setSelectedSubjectForSlot(e.target.value)}
                className="flex-1 rounded-lg border border-current/20 bg-transparent px-2 py-1.5 text-sm"
              >
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id} className="text-black">
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={addTimetableSlot}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Add Lecture
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {DAYS.map((dayName, dayIdx) => {
                const slots = data.timetable[dayIdx] || [];
                return (
                  <div key={dayName} className="rounded-lg border border-current/10 p-2.5">
                    <div className="text-xs font-semibold opacity-70">{dayName}</div>
                    {slots.length === 0 ? (
                      <div className="text-xs opacity-40">No lectures</div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {slots.map((slot) => (
                          <span
                            key={slot.id}
                            className="inline-flex items-center gap-1 rounded-md border border-current/15 px-2 py-0.5 text-xs"
                          >
                            {subjectMap[slot.subjectId]}
                            <button
                              onClick={() => removeTimetableSlot(dayIdx, slot.id)}
                              className="text-rose-500 hover:opacity-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}