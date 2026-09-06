import { useEffect, useState } from "react";

import {
  User,
  CalendarDays,
  ClipboardList,
  Wallet,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { useAuth } from "../context/AuthContext";


function EmployeeDashboard() {

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const {
    currentUser,
    logout,
  } = useAuth();

  const navigate = useNavigate();


  // ==========================================
  // STATE
  // ==========================================

  const [employee, setEmployee] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {

    try {

      await logout();

      navigate("/login", {
        replace: true,
      });

    } catch (error) {

      console.error(
        "Logout failed:",
        error
      );

    }
  };


  // ==========================================
  // FETCH EMPLOYEE DATA
  // ==========================================

  useEffect(() => {

    const fetchEmployee = async () => {

      if (!currentUser) {

        setLoading(false);

        return;
      }

      try {

        setLoading(true);
        setError("");


        // ==========================================
        // STEP 1:
        // Get logged-in user's document
        // ==========================================

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const userSnap = await getDoc(
          userRef
        );


        if (!userSnap.exists()) {

          setError(
            "Employee account information not found."
          );

          setLoading(false);

          return;
        }


        const userData =
          userSnap.data();


        const employeeId =
          userData.employeeId;


        // ==========================================
        // Check Employee ID
        // ==========================================

        if (!employeeId) {

          setError(
            "Employee ID is missing from your account."
          );

          setLoading(false);

          return;
        }


        // ==========================================
        // STEP 2:
        // Get employee profile
        // ==========================================

        const employeeRef = doc(
          db,
          "employees",
          employeeId
        );

        const employeeSnap =
          await getDoc(employeeRef);


        if (!employeeSnap.exists()) {

          setError(
            "Employee profile has not been created yet."
          );

          setLoading(false);

          return;
        }


        // ==========================================
        // STEP 3:
        // Store employee data
        // ==========================================

        const employeeData =
          employeeSnap.data();


        setEmployee(
          employeeData
        );

      } catch (error) {

        console.error(
          "Error loading employee:",
          error
        );

        setError(
          "Unable to load employee information."
        );

      } finally {

        setLoading(false);

      }
    };


    fetchEmployee();

  }, [currentUser]);


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (

      <div className="dashboard-container">

        <h2>
          Loading employee dashboard...
        </h2>

      </div>

    );

  }


  // ==========================================
  // ERROR
  // ==========================================

  if (error) {

    return (

      <div className="dashboard-container">

        <h2>
          Employee Dashboard
        </h2>

        <p className="error-message">
          {error}
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="logout-button"
        >
          Logout
        </button>

      </div>

    );

  }


  // ==========================================
  // EMPLOYEE NAME
  // ==========================================

  const employeeName =
    employee?.name?.trim() ||
    "Employee";


  const designation =
    employee?.designation?.trim() ||
    "Employee";


  const department =
    employee?.department?.trim() ||
    "Department";


  // ==========================================
  // EMPLOYEE DASHBOARD
  // ==========================================

  return (

    <div className="dashboard-container">

      {/* =====================================
          DASHBOARD HEADER
      ====================================== */}

      <div className="dashboard-header">

        <div>

          <h1>
            Welcome back, {employeeName} 👋
          </h1>

          <p>
            {designation}
            {" • "}
            {department}
          </p>

        </div>


        {/* Logout Button */}

        <button
          type="button"
          onClick={handleLogout}
          className="logout-button"
        >
          Logout
        </button>

      </div>


      {/* =====================================
          QUICK ACTIONS
      ====================================== */}

      <div className="quick-actions">

        {/* Profile */}

        <Link
          to="/profile"
          className="action-card"
        >

          <User size={32} />

          <h2>
            My Profile
          </h2>

          <p>
            View and update your personal
            details
          </p>

        </Link>


        {/* Attendance */}

        <Link
          to="/attendance"
          className="action-card"
        >

          <CalendarDays size={32} />

          <h2>
            Attendance
          </h2>

          <p>
            Check your daily and monthly
            attendance
          </p>

        </Link>


        {/* Leave */}

        <Link
          to="/leave"
          className="action-card"
        >

          <ClipboardList size={32} />

          <h2>
            Leave Requests
          </h2>

          <p>
            Apply and track your leave
            requests
          </p>

        </Link>


        {/* Payroll */}

        <Link
          to="/payroll"
          className="action-card"
        >

          <Wallet size={32} />

          <h2>
            Payroll
          </h2>

          <p>
            View your salary and payroll
            details
          </p>

        </Link>

      </div>


      {/* =====================================
          EMPLOYEE OVERVIEW
      ====================================== */}

      <div className="recent-activity">

        <h2>
          Employee Overview
        </h2>

        <div className="activity-item">

          <p>

            Welcome to{" "}

            <strong>
              Peoplebox HRMS
            </strong>

          </p>

          <span>
            Manage your profile, attendance,
            leave requests and payroll from
            one place.
          </span>

        </div>

      </div>

    </div>

  );

}


export default EmployeeDashboard;