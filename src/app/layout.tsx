import type { Metadata } from "next";
import { Lato, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import "./globals.css";

const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shapeheart · Amazon Tracker",
  description: "Back office pour suivre vos produits Amazon via l'API Keepa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${lato.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">{children}</main>
      </body>
    </html>
  );
}
