import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { generatedMetadata } from "./generated/metadata";

export const metadata: Metadata = {
  title: generatedMetadata.title,
  description: generatedMetadata.description
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
