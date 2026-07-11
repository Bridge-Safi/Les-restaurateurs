import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useUser, useBridgeAuth, getStoredToken } from "@/bridge-auth";
import { SERVICE_TYPES, getServiceTypeConfig, type ServiceType } from "@/lib/service-types";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlarmProvider } from "@/contexts/AlarmContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Landing from "@/pages/landing";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Formulaire partagé connexion / inscription ── */
function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn, signUp } = useBridgeAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("restaurant");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";
  const serviceConfig = getServiceTypeConfig(serviceType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name, serviceType);
      } else {
        await signIn(email, password);
      }
      setLocation(basePath || "/");
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      <div className="bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {isSignUp ? "Créer un compte" : "Connexion"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp
              ? "Rejoignez Bridge Eats et gérez vos commandes"
              : "Accédez à votre tableau de bord Bridge Eats"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <Label>Type de commerce</Label>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_TYPES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setServiceType(s.key)}
                    data-testid={`service-type-${s.key}`}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      serviceType === s.key
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    <span className="text-lg leading-none">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="name">{serviceConfig.nameLabel}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Mon ${serviceConfig.label}`}
                className="bg-gray-50 border-gray-200"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="bg-gray-50 border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer mon compte" : "Se connecter"}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-500">
          {isSignUp ? (
            <>
              Déjà un compte ?{" "}
              <Link href="/sign-in" className="text-orange-500 hover:text-orange-600 font-semibold">
                Se connecter
              </Link>
            </>
          ) : (
            <>
              Pas encore de compte ?{" "}
              <Link href="/sign-up" className="text-orange-500 hover:text-orange-600 font-semibold">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return <AuthForm mode="sign-in" />;
}

function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}

/* Auto-creates the restaurant profile on first login so the API token is available immediately */
function RestaurantInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = getStoredToken();
    fetch(`${base}/api/restaurant/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, []);

  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) {
    return (
      <>
        <RestaurantInitializer />
        <AlarmProvider>
          <Layout>
            <Dashboard />
          </Layout>
        </AlarmProvider>
      </>
    );
  }
  return <Landing />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/" />;
  return (
    <>
      <RestaurantInitializer />
      <AlarmProvider>
        <Layout>{children}</Layout>
      </AlarmProvider>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/orders/:id">
        {(params) => (
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/orders">
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WouterRouter base={basePath}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </WouterRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
