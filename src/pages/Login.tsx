import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, User, Lock, EyeOff, Eye, Loader2 } from "lucide-react";
import { authApi } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? "Credenciales inválidas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Main container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex w-full max-w-[1100px] min-h-[620px] rounded-2xl overflow-hidden shadow-xl">
          {/* Left - Hero */}
          <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-slate-700 to-slate-900">
            {/* Overlay image */}
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80"
              alt="Edificio corporativo"
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
            />
            {/* Content over image */}
            <div className="relative z-10 flex flex-col justify-between p-10 text-white">
              <div className="flex items-center gap-2">
                <img src="/shield_logo.png" alt="Valtor" className="h-30 w-30 object-contain" />
                <div>
                  <h2 className="text-3xl font-bold tracking-wide">Valtor</h2>
                  <div className="w-12 h-1 bg-cyan-400 mt-1.5 rounded-full" />
                </div>
              </div>

              <div>
                <h1 className="text-4xl lg:text-5xl font-light leading-tight mb-6">
                  El futuro del control
                  <br />
                  de efectivo empieza
                  <br />
                  aquí.
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
                  Controla y supervisa el flujo de efectivo de tus sucursales en
                  tiempo real, con precisión, seguridad y total trazabilidad en
                  cada operación.
                </p>
              </div>

              <p className="text-xs uppercase tracking-widest text-slate-400">
                Preferida por más de 500+ entidades bancarias 
              </p>
            </div>
          </div>

          {/* Right - Login Form */}
          <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 lg:p-14">
            <div className="w-full max-w-sm">
              {/* Icon */}
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-slate-700" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">Login</h2>
              <p className="text-slate-500 text-sm mb-8">
                Por favor, ingrese sus credenciales para poder proceder.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="usuario@institucion.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                  />
                  <span className="text-sm text-slate-500">
                    Recordar este usuario
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-500 hover:bg-slate-600 disabled:opacity-60 text-white font-medium rounded-lg transition-colors mt-4 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Accediendo..." : "Acceder"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        Valtor — Gestion inteligente de efectivo
      </footer>
    </div>
  );
}
