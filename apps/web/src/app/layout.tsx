import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeRegistry } from "../theme-registry";

export const metadata: Metadata = {
  title: "QuickCart — everything, in minutes",
  description: "One search across Blinkit, Zepto, BigBasket, Flipkart & Amazon — we buy you the best.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
