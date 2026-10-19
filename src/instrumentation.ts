import { reportServerError } from "@/lib/errorCapture";

export async function onRequestError(
  error: unknown,
  request: { path?: string },
  _context: unknown
): Promise<void> {
  await reportServerError(request.path ?? "unknown", error);
}
