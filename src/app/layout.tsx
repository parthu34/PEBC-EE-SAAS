
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "PEBC EE - Exam Practice",
  description: "Original practice questions aligned to the PEBC EE syllabus. Not affiliated with PEBC.",
};

export default function RootLayout({ children }: { children: ReactNode }){
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="container">
          <div className="card text-sm opacity-80 flex flex-col gap-2">
            <div>Practice only. Not affiliated with or endorsed by PEBC.</div>
            <div className="flex gap-3">
              <a className="link" href="/terms">Terms</a>
              <a className="link" href="/privacy">Privacy</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
