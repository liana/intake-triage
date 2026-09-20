import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family across the whole interface; hierarchy comes from weight and size.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Intake",
  description: "Triage inbound project requests against four constraints.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
