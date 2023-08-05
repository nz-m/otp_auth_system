import { useAuth } from "../AuthContext";
import { Link } from "react-router-dom";

const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-container">
      {user ? (
        <div>
          <h1 className="welcome-message">Welcome {user.name}</h1>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="not-logged-in">
          <p>Not logged in</p>
          <Link to="/">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </div>
  );
};

export default Home;
