
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import FinalizePurchase from "./finalize";
import BuyButton from "./BuyButton";
import CouponBanner from "./CouponBanner";

async function getData(){
  const sess = await getSession();
  if(!sess) return null;
  const user = await prisma.user.findUnique({
    where: { id: sess.uid },
    include: {
      credits: { include: { product: true } },
      purchases: { include: { product: true }, orderBy: { createdAt: "desc" } },
      attempts: { include: { form: true }, orderBy: { startedAt: "desc" }, take: 5 },
    }
  });
  const paidPurchases = (user?.purchases || []).filter(p=>p.status==="PAID");
  const paidSlots = paidPurchases
    .filter(p=>["full-200","full-200-3pack"].includes(p.product.slug))
    .reduce((sum,p)=> sum + (p.product.slug==="full-200-3pack" ? 3 : 1), 0);
  const fullCredits = paidSlots;
  const hasOnePack = paidPurchases.some(p=>p.product.slug==="full-200");
  const hasThreePack = paidPurchases.some(p=>p.product.slug==="full-200-3pack");
  return { user, fullCredits, paidSlots, hasOnePack, hasThreePack };
}

export default async function Dashboard({ searchParams }:{ searchParams?: { success?: string; canceled?: string; session_id?: string; previewPack?: string } }){
  const data = await getData();
  if(!data) redirect("/login");
  const { user, fullCredits, paidSlots, hasOnePack, hasThreePack } = data;
  const previewPack = user?.isAdmin ? Number(searchParams?.previewPack || 0) : 0;
  const previewOn = previewPack === 1 || previewPack === 3;
  const effectiveHasOnePack = previewOn ? previewPack === 1 : hasOnePack;
  const effectiveHasThreePack = previewOn ? previewPack === 3 : hasThreePack;
  const slots = previewOn ? previewPack : (user?.isAdmin ? Math.max(paidSlots, 1) : paidSlots);
  const creditsDisplay = previewOn ? previewPack : (user?.isAdmin ? Math.max(fullCredits, 1) : fullCredits);
  return (
    <main className="container">
      <FinalizePurchase sessionId={searchParams?.session_id} canceled={searchParams?.canceled}/>
      {user?.isAdmin && (
        <div className="card mb-3 text-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <span>Preview user view:</span>
            <a className="btn" href="/dashboard?previewPack=1">1-pack</a>
            <a className="btn" href="/dashboard?previewPack=3">3-pack</a>
            <a className="btn" href="/dashboard">Clear</a>
            {previewOn ? <span>Previewing {previewPack}-pack UI.</span> : <span>Preview off.</span>}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <form action="/api/auth/logout" method="post"><button className="btn">Sign out</button></form>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="card">
          <h2 className="font-semibold mb-1">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h2>
          <p className="text-sm opacity-80 mb-2">{user?.email}</p>
          <p className="text-sm opacity-80">Full exam credits: <b>{creditsDisplay}</b>{user?.isAdmin ? " (admin override)" : ""}</p>
          <p className="text-sm opacity-80">
            Purchased:{" "}
            {effectiveHasThreePack && effectiveHasOnePack ? "1-pack + 3-pack" : effectiveHasThreePack ? "3-pack" : effectiveHasOnePack ? "1-pack" : "None"}
          </p>
          <div className="mt-3 flex gap-2">
            <Link className="btn btn-primary" href="/exam/mock">Start Free Mock (30Q)</Link>
            {creditsDisplay>0 || user?.isAdmin ? (
              <span className="text-sm opacity-80">Open full exams from the list.</span>
            ) : (
              <span className="text-sm opacity-80">Purchase required for Full Exam.</span>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Your Full Exams</h3>
          {slots >= 1 ? (
            <div className="space-y-2">
              {Array.from({ length: slots }).map((_,idx)=>(
                <Link key={idx} className="btn w-full" href={`/exam/full?slot=${idx+1}${previewPack ? `&previewPack=${previewPack}` : ""}`}>
                  Full Exam {idx+1} (200Q)
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-80">Purchase required to unlock full exams.</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Buy Exams</h3>
          <CouponBanner />
          {(!effectiveHasOnePack && !effectiveHasThreePack) ? (
            <>
              <BuyButton priceType="full" label="Buy 1 Full ($9.99)" primary />
              <div className="mt-2">
                <BuyButton priceType="bundle3" label="Buy 3 Exams ($15.99)" />
              </div>
            </>
          ) : (
            <p className="text-sm opacity-80">You already own a pack.</p>
          )}
          <p className="text-xs opacity-70 mt-2">Stripe-hosted checkout, taxes calculated automatically.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Recent Attempts</h3>
          <table className="table">
            <thead><tr><th>Label</th><th>Started</th><th>Score</th></tr></thead>
            <tbody>
              {data.user?.attempts?.map(a=>(
                <tr key={a.id}><td>{a.form.label}</td><td>{new Date(a.startedAt).toLocaleString()}</td><td>{a.score??"-"}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2"><a className="link text-sm" href="/results">All Results</a></div>
        </div>
      </div>
      {data.user?.isAdmin && (
        <div className="card mt-4">
          <h3 className="font-semibold mb-2">Admin</h3>
          <div className="flex gap-2">
            <a className="btn" href="/admin">Open Admin</a>
          </div>
        </div>
      )}
    </main>
  );
}
