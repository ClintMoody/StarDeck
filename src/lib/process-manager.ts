import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { db } from "@/lib/db";
import { repoLocalState } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/db/migrate";

export interface ManagedProcess {
  repoId: number;
  pid: number;
  command: string;
  child: ChildProcess;
  output: string[];
  startedAt: Date;
  status: "running" | "stopped" | "error";
  exitCode: number | null;
}

class ProcessManager extends EventEmitter {
  private processes = new Map<number, ManagedProcess>();

  /**
   * Run a command in a given directory for a repo.
   * Returns the managed process info.
   */
  run(repoId: number, command: string, cwd: string): ManagedProcess {
    // Kill existing process for this repo if running
    this.stop(repoId);

    const child = spawn("sh", ["-c", command], {
      cwd,
      env: { ...process.env, FORCE_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const managed: ManagedProcess = {
      repoId,
      pid: child.pid ?? 0,
      command,
      child,
      output: [],
      startedAt: new Date(),
      status: "running",
      exitCode: null,
    };

    this.processes.set(repoId, managed);

    // Capture output
    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      managed.output.push(line);
      // Keep last 1000 lines
      if (managed.output.length > 1000) managed.output.shift();
      this.emit("output", repoId, line);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const line = data.toString();
      managed.output.push(line);
      if (managed.output.length > 1000) managed.output.shift();
      this.emit("output", repoId, line);
    });

    child.on("exit", (code) => {
      managed.status = code === 0 ? "stopped" : "error";
      managed.exitCode = code;
      this.emit("exit", repoId, code);
      this.updateDbState(repoId, managed.status);
    });

    // Update DB
    this.updateDbState(repoId, "running", child.pid ?? undefined);

    return managed;
  }

  /**
   * Clone a repo to a local directory.
   */
  clone(repoId: number, repoFullName: string, targetDir: string): ManagedProcess {
    const command = `git clone https://github.com/${repoFullName}.git "${targetDir}"`;
    // Clone runs from parent dir, not target (target doesn't exist yet)
    const cwd = require("path").dirname(targetDir);
    return this.run(repoId, command, cwd);
  }

  /**
   * Stop a running process for a repo.
   */
  stop(repoId: number): boolean {
    const managed = this.processes.get(repoId);
    if (!managed || managed.status !== "running") return false;

    managed.child.kill("SIGTERM");

    // Force kill after 5 seconds
    setTimeout(() => {
      if (managed.status === "running") {
        managed.child.kill("SIGKILL");
      }
    }, 5000);

    managed.status = "stopped";
    this.updateDbState(repoId, "stopped");
    return true;
  }

  /**
   * Get a managed process by repo ID.
   */
  get(repoId: number): ManagedProcess | undefined {
    return this.processes.get(repoId);
  }

  /**
   * Get all managed processes.
   */
  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get recent output lines for a repo.
   */
  getOutput(repoId: number, lastN: number = 100): string[] {
    const managed = this.processes.get(repoId);
    if (!managed) return [];
    return managed.output.slice(-lastN);
  }

  private updateDbState(repoId: number, status: string, pid?: number): void {
    try {
      const existing = db
        .select()
        .from(repoLocalState)
        .where(eq(repoLocalState.repoId, repoId))
        .get();

      if (existing) {
        db.update(repoLocalState)
          .set({
            processStatus: status,
            processPid: pid ?? null,
            processStartedAt: status === "running" ? new Date().toISOString() : existing.processStartedAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(repoLocalState.repoId, repoId))
          .run();
      }
    } catch {
      // Non-fatal — DB update failure shouldn't crash the process
    }
  }

  /**
   * Clean up on server shutdown.
   */
  cleanup(): void {
    for (const [repoId, managed] of this.processes) {
      if (managed.status === "running") {
        managed.child.kill("SIGTERM");
      }
    }
    this.processes.clear();
  }
}

// Singleton instance
export const processManager = new ProcessManager();

// Cleanup on process exit
process.on("beforeExit", () => processManager.cleanup());
process.on("SIGINT", () => { processManager.cleanup(); process.exit(0); });
process.on("SIGTERM", () => { processManager.cleanup(); process.exit(0); });
