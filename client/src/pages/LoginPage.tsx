import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authApi } from "@/api/authApi";
import { useAuth } from "@/hooks/useAuth";
import AuthShell from "@/components/AuthShell";
import type { LoginRequest } from "@/types";

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent";
const labelCls =
  "block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    try {
      const res = await authApi.login(data);
      login(res.data.data.token, res.data.data.user);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.error
          : "Something went wrong";
      setError("root", { message });
    }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to Habitflow">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            className={inputCls}
            placeholder="you@example.com"
            {...register("email", {
              required: "Required",
              pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
            })}
          />
          {errors.email && (
            <p className="text-danger-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            type="password"
            className={inputCls}
            placeholder="••••••••"
            {...register("password", {
              required: "Required",
              minLength: { value: 8, message: "Min 8 chars" },
            })}
          />
          {errors.password && (
            <p className="text-danger-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        {errors.root && (
          <div className="bg-danger-50 border border-danger-100 rounded-xl px-3 py-2.5">
            <p className="text-danger-700 text-sm">{errors.root.message}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-accent-500 to-accent-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-5">
        No account?{" "}
        <Link
          to="/register"
          className="text-accent-600 font-bold hover:underline"
        >
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
