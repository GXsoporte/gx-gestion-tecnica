'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Shield, Zap, BarChart3, Mail, KeyRound } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el flujo de cliente OTP
  const [loginMode, setLoginMode] = useState<'staff' | 'client'>('staff');
  const [otpSent, setOtpSent] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || 'Credenciales incorrectas');
      } else {
        toast.success('Bienvenido al sistema');
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!clientEmail) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al enviar el código');
      } else {
        setOtpSent(true);
        toast.success('Código enviado a tu correo');
      }
    } catch {
      toast.error('Error al enviar el código');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpLogin = async () => {
    if (!otp) {
      toast.error('Ingresa el código recibido');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: clientEmail,
        otp,
        redirect: false,
      });
      if (result?.error) {
        toast.error(result.error || 'Código inválido o expirado');
      } else {
        toast.success('Bienvenido al sistema');
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: 'staff' | 'client') => {
    setLoginMode(mode);
    setOtpSent(false);
    setClientEmail('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">GX Soporte</span>
          </div>
          <p className="text-blue-200/60 text-sm">Gestión Técnica Empresarial</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Gestiona tu soporte
              <span className="block text-blue-400">técnico con eficiencia</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Plataforma integral para gestión de tickets, actividades, inventario y mantenimiento tecnológico empresarial.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: Shield,
                title: 'Multi-empresa seguro',
                desc: 'Datos aislados por empresa con roles granulares',
              },
              {
                icon: Zap,
                title: 'IA para diagnósticos',
                desc: 'Diagnósticos técnicos inteligentes con OpenAI',
              },
              {
                icon: BarChart3,
                title: 'Reportes en tiempo real',
                desc: 'KPIs, métricas y exportación en PDF/Excel',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{feature.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-500 text-xs">
            © 2025 GX Soporte S.A.S. — Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">GX Soporte</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-premium">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Iniciar sesión</h2>
              <p className="text-slate-400 text-sm">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* Tabs de modo de acceso */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleModeChange('staff')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === 'staff'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                Acceso Personal
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('client')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === 'client'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                Acceso Cliente
              </button>
            </div>

            {/* Formulario Staff */}
            {loginMode === 'staff' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="usuario@empresa.com"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>
            )}

            {/* Formulario Cliente OTP */}
            {loginMode === 'client' && (
              <div className="space-y-5">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="tu@empresa.com"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        autoComplete="email"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                      />
                    </div>
                    <p className="text-slate-500 text-xs">
                      Recibirás un código de 6 dígitos en tu correo para ingresar.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || !clientEmail}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/25"
                    >
                      {sendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando código...
                        </>
                      ) : (
                        'Enviar código'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <p className="text-blue-300 text-sm text-center">
                        Código enviado a <strong>{clientEmail}</strong>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Código de acceso
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm text-center tracking-widest font-mono text-lg"
                        onKeyDown={(e) => e.key === 'Enter' && handleOtpLogin()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleOtpLogin}
                      disabled={isLoading || otp.length !== 6}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/25"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Ingresando...
                        </>
                      ) : (
                        'Ingresar'
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                        }}
                        className="text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      >
                        Reenviar código
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Credenciales de demo — solo en modo staff */}
            {loginMode === 'staff' && (
              <div className="mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-3">
                  Accesos de demostración
                </p>
                <div className="space-y-2">
                  {[
                    { role: 'Super Admin', email: 'superadmin@gx.com.co' },
                    { role: 'Admin', email: 'admin@gx.com.co' },
                    { role: 'Técnico', email: 'tecnico1@gx.com.co' },
                    { role: 'Cliente', email: 'contacto@demo.com' },
                  ].map((cred) => (
                    <div key={cred.email} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">{cred.role}:</span>
                      <span className="text-slate-300 font-mono">{cred.email}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-500/20">
                    <span className="text-slate-400">Contraseña:</span>
                    <span className="text-slate-300 font-mono">Admin123!</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            ¿Problemas para acceder? Contacte al administrador del sistema
          </p>
        </div>
      </div>
    </div>
  );
}
