import { useEffect, useState } from "react";

import {
  CalendarDays,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Send,
  ArrowLeft,
} from "lucide-react";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import "./Leave.css";


function Leave() {

  const { currentUser } = useAuth();

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================

  const [leaveRequests, setLeaveRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================
  // APPLY LEAVE FORM
  // ==========================================

  const [showForm, setShowForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  // ==========================================
  // EMPLOYEE DATA
  // ==========================================

  const [employeeData, setEmployeeData] = useState(null);


  // ==========================================
  // FETCH EMPLOYEE + LEAVE REQUESTS
  // ==========================================

  const fetchLeaveRequests = async () => {

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {

      setLoading(true);
      setError("");

      // ----------------------------------------
      // STEP 1: Get logged-in user
      // ----------------------------------------

      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );

      const userSnapshot =
        await getDocs(userQuery);


      if (userSnapshot.empty) {

        setError(
          "Employee account information not found."
        );

        setLoading(false);
        return;
      }


      const userData =
        userSnapshot.docs[0].data();


      const employeeId =
        userData.employeeId;


      if (!employeeId) {

        setError(
          "Employee ID is missing from your account."
        );

        setLoading(false);
        return;
      }


      // ----------------------------------------
      // Save employee information
      // ----------------------------------------

      setEmployeeData({
        uid: currentUser.uid,
        employeeId: employeeId,
        email:
          userData.email ||
          currentUser.email,
        name:
          userData.name ||
          currentUser.email,
      });


      // ----------------------------------------
      // STEP 2: Get leave requests
      // ----------------------------------------

      const leaveQuery = query(
        collection(db, "leaveRequests"),
        where(
          "employeeId",
          "==",
          employeeId
        )
      );


      const snapshot =
        await getDocs(leaveQuery);


      const requests =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));


      // Latest requests first
      requests.sort((a, b) => {

        const dateA =
          a.fromDate || "";

        const dateB =
          b.fromDate || "";

        return dateB.localeCompare(dateA);

      });


      setLeaveRequests(requests);

    } catch (error) {

      console.error(
        "Error loading leave requests:",
        error
      );

      setError(
        error.message ||
        "Unable to load your leave requests."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    fetchLeaveRequests();

  }, [currentUser]);


  // ==========================================
  // HANDLE FORM CHANGE
  // ==========================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };


  // ==========================================
  // CALCULATE DAYS
  // ==========================================

  const calculateDays = () => {

    if (
      !formData.fromDate ||
      !formData.toDate
    ) {
      return 0;
    }

    const from =
      new Date(formData.fromDate);

    const to =
      new Date(formData.toDate);

    if (to < from) {
      return 0;
    }

    const difference =
      to.getTime() -
      from.getTime();

    return (
      Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
      ) + 1
    );
  };


  const totalDays =
    calculateDays();


  // ==========================================
  // SUBMIT LEAVE REQUEST
  // ==========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");
    setSuccess("");


    // ----------------------------------------
    // Validation
    // ----------------------------------------

    if (!formData.leaveType) {

      setError(
        "Please select a leave type."
      );

      return;
    }


    if (!formData.fromDate) {

      setError(
        "Please select the start date."
      );

      return;
    }


    if (!formData.toDate) {

      setError(
        "Please select the end date."
      );

      return;
    }


    if (new Date(formData.toDate) <
        new Date(formData.fromDate)) {

      setError(
        "End date cannot be before start date."
      );

      return;
    }


    if (!formData.reason.trim()) {

      setError(
        "Please enter the reason for leave."
      );

      return;
    }


    if (!employeeData) {

      setError(
        "Employee information is not available."
      );

      return;
    }


    try {

      setSubmitting(true);


      // ----------------------------------------
      // Create Leave Request
      // ----------------------------------------

      await addDoc(
        collection(db, "leaveRequests"),
        {

          employeeId:
            employeeData.employeeId,

          employeeName:
            employeeData.name,

          leaveType:
            formData.leaveType,

          fromDate:
            formData.fromDate,

          toDate:
            formData.toDate,

          days:
            totalDays,

          reason:
            formData.reason.trim(),

          // Initial status
          status:
            "pending",

          // HR will update this later
          adminComment:
            "",

          reviewedAt:
            "",

          createdAt:
            serverTimestamp(),

        }
      );


      // ----------------------------------------
      // Success
      // ----------------------------------------

      setSuccess(
        "Leave request submitted successfully!"
      );


      // Clear form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
      });


      setShowForm(false);


      // Refresh requests
      await fetchLeaveRequests();

    } catch (error) {

      console.error(
        "Leave submission error:",
        error
      );

      setError(
        error.message ||
        "Unable to submit leave request."
      );

    } finally {

      setSubmitting(false);

    }
  };


  // ==========================================
  // STATUS ICON
  // ==========================================

  const getStatusIcon = (status) => {

    const value =
      status?.toLowerCase();


    if (value === "approved") {

      return (
        <CheckCircle size={18} />
      );

    }


    if (value === "rejected") {

      return (
        <XCircle size={18} />
      );

    }


    return (
      <Clock size={18} />
    );
  };


  // ==========================================
  // STATUS CLASS
  // ==========================================

  const getStatusClass = (status) => {

    const value =
      status?.toLowerCase();


    if (value === "approved") {

      return "leave-status approved";

    }


    if (value === "rejected") {

      return "leave-status rejected";

    }


    return "leave-status pending";
  };


  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {

    if (!date) {
      return "-";
    }


    if (date?.toDate) {

      return date
        .toDate()
        .toLocaleDateString("en-IN");

    }


    if (
      typeof date === "string" &&
      date.includes("-")
    ) {

      const [
        year,
        month,
        day,
      ] = date.split("-");

      return `${day}/${month}/${year}`;
    }


    return date;
  };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (

      <div className="leave-page">

        <div className="leave-header">

          <h1>
            My Leave Requests
          </h1>

          <p>
            Loading your leave applications...
          </p>

        </div>

      </div>

    );
  }


  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (

    <div className="leave-page">

      <button
        type="button"
        className="page-back-button"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={17} />
        Back
      </button>

      {/* ======================================
          HEADER
      ======================================= */}

      <div className="leave-header">

        <div>

          <p className="leave-label">
            EMPLOYEE PORTAL
          </p>

          <h1>
            My Leave Requests
          </h1>

          <p className="leave-subtitle">
            Apply for leave and track your
            applications.
          </p>

        </div>


        <button
          className="apply-leave-button"
          onClick={() => {

            setShowForm(
              !showForm
            );

            setError("");
            setSuccess("");

          }}
        >

          <Plus size={18} />

          {showForm
            ? "Close"
            : "Apply Leave"}

        </button>

      </div>


      {/* ======================================
          SUCCESS MESSAGE
      ======================================= */}

      {success && (

        <div className="leave-message success">

          <CheckCircle size={22} />

          <span>
            {success}
          </span>

        </div>

      )}


      {/* ======================================
          ERROR MESSAGE
      ======================================= */}

      {error && (

        <div className="leave-message error">

          <AlertCircle size={22} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ======================================
          APPLY LEAVE FORM
      ======================================= */}

      {showForm && (

        <div className="leave-form-card">

          <div className="leave-form-header">

            <div>

              <h2>
                Apply for Leave
              </h2>

              <p>
                Submit your leave request
                for HR approval.
              </p>

            </div>

          </div>


          <form
            onSubmit={handleSubmit}
            className="leave-form"
          >

            {/* Leave Type */}

            <div className="form-group">

              <label>
                Leave Type
              </label>

              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
              >

                <option value="">
                  Select leave type
                </option>

                <option value="Sick Leave">
                  Sick Leave
                </option>

                <option value="Emergency Leave">
                  Emergency Leave
                </option>

                <option value="Personal Leave">
                  Personal Leave
                </option>

              </select>

            </div>


            {/* Dates */}

            <div className="leave-date-grid">

              <div className="form-group">

                <label>
                  From Date
                </label>

                <input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleChange}
                />

              </div>


              <div className="form-group">

                <label>
                  To Date
                </label>

                <input
                  type="date"
                  name="toDate"
                  value={formData.toDate}
                  min={formData.fromDate}
                  onChange={handleChange}
                />

              </div>

            </div>


            {/* Total Days */}

            <div className="leave-days-preview">

              <CalendarDays size={22} />

              <div>

                <span>
                  Total Leave Days
                </span>

                <strong>
                  {totalDays}{" "}
                  {totalDays === 1
                    ? "Day"
                    : "Days"}
                </strong>

              </div>

            </div>


            {/* Reason */}

            <div className="form-group">

              <label>
                Reason
              </label>

              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter the reason for your leave..."
                rows="4"
              />

            </div>


            {/* Submit */}

            <button
              type="submit"
              className="submit-leave-button"
              disabled={submitting}
            >

              <Send size={18} />

              {submitting
                ? "Submitting..."
                : "Submit Leave Request"}

            </button>

          </form>

        </div>

      )}


      {/* ======================================
          LEAVE REQUESTS
      ======================================= */}

      {leaveRequests.length === 0 ? (

        <div className="leave-message">

          <FileText size={40} />

          <h2>
            No Leave Requests
          </h2>

          <p>
            You haven't submitted any leave
            applications yet.
          </p>

        </div>

      ) : (

        <div className="leave-list">

          {leaveRequests.map((leave) => (

            <div
              className="leave-card"
              key={leave.id}
            >

              {/* Card Header */}

              <div className="leave-card-header">

                <div>

                  <h2>
                    {leave.leaveType ||
                      "Leave Request"}
                  </h2>

                  <span className="leave-request-id">
                    Request ID: {leave.id}
                  </span>

                </div>


                <div
                  className={getStatusClass(
                    leave.status
                  )}
                >

                  {getStatusIcon(
                    leave.status
                  )}

                  <span>

                    {leave.status
                      ? leave.status
                          .charAt(0)
                          .toUpperCase() +
                        leave.status.slice(1)
                      : "Pending"}

                  </span>

                </div>

              </div>


              {/* Details */}

              <div className="leave-details">

                <div className="leave-detail">

                  <CalendarDays size={20} />

                  <div>

                    <span>
                      Leave Period
                    </span>

                    <strong>

                      {formatDate(
                        leave.fromDate
                      )}

                      {" → "}

                      {formatDate(
                        leave.toDate
                      )}

                    </strong>

                  </div>

                </div>


                <div className="leave-detail">

                  <Clock size={20} />

                  <div>

                    <span>
                      Total Days
                    </span>

                    <strong>

                      {leave.days ?? 0}{" "}

                      {Number(leave.days) === 1
                        ? "Day"
                        : "Days"}

                    </strong>

                  </div>

                </div>


                <div className="leave-detail">

                  <FileText size={20} />

                  <div>

                    <span>
                      Reason
                    </span>

                    <strong>
                      {leave.reason ||
                        "No reason provided"}
                    </strong>

                  </div>

                </div>

              </div>


              {/* Employee ID */}

              <div className="leave-employee-info">

                <span>
                  Employee ID
                </span>

                <strong>
                  {leave.employeeId}
                </strong>

              </div>


              {/* HR Comment */}

              {leave.adminComment && (

                <div className="admin-comment">

                  <strong>
                    HR / Admin Comment
                  </strong>

                  <p>
                    {leave.adminComment}
                  </p>

                </div>

              )}


              {/* Reviewed Date */}

              {leave.reviewedAt && (

                <div className="reviewed-date">

                  Reviewed:{" "}

                  {formatDate(
                    leave.reviewedAt
                  )}

                </div>

              )}

            </div>

          ))}

        </div>

      )}

    </div>

  );
}


export default Leave;