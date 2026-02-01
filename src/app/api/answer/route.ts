
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request){
  const sess = await getSession(); if(!sess) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { attemptId, questionId, selected, flagged, timeSpent } = await req.json();
  const att = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if(!att || att.userId !== sess.uid) return NextResponse.json({error:"Attempt not found"},{status:404});
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if(!q) return NextResponse.json({error:"Question not found"},{status:404});
  const correct = (typeof selected==="number") ? (selected === (q.answer as number)) : null;
  const exist = await prisma.attemptAnswer.findFirst({ where: { attemptId, questionId } });
  if(exist){
    await prisma.attemptAnswer.update({ where: { id: exist.id }, data: { selected, correct, flagged: flagged??exist.flagged, timeSpentSec: (exist.timeSpentSec + (timeSpent||0)) } });
  }else{
    await prisma.attemptAnswer.create({ data: { attemptId, questionId, selected, correct, flagged: !!flagged, timeSpentSec: timeSpent||0 } });
  }
  return NextResponse.json({ ok:true });
}

export async function PUT(req: Request){
  const sess = await getSession(); if(!sess) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { attemptId, submit } = await req.json();
  const att = await prisma.attempt.findUnique({ where: { id: attemptId }, include: { form: { include: { items: { include: { question: true } } } }, answers: true } });
  if(!att || att.userId!==sess.uid) return NextResponse.json({error:"Attempt not found"},{status:404});
  if(submit){
    let score = 0;
    for(const it of att.form.items){
      const ans = att.answers.find(a=>a.questionId===it.questionId);
      if(ans?.correct) score++;
    }
    await prisma.attempt.update({ where: { id: attemptId }, data: { score, submittedAt: new Date() } });
  }
  return NextResponse.json({ ok:true });
}
