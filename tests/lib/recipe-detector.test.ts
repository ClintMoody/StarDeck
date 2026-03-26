import { describe, it, expect } from "vitest";
import { detectProjectType } from "@/lib/recipe-detector";

describe("detectProjectType", () => {
  it("detects Node.js project from package.json", () => {
    const files = ["package.json", "src/index.ts", "tsconfig.json"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("node");
    expect(result.installCommand).toBe("npm install");
    expect(result.runCommand).toBe("npm start");
  });

  it("prefers npm start for package.json with start script indicator", () => {
    const files = ["package.json", "node_modules"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("node");
  });

  it("detects Python project from requirements.txt", () => {
    const files = ["requirements.txt", "main.py"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("python");
    expect(result.installCommand).toBe("pip install -r requirements.txt");
  });

  it("detects Python project from pyproject.toml", () => {
    const files = ["pyproject.toml", "src/app.py"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("python");
    expect(result.installCommand).toBe("pip install -e .");
  });

  it("detects Rust project from Cargo.toml", () => {
    const files = ["Cargo.toml", "src/main.rs"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("rust");
    expect(result.installCommand).toBe("cargo build");
    expect(result.runCommand).toBe("cargo run");
  });

  it("detects Go project from go.mod", () => {
    const files = ["go.mod", "main.go"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("go");
    expect(result.installCommand).toBe("go build");
    expect(result.runCommand).toBe("go run .");
  });

  it("detects Docker project from docker-compose.yml", () => {
    const files = ["docker-compose.yml", "Dockerfile"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("docker");
    expect(result.runCommand).toBe("docker compose up");
  });

  it("detects Dockerfile-only project", () => {
    const files = ["Dockerfile", "app.py"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("docker");
  });

  it("detects Makefile project", () => {
    const files = ["Makefile", "src/main.c"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("make");
    expect(result.installCommand).toBe("make");
  });

  it("returns other for unknown project types", () => {
    const files = ["README.md", "data.csv"];
    const result = detectProjectType(files);
    expect(result.detectedType).toBe("other");
    expect(result.installCommand).toBeNull();
    expect(result.runCommand).toBeNull();
  });
});
