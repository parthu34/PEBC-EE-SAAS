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
  const mockSize = 30;
  const fullSize = 200;
  const maxFullAttempts = Math.max(0, Math.floor((uniqueConceptCount - mockSize) / fullSize));
  return NextResponse.json({
    total,
    uniqueCount,
    duplicateCount,
    uniqueConceptCount,
    maxFullAttempts
  });
}
