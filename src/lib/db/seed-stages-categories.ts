import { db } from '@/lib/db';
import { workflowStages, dbCategories, starredRepos } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_STAGES = [
  { name: 'Watching', icon: '👁', color: '#8b949e', position: 0, deletable: false },
  { name: 'Want to Try', icon: '🧪', color: '#d2a8ff', position: 1, deletable: false },
  { name: 'Downloaded', icon: '📦', color: '#58a6ff', position: 2, deletable: false },
  { name: 'Active', icon: '🚀', color: '#f0883e', position: 3, deletable: false },
  { name: 'Archived', icon: '📁', color: '#484f58', position: 4, deletable: false },
];

const DEFAULT_CATEGORIES = [
  { name: 'AI & Agents', icon: '🤖', color: '#d2a8ff', position: 0, autoRules: JSON.stringify({ keywords: ["ai-agent","ai-agents","ai-tools","ai-assistant","agentic-ai","agentic-framework","artificial-intelligence","machine-learning","deep-learning","large-language-models","llm-inference","multi-agent","autonomous-agents","langchain","langgraph","llamaindex","anthropic","claude-code","openai","llm","gpt","claude","agentic","embedding","transformer","diffusion","chatbot","neural","generative","model-context-protocol","mcp-server","deep-research","superagent","swarm","mlx"] }) },
  { name: 'Security & OSINT', icon: '🔒', color: '#f85149', position: 1, autoRules: JSON.stringify({ keywords: ["security","hacking","pentest","penetration-testing","exploit","vulnerability","cve","ctf","red-team","offensive-security","malware","reverse-engineering","forensics","osint","osint-tool","reconnaissance","bug-bounty","infosec","cybersecurity","encryption","cryptography"] }) },
  { name: 'Developer Tools', icon: '🛠️', color: '#3fb950', position: 2, autoRules: JSON.stringify({ keywords: ["developer-tools","devtools","command-line","terminal","linter","formatter","bundler","compiler","debugger","profiler","test-framework","ci-cd","version-control","package-manager","build-tool","code-quality","static-analysis","coding"] }) },
  { name: 'Automation & Browser', icon: '🌐', color: '#1f6feb', position: 3, autoRules: JSON.stringify({ keywords: ["automation","browser-automation","scraping","scraper","crawler","selenium","puppeteer","playwright","web-scraping","workflow","orchestration","browser-use"] }) },
  { name: 'Audio & Music', icon: '🎵', color: '#f0883e', position: 4, autoRules: JSON.stringify({ keywords: ["audio","audio-analysis","audio-plugin","music","vst","vst3","juce","daw","synthesizer","midi","sound","spectral","signal","acoustics"] }) },
  { name: 'Knowledge & Memory', icon: '📚', color: '#a371f7', position: 5, autoRules: JSON.stringify({ keywords: ["knowledge","knowledge-graph","notes","obsidian","brain","memory","ai-memory","memory-system","research","paper","arxiv","academic","personal-knowledge","open-brain"] }) },
  { name: 'Geolocation & Maps', icon: '🗺️', color: '#3fb950', position: 6, autoRules: JSON.stringify({ keywords: ["geolocation","gps","navigation","maps","offline-maps","mgrs","military-grid","satellite","mapping","tactical"] }) },
  { name: 'Mobile & Desktop', icon: '📱', color: '#58a6ff', position: 7, autoRules: JSON.stringify({ keywords: ["mobile","ios","android","react-native","flutter","electron","tauri","desktop","cross-platform","dart"] }) },
  { name: 'Backend & Infra', icon: '⚙️', color: '#8b949e', position: 8, autoRules: JSON.stringify({ keywords: ["backend","server","graphql","grpc","database","nosql","redis","postgres","mongodb","supabase","docker","kubernetes","devops","infrastructure","aws","gcp","azure","serverless","microservices","self-hosted"] }) },
  { name: 'Other', icon: '📁', color: '#484f58', position: 9, autoRules: null },
];

const STAGE_KEY_TO_POSITION: Record<string, number> = {
  watching: 0,
  want_to_try: 1,
  downloaded: 2,
  active: 3,
  archived: 4,
};

export function seedStagesAndCategories() {
  const existingStages = db.select().from(workflowStages).all();
  if (existingStages.length === 0) {
    for (const stage of DEFAULT_STAGES) {
      db.insert(workflowStages).values(stage).run();
    }
  }

  const existingCategories = db.select().from(dbCategories).all();
  if (existingCategories.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      db.insert(dbCategories).values(cat).run();
    }
  }
}

export function migrateWorkflowStageIds() {
  const allStages = db.select().from(workflowStages).all();
  const posToId = new Map(allStages.map(s => [s.position, s.id]));

  const repos = db.select({ id: starredRepos.id, workflowStage: starredRepos.workflowStage, workflowStageId: starredRepos.workflowStageId }).from(starredRepos).all();
  for (const repo of repos) {
    if (repo.workflowStageId) continue; // already migrated
    const pos = STAGE_KEY_TO_POSITION[repo.workflowStage] ?? 0;
    const stageId = posToId.get(pos);
    if (stageId) {
      db.update(starredRepos).set({ workflowStageId: stageId }).where(eq(starredRepos.id, repo.id)).run();
    }
  }
}
