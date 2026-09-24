import { LoginForm } from "./login-form";

/**
 * No session gate here anymore: middleware silently gives every visitor a session (anonymous
 * or real) before this page even renders, so "already logged in -> redirect home" would fire
 * for literally everyone, making this page unreachable. Visiting it while anonymous is fine —
 * "Continue with Zepto" upgrades that same session by linking a real connection to it, the
 * same thing the Profile page's connect flow does.
 */
export default function LoginPage() {
  return <LoginForm />;
}
