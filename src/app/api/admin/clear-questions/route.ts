import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) return NextResponse.json({error:"Unauthorized"},{status:401});
  const count = await prisma.question.count();
  await prisma.attemptAnswer.deleteMany({});
  await prisma.attempt.deleteMany({});
  await prisma.examFormItem.deleteMany({});
  await prisma.examForm.deleteMany({});
  await prisma.question.deleteMany({});
  return NextResponse.json({ ok:true, count });
}
