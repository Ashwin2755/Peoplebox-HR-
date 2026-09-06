import { useEffect, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { collection, doc, getDocs, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { getEmployeeDisplayId } from "../utils/employeeDisplay";
import "./Payroll.css";

function Payroll() {
  const { currentUser } = useAuth();
  const [employee, setEmployee] = useState({
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    employeeId: "",
    name: "Employee",
    department: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayroll = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("User record not found.");
          setLoading(false);
          return;
        }

        const employeeId = userSnap.data().employeeId;
        if (!employeeId) {
          setError("Employee ID not found for this user.");
          setLoading(false);
          return;
        }

        let employeeSnap = await getDoc(doc(db, "employees", employeeId));

        if (!employeeSnap.exists()) {
          const [uidQuery, emailQuery] = await Promise.all([
            getDocs(query(collection(db, "employees"), where("uid", "==", currentUser.uid))),
            getDocs(query(collection(db, "employees"), where("email", "==", userSnap.data().email || currentUser.email))),
          ]);
          employeeSnap = [...uidQuery.docs, ...emailQuery.docs]
            .find((item) => /^EMP\w+$/i.test(item.id)) || uidQuery.docs[0] || emailQuery.docs[0] || null;
        }

        if (!employeeSnap) {
          setError("Employee payroll record not found.");
          setLoading(false);
          return;
        }

        const employeeData = employeeSnap.data();
        const resolvedEmployeeId = employeeData.employeeId?.match(/^EMP\w+$/i)
          ? employeeData.employeeId
          : employeeSnap.id.match(/^EMP\w+$/i)
            ? employeeSnap.id
            : employeeId;
        const payrollSnapshots = await Promise.all([
          getDocs(query(collection(db, "payroll"), where("employeeId", "==", resolvedEmployeeId))),
          getDocs(query(collection(db, "payroll"), where("employeeId", "==", currentUser.uid))),
        ]);
        const payrollRecords = payrollSnapshots
          .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
          .filter((item, index, records) => records.findIndex((record) => record.id === item.id) === index)
          .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
        const latestPayroll = payrollRecords[0];

        setEmployee({
          ...employeeData,
          ...(latestPayroll || {}),
          employeeId: resolvedEmployeeId,
        });
      } catch (err) {
        console.error("Error loading payroll:", err);
        setError("Unable to load payroll details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [currentUser]);

  const netSalary =
    Number(employee.basicSalary || 0) +
    Number(employee.allowances || 0) -
    Number(employee.deductions || 0);

  if (loading) {
    return <div className="payroll-page"><h2>Loading payroll...</h2></div>;
  }

  if (error) {
    return (
      <div className="payroll-page">
        <button type="button" className="page-back-button" onClick={() => window.history.back()}><ArrowLeft size={17} />Back</button>
        <h2>Payroll</h2>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="payroll-page">
      <button type="button" className="page-back-button" onClick={() => window.history.back()}><ArrowLeft size={17} />Back</button>
      <div className="profile-header">
        <div className="profile-avatar">
          {employee.profileImage ? (
            <img src={employee.profileImage} alt={`${employee.name || "Employee"} profile`} />
          ) : (
            employee.name?.charAt(0) || "E"
          )}
        </div>

        <div>
          <h1>{employee.name}</h1>
          <p>{getEmployeeDisplayId(employee)}</p>
          <span>{employee.department || "Department"}</span>
        </div>
      </div>

      <div className="salary-card">
        <div className="salary-title">
          <Wallet size={24} />
          <h2>Salary Structure</h2>
        </div>

        <div className="salary-grid">
          <div className="salary-item">
            <span>Basic Salary</span>
            <strong>₹{employee.basicSalary}</strong>
          </div>

          <div className="salary-item">
            <span>Allowances</span>
            <strong>₹{employee.allowances}</strong>
          </div>

          <div className="salary-item">
            <span>Deductions</span>
            <strong>₹{employee.deductions}</strong>
          </div>

          <div className="salary-item net-salary">
            <span>Net Salary</span>
            <strong>₹{netSalary}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payroll;