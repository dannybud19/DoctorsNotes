import type { ReactNode } from "react";

export const metadata = {
  title: "MedThread",
  description: "Follow what is happening to you — verbatim, with provenance.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
