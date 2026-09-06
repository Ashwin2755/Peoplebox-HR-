import { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import "./Attendance.css";
import {
  Clock3,
  LogIn,
  LogOut,
  CalendarDays,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return "--";

  const date = new Date(value);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayNumber = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${dayNumber}`;
  });
}

function Attendance() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("employee");

  const [todayRecord, setTodayRecord] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const today = getToday();

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Get the user's role from Firestore.
      const userRef = doc(db, "users", currentUser.uid);
      const userSnapshot = await getDoc(userRef);

      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      const employeeId = userData.employeeId || currentUser.uid;
      let currentRole = "employee";

      if (userSnapshot.exists()) {
        currentRole = userData.role || "employee";
      }

      setRole(currentRole);

      if (currentRole === "admin" || currentRole === "hr") {
        // HR/Admin can see all attendance records.
        const attendanceSnapshot = await getDocs(
          collection(db, "attendance")
        );

        const records = attendanceSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        setAttendanceRecords(records);
      } else {
        // Employee can see only their own attendance.
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("employeeId", "==", employeeId)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);

        const records = attendanceSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        setAttendanceRecords(records);

        const todayAttendance = records.find(
          (record) => record.date === today
        );

        setTodayRecord(todayAttendance || null);
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
      alert("Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    const run = async () => {
      await loadAttendance();
    };

    run();
  }, [loadAttendance]);

  async function handleCheckIn() {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (todayRecord?.checkIn) {
      alert("You have already checked in today.");
      return;
    }

    try {
      setActionLoading(true);

      const now = new Date().toISOString();

      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      const employeeId = userData.employeeId || user.uid;
      const attendanceId = `${employeeId}_${today}`;

      const attendanceData = {
        id: attendanceId,
        employeeId,
        employeeName: userData.name || userData.email || user.email || "Employee",
        date: today,
        checkIn: now,
        checkOut: null,
        status: "Present",
      };

      await setDoc(
        doc(db, "attendance", attendanceId),
        attendanceData,
        { merge: true }
      );

      setTodayRecord(attendanceData);

      setAttendanceRecords((previous) => [
        attendanceData,
        ...previous.filter((item) => item.date !== today),
      ]);

      alert("Check-in successful!");
    } catch (error) {
      console.error("Check-in error:", error);
      alert("Unable to check in.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!todayRecord?.checkIn) {
      alert("Please check in before checking out.");
      return;
    }

    if (todayRecord.checkOut) {
      alert("You have already checked out today.");
      return;
    }

    try {
      setActionLoading(true);

      const now = new Date().toISOString();

      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      const employeeId = userData.employeeId || user.uid;
      const attendanceId = `${employeeId}_${today}`;

      const updatedRecord = {
        ...todayRecord,
        checkOut: now,
      };

      await setDoc(
        doc(db, "attendance", attendanceId),
        {
          checkOut: now,
        },
        { merge: true }
      );

      setTodayRecord(updatedRecord);

      setAttendanceRecords((previous) =>
        previous.map((item) =>
          item.date === today ? updatedRecord : item
        )
      );

      alert("Check-out successful!");
    } catch (error) {
      console.error("Check-out error:", error);
      alert("Unable to check out.");
    } finally {
      setActionLoading(false);
    }
  }

  const weekDates = useMemo(() => getWeekDates(), []);

  const weeklyRecords = weekDates.map((date) => {
    const record = attendanceRecords.find(
      (item) => item.date === date
    );

    return {
      date,
      record,
      status: record?.status || "Absent",
    };
  });

  if (loading) {
    return (
      <div className="attendance-page">
        <div className="attendance-loading">
          <RefreshCw className="loading-icon" size={28} />
          <p>Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="attendance-page">
        <div className="attendance-empty">
          <h2>Attendance</h2>
          <p>Please login to access attendance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <button
        type="button"
        className="page-back-button"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={17} />
        Back
      </button>
      <div className="attendance-header">
        <div>
          <p className="attendance-label">PEOPLEBOX HRMS</p>
          <h1>Attendance Management</h1>
          <p className="attendance-subtitle">
            Track your daily check-in, check-out and attendance history.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadAttendance}
          disabled={loading}
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {role !== "admin" && role !== "hr" && (
        <>
          {/* Today's Attendance */}
          <section className="today-card">
            <div className="today-card-header">
              <div>
                <span className="section-label">TODAY</span>
                <h2>{today}</h2>
              </div>

              <div className="status-badge">
                {todayRecord?.status || "Not Marked"}
              </div>
            </div>

            <div className="attendance-actions">
              <div className="time-box">
                <Clock3 size={24} />
                <div>
                  <span>Check In</span>
                  <strong>
                    {formatTime(todayRecord?.checkIn)}
                  </strong>
                </div>
              </div>

              <div className="time-box">
                <Clock3 size={24} />
                <div>
                  <span>Check Out</span>
                  <strong>
                    {formatTime(todayRecord?.checkOut)}
                  </strong>
                </div>
              </div>

              <button
                className="check-in-button"
                onClick={handleCheckIn}
                disabled={actionLoading || !!todayRecord?.checkIn}
              >
                <LogIn size={20} />
                {todayRecord?.checkIn
                  ? "Checked In"
                  : "Check In"}
              </button>

              <button
                className="check-out-button"
                onClick={handleCheckOut}
                disabled={
                  actionLoading ||
                  !todayRecord?.checkIn ||
                  !!todayRecord?.checkOut
                }
              >
                <LogOut size={20} />
                {todayRecord?.checkOut
                  ? "Checked Out"
                  : "Check Out"}
              </button>
            </div>
          </section>

          {/* Weekly Attendance */}
          <section className="attendance-section">
            <div className="section-heading">
              <div>
                <CalendarDays size={22} />
                <h2>This Week</h2>
              </div>
            </div>

            <div className="weekly-grid">
              {weeklyRecords.map((item) => (
                <div className="day-card" key={item.date}>
                  <span>
                    {new Date(
                      `${item.date}T00:00:00`
                    ).toLocaleDateString([], {
                      weekday: "short",
                    })}
                  </span>

                  <strong>{item.date.slice(8)}</strong>

                  <small className={`status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </small>

                  <p>
                    {item.record
                      ? formatTime(item.record.checkIn)
                      : "--"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Attendance History */}
      <section className="attendance-section">
        <div className="section-heading">
          <div>
            <CalendarDays size={22} />
            <h2>
              {role === "admin" || role === "hr"
                ? "Employee Attendance Records"
                : "Attendance History"}
            </h2>
          </div>
        </div>

        {attendanceRecords.length === 0 ? (
          <div className="no-records">
            <p>No attendance records found.</p>
          </div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  {(role === "admin" || role === "hr") && (
                    <th>Employee</th>
                  )}
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    {(role === "admin" || role === "hr") && (
                      <td>{record.employeeName || "Employee"}</td>
                    )}

                    <td>{record.date}</td>

                    <td>{formatTime(record.checkIn)}</td>

                    <td>{formatTime(record.checkOut)}</td>

                    <td>
                      <span className="table-status">
                        {record.status || "Present"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Attendance;