"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    setLoading(false);
    if (!response.ok) { const body = await response.json(); setError(body.error?.message ?? "Não foi possível entrar."); return; }
    router.replace("/dashboard"); router.refresh();
  }
  return <form onSubmit={submit} className="card login-form">
    <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
    <label>Senha<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
  </form>;
}
