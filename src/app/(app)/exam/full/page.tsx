
import { Suspense } from "react";
import FullExamClient from "./FullExamClient";

export default function FullExam(){
  return (
    <Suspense fallback={<main className="container"><div className="card">Loading...</div></main>}>
      <FullExamClient />
    </Suspense>
  );
}
