export default function PrivacyPage(){
  return (
    <main className="container">
      <div className="card">
        <h1 className="text-lg font-semibold mb-2">Privacy Policy</h1>
        <div className="space-y-3 text-sm opacity-80">
          <p>We collect the minimum data needed to provide the service: email, hashed password, and usage data such as attempts and scores.</p>
          <p>Payment processing is handled by Stripe. We do not store your full payment details.</p>
          <p>We use a session cookie to keep you signed in. It is HttpOnly and not accessible to JavaScript.</p>
          <p>We do not sell your personal data. You can request deletion of your account and data by contacting support.</p>
          <p>Contact: devdocbuddy@gmail.com.</p>
        </div>
        <div className="mt-4">
          <a className="btn" href="/dashboard">Back to Dashboard</a>
        </div>
      </div>
    </main>
  );
}
