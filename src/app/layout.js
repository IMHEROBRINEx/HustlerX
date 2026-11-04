import { Bricolage_Grotesque, Figtree, Kalam } from "next/font/google";
import "./globals.css";
import ThemeToggleFab from "@/components/theme-toggle-fab";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata = {
  title: "Truss | Internships with someone to ask",
  description:
    "Truss finds this week's internship and job posts on LinkedIn, newest first, so every lead comes with someone you can message.",
};

const themeInitScript = `(() => {
  const STORAGE_KEY = "truss-theme";
  const root = document.documentElement;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme = stored === "light" || stored === "dark" ? stored : "light";
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch {
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
  }
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${bricolage.variable} ${figtree.variable} ${kalam.variable} antialiased`}>
        {children}
        <ThemeToggleFab />
      </body>
    </html>
  );
}
