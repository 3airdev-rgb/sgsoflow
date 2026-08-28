import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage() { if (await getSession()) redirect("/dashboard"); return <main className="login-page"><section><p className="eyebrow">Segurança operacional</p><h1>Aero SGSO</h1><p className="muted">Acesso à fundação administrativa do sistema.</p><LoginForm /></section></main>; }
