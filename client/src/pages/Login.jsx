import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setLoading(true); // Set loading state to true
    axios
      .post("http://127.0.0.1:3000/login", {
        email,
        password,
      })
      .then((res) => {
        console.log(res.data);
        navigate("/otp", { state: { email } });
      })
      .catch((err) => {
        console.log(err);
        setError("Login failed. Please check your credentials.");
      })
      .finally(() => {
        setLoading(false); // Reset loading state
      });
  };

  return (
    <div className="App">
      <div className="login-container">
        <h1>Login</h1>
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleLogin} disabled={loading}>
          {" "}
          {loading ? "Logging in..." : "Login"}
        </button>

        <Link to="/register">Register</Link>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default Login;
