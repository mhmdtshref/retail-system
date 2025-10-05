import { NextResponse } from 'next/server';

const g = globalThis as unknown as { __returnsSettings?: { windowDays: number; reasons: string[] } };
if (!g.__returnsSettings) g.__returnsSettings = { windowDays: 14, reasons: ['غير مناسب','مقاس غير صحيح','تالف','تغيير رأي'] };

export async function GET() {
	return NextResponse.json(g.__returnsSettings);
}

export async function PUT(req: Request) {
	const body = await req.json();
	const wnd = Number(body.windowDays);
	const reasons = Array.isArray(body.reasons) ? body.reasons.filter((s) => typeof s === 'string') : undefined;
	if (wnd && wnd > 0) g.__returnsSettings!.windowDays = wnd;
	if (reasons && reasons.length) g.__returnsSettings!.reasons = reasons;
	return NextResponse.json(g.__returnsSettings);
}


