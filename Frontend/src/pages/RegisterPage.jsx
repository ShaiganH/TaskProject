import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Client-side validation before hitting the server ──────────────────────
  // Catches obvious mistakes cheaply (no network round trip)
  const schema = yup.object().shape({
    firstName: yup.string().min(3).max(50).required("First name is required"),

    lastName: yup
      .string()
      .min(3, "Last name must be at least 3 characters")
      .max(50)
      .required("Last name is required"),

    email: yup.string().email("Invalid email").required("Email is required"),

    password: yup
      .string()
      .required("Password is required")
      .min(8, "Password must be at least 8 characters")
      .matches(/[A-Z]/, "Must contain at least one uppercase letter")
      .matches(/[0-9]/, "Must contain at least one number")
      .matches(/[^A-Za-z0-9]/, "Must contain at least one special character"),

    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password"), null], "Passwords must match")
      .required("Confirm password is required"),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    mode: "onTouched",
    resolver: yupResolver(schema),
  });
  const password = watch("password");

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      navigate("/dashboard", { replace: true });
      toast.success("Account created successfully!")
    } catch (err) {

        console.log(err?.response?.data?.error);
      setServerError(
        err?.response?.data.error ?? err?.response?.data ?? "Failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const strength = () => {
    const p = password;
    if (!p) return { level: 0, label: "", color: "" };
    if (p.length < 6) return { level: 1, label: "Weak", color: "bg-red-400" };
    if (p.length < 10)
      return { level: 2, label: "Fair", color: "bg-amber-400" };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p))
      return { level: 3, label: "Strong", color: "bg-green-500" };
    return { level: 2, label: "Fair", color: "bg-amber-400" };
  };
  const pw = strength();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link
            to="/login"
            className="text-xl font-semibold text-gray-900 tracking-tight"
          >
            Task<span className="text-brand-400">Flow</span>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Create account
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Get started with TaskFlow today
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="field-label">First Name</label>
            <input
              className={`field-input ${errors.firstName ? "error" : ""}`}
              placeholder="Ali"
              {...register("firstName")}
              autoComplete="name"
            />
            {errors.firstName && (
              <p className="field-error">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="field-label">Last Name</label>
            <input
              className={`field-input ${errors.lastName ? "error" : ""}`}
              placeholder="Hassan"
              {...register("lastName")}
              autoComplete="name"
            />
            {errors.lastName && (
              <p className="field-error">{errors.lastName.message}</p>
            )}
          </div>

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
                placeholder="At least 8 characters"
                {...register("password")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${pw.level >= i ? pw.color : "bg-gray-200"} transition-all`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">{pw.label}</span>
              </div>
            )}
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="field-label">Confirm password</label>
            <input
              type={show ? "text" : "password"}
              className={`field-input ${errors.confirmPassword ? "error" : ""}`}
              placeholder="Repeat password"
              {...register("confirmPassword")}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="field-error">{errors.confirmPassword.message}</p>
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
              <UserPlus size={16} />
            )}
            {loading ? "Creating account…" : "Create account"}
          </button>
          {serverError && (
  <div className="text-red-500 text-sm mt-2">
    {serverError}
  </div>
)}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-brand-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
      
    </div>
  );
}
