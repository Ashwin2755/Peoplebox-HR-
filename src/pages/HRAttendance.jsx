import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  Search,
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { db } from "../firebase/config";
import { getEmployeeDisplayId } from "../utils/employeeDisplay";
import "./HRAttendance.css";

function formatTime(value) {
  if (!value) return "--";

  const date = new Date(value);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString) {
  if (!dateString) return "--";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getStatus(record) {
  if (!record) return "Absent";

  if (record.checkIn && record.checkOut) {
    return "Present";
  }

  if (record.checkIn && !record.checkOut) {
    return "Incomplete";
  }

  return "Absent";
}

function HRAttendance() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      // Get all employees
      const employeeSnapshot = await getDocs(
        collection(db, "employees")
      );

      const employeeData = employeeSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setEmployees(employeeData);

      // Get all attendance
      const attendanceSnapshot = await getDocs(
        collection(db, "attendance")
      );

      const attendanceData = attendanceSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setAttendance(attendanceData);
    } catch (error) {
      console.error("Error loading HR attendance:", error);
      alert("Unable to load attendance records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return employees.filter((employee) => {
      if (!searchValue) return true;

      const name = employee.name?.toLowerCase() || "";
      const email = employee.email?.toLowerCase() || "";
      const employeeId =
        employee.employeeId?.toLowerCase() ||
        employee.id?.toLowerCase() ||
        "";

      return (
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        employeeId.includes(searchValue)
      );
    });
  }, [employees, search]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      if (!selectedDate) return true;

      return record.date === selectedDate;
    });
  }, [attendance, selectedDate]);

  const selectedEmployeeAttendance = useMemo(() => {
    if (!selectedEmployee) return [];

    const employeeId =
      selectedEmployee.employeeId ||
      selectedEmployee.uid ||
      selectedEmployee.id;

    return attendance
      .filter((record) => record.employeeId === employeeId)
      .sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );
  }, [selectedEmployee, attendance]);

  const summary = useMemo(() => {
    const records = selectedEmployee
      ? selectedEmployeeAttendance
      : filteredAttendance;

    return {
      present: records.filter(
        (record) => getStatus(record) === "Present"
      ).length,

      absent: records.filter(
        (record) => getStatus(record) === "Absent"
      ).length,

      incomplete: records.filter(
        (record) => getStatus(record) === "Incomplete"
      ).length,
    };
  }, [
    selectedEmployee,
    selectedEmployeeAttendance,
    filteredAttendance,
  ]);

  if (loading) {
    return (
      <div className="hr-attendance-page">
        <div className="hr-loading">
          <RefreshCw className="hr-spin" size={28} />
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-attendance-page">

      <button
        type="button"
        className="page-back-button"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={17} />
        Back
      </button>

      {/* Header */}
      <div className="hr-attendance-header">
        <div>
          <span className="hr-label">PEOPLEBOX HRMS</span>

          <h1>Attendance Management</h1>

          <p>
            Monitor employee attendance, check-in and check-out
            records.
          </p>
        </div>

        <button
          className="hr-refresh-button"
          onClick={loadData}
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Selected employee view */}
      {selectedEmployee ? (
        <>
          <button
            className="hr-back-button"
            onClick={() => setSelectedEmployee(null)}
          >
            <ArrowLeft size={18} />
            Back to Employees
          </button>

          <div className="selected-employee-card">
            <div className="employee-avatar">
              {selectedEmployee.name
                ?.charAt(0)
                .toUpperCase() || "E"}
            </div>

            <div>
              <h2>
                {selectedEmployee.name || "Employee"}
              </h2>

              <p>
                {getEmployeeDisplayId(selectedEmployee)}
                {" • "}
                {selectedEmployee.department ||
                  "Department not specified"}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="hr-summary-grid">

            <div className="hr-summary-card present">
              <CheckCircle2 size={25} />

              <div>
                <span>Present</span>
                <strong>{summary.present}</strong>
              </div>
            </div>

            <div className="hr-summary-card absent">
              <XCircle size={25} />

              <div>
                <span>Absent</span>
                <strong>{summary.absent}</strong>
              </div>
            </div>

            <div className="hr-summary-card incomplete">
              <Clock3 size={25} />

              <div>
                <span>Incomplete</span>
                <strong>{summary.incomplete}</strong>
              </div>
            </div>

          </div>

          {/* Employee attendance */}
          <div className="hr-table-card">

            <div className="hr-section-header">
              <div>
                <CalendarDays size={21} />
                <h2>Attendance History</h2>
              </div>
            </div>

            {selectedEmployeeAttendance.length === 0 ? (
              <div className="hr-empty">
                <CalendarDays size={35} />
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="hr-table-wrapper">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedEmployeeAttendance.map(
                      (record) => {
                        const status = getStatus(record);

                        return (
                          <tr key={record.id}>
                            <td>
                              {formatDate(record.date)}
                            </td>

                            <td>
                              {formatTime(record.checkIn)}
                            </td>

                            <td>
                              {formatTime(record.checkOut)}
                            </td>

                            <td>
                              <span
                                className={`hr-status ${status.toLowerCase()}`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Summary */}
          <div className="hr-summary-grid">

            <div className="hr-summary-card employees">
              <Users size={25} />

              <div>
                <span>Total Employees</span>
                <strong>{employees.length}</strong>
              </div>
            </div>

            <div className="hr-summary-card present">
              <CheckCircle2 size={25} />

              <div>
                <span>Present</span>
                <strong>{summary.present}</strong>
              </div>
            </div>

            <div className="hr-summary-card absent">
              <XCircle size={25} />

              <div>
                <span>Absent</span>
                <strong>{summary.absent}</strong>
              </div>
            </div>

            <div className="hr-summary-card incomplete">
              <Clock3 size={25} />

              <div>
                <span>Incomplete</span>
                <strong>{summary.incomplete}</strong>
              </div>
            </div>

          </div>

          {/* Search and date filter */}
          <div className="hr-filters">

            <div className="hr-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search employee by name, email or ID..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="hr-date-filter">
              <CalendarDays size={19} />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
              />

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Employee list */}
          <div className="hr-table-card">

            <div className="hr-section-header">
              <div>
                <Users size={21} />
                <h2>Employees</h2>
              </div>

              <span>
                {filteredEmployees.length} employees
              </span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="hr-empty">
                <Users size={35} />
                <p>No employees found.</p>
              </div>
            ) : (
              <div className="hr-table-wrapper">
                <table className="hr-table">

                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Attendance</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((employee) => {

                      const employeeId =
                        employee.uid ||
                        employee.employeeId ||
                        employee.id;

                      const employeeRecords =
                        filteredAttendance.filter(
                          (record) =>
                            record.employeeId ===
                            employeeId
                        );

                      const present =
                        employeeRecords.filter(
                          (record) =>
                            getStatus(record) ===
                            "Present"
                        ).length;

                      const absent =
                        employeeRecords.filter(
                          (record) =>
                            getStatus(record) ===
                            "Absent"
                        ).length;

                      return (
                        <tr key={employee.id}>

                          <td>
                            <div className="employee-info">
                              <div className="employee-avatar small">
                                {employee.name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  "E"}
                              </div>

                              <div>
                                <strong>
                                  {employee.name ||
                                    "Employee"}
                                </strong>

                                <span>
                                  {employee.email ||
                                    "--"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {getEmployeeDisplayId(employee)}
                          </td>

                          <td>
                            {employee.department ||
                              "--"}
                          </td>

                          <td>
                            {employee.designation ||
                              "--"}
                          </td>

                          <td>
                            <div className="attendance-mini">
                              <span className="mini-present">
                                {present} Present
                              </span>

                              <span className="mini-absent">
                                {absent} Absent
                              </span>
                            </div>
                          </td>

                          <td>
                            <button
                              className="view-button"
                              onClick={() =>
                                setSelectedEmployee(
                                  employee
                                )
                              }
                            >
                              View
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}

export default HRAttendance;