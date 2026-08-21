import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppInitProvider } from "@/context/app-init-context";

export const metadata: Metadata = {
  title: "Callcraft — AI-Powered Dynamic Multimodal Execution Engine",
  description: "Dynamic AI Tool Calling, Structured JSON Coercion, and Multimodal API Gateway.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen antialiased">
        <AppInitProvider>
          <AuthProvider>{children}</AuthProvider>
        </AppInitProvider>
      </body>
    </html>
  );
}
