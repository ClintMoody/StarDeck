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
      // Topic-safe (hyphenated terms match topics exactly)
      "ai-agent", "ai-agents", "ai-tools", "ai-assistant", "ai-security-tool",
      "agentic-ai", "agentic-engineering", "agentic-framework", "agentic-workflow",
      "artificial-intelligence", "machine-learning", "deep-learning",
      "large-language-models", "llm-inference", "multi-agent", "multi-agent-system",
      "multi-agent-systems", "autonomous-agents", "swarm-intelligence",
      "langchain", "langgraph", "llamaindex", "anthropic", "anthropic-claude",
      "claude-code", "claude-skills", "openclaw", "openclaw-skills",
      "codex", "codex-skills", "openai",
      // Word-boundary safe for descriptions
      "llm", "gpt", "claude", "agentic", "embedding", "transformer",
      "diffusion", "chatbot", "neural", "generative",
      // Specific to user's repos
      "model-context-protocol", "mcp-server", "deep-research",
      "superagent", "swarm", "mlx",
    ],
  },
  {
    name: "Security & OSINT",
    icon: "🔒",
    keywords: [
      "security", "hacking", "pentest", "penetration-testing", "penetration-testing-tools",
      "exploit", "vulnerability", "cve", "ctf", "red-team", "offensive-security",
      "defensive", "malware", "reverse-engineering", "forensics",
      "osint", "osint-tool", "osint-resources",
      "reconnaissance", "bug-bounty", "infosec", "cybersecurity",
      "security-automation", "security-testing", "security-tools",
      "ai-security", "dlp", "ssrf-protection", "egress-proxy",
      "encryption", "aes-256", "cryptography",
      // User's specific repos
      "cctv", "cctv-cameras", "sattelite", "sattelite-imagery",
      "elonjet", "airforce1",
    ],
  },
  {
    name: "Developer Tools",
    icon: "🛠️",
    keywords: [
      "developer-tools", "devtools", "command-line", "terminal",
      "linter", "formatter", "bundler", "compiler",
      "debugger", "profiler", "test-framework", "ci-cd",
      "version-control", "package-manager", "build-tool",
      "code-quality", "static-analysis",
      // Specific to user's repos
      "claude-code-plugin", "claude-code-skills",
      "context-engineering", "meta-prompting", "spec-driven-development",
      "vibe-coding", "coding",
      "token-savings", "token",
    ],
  },
  {
    name: "Automation & Browser",
    icon: "🌐",
    keywords: [
      "automation", "browser-automation", "scraping", "scraper", "crawler",
      "selenium", "puppeteer", "playwright",
      "web-scraping", "workflow", "orchestration",
      "browser-use", "browser-automation",
    ],
  },
  {
    name: "Audio & Music",
    icon: "🎵",
    keywords: [
      "audio", "audio-analysis", "audio-plugin", "audio-visualizer",
      "music", "vst", "vst3", "juce", "juce-framework", "juce-plugin",
      "daw", "synthesizer", "midi", "sound",
      "spectral", "signal", "spl", "acoustics",
      "sample", "visualizer",
    ],
  },
  {
    name: "Knowledge & Memory",
    icon: "📚",
    keywords: [
      "knowledge", "knowledge-graph", "notes", "obsidian",
      "brain", "brain-map", "memory", "ai-memory", "memory-system",
      "memory-layer", "long-term-memory", "memory-engine",
      "research", "paper", "arxiv", "academic",
      "personal-knowledge", "personal-knowledge-management",
      "open-brain",
    ],
  },
  {
    name: "Geolocation & Maps",
    icon: "🗺️",
    keywords: [
      "geolocation", "gps", "navigation", "maps", "offline-maps",
      "mgrs", "military-grid", "land-navigation",
      "street-level", "satellite", "mapping",
      "tactical", "hiking", "search-and-rescue",
    ],
  },
  {
    name: "Mobile & Desktop",
    icon: "📱",
    keywords: [
      "mobile", "ios", "android", "react-native",
      "flutter", "electron", "tauri", "desktop",
      "cross-platform", "dart",
    ],
  },
  {
    name: "Backend & Infra",
    icon: "⚙️",
    keywords: [
      "backend", "server", "graphql", "grpc",
      "database", "nosql", "redis", "postgres", "mongodb", "supabase",
      "docker", "kubernetes", "devops", "infrastructure",
      "aws", "gcp", "azure", "serverless", "microservices",
      "self-hosted",
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
 *
 * Matching strategy:
 * - Topics are matched exactly (they're already discrete tags)
 * - Description and name are matched with word boundaries to avoid
 *   false positives like "ai" matching inside "trail"
 */
export function categorizeRepo(repo: {
  topics: string | null;
  description: string | null;
  fullName: string;
  language: string | null;
}): string[] {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const topicsLower = new Set(topics.map((t) => t.toLowerCase()));

  // For word-boundary matching on free text
  const freeText = [
    repo.description ?? "",
    repo.fullName.replace(/[/\-_]/g, " "),
    repo.language ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    const hasMatch = cat.keywords.some((kw) => {
      // Exact match against topics (most reliable signal)
      if (topicsLower.has(kw)) return true;

      // Multi-word keywords can use includes on topics
      if (kw.includes("-") && topics.some((t) => t.toLowerCase().includes(kw))) return true;

      // Word-boundary match on description/name
      // Use regex to avoid "ai" matching "trail", "app" matching "apple", etc.
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return re.test(freeText);
    });

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
