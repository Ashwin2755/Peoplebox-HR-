import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { Bell, CalendarDays, Check, Clock3, Eye, Filter, LogOut, RefreshCw, Search, TrendingUp, UserCheck, UserX, Users, Wallet, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import "./AdminDashboard.css";

const sections = [["Dashboard", TrendingUp], ["Employees", Users], ["Attendance", Clock3], ["Leave Requests", CalendarDays], ["Payroll", Wallet]];
const departments = ["Engineering", "Human Resources", "Finance", "Marketing", "Sales", "Operations", "Design", "Customer Support"];
const todayString = () => new Date().toISOString().split("T")[0];

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const snapshots = await Promise.all(["employees", "attendance", "leaveRequests", "payroll"].map((name) => getDocs(collection(db, name))));
      const mapSnapshot = (snapshot) => snapshot.docs.map((item) => {
        const data = item.data();
        const employeeId = data.employeeId && /^EMP\w+$/i.test(data.employeeId)
          ? data.employeeId
          : /^EMP\w+$/i.test(item.id)
            ? item.id
            : data.employeeId;
        return { id: item.id, ...data, employeeId };
      });
      setEmployees(mapSnapshot(snapshots[0]));
      setAttendance(mapSnapshot(snapshots[1]));
      setLeaveRequests(mapSnapshot(snapshots[2]));
      setPayroll(mapSnapshot(snapshots[3]));
    } catch (loadError) {
      console.error("Firebase error:", loadError);
      setError(loadError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { const run = async () => loadData(); run(); }, []);

  const today = todayString();
  const todayAttendance = attendance.filter((item) => item.date === today);
  const presentToday = todayAttendance.filter((item) => item.status === "Present" || item.checkIn).length;
  const absentToday = Math.max(employees.length - presentToday, 0);
  const onLeave = employees.filter((item) => item.status === "On Leave").length;
  const pendingLeaves = leaveRequests.filter((item) => String(item.status || "").toLowerCase() === "pending").length;

  const filteredEmployees = useMemo(() => {
    const value = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch = [employee.name, employee.email, employee.department, employee.designation, employee.employeeId].filter(Boolean).some((field) => String(field).toLowerCase().includes(value));
      return matchesSearch && (statusFilter === "All" || (employee.status || "Active") === statusFilter);
    });
  }, [employees, search, statusFilter]);

  const handleLeaveAction = async (requestId, status) => {
    try {
      const fields = { status, adminComment: status === "Approved" ? "Approved by HR" : "Rejected by HR", reviewedAt: new Date().toISOString() };
      await updateDoc(doc(db, "leaveRequests", requestId), fields);
      setLeaveRequests((current) => current.map((item) => item.id === requestId ? { ...item, ...fields } : item));
    } catch (actionError) { setError(actionError.message || "Unable to update leave request."); }
  };

  const handleEmployeeUpdate = async (employeeId, changes) => {
    const fields = { ...changes, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, "employees", employeeId), fields);
    setEmployees((current) => current.map((employee) => employee.id === employeeId ? { ...employee, ...fields } : employee));
    setSelectedEmployee((current) => current ? { ...current, ...fields } : current);
  };

  const handleLogout = async () => { await signOut(auth); window.location.href = "/login"; };
  if (loading) return <StateScreen icon={<RefreshCw className="loading-icon" size={28} />} title="Loading Peoplebox..." message="Fetching HR data from Firebase." />;
  if (error) return <div className="hr-error"><h2>Unable to load HR dashboard</h2><p>{error}</p><button onClick={loadData}><RefreshCw size={17} />Try Again</button></div>;

  return <div className="hr-layout">
    <aside className="hr-sidebar"><div className="hr-brand"><div className="brand-logo">P</div><div><h2>Peoplebox</h2><span>HR Management</span></div></div><nav className="hr-nav"><p className="nav-label">MAIN</p>{sections.map(([label, Icon]) => <button key={label} className={activeSection === label ? "nav-item active" : "nav-item"} onClick={() => setActiveSection(label)}><Icon size={19} />{label}{label === "Leave Requests" && pendingLeaves > 0 && <span className="nav-badge">{pendingLeaves}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="admin-mini-profile"><div className="admin-avatar">HR</div><div><strong>HR Admin</strong><span>Administrator</span></div></div><button className="logout-button" onClick={handleLogout}><LogOut size={18} />Logout</button></div></aside>
    <main className="hr-main"><header className="hr-header"><div><h1>{activeSection}</h1><p>Manage your organization from one place.</p></div><div className="header-actions"><button className="notification-button" title="Notifications"><Bell size={20} /><span /></button><div className="header-admin"><div className="admin-avatar small">HR</div><div><strong>HR Admin</strong><span>Administrator</span></div></div></div></header>
      {activeSection === "Dashboard" && <DashboardOverview employees={employees} presentToday={presentToday} absentToday={absentToday} onLeave={onLeave} pendingLeaves={pendingLeaves} todayAttendance={todayAttendance} onNavigate={setActiveSection} />}
      {activeSection === "Employees" && <EmployeeSection employees={filteredEmployees} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onView={setSelectedEmployee} />}
      {activeSection === "Attendance" && <AttendanceSection employees={employees} attendance={attendance} today={today} />}
      {activeSection === "Leave Requests" && <LeaveSection requests={leaveRequests} onAction={handleLeaveAction} />}
      {activeSection === "Payroll" && <PayrollSection payroll={payroll} employees={employees} onSaved={loadData} />}
    </main>{selectedEmployee && <EmployeeModal employee={selectedEmployee} departments={departments} onSaveEmployee={handleEmployeeUpdate} onClose={() => setSelectedEmployee(null)} />}
  </div>;
}

function StateScreen({ icon, title, message }) { return <div className="hr-loading">{icon}<h2>{title}</h2><p>{message}</p></div>; }
function DashboardOverview({ employees, presentToday, absentToday, onLeave, pendingLeaves, todayAttendance, onNavigate }) { return <section className="dashboard-content"><div className="stats-grid"><StatCard icon={<Users />} title="Total Employees" value={employees.length} subtitle="Registered employees" iconClass="blue" /><StatCard icon={<UserCheck />} title="Present Today" value={presentToday} subtitle={`${todayAttendance.length} records`} iconClass="green" /><StatCard icon={<UserX />} title="Absent Today" value={absentToday} subtitle="No check-in recorded" iconClass="red" /><StatCard icon={<CalendarDays />} title="On Leave" value={onLeave} subtitle={`${pendingLeaves} requests pending`} iconClass="orange" /></div><div className="dashboard-grid"><div className="dashboard-card attendance-panel"><div className="card-header"><div><h3>Today's Attendance</h3><p>Live overview for {formatDate(todayString())}</p></div><button className="view-button" onClick={() => onNavigate("Attendance")}>View All</button></div><div className="attendance-summary"><div className="attendance-circle"><strong>{employees.length ? Math.round((presentToday / employees.length) * 100) : 0}%</strong><span>Present</span></div><div className="attendance-stats"><SummaryLine color="present" label="Present" value={presentToday} /><SummaryLine color="absent" label="Absent" value={absentToday} /><SummaryLine color="leave" label="Pending leave" value={pendingLeaves} /></div></div></div><div className="dashboard-card quick-panel"><div className="card-header"><div><h3>Quick HR Actions</h3><p>Jump to common tasks</p></div></div><div className="quick-actions"><button className="action-card" onClick={() => onNavigate("Employees")}><Users size={19} />Manage employees</button><button className="action-card" onClick={() => onNavigate("Leave Requests")}><CalendarDays size={19} />Review leave</button><button className="action-card" onClick={() => onNavigate("Payroll")}><Wallet size={19} />View payroll</button></div></div><div className="dashboard-card full-card"><div className="card-header"><div><h3>Employee Directory</h3><p>Latest employee records</p></div><button className="view-button" onClick={() => onNavigate("Employees")}>View All</button></div><EmployeeTable employees={employees.slice(0, 6)} onView={() => onNavigate("Employees")} /></div></div></section>; }
function SummaryLine({ color, label, value }) { return <div><span className={`dot ${color}`} /><span>{label}</span><strong>{value}</strong></div>; }
function StatCard({ icon, title, value, subtitle, iconClass }) { return <div className="stat-card"><div className={`stat-icon ${iconClass}`}>{icon}</div><div className="stat-info"><span>{title}</span><strong>{value}</strong><small>{subtitle}</small></div></div>; }
function EmployeeSection({ employees, search, setSearch, statusFilter, setStatusFilter, onView }) { return <section className="section-content"><div className="section-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" /></div><div className="filter-box"><Filter size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Active</option><option>On Leave</option><option>Inactive</option></select></div></div><div className="dashboard-card full-card"><div className="card-header"><div><h3>Employee Management</h3><p>{employees.length} employee records</p></div></div><EmployeeTable employees={employees} onView={onView} /></div></section>; }
function EmployeeTable({ employees, onView }) { return employees.length === 0 ? <div className="empty-state"><Users size={30} /><p>No employees found.</p></div> : <div className="table-wrapper"><table><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Joining Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><div className="employee-cell"><div className="employee-avatar">{getInitials(employee.name)}</div><div><strong>{employee.name || "Employee"}</strong><span>{employee.employeeId || employee.id}</span></div></div></td><td>{employee.department || "-"}</td><td>{employee.designation || "-"}</td><td>{formatDate(employee.joiningDate || employee.dateOfJoining)}</td><td><StatusBadge status={employee.status || "Active"} /></td><td><button className="icon-action" title="View employee details" onClick={() => onView(employee)}><Eye size={17} /></button></td></tr>)}</tbody></table></div>; }
function AttendanceSection({ employees, attendance, today }) {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const recordsForDate = useMemo(
    () => attendance.filter((record) => !selectedDate || record.date === selectedDate),
    [attendance, selectedDate]
  );
  const visibleEmployees = useMemo(() => {
    const value = search.trim().toLowerCase();
    return employees.filter((employee) => [employee.name, employee.email, employee.employeeId]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(value)));
  }, [employees, search]);
  const getRecord = (employee) => recordsForDate.find(
    (record) => record.employeeId === (employee.employeeId || employee.uid || employee.id)
  );
  const getStatus = (employee, record) => employee.status === "On Leave" ? "On Leave" : record?.checkIn ? (record.checkOut ? "Present" : "Incomplete") : "Absent";
  const summary = visibleEmployees.reduce((totals, employee) => {
    const status = getStatus(employee, getRecord(employee));
    totals[status] = (totals[status] || 0) + 1;
    return totals;
  }, {});

  if (selectedEmployee) {
    const employeeKey = selectedEmployee.employeeId || selectedEmployee.uid || selectedEmployee.id;
    const history = attendance.filter((record) => record.employeeId === employeeKey).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return <section className="section-content"><button className="view-button attendance-back" onClick={() => setSelectedEmployee(null)}>Back to employees</button><div className="dashboard-card employee-attendance-profile"><div className="employee-avatar">{getInitials(selectedEmployee.name)}</div><div><h2>{selectedEmployee.name || "Employee"}</h2><p>{selectedEmployee.employeeId || selectedEmployee.id} | {selectedEmployee.department || "Department not specified"}</p></div></div><div className="attendance-history"><div className="card-header"><div><h3>Attendance History</h3><p>All recorded check-in and check-out activity</p></div></div><AttendanceRows records={history} /></div></section>;
  }

  return <section className="section-content"><div className="attendance-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or ID" /></div><label className="date-picker"><CalendarDays size={17} /><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label></div><div className="attendance-summary-grid"><StatCard icon={<Users />} title="Employees" value={visibleEmployees.length} subtitle="In this view" iconClass="blue" /><StatCard icon={<UserCheck />} title="Present" value={summary.Present || 0} subtitle="Checked in" iconClass="green" /><StatCard icon={<UserX />} title="Absent" value={summary.Absent || 0} subtitle="No check-in" iconClass="red" /><StatCard icon={<Clock3 />} title="Incomplete" value={summary.Incomplete || 0} subtitle="Needs check-out" iconClass="orange" /></div><div className="dashboard-card full-card"><div className="card-header"><div><h3>Attendance Overview</h3><p>{selectedDate ? `All employees for ${formatDate(selectedDate)}` : "All attendance records"}</p></div></div><div className="table-wrapper"><table><thead><tr><th>Employee</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleEmployees.map((employee) => { const record = getRecord(employee); const status = getStatus(employee, record); return <tr key={employee.id}><td><div className="employee-cell"><div className="employee-avatar">{getInitials(employee.name)}</div><div><strong>{employee.name || "Employee"}</strong><span>{employee.employeeId || employee.id}</span></div></div></td><td>{formatTime(record?.checkIn)}</td><td>{formatTime(record?.checkOut)}</td><td><StatusBadge status={status} /></td><td><button className="icon-action" title="View attendance history" onClick={() => setSelectedEmployee(employee)}><Eye size={17} /></button></td></tr>; })}</tbody></table></div></div></section>;
}

function AttendanceRows({ records }) {
  if (records.length === 0) return <div className="empty-state"><CalendarDays size={30} /><p>No attendance records found.</p></div>;
  return <div className="table-wrapper"><table><thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead><tbody>{records.map((record) => { const status = record.checkIn ? (record.checkOut ? "Present" : "Incomplete") : "Absent"; return <tr key={record.id}><td>{formatDate(record.date)}</td><td>{formatTime(record.checkIn)}</td><td>{formatTime(record.checkOut)}</td><td><StatusBadge status={status} /></td></tr>; })}</tbody></table></div>;
}
function LeaveSection({ requests, onAction }) { return <section className="section-content"><div className="dashboard-card full-card"><div className="card-header"><div><h3>Leave Approval</h3><p>Review and update employee leave requests</p></div></div>{requests.length === 0 ? <div className="empty-state"><CalendarDays size={30} /><p>No leave requests found.</p></div> : <div className="table-wrapper"><table><thead><tr><th>Employee</th><th>Leave Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.map((request) => { const isPending = String(request.status || "Pending").toLowerCase() === "pending"; return <tr key={request.id}><td><strong>{request.employeeName || request.employee || "Employee"}</strong></td><td>{request.leaveType || "-"}</td><td>{formatDate(request.fromDate)} - {formatDate(request.toDate)}</td><td>{request.days || "-"}</td><td className="reason-cell">{request.reason || "-"}</td><td><StatusBadge status={request.status || "Pending"} /></td><td>{isPending ? <div className="leave-actions"><button className="approve-button" title="Approve leave" onClick={() => onAction(request.id, "Approved")}><Check size={16} />Approve</button><button className="reject-button" title="Reject leave" onClick={() => onAction(request.id, "Rejected")}><X size={16} />Reject</button></div> : <span className="reviewed-text">Reviewed</span>}</td></tr>; })}</tbody></table></div>}</div></section>; }
function PayrollSection({ payroll, employees, onSaved }) {
  const [form, setForm] = useState({ employeeId: "", month: new Date().toISOString().slice(0, 7), basicSalary: "", allowances: "", deductions: "", status: "Processed" });
  const [saving, setSaving] = useState(false);
  const selectedEmployee = employees.find((employee) => (employee.employeeId || employee.uid || employee.id) === form.employeeId);
  const netSalary = Number(form.basicSalary || 0) + Number(form.allowances || 0) - Number(form.deductions || 0);
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const editPayroll = (item) => setForm({ employeeId: item.employeeId || "", month: item.month || new Date().toISOString().slice(0, 7), basicSalary: item.basicSalary || item.basic || "", allowances: item.allowances || "", deductions: item.deductions || "", status: item.status || "Processed" });
  const savePayroll = async (event) => {
    event.preventDefault();
    if (!form.employeeId || !form.month) return;
    setSaving(true);
    try {
      const payrollEmployeeId = selectedEmployee?.employeeId || form.employeeId;
      const employeeName = selectedEmployee?.name || payroll.find((item) => item.employeeId === payrollEmployeeId)?.employeeName || "Employee";
      const payrollId = `${payrollEmployeeId}_${form.month}`;
      await setDoc(doc(db, "payroll", payrollId), { employeeId: payrollEmployeeId, employeeName, basicSalary: Number(form.basicSalary) || 0, allowances: Number(form.allowances) || 0, deductions: Number(form.deductions) || 0, netSalary, month: form.month, status: form.status, updatedAt: new Date().toISOString() }, { merge: true });
      await onSaved();
      setForm({ employeeId: "", month: new Date().toISOString().slice(0, 7), basicSalary: "", allowances: "", deductions: "", status: "Processed" });
    } catch (saveError) { alert(saveError.message || "Unable to save payroll."); } finally { setSaving(false); }
  };

  return <section className="section-content"><div className="dashboard-card payroll-editor"><div className="card-header"><div><h3>Set Employee Payroll</h3><p>HR controls salary details for each employee and month.</p></div></div><form className="payroll-form" onSubmit={savePayroll}><label>Employee<select name="employeeId" value={form.employeeId} onChange={updateField} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.uid || employee.employeeId || employee.id}>{employee.name || employee.email || employee.id}</option>)}</select></label><label>Month<input name="month" type="month" value={form.month} onChange={updateField} required /></label><label>Basic Salary<input name="basicSalary" type="number" min="0" value={form.basicSalary} onChange={updateField} placeholder="30000" required /></label><label>Allowances<input name="allowances" type="number" min="0" value={form.allowances} onChange={updateField} placeholder="5000" /></label><label>Deductions<input name="deductions" type="number" min="0" value={form.deductions} onChange={updateField} placeholder="2000" /></label><label>Status<select name="status" value={form.status} onChange={updateField}><option>Processed</option><option>Pending</option><option>Paid</option></select></label><div className="payroll-net"><span>Net Salary</span><strong>{formatCurrency(netSalary)}</strong></div><button className="payroll-save" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Payroll"}</button></form></div><div className="dashboard-card full-card"><div className="card-header"><div><h3>Payroll Records</h3><p>Salary information for all employees</p></div></div>{payroll.length === 0 ? <div className="empty-state"><Wallet size={30} /><p>No payroll records found.</p></div> : <div className="table-wrapper"><table><thead><tr><th>Employee</th><th>Month</th><th>Basic Salary</th><th>Allowances</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Action</th></tr></thead><tbody>{payroll.map((item) => <tr key={item.id}><td><strong>{item.employeeName || item.employee || "Employee"}</strong><span className="table-subtext">{item.employeeId || ""}</span></td><td>{item.month || "-"}</td><td>{formatCurrency(item.basicSalary || item.basic)}</td><td>{formatCurrency(item.allowances)}</td><td>{formatCurrency(item.deductions)}</td><td><strong className="salary-value">{formatCurrency(item.netSalary || item.net)}</strong></td><td><StatusBadge status={item.status || "Processed"} /></td><td><button className="view-button" type="button" onClick={() => editPayroll(item)}>Edit</button></td></tr>)}</tbody></table></div>}</div></section>;
}
function EmployeeModal({ employee, departments, onSaveEmployee, onClose }) {
  const [form, setForm] = useState({
    name: employee.name || "",
    email: employee.email || "",
    department: employee.department || "",
    designation: employee.designation || "",
    joiningDate: employee.joiningDate || employee.dateOfJoining || "",
    status: employee.status || "Active",
    phone: employee.phone || "",
    employeeId: employee.employeeId || employee.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const saveEmployee = async () => {
    if (!form.name || !form.department) return;
    setSaving(true);
    setMessage("");
    try {
      await onSaveEmployee(employee.id, form);
      setMessage("Employee details updated successfully.");
    } catch (saveError) {
      setMessage(saveError.message || "Unable to update department.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-overlay" onClick={onClose}><div className="employee-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2>Edit Employee Details</h2><button className="modal-close" onClick={onClose}><X size={18} /></button></div><div className="modal-profile"><div className="large-avatar">{getInitials(form.name)}</div><div><h3>{form.name || "Employee"}</h3><p>{form.email || form.employeeId}</p></div></div><div className="employee-details editable-details"><label>Name<input name="name" value={form.name} onChange={updateField} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={updateField} /></label><label>Department<select name="department" value={form.department} onChange={updateField} required><option value="">Select department</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Designation<input name="designation" value={form.designation} onChange={updateField} /></label><label>Joining Date<input name="joiningDate" type="date" value={form.joiningDate} onChange={updateField} /></label><label>Status<select name="status" value={form.status} onChange={updateField}><option>Active</option><option>On Leave</option><option>Inactive</option></select></label><label>Phone<input name="phone" value={form.phone} onChange={updateField} /></label><label>Employee ID<input name="employeeId" value={form.employeeId} onChange={updateField} /></label><div className="employee-save-area"><button className="department-save" onClick={saveEmployee} disabled={saving || !form.name || !form.department}>{saving ? "Saving..." : "Save Employee Details"}</button>{message && <small className={message.includes("successfully") ? "save-success" : "save-error"}>{message}</small>}</div></div></div></div>;
}
function StatusBadge({ status }) { return <span className={`status-badge ${String(status).toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>; }
function getInitials(name = "") { return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "U"; }
function formatDate(value) { if (!value) return "-"; const date = new Date(`${value}`.includes("T") ? value : `${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(value) { if (!value) return "--"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function formatCurrency(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0); }

export default AdminDashboard;
