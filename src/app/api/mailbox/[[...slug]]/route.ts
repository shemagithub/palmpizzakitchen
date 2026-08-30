import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, handleShopMailbox } from "@/lib/server/shopMailbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(
  req: NextRequest,
  params: Promise<{ slug?: string[] }>,
) {
  const auth = req.headers.get("authorization") || "";
  if (!auth) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    await assertAdmin(auth);
  } catch (err) {
    const status = Number((err as { status?: number }).status) || 401;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Admin sign in required." },
      { status },
    );
  }

  const { slug = [] } = await params;
  let body: Record<string, unknown> | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  try {
    const result = await handleShopMailbox({
      method: req.method,
      slug,
      search: req.nextUrl.searchParams,
      body,
    });
    if (result.binary) {
      const filename = result.binary.filename.replace(/[\r\n"]/g, "");
      return new NextResponse(new Uint8Array(result.binary.content), {
        status: 200,
        headers: {
          "Content-Type": result.binary.contentType,
          "Content-Disposition": `${result.binary.download ? "attachment" : "inline"}; filename="${filename}"`,
        },
      });
    }
    return NextResponse.json(result.json, { status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mailbox request failed.";
    return NextResponse.json(
      { total: 0, messages: [], folders: [], labels: [], error: message },
      { status: 200 },
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  return run(req, ctx.params);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  return run(req, ctx.params);
}
