import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup.string().required("Password is required"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const user = await login(data);
      console.log("Logged in user:", user);
      toast.success(`Welcome back, ${user.firstName.split(" ")[0]}!`);
      navigate("/dashboard");
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Login failed";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12">
        <div>
          <span className="text-xl font-semibold text-white tracking-tight">
            Task<span className="text-brand-400">Flow</span>
          </span>
        </div>
        <div>
          <blockquote className="text-2xl font-light text-white/80 leading-relaxed mb-8">
            "Clarity in tasks, clarity in progress. TaskFlow keeps the whole
            team aligned without the noise."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              SA
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sarah Mitchell</p>
              <p className="text-xs text-white/50">Engineering Manager</p>
            </div>
          </div>
        </div>
        <div className="flex gap-6">
          {[
            ["12", "Tasks tracked"],
            ["3", "Team members"],
            ["98%", "On-time rate"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-semibold text-white">{v}</p>
              <p className="text-xs text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="text-xl font-semibold text-gray-900 tracking-tight">
              Task<span className="text-brand-400">Flow</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-8">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                className={`field-input ${errors.email ? "error" : ""}`}
                placeholder="you@example.com"
                {...register("email")}
                autoComplete="email"
              />
              {errors.email && (
                <p className="field-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  className={`field-input pr-10 ${errors.password ? "error" : ""}`}
                  placeholder="••••••••"
                  {...register("password")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
            {serverError && (
              <p className="text-red-500 text-sm text-center">{serverError}</p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-brand-600 font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
