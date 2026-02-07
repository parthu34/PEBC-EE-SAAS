
import Link from "next/link";

export default function Landing(){
  return (
    <main className="container">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">PEBC EE - Exam Practice</h1>
          <span className="badge">Practice Only</span>
        </div>
        <p className="text-sm opacity-90">Original practice questions aligned to the PEBC EE syllabus. Not affiliated with or endorsed by PEBC.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold mb-1">Free Mock (30Q)</h2>
            <p className="text-sm opacity-90 mb-2">Always included after sign-in.</p>
            <Link href="/login" className="btn btn-primary">Sign in & Try</Link>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-1">Full Exam (200Q)</h2>
            <p className="text-sm opacity-90 mb-2">$6.99 single exam or $10.99 for 3 exams (credits).</p>
            <div className="flex gap-2">
              <Link href="/login" className="btn btn-primary">Sign in to Buy</Link>
              <Link href="/dashboard" className="btn">Dashboard</Link>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs opacity-70">By using this site you agree to our Terms and Privacy Policy.</p>
      </div>
    </main>
  );
}
