/**
 * Auto-categorizes repos based on their topics, description, name, and language.
 * Categories are derived from keyword matching — no AI or external API needed.
 */

interface CategorizedRepo {
  repoId: number;
  categories: string[];
}

interface CategoryDefinition {
  name: string;
  icon: string;
  keywords: string[]; // matched against topics, description, and name (lowercased)
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    name: "AI & Agents",
    icon: "🤖",
    keywords: [
      "ai", "artificial-intelligence", "machine-learning", "ml", "deep-learning",
      "llm", "large-language-model", "gpt", "claude", "openai", "anthropic",
      "agent", "agents", "agentic", "ai-agent", "ai-agents", "autonomous",
      "langchain", "llamaindex", "rag", "embedding", "vector", "neural",
      "transformer", "diffusion", "generative", "prompt", "chatbot",
    ],
  },
  {
    name: "Security & Hacking",
    icon: "🔒",
    keywords: [
      "security", "hacking", "pentest", "penetration-testing", "exploit",
      "vulnerability", "cve", "ctf", "red-team", "blue-team", "offensive",
      "defensive", "malware", "reverse-engineering", "forensics", "osint",
      "recon", "reconnaissance", "bug-bounty", "infosec", "cybersecurity",
      "encryption", "crypto", "cryptography", "aes", "rsa",
    ],
  },
  {
    name: "Developer Tools",
    icon: "🛠️",
    keywords: [
      "developer-tools", "devtools", "cli", "command-line", "terminal",
      "editor", "ide", "linter", "formatter", "bundler", "compiler",
      "debugger", "profiler", "testing", "test-framework", "ci-cd",
      "git", "version-control", "package-manager", "build-tool",
      "code-quality", "static-analysis", "documentation", "sdk",
    ],
  },
  {
    name: "Web & Frontend",
    icon: "🌐",
    keywords: [
      "web", "frontend", "front-end", "react", "vue", "svelte", "angular",
      "nextjs", "next-js", "css", "html", "javascript", "typescript",
      "tailwind", "ui-components", "component-library", "design-system",
      "responsive", "pwa", "spa", "ssr", "static-site",
    ],
  },
  {
    name: "Backend & Infrastructure",
    icon: "⚙️",
    keywords: [
      "backend", "back-end", "server", "api", "rest", "graphql", "grpc",
      "database", "sql", "nosql", "redis", "postgres", "mongodb",
      "docker", "kubernetes", "k8s", "devops", "infrastructure", "cloud",
      "aws", "gcp", "azure", "serverless", "microservices", "nginx",
    ],
  },
  {
    name: "Data & Visualization",
    icon: "📊",
    keywords: [
      "data", "analytics", "visualization", "dashboard", "chart", "graph",
      "plotting", "statistics", "data-science", "pandas", "jupyter",
      "notebook", "dataset", "etl", "pipeline", "streaming", "kafka",
    ],
  },
  {
    name: "Automation & Scraping",
    icon: "🤖",
    keywords: [
      "automation", "automate", "scraping", "scraper", "crawler", "spider",
      "browser-automation", "selenium", "puppeteer", "playwright",
      "web-scraping", "bot", "workflow", "orchestration",
    ],
  },
  {
    name: "Networking & Protocols",
    icon: "🔌",
    keywords: [
      "networking", "network", "protocol", "tcp", "udp", "http", "websocket",
      "dns", "proxy", "vpn", "tunnel", "bluetooth", "ble", "wifi",
      "mesh", "p2p", "peer-to-peer", "mqtt", "socket",
    ],
  },
  {
    name: "Media & Creative",
    icon: "🎨",
    keywords: [
      "audio", "video", "music", "image", "graphics", "3d", "animation",
      "game", "gamedev", "opengl", "vulkan", "shader", "rendering",
      "creative", "art", "design", "photography", "camera",
    ],
  },
  {
    name: "Knowledge & Research",
    icon: "📚",
    keywords: [
      "knowledge", "wiki", "notes", "obsidian", "brain", "memory",
      "research", "paper", "academic", "education", "learning",
      "documentation", "reference", "graph", "knowledge-graph",
    ],
  },
  {
    name: "Mobile & Desktop",
    icon: "📱",
    keywords: [
      "mobile", "ios", "android", "swift", "kotlin", "react-native",
      "flutter", "electron", "tauri", "desktop", "native", "app",
      "cross-platform",
    ],
  },
];

export interface CategoryCount {
  name: string;
  icon: string;
  count: number;
}

/**
 * Categorize a single repo based on its metadata.
 * A repo can belong to multiple categories.
 */
export function categorizeRepo(repo: {
  topics: string | null;
  description: string | null;
  fullName: string;
  language: string | null;
}): string[] {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const searchText = [
    ...topics,
    repo.description ?? "",
    repo.fullName,
    repo.language ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    const hasMatch = cat.keywords.some(
      (kw) => searchText.includes(kw)
    );
    if (hasMatch) {
      matched.push(cat.name);
    }
  }

  return matched.length > 0 ? matched : ["Other"];
}

/**
 * Get category counts across all repos.
 */
export function getCategoryCounts(
  repos: { topics: string | null; description: string | null; fullName: string; language: string | null }[]
): CategoryCount[] {
  const counts = new Map<string, number>();

  for (const repo of repos) {
    const cats = categorizeRepo(repo);
    for (const cat of cats) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }

  // Build result with icons, sorted by count
  const result: CategoryCount[] = [];
  for (const [name, count] of counts) {
    const def = CATEGORY_DEFINITIONS.find((d) => d.name === name);
    result.push({
      name,
      icon: def?.icon ?? "📁",
      count,
    });
  }

  result.sort((a, b) => b.count - a.count);
  return result;
}

/**
 * Filter repos by category name.
 */
export function getReposByCategory<T extends { topics: string | null; description: string | null; fullName: string; language: string | null }>(
  repos: T[],
  categoryName: string
): T[] {
  return repos.filter((repo) => {
    const cats = categorizeRepo(repo);
    return cats.includes(categoryName);
  });
}
