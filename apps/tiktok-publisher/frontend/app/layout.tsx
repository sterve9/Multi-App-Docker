import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok Publisher",
  description: "Génération de vidéos TikTok avec Remotion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
