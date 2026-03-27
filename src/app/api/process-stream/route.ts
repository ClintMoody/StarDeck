import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { processManager } from "@/lib/process-manager";
import { getRepoByFullName } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const owner = request.nextUrl.searchParams.get("owner");
  const name = request.nextUrl.searchParams.get("name");
  if (!owner || !name) {
    return new Response("Missing params", { status: 400 });
  }

  const repoResult = getRepoByFullName(owner, name);
  if (!repoResult) return new Response("Not found", { status: 404 });
  const repo = repoResult;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send existing output first
      const existing = processManager.getOutput(repo.id);
      for (const line of existing) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(line)}\n\n`));
      }

      // Listen for new output
      function onOutput(repoId: number, data: string) {
        if (repoId === repo.id) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Stream closed
            processManager.removeListener("output", onOutput);
          }
        }
      }

      function onExit(repoId: number, code: number | null) {
        if (repoId === repo.id) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(`\n[Process exited with code ${code}]`)}\n\n`));
            controller.close();
          } catch {
            // Already closed
          }
          processManager.removeListener("exit", onExit);
          processManager.removeListener("output", onOutput);
        }
      }

      processManager.on("output", onOutput);
      processManager.on("exit", onExit);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        processManager.removeListener("output", onOutput);
        processManager.removeListener("exit", onExit);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
