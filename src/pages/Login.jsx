import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState("employee");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setError("");

    setFormData({
      email: "",
      password: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await loginUser(
      formData.email,
      formData.password
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error || "Invalid email or password.");
      return;
    }

    // Check the actual role stored in Firestore
    if (result.role === "employee") {
      // Employee account
      if (loginType !== "employee") {
        setError("This account is not an Admin / HR account.");
        return;
      }

      navigate("/employee-dashboard");
    } 
    
    else if (
      result.role === "admin" ||
      result.role === "hr"
    ) {
      // Admin / HR account
      if (loginType !== "admin") {
        setError("This account is not an Employee account.");
        return;
      }

      navigate("/admin-dashboard");
    } 
    
    else {
      setError("Invalid user role. Please contact HR/Admin.");
    }
  };

  return (
    <div className="login">
      <section className="login__panel">
        <div className="login__brand">
          <span className="employee-brand__mark">P</span>
          <span><strong>Peoplebox</strong><small>HR MANAGEMENT</small></span>
        </div>
        <div className="login__building" aria-hidden="true"><img src="/image.jpg" alt="" /></div>
        <div className="login__quote">
          <h2>Bring every workday into focus.</h2>
          <p>Attendance, leave, and payroll, organized in one clear workspace.</p>
          <div className="login__arc-wrap"><div className="login-arc-line" /><span className="login-arc-dot" /></div>
        </div>
        <p className="login__quote-note">Human Resource Management System</p>
      </section>
      <section className="login__form-col">
        <div className="login__form">
          <span className="content__eyebrow">Welcome back</span>
          <h1>Sign in to Peoplebox</h1>
          <p className="login__form-sub">Use your work account to continue.</p>
          <div className="login-type" role="tablist" aria-label="Account type">
            <button type="button" className={loginType === "employee" ? "active" : ""} onClick={() => handleLoginTypeChange("employee")}>Employee</button>
            <button type="button" className={loginType === "admin" ? "active" : ""} onClick={() => handleLoginTypeChange("admin")}>Admin / HR</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field"><label className="field__label" htmlFor="login-email">Email</label><input className="field__control" id="login-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" required /></div>
            <div className="field"><label className="field__label" htmlFor="login-password">Password</label><input className="field__control" id="login-password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required /></div>
            {error && <p className="field__hint field__hint--error">{error}</p>}
            <button className="btn btn--primary btn--full login-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
          </form>
          {loginType === "employee" && <p className="login__footer-note">New employee? <Link className="link" to="/register">Create an account</Link></p>}
        </div>
      </section>
    </div>
  );
}

export default Login;