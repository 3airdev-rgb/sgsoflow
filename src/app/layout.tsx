import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Aero SGSO", description: "Fundação técnica para gestão da segurança operacional" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
