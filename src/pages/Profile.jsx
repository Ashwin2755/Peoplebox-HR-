import { useState, useEffect } from "react";

import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Pencil,
  User,
  ArrowLeft,
  Camera,
} from "lucide-react";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { getEmployeeDisplayId } from "../utils/employeeDisplay";

import { useAuth } from "../context/AuthContext";
import "./Profile.css";


function Profile() {

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const { currentUser } = useAuth();


  // ==========================================
  // EDIT MODE
  // ==========================================

  const [isEditing, setIsEditing] =
    useState(false);


  // ==========================================
  // LOADING
  // ==========================================

  const [loading, setLoading] =
    useState(true);


  // ==========================================
  // SAVING
  // ==========================================

  const [saving, setSaving] =
    useState(false);

  const [imageSaving, setImageSaving] =
    useState(false);


  // ==========================================
  // EMPLOYEE DATA
  // ==========================================

  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",

    employeeId: "",
    department: "",
    designation: "",
    dateOfBirth: "",
    joiningDate: "",

    basicSalary: 0,
    allowances: 0,
    deductions: 0,

    profileImage: "",
  });


  // ==========================================
  // ERROR
  // ==========================================

  const [error, setError] =
    useState("");


  // ==========================================
  // FETCH EMPLOYEE PROFILE
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


        // ======================================
        // STEP 1:
        // Get logged-in user's document
        // ======================================

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const userSnap =
          await getDoc(userRef);


        if (!userSnap.exists()) {

          setError(
            "User account information not found."
          );

          setLoading(false);

          return;
        }


        const userData =
          userSnap.data();


        // ======================================
        // STEP 2:
        // Get Employee ID
        // ======================================

        const employeeId = userData.employeeId;


        if (!employeeId) {

          setError(
            "Employee ID is missing from your account."
          );

          setLoading(false);

          return;
        }


        // ======================================
        // STEP 3:
        // Get actual employee document
        // ======================================

        let employeeSnap = await getDoc(doc(db, "employees", employeeId));

        if (!employeeSnap.exists()) {
          const [uidQuery, emailQuery] = await Promise.all([
            getDocs(query(collection(db, "employees"), where("uid", "==", currentUser.uid))),
            getDocs(query(collection(db, "employees"), where("email", "==", userData.email || currentUser.email))),
          ]);
          employeeSnap = [...uidQuery.docs, ...emailQuery.docs]
            .find((item) => /^EMP\w+$/i.test(item.id)) || uidQuery.docs[0] || emailQuery.docs[0] || null;
        }


        if (!employeeSnap) {

          setError(
            "Employee profile not found."
          );

          setLoading(false);

          return;
        }


        // ======================================
        // STEP 4:
        // Store employee data
        // ======================================

        const employeeData = employeeSnap.data();
        const resolvedEmployeeId = employeeData.employeeId?.match(/^EMP\w+$/i)
          ? employeeData.employeeId
          : employeeSnap.id.match(/^EMP\w+$/i)
            ? employeeSnap.id
            : employeeId;

        setEmployee({
          name: employeeData.name || "",
          phone: employeeData.phone || "",
          address: employeeData.address || "",
          employeeId: resolvedEmployeeId,
          department: employeeData.department || "",
          designation: employeeData.designation || "",
          dateOfBirth: employeeData.dateOfBirth || "",
          joiningDate: employeeData.joiningDate || "",
          basicSalary: employeeData.basicSalary || 0,
          allowances: employeeData.allowances || 0,
          deductions: employeeData.deductions || 0,
          profileImage: employeeData.profileImage || "",

          // Make sure email is available
          email:
            employeeData.email ||
            userData.email ||
            currentUser.email ||
            "",
        });


      } catch (error) {

        console.error(
          "Error loading profile:",
          error
        );

        setError(
          "Unable to load employee profile."
        );

      } finally {

        setLoading(false);

      }

    };


    fetchEmployee();

  }, [currentUser]);


  // ==========================================
  // HANDLE INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;


    setEmployee((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSave = async () => {

    if (!currentUser) {

      alert(
        "You are not logged in."
      );

      return;
    }


    if (!employee.employeeId) {

      alert(
        "Employee ID not found."
      );

      return;
    }


    if (!employee.name.trim()) {

      alert(
        "Please enter your name."
      );

      return;
    }


    try {

      setSaving(true);


      // ======================================
      // Employee document reference
      // ======================================

      const employeeRef = doc(
        db,
        "employees",
        employee.employeeId
      );


      // ======================================
      // Save only editable profile data
      // ======================================

      await setDoc(
        employeeRef,
        {
          name:
            employee.name.trim(),

          phone:
            employee.phone || "",

          address:
            employee.address || "",

          dateOfBirth:
            employee.dateOfBirth || "",

          department:
            employee.department || "",

          designation:
            employee.designation || "",

          joiningDate:
            employee.joiningDate || "",

          // Keep employee ID linked
          employeeId:
            employee.employeeId,

          // Keep email synced
          email:
            employee.email ||
            currentUser.email ||
            "",
        },
        {
          merge: true,
        }
      );


      // ======================================
      // Update local state
      // ======================================

      setEmployee((previous) => ({
        ...previous,
        name: employee.name.trim(),
      }));


      alert(
        "Profile updated successfully!"
      );


      setIsEditing(false);


    } catch (error) {

      console.error(
        "Error saving profile:",
        error
      );

      alert(
        "Failed to update profile."
      );

    } finally {

      setSaving(false);

    }

  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEmployee((previous) => ({
        ...previous,
        profileImage: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageSave = async () => {
    if (!currentUser || !employee.employeeId || !employee.profileImage) {
      alert("Please choose a profile picture first.");
      return;
    }

    try {
      setImageSaving(true);

      await setDoc(
        doc(db, "employees", employee.employeeId),
        { profileImage: employee.profileImage },
        { merge: true }
      );

      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error saving profile picture:", error);
      alert("Failed to update profile picture.");
    } finally {
      setImageSaving(false);
    }
  };


  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {

    return (

      <div className="profile-container">

        <h2>
          Loading profile...
        </h2>

      </div>

    );

  }


  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (error) {

    return (

      <div className="profile-container">

        <h2>
          Employee Profile
        </h2>

        <p className="error-message">
          {error}
        </p>

      </div>

    );

  }


  // ==========================================
  // PROFILE PAGE
  // ==========================================

  return (

    <div className="profile-container">

      <button
        type="button"
        className="page-back-button"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={17} />
        Back
      </button>


      {/* ======================================
          PROFILE HEADER
      ======================================= */}

      <div className="profile-header">


        {/* Profile Avatar */}

        <div className="profile-avatar">

          {employee.profileImage ? (

            <img
              src={employee.profileImage}
              alt="Profile"
              className="profile-image"
            />

          ) : (

            employee.name
              ?.trim()
              ?.charAt(0)
              ?.toUpperCase() || "E"

          )}

        </div>


        {/* Employee Name */}

        <div>

          <h1>
            {employee.name ||
              "Employee Name"}
          </h1>

          <p>
            {employee.designation ||
              "Employee"}
          </p>

          <span>
            {employee.department ||
              "Department"}
          </span>

        </div>


        {/* Edit Button */}

        <button
          type="button"
          className="edit-profile-btn"
          onClick={() => {

            setIsEditing(
              !isEditing
            );

          }}
        >

          <Pencil size={18} />

          {isEditing
            ? "Cancel"
            : "Edit Profile"}

        </button>

      </div>


      {/* ======================================
          PROFILE GRID
      ======================================= */}

      <div className="profile-grid">


        {/* ====================================
            PERSONAL DETAILS
        ===================================== */}

        <div className="profile-card">

          <h2>
            Personal Details
          </h2>


          {/* Name */}

          <div className="profile-field">

            <User size={20} />

            <div>

              <label>
                Full Name
              </label>


              {isEditing ? (

                <input
                  type="text"
                  name="name"
                  value={employee.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />

              ) : (

                <p>
                  {employee.name ||
                    "Not provided"}
                </p>

              )}

            </div>

          </div>


          {/* Email */}

          <div className="profile-field">

            <Mail size={20} />

            <div>

              <label>
                Email
              </label>

              <p>
                {employee.email ||
                  "Not provided"}
              </p>

            </div>

          </div>


          {/* Phone */}

          <div className="profile-field">

            <Phone size={20} />

            <div>

              <label>
                Phone
              </label>


              {isEditing ? (

                <input
                  type="text"
                  name="phone"
                  value={employee.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />

              ) : (

                <p>
                  {employee.phone ||
                    "Not provided"}
                </p>

              )}

            </div>

          </div>


          {/* Address */}

          <div className="profile-field">

            <MapPin size={20} />

            <div>

              <label>
                Address
              </label>


              {isEditing ? (

                <input
                  type="text"
                  name="address"
                  value={employee.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />

              ) : (

                <p>
                  {employee.address ||
                    "Not provided"}
                </p>

              )}

            </div>

          </div>


          {/* Profile Image */}

          {isEditing && (
            <div className="profile-field profile-photo-field">
              <Camera size={20} />
              <div>
                <label htmlFor="profile-image">Profile Picture</label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  className="save-photo-btn"
                  onClick={handleImageSave}
                  disabled={imageSaving || !employee.profileImage}
                >
                  {imageSaving ? "Saving..." : "Save Photo"}
                </button>
                <small className="photo-help">
                  Only the profile picture is updated by this button.
                </small>
              </div>
            </div>
          )}

          <div className="profile-field">

            <Calendar size={20} />

            <div>

              <label>
                Date of Birth
              </label>

              {isEditing ? (

                <input
                  type="date"
                  name="dateOfBirth"
                  value={employee.dateOfBirth}
                  onChange={handleChange}
                />

              ) : (

                <p>
                  {employee.dateOfBirth ||
                    "Not provided"}
                </p>

              )}

            </div>

          </div>

        </div>


        {/* ====================================
            JOB DETAILS
        ===================================== */}

        <div className="profile-card">

          <h2>
            Job Details
          </h2>


          {/* Employee ID */}

          <div className="profile-field">

            <CreditCard size={20} />

            <div>

              <label>
                Employee ID
              </label>

              <p>
                {getEmployeeDisplayId(employee)}
              </p>

            </div>

          </div>


          {/* Department */}

          <div className="profile-field">

            <Building2 size={20} />

            <div>

              <label>
                Department
              </label>

              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={employee.department}
                  onChange={handleChange}
                  placeholder="Enter department"
                />
              ) : (
                <p>{employee.department || "Not provided"}</p>
              )}

            </div>

          </div>


          {/* Designation */}

          <div className="profile-field">

            <Briefcase size={20} />

            <div>

              <label>
                Designation
              </label>

              {isEditing ? (
                <input
                  type="text"
                  name="designation"
                  value={employee.designation}
                  onChange={handleChange}
                  placeholder="Enter designation"
                />
              ) : (
                <p>{employee.designation || "Not provided"}</p>
              )}

            </div>

          </div>


          {/* Joining Date */}

          <div className="profile-field">

            <Calendar size={20} />

            <div>

              <label>
                Joining Date
              </label>

              {isEditing ? (
                <input
                  type="date"
                  name="joiningDate"
                  value={employee.joiningDate}
                  onChange={handleChange}
                />
              ) : (
                <p>{employee.joiningDate || "Not provided"}</p>
              )}

            </div>

          </div>

        </div>

      </div>


      {/* ======================================
          SAVE BUTTON
      ======================================= */}

      {isEditing && (

        <button
          type="button"
          className="save-profile-btn"
          onClick={handleSave}
          disabled={saving}
        >

          {saving
            ? "Saving..."
            : "Save Changes"}

        </button>

      )}

    </div>

  );

}


export default Profile;
