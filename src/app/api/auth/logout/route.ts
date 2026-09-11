import { asErrorResponse, endSession } from "@/lib/auth";

export async function POST() {
  try {
    await endSession();
    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}
