import { FinishZeptoConnectForm } from "./finish-form";

/** Deliberately outside `(shop)` — reachable whether or not a QuickCart session exists yet
 * (this *is* the login for a first-time "Continue with Zepto"). See `zepto.ts`'s doc comment
 * for why this manual paste-back step exists at all. */
export default function FinishZeptoConnectPage() {
  return <FinishZeptoConnectForm />;
}
