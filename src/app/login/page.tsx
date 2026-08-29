import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "@/components/login-form";
import { isLocalPreviewEnabled } from "@/server/local-preview";
export default async function LoginPage() { if (await getSession()) redirect("/dashboard"); const preview = isLocalPreviewEnabled(); return <main className="login-page"><section><p className="eyebrow">Segurança operacional</p><h1>Aero SGSO</h1><p className="muted">Acesso à fundação administrativa do sistema.</p>{preview && <p className="preview-notice">Modo de visualização local — sem banco de dados e sem persistência.</p>}<LoginForm /></section></main>; }
