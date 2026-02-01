import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) return NextResponse.json({error:"Unauthorized"},{status:401});
  const total = await prisma.question.count();
  const uniques = await prisma.question.groupBy({
    by: ["topic","conceptKey"],
    _count: { _all: true }
  });
  const uniqueCount = uniques.length;
  const duplicateCount = Math.max(0, total - uniqueCount);
  const uniqueConcepts = await prisma.question.groupBy({ by: ["conceptKey"] });
  const uniqueConceptCount = uniqueConcepts.length;
  const active = await prisma.question.count({ where: { active: true } });
  const topics = await prisma.question.findMany({ select: { topic: true }, where: { active: true } });
  const normalizeTopic = (t: string) => {
    const s = (t || "").trim().toLowerCase();
    if(s.startsWith("pharmaceutical sciences")) return "Pharmaceutical Sciences";
    if(s.startsWith("pharmacy practice")) return "Pharmacy Practice";
    if(s.includes("behavioural") || s.includes("behavioral") || s.includes("administrative")){
      return "Behavioural, Social, and Administrative Sciences";
    }
    return t;
  };
  const topicCounts: Record<string, number> = {};
  for(const t of topics){
    const k = normalizeTopic(t.topic);
    topicCounts[k] = (topicCounts[k] || 0) + 1;
  }
  const mockSize = 30;
  const fullSize = 200;
  const maxFullAttempts = Math.max(0, Math.floor((uniqueConceptCount - mockSize) / fullSize));
  return NextResponse.json({
    total,
    uniqueCount,
    duplicateCount,
    uniqueConceptCount,
    active,
    topicCounts,
    maxFullAttempts
  });
}
