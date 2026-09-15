import type { Metadata } from "next";
import { preload } from "react-dom";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "@cadenya/widgets-ui-react/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadenya Widgets Demo",
  description: "A travel concierge, chess opponent, and diagram builder powered by Cadenya widgets.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Preload the variable fonts declared in app/fonts.css.
  preload("https://assets.cadenya.com/fonts/ABCArizonaSansVariable.woff2?v=20260913", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("https://assets.cadenya.com/fonts/ABCArizonaFlareVariable.woff2?v=20260913", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  // accentColor/grayColor pick the closest Radix scales; globals.css remaps the accent and gray steps onto the brand palette.
  return <html lang="en"><body><Theme accentColor="green" grayColor="sage" radius="medium" appearance="light">{children}</Theme></body></html>;
}
