import { Suspense } from "react";
import ResetClient from "./reset-client";

export default function ResetPassword(){
  return (
    <Suspense fallback={<main className="container"><div className="card">Loading...</div></main>}>
      <ResetClient />
    </Suspense>
  );
}
