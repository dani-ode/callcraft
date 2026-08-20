import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCR Platform — AI-Powered Stateless OCR-as-a-Service",
  description: "Build custom visual OCR APIs powered by Gemini & OpenAI Vision models with zero data retention privacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
