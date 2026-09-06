import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, LogOut, Search, User, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

const navigation = [
  ["Overview", "/employee-dashboard", User],
  ["Attendance", "/attendance", Clock3],
  ["Leave Requests", "/leave", ClipboardList],
  ["Payroll", "/payroll", Wallet],
  ["Profile", "/profile", User],
];

function EmployeeDashboardView() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentUser) return;
      try {
        const userSnapshot = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userSnapshot.exists() ? userSnapshot.data() : {};
        const employeeId = userData.employeeId || currentUser.uid;
        let employeeSnapshot = await getDoc(doc(db, "employees", employeeId));
        if (!employeeSnapshot.exists()) {
          const [uidQuery, emailQuery] = await Promise.all([
            getDocs(query(collection(db, "employees"), where("uid", "==", currentUser.uid))),
            getDocs(query(collection(db, "employees"), where("email", "==", userData.email || currentUser.email))),
          ]);
          employeeSnapshot = [...uidQuery.docs, ...emailQuery.docs]
            .find((item) => /^EMP\w+$/i.test(item.id)) || uidQuery.docs[0] || emailQuery.docs[0] || null;
        }
        const resolvedEmployeeId = employeeSnapshot?.data()?.employeeId?.match(/^EMP\w+$/i)
          ? employeeSnapshot.data().employeeId
          : employeeSnapshot?.id?.match(/^EMP\w+$/i)
            ? employeeSnapshot.id
            : employeeId;
        const [attendanceSnapshot, leaveSnapshot, payrollSnapshot] = await Promise.all([
          getDocs(query(collection(db, "attendance"), where("employeeId", "==", resolvedEmployeeId))),
          getDocs(query(collection(db, "leaveRequests"), where("employeeId", "==", resolvedEmployeeId))),
          getDocs(query(collection(db, "payroll"), where("employeeId", "==", resolvedEmployeeId))),
        ]);
        const first = (snapshot) => snapshot ? { id: snapshot.id, ...snapshot.data() } : null;
        const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setEmployee(first(employeeSnapshot)
          ? { ...first(employeeSnapshot), employeeId: resolvedEmployeeId }
          : { name: userData.name || currentUser.email, email: currentUser.email, employeeId: resolvedEmployeeId });
        setAttendance(records(attendanceSnapshot));
        setLeaves(records(leaveSnapshot).sort((a, b) => (b.fromDate || "").localeCompare(a.fromDate || "")));
        setPayroll(records(payrollSnapshot));
      } catch (loadError) {
        console.error("Dashboard error:", loadError);
        setError("Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [currentUser]);

  const today = new Date().toISOString().split("T")[0];
  const todayRecord = attendance.find((record) => record.date === today);
  const month = today.slice(0, 7);
  const daysPresent = attendance.filter((record) => record.date?.startsWith(month) && record.status === "Present").length;
  const pendingLeaves = leaves.filter((leave) => String(leave.status).toLowerCase() === "pending").length;
  const latestPayroll = payroll[0];
  const netSalary = Number(latestPayroll?.netSalary || latestPayroll?.net || 0);
  const filteredLeaves = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return leaves;

    return leaves.filter((leave) =>
      [leave.leaveType, leave.status, leave.reason, leave.fromDate, leave.toDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [leaves, searchQuery]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const matches = (values) => values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    const results = [];

    if (matches(["payroll", "salary", "allowances", "deductions", "net salary"]) || payroll.some((item) => matches([item.month, item.status, item.employeeName]))) {
      results.push({ type: "Payroll", items: payroll.slice(0, 5) });
    }

    if (matches(["leave", "leave request"]) || filteredLeaves.length > 0) {
      results.push({ type: "Leave requests", items: filteredLeaves.slice(0, 5) });
    }

    if (matches(["attendance", "check in", "check out", "present", "absent"]) || attendance.some((item) => matches([item.date, item.status, item.checkIn, item.checkOut]))) {
      results.push({ type: "Attendance", items: attendance.slice(0, 5) });
    }

    if (matches([employee?.name, employee?.email, employee?.employeeId, employee?.department, employee?.designation, "profile"])) {
      results.push({ type: "Employee profile", items: [employee] });
    }

    return results;
  }, [attendance, employee, filteredLeaves, payroll, searchQuery]);

  const weekDays = useMemo(() => {
    const current = new Date();
    const mondayOffset = current.getDay() === 0 ? -6 : 1 - current.getDay();
    current.setDate(current.getDate() + mondayOffset);
    return Array.from({ length: 5 }, (_, index) => {
      const day = new Date(current);
      day.setDate(current.getDate() + index);
      const date = day.toISOString().split("T")[0];
      return { date, label: day.toLocaleDateString("en-US", { weekday: "short" }), record: attendance.find((item) => item.date === date) };
    });
  }, [attendance]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) return <div className="employee-loading"><div className="skeleton employee-loading__bar" /><p>Loading your workspace...</p></div>;
  if (error) return <div className="employee-loading"><h2>Peoplebox</h2><p>{error}</p></div>;

  return <div className="employee-shell">
    <aside className="employee-sidebar">
      <Link to="/employee-dashboard" className="employee-brand"><span className="employee-brand__mark">P</span><span><strong>Peoplebox</strong><small>HR MANAGEMENT</small></span></Link>
      <nav className="employee-nav"><span className="employee-nav__label">MENU</span>{navigation.map(([label, path, Icon]) => <Link key={label} to={path} className={label === "Overview" ? "employee-nav__item is-active" : "employee-nav__item"}><Icon className="employee-nav__icon" size={16} />{label}</Link>)}</nav>
      <div className="employee-sidebar__footer"><div className="employee-user-chip"><span className="employee-avatar">{employee?.profileImage ? <img src={employee.profileImage} alt={`${employee.name || "Employee"} profile`} /> : getInitials(employee?.name)}</span><span><strong>{employee?.name || "Employee"}</strong><small>{employee?.designation || "Team member"}</small></span></div><button className="employee-logout" onClick={handleLogout}><LogOut size={16} />Log out</button></div>
    </aside>
    <main className="employee-main">
      <header className="employee-topbar"><label className="employee-search"><Search size={16} /><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search requests..." aria-label="Search leave requests" /></label></header>
      <div className="employee-content">
        <header className="employee-content__header"><div><span className="employee-eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase()}</span><h1>Good afternoon, {employee?.name?.split(" ")[0] || "there"}</h1></div><Link to="/leave" className="btn btn--primary">+ Apply for Leave</Link></header>
        {searchQuery && <section className="employee-search-results"><div className="employee-card__head"><div><h2>Search results</h2><p>Showing details related to "{searchQuery}"</p></div></div>{searchResults.length === 0 ? <p className="employee-empty-search">No matching dashboard details.</p> : searchResults.map((result) => <div className="employee-search-group" key={result.type}><h3>{result.type}</h3>{result.items.length === 0 ? <p className="employee-empty-search">No records found.</p> : result.items.map((item, index) => <div className="employee-search-result" key={item.id || item.month || item.employeeId || `${result.type}-${index}`}><strong>{item.employeeName || item.name || item.leaveType || item.status || result.type}</strong><span>{result.type === "Payroll" ? `${item.month || "No month"} • ${formatCurrency(item.netSalary || item.net || 0)} • ${item.status || "Pending"}` : result.type === "Attendance" ? `${item.date || "No date"} • ${item.status || "Not marked"} • ${item.checkIn ? formatTime(item.checkIn) : "No check-in"}` : result.type === "Leave requests" ? `${item.fromDate || "No date"} - ${item.toDate || "No end date"} • ${item.days || 0} days • ${item.status || "Pending"}` : `${item.employeeId || "No employee ID"} • ${item.department || "Department not specified"}`}</span></div>)}</div>)}</section>}
        <section className="employee-stat-grid"><EmployeeStat label="TODAY'S STATUS" value={todayRecord?.checkIn ? "Present" : "Not checked in"} meta={todayRecord?.checkIn ? `IN ${formatTime(todayRecord.checkIn)}` : "Ready to check in"} tone="green" /><EmployeeStat label="THIS MONTH" value={`${daysPresent}/23`} meta="Days present" tone="blue" /><EmployeeStat label="LEAVE BALANCE" value={`${Math.max(20 - leaves.filter((leave) => leave.status === "Approved").reduce((sum, leave) => sum + Number(leave.days || 0), 0), 0)}/20`} meta={`${pendingLeaves} pending review`} tone="amber" /><EmployeeStat label="NET SALARY" value={formatCurrency(netSalary)} meta={latestPayroll?.status || "Awaiting payroll"} tone="teal" /></section>
        <section className="employee-dashboard-grid"><div className="employee-card employee-workday"><div className="employee-card__head"><div><h2>Today's workday</h2><p>Live check-in to check-out flow</p></div><StatusPill label={todayRecord?.checkIn ? "Present" : "Not started"} tone={todayRecord?.checkIn ? "green" : "amber"} /></div><div className="employee-timeline"><div className="employee-timeline__line" /><div className="employee-timeline__dot" /><div className="employee-timeline__labels"><span>{todayRecord?.checkIn ? `${formatTime(todayRecord.checkIn)} IN` : "--:-- IN"}</span><span>NOW</span><span>Expected 18:00</span></div></div><div className="employee-week"><div className="employee-week__head"><strong>This week</strong><span>Mon - Fri</span></div>{weekDays.map((day) => <div className="employee-week__day" key={day.date}><span>{day.label}</span><strong>{day.record ? "Present" : "—"}</strong></div>)}</div></div><div className="employee-card employee-leave"><div className="employee-card__head"><div><h2>Recent leave</h2><p>{searchQuery ? `${filteredLeaves.length} matching requests` : "Last 3 requests"}</p></div><Link to="/leave" className="employee-link">View all</Link></div>{filteredLeaves.slice(0, 3).map((leave) => <div className="employee-leave__row" key={leave.id}><span className="employee-avatar">{getInitials(leave.leaveType || "Leave")}</span><span><strong>{leave.leaveType || "Leave request"}</strong><small>{formatDate(leave.fromDate)} - {leave.days || 0} days</small></span><StatusPill label={leave.status || "Pending"} tone={String(leave.status).toLowerCase()} /></div>)}{searchQuery && filteredLeaves.length === 0 && <p className="employee-empty-search">No matching requests.</p>}</div></section>
      </div>
    </main>
  </div>;
}

function EmployeeStat({ label, value, meta, tone }) { return <div className="employee-stat"><span className="employee-stat__label">{label}</span><strong>{value}</strong><small className={`employee-stat__meta employee-stat__meta--${tone}`}>{meta}</small></div>; }
function StatusPill({ label, tone }) { return <span className={`employee-pill employee-pill--${tone}`}><i />{label}</span>; }
function getInitials(value = "") { return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U"; }
function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "--:--" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function formatDate(value) { if (!value) return "No date"; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { day: "2-digit", month: "short" }); }
function formatCurrency(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }

export default EmployeeDashboardView;
