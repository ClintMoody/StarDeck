export interface DetectedRecipe {
  detectedType: "node" | "python" | "rust" | "go" | "docker" | "make" | "other";
  installCommand: string | null;
  runCommand: string | null;
}

/**
 * Detect project type from a list of filenames in the repo root.
 * Priority order matters — docker-compose > Dockerfile > language-specific.
 */
export function detectProjectType(files: string[]): DetectedRecipe {
  const fileSet = new Set(files);

  // Docker Compose takes priority (might wrap other project types)
  if (fileSet.has("docker-compose.yml") || fileSet.has("docker-compose.yaml")) {
    return {
      detectedType: "docker",
      installCommand: null,
      runCommand: "docker compose up",
    };
  }

  // Dockerfile
  if (fileSet.has("Dockerfile")) {
    return {
      detectedType: "docker",
      installCommand: "docker build -t app .",
      runCommand: "docker run app",
    };
  }

  // Node.js
  if (fileSet.has("package.json")) {
    return {
      detectedType: "node",
      installCommand: "npm install",
      runCommand: "npm start",
    };
  }

  // Python (pyproject.toml)
  if (fileSet.has("pyproject.toml")) {
    return {
      detectedType: "python",
      installCommand: "pip install -e .",
      runCommand: "python -m app",
    };
  }

  // Python (requirements.txt)
  if (fileSet.has("requirements.txt")) {
    return {
      detectedType: "python",
      installCommand: "pip install -r requirements.txt",
      runCommand: "python main.py",
    };
  }

  // Rust
  if (fileSet.has("Cargo.toml")) {
    return {
      detectedType: "rust",
      installCommand: "cargo build",
      runCommand: "cargo run",
    };
  }

  // Go
  if (fileSet.has("go.mod")) {
    return {
      detectedType: "go",
      installCommand: "go build",
      runCommand: "go run .",
    };
  }

  // Makefile
  if (fileSet.has("Makefile")) {
    return {
      detectedType: "make",
      installCommand: "make",
      runCommand: "make run",
    };
  }

  return {
    detectedType: "other",
    installCommand: null,
    runCommand: null,
  };
}
