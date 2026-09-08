import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { signInWithPassword, signUpWithPassword } from "../lib/auth";
import { useGuest } from "../hooks/useGuest";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { isDevMode } from "../lib/env";

const MODES = { closed: "closed", login: "login", signup: "signup" };

// The "Jouer" screen (route: /play): pick how to start playing --
// account (real Supabase email/password auth, see lib/auth.js) or Guest
// Mode (see lib/guest/, hooks/useGuest.js) -- then land on /select-mode.
export default function PlayMenu() {
  const navigate = useNavigate();
  const { createGuestSession } = useGuest();
  const { session } = useSupabaseSession();
  const [mode, setMode] = useState(MODES.closed);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);

  // The guest shortcut is always available during development (so it's
  // never more than one click away while iterating locally) and, once a
  // guest session already exists, for anyone resuming it -- but stays
  // hidden for a first-time visitor of a production build, who should
  // see the account options first.
  const showGuestButton = isDevMode() || session?.mode === "guest";

  const handleGuestMode = () => {
    createGuestSession();
    navigate("/select-mode");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setConfirmationNeeded(false);
    try {
      const action = mode === MODES.signup ? signUpWithPassword : signInWithPassword;
      const { session: newSession } = await action(email, password);
      if (newSession) {
        navigate("/select-mode");
      } else {
        // Supabase project has email confirmation enabled: no session yet.
        setConfirmationNeeded(true);
      }
    } catch (submitError) {
      setError(submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-10 text-white">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Hospitality Lab</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Jouer</h1>
      </div>

      {mode === MODES.closed && (
        <nav aria-label="Options de connexion" className="flex w-72 flex-col gap-3">
          <Button onClick={() => setMode(MODES.login)}>Se connecter</Button>
          <Button variant="outline" onClick={() => setMode(MODES.signup)}>S'inscrire</Button>
          {showGuestButton && (
            <Button variant="secondary" onClick={handleGuestMode}>
              Mode invité
            </Button>
          )}
        </nav>
      )}

      {(mode === MODES.login || mode === MODES.signup) && (
        <Card className="w-full max-w-sm bg-white text-slate-900">
          <h2 className="mb-3 text-base font-semibold text-slate-900">{mode === MODES.login ? "Se connecter" : "S'inscrire"}</h2>

          {confirmationNeeded ? (
            <p className="text-sm text-emerald-700">
              Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Mot de passe</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete={mode === MODES.login ? "current-password" : "new-password"}
                />
              </label>

              {error && <p className="text-sm text-rose-700">{error.message}</p>}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "…" : mode === MODES.login ? "Se connecter" : "S'inscrire"}
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(MODES.closed);
              setError(null);
              setConfirmationNeeded(false);
            }}
            className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Retour
          </button>
        </Card>
      )}
    </div>
  );
}
