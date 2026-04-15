// src/features/auth/components/LoginForm.tsx
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.ts";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative">
      <img
        src="/bgimage.webp"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <img
          src="/imgi_2_Easeteq_sticky.svg"
          alt="logo"
          className="w-20 mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold mb-2 text-gray-800">
          Workforce Access Portal
        </h1>
        <p className="text-gray-500 mb-6">
          Sign in with your email and password
        </p>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 p-3 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-3 border rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Workforce System
        </p>
      </div>
    </div>
  );
};

export default LoginForm;