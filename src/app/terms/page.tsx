export default function TermsPage(){
  return (
    <main className="container">
      <div className="card">
        <h1 className="text-lg font-semibold mb-2">Terms of Service</h1>
        <div className="space-y-3 text-sm opacity-80">
          <p>This site provides practice questions for the PEBC EE. It is for study purposes only and is not affiliated with or endorsed by PEBC.</p>
          <p>Accounts are for individual use. Do not share your login. You are responsible for activity on your account.</p>
          <p>Purchases grant access credits to full exams. Credits are non-transferable and have no cash value.</p>
          <p>Content is provided as-is without warranties. We are not liable for exam outcomes or any indirect damages.</p>
          <p>We may update these terms as the product evolves. Continued use means you accept the updated terms.</p>
          <p>Contact: devdocbuddy@gmail.com.</p>
        </div>
        <div className="mt-4">
          <a className="btn" href="/dashboard">Back to Dashboard</a>
        </div>
      </div>
    </main>
  );
}
