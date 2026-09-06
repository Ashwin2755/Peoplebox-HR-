import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      employeeId,
      email,
      password,
      confirmPassword,
    } = formData;

    // Check empty fields
    if (!employeeId || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Check password length
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Register employee
    const result = await registerUser(
      employeeId,
      email,
      password
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess("Employee account created successfully!");

    // Redirect to login
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  return (
    <div className="login">
      <section className="login__panel">
        <div className="login__brand"><span className="employee-brand__mark">P</span><span><strong>Peoplebox</strong><small>HR MANAGEMENT</small></span></div>
        <div className="login__building" aria-hidden="true"><img src="/image.jpg" alt="" /></div>
        <div className="login__quote"><h2>Build a better workday together.</h2><p>Join Peoplebox to keep attendance, leave, and payroll in one clear workspace.</p><div className="login__arc-wrap"><div className="login-arc-line" /><span className="login-arc-dot" /></div></div>
        <p className="login__quote-note">Human Resource Management System</p>
      </section>
      <section className="login__form-col"><div className="login__form"><span className="content__eyebrow">Employee access</span><h1>Create your account</h1><p className="login__form-sub">Register with the employee ID provided by HR.</p><form onSubmit={handleSubmit}><div className="field"><label className="field__label" htmlFor="register-id">Employee ID</label><input className="field__control" id="register-id" type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="EMP-000" required /></div><div className="field"><label className="field__label" htmlFor="register-email">Email</label><input className="field__control" id="register-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" required /></div><div className="field"><label className="field__label" htmlFor="register-password">Password</label><input className="field__control" id="register-password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" required /></div><div className="field"><label className="field__label" htmlFor="register-confirm">Confirm Password</label><input className="field__control" id="register-confirm" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required /></div>{error && <p className="field__hint field__hint--error">{error}</p>}{success && <p className="field__hint field__hint--success">{success}</p>}<button className="btn btn--primary btn--full login-submit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button></form><p className="login__footer-note">Already have an account? <Link className="link" to="/login">Sign in</Link></p></div></section>
    </div>
  );
}

export default Register;