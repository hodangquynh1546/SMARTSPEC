import { SQLGenerationService } from "../../database/domain/SQLGenerationService";

/**
 * Turns SmartSpec's structured design artifacts into Markdown (with Mermaid diagrams) for WorkHub's Documents module.
 * Everything here is a pure function of the stored data, so the output only changes when the design changes.
 */
export interface DesignDoc {
  key: string;                       // stable identity across versions (kind:slug)
  title: string;
  type: "SRS" | "TECHNICAL_DESIGN" | "TEST_PLAN";
  folder: string[];                  // folder path in WorkHub
  markdown: string;
  useCaseKeys: string[];             // use cases (lineage keys) the document is about → linked to their tasks
}

export const ROOT_FOLDER = "SmartSpec";
const MAX = 95_000;
const BANNER = "> Tài liệu được **SmartSpec** tạo và cập nhật tự động. Hãy sửa ở SmartSpec; chỉnh sửa tại đây sẽ bị ghi đè ở lần đồng bộ kế tiếp (lịch sử phiên bản vẫn được giữ).\n\n";

const clip = (s: string) => (s.length <= MAX ? s : s.slice(0, MAX - 40) + "\n\n_… (đã cắt bớt do quá dài)_");
const label = (s: unknown) => String(s ?? "").replace(/["\n\r]/g, " ").replace(/[<>]/g, "").trim() || " ";
const cell = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "x";
const id = (x: any) => String(x?._id ?? x?.id ?? x);

// ---------------------------------------------------------------- use case diagram
export function useCaseDiagram(d: any): string {
  const out = ["```mermaid", "flowchart LR"];
  const actorName = new Map<string, string>();
  (d.actors ?? []).forEach((a: any, i: number) => { actorName.set(id(a), `A${i}`); out.push(`  A${i}(["👤 ${label(a.name)}"])`); });
  const ucName = new Map<string, string>();
  (d.usecases ?? []).forEach((u: any, i: number) => { ucName.set(id(u), `U${i}`); out.push(`  U${i}(("${label(u.title)}"))`); });
  for (const a of d.associations ?? []) {
    const from = actorName.get(String(a.actor_id)), to = ucName.get(String(a.usecase_id));
    if (from && to) out.push(`  ${from} --- ${to}`);
  }
  for (const r of d.relationships ?? []) {
    const from = ucName.get(String(r.source)), to = ucName.get(String(r.target));
    if (!from || !to) continue;
    out.push(r.type === "generalization" ? `  ${from} --> ${to}` : `  ${from} -.->|"«${r.type}»"| ${to}`);
  }
  out.push("```");
  return out.join("\n");
}

// ---------------------------------------------------------------- activity diagram
const SHAPE: Record<string, (i: string, l: string) => string> = {
  start: (i) => `${i}(("●"))`,
  end: (i) => `${i}((("◉")))`,
  action: (i, l) => `${i}["${l}"]`,
  decision: (i, l) => `${i}{"${l}"}`,
  merge: (i) => `${i}{" "}`,
  fork: (i) => `${i}[["⫴ fork"]]`,
  join: (i) => `${i}[["⫴ join"]]`,
  object: (i, l) => `${i}[/"${l}"/]`,
  swimlane: (i, l) => `${i}["${l}"]`,
};

export function activityDiagram(d: any): string {
  const out = ["```mermaid", "flowchart TD"];
  const nid = new Map<string, string>();
  (d.nodes ?? []).forEach((n: any, i: number) => nid.set(id(n), `N${i}`));
  const lanes: any[] = d.lanes ?? [];
  const decl = (n: any) => (SHAPE[n.type] ?? SHAPE.action)(nid.get(id(n))!, label(n.label || n.type));
  const placed = new Set<string>();
  lanes.forEach((lane, li) => {
    const inLane = (d.nodes ?? []).filter((n: any) => n.lane_id && String(n.lane_id) === id(lane));
    if (!inLane.length) return;
    out.push(`  subgraph L${li}["${label(lane.name)}"]`);
    for (const n of inLane) { out.push("    " + decl(n)); placed.add(id(n)); }
    out.push("  end");
  });
  for (const n of d.nodes ?? []) if (!placed.has(id(n))) out.push("  " + decl(n));
  for (const e of d.edges ?? []) {
    const from = nid.get(String(e.from)), to = nid.get(String(e.to));
    if (!from || !to) continue;
    const text = [e.condition, e.guard && `[${e.guard}]`, e.trigger].filter(Boolean).join(" ");
    out.push(text ? `  ${from} -->|"${label(text)}"| ${to}` : `  ${from} --> ${to}`);
  }
  out.push("```");
  return out.join("\n");
}

// ---------------------------------------------------------------- sequence diagram
const ARROW: Record<string, string> = { sync: "->>", async: "-)", reply: "-->>", create: "->>", destroy: "-x" };

export function sequenceDiagram(d: any): string {
  const out = ["```mermaid", "sequenceDiagram"];
  const pid = new Map<string, string>();
  (d.lifelines ?? []).forEach((l: any, i: number) => { pid.set(id(l), `P${i}`); out.push(`  participant P${i} as ${label(l.name)}`); });
  const frags = new Map<string, any>((d.fragments ?? []).map((f: any) => [id(f), f]));

  /** Blocks (alt/loop/opt/par/critical) enclosing a fragment, outermost first; an "else" is a branch of its parent block. */
  const locate = (fid: string | null): { blocks: string[]; branch: string | null } => {
    const chain: string[] = [];
    for (let cur = fid ? frags.get(fid) : null, n = 0; cur && n < 20; cur = cur.parent_fragment_id ? frags.get(String(cur.parent_fragment_id)) : null, n++) chain.unshift(id(cur));
    const blocks = chain.filter((x) => frags.get(x)?.type !== "else");
    const last = chain[chain.length - 1];
    return { blocks, branch: last && frags.get(last)?.type === "else" ? last : null };
  };

  const stack: string[] = [];
  const branchOf = new Map<string, string | null>();
  const pad = (level: number) => "  ".repeat(level + 1);
  const messages = [...(d.messages ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  for (const m of messages) {
    const { blocks, branch } = locate(m.fragment_id ? String(m.fragment_id) : null);
    let common = 0;
    while (common < stack.length && common < blocks.length && stack[common] === blocks[common]) common++;
    while (stack.length > common) { stack.pop(); out.push(pad(stack.length) + "end"); }
    for (let i = common; i < blocks.length; i++) {
      const f = frags.get(blocks[i]);
      out.push(`${pad(stack.length)}${f.type === "region" ? "critical" : f.type} ${label(f.guard_condition)}`);
      stack.push(blocks[i]);
      branchOf.set(blocks[i], null);
    }
    if (stack.length && branch && branchOf.get(stack[stack.length - 1]) !== branch) {
      out.push(`${pad(stack.length - 1)}else ${label(frags.get(branch).guard_condition)}`);
      branchOf.set(stack[stack.length - 1], branch);
    }
    const from = pid.get(String(m.source_lifeline_id)), to = pid.get(String(m.target_lifeline_id));
    if (!from || !to) continue;
    out.push(`${pad(stack.length)}${from}${ARROW[m.type] ?? "->>"}${to}: ${label(m.content)}${m.type === "create" ? " «create»" : ""}`);
  }
  while (stack.length) { stack.pop(); out.push(pad(stack.length) + "end"); }
  out.push("```");
  return out.join("\n");
}

// ---------------------------------------------------------------- database / ERD
const REL: Record<string, string> = { "one-to-one": "||--||", "one-to-many": "||--o{", "many-to-one": "}o--||", "many-to-many": "}o--o{" };
const ident = (s: string) => String(s).replace(/[^A-Za-z0-9_]/g, "_") || "T";

export function erdDiagram(db: any): string {
  const out = ["```mermaid", "erDiagram"];
  for (const t of db.tables ?? []) {
    out.push(`  ${ident(t.name)} {`);
    for (const c of t.columns ?? []) {
      const keys = [c.is_primary_key && "PK", c.is_foreign_key && "FK", c.unique && "UK"].filter(Boolean).join(",");
      out.push(`    ${ident(String(c.type ?? "string").split("(")[0])} ${ident(c.name)}${keys ? " " + keys : ""}`);
    }
    out.push("  }");
  }
  for (const r of db.relationships ?? []) {
    out.push(`  ${ident(r.from_table)} ${REL[r.type] ?? "||--o{"} ${ident(r.to_table)} : "${label(r.name || r.type)}"`);
  }
  out.push("```");
  return out.join("\n");
}

export function databaseDocument(db: any, useCaseNames: Map<string, string>): string {
  const parts = [BANNER + `# Thiết kế cơ sở dữ liệu: ${db.name}`, db.description ?? "", "## Sơ đồ ERD", erdDiagram(db), "## Từ điển dữ liệu"];
  for (const t of db.tables ?? []) {
    parts.push(`### ${t.name}`, t.description ?? "");
    parts.push("| Cột | Kiểu | PK | FK | Null | Unique | Tham chiếu | Use case |", "|---|---|---|---|---|---|---|---|");
    for (const c of t.columns ?? []) {
      const ucs = (c.related_usecase_ids ?? []).map((u: string) => useCaseNames.get(String(u)) ?? "").filter(Boolean).join(", ");
      parts.push(`| ${cell(c.name)} | ${cell(c.type)}${c.length ? `(${cell(c.length)})` : ""} | ${c.is_primary_key ? "✔" : ""} | ${c.is_foreign_key ? "✔" : ""} | ${c.nullable === false ? "NOT NULL" : "NULL"} | ${c.unique ? "✔" : ""} | ${cell(c.references)} | ${cell(ucs)} |`);
    }
  }
  try {
    const sql = new SQLGenerationService().generateSQLFromSchema({ name: db.name, description: db.description, tables: db.tables ?? [], relationships: db.relationships ?? [] } as any, { dialect: "postgresql", includeIndexes: true, includeComments: true });
    // the generator stamps the current time in a comment; strip it so the document only changes when the design does
    const stable = sql.split("\n").filter((l) => !/^--\s*Generated:/i.test(l)).join("\n");
    parts.push("## Mã SQL (PostgreSQL)", "```sql\n" + stable.trim() + "\n```");
  } catch { /* the diagram and dictionary are still useful without DDL */ }
  return clip(parts.filter(Boolean).join("\n\n"));
}

// ---------------------------------------------------------------- SRS
const list = (title: string, items?: string[]) => (items?.length ? `**${title}**\n${items.map((x) => `- ${x}`).join("\n")}` : "");

export function useCaseSection(u: any): string {
  const p = [`### ${u.name}`];
  if (u.description) p.push(u.description);
  const meta = [u.actor?.name && `Tác nhân: ${u.actor.name}`, u.priority && `Ưu tiên: ${u.priority}`, u.frequency && `Tần suất: ${u.frequency}`, u.trigger?.event && `Kích hoạt: ${u.trigger.event}`].filter(Boolean);
  if (meta.length) p.push(meta.join(" · "));
  if (u.goal) p.push(`**Mục tiêu:** ${u.goal}`);
  if (u.business_reason) p.push(`**Lý do nghiệp vụ:** ${u.business_reason}`);
  p.push(list("Điều kiện tiên quyết", u.preconditions));
  if (u.main_flow?.length) p.push("**Luồng chính**\n" + u.main_flow.map((s: any, i: number) => `${s.step ?? i + 1}. ${[s.actor, s.action].filter(Boolean).join(": ")}${s.expected_result ? ` → ${s.expected_result}` : ""}`).join("\n"));
  if (u.alternative_flows?.length) p.push("**Luồng thay thế**\n" + u.alternative_flows.map((a: any) => `- (bước ${a.at_step}) ${a.condition} → ${a.system_response}${a.end_state ? ` [${a.end_state}]` : ""}`).join("\n"));
  if (u.exceptions?.length) p.push("**Ngoại lệ**\n" + u.exceptions.map((e: any) => `- (bước ${e.at_step}) ${e.type}: ${e.description} → ${e.system_response}`).join("\n"));
  if (u.rules?.length) p.push("**Quy tắc nghiệp vụ**\n" + u.rules.map((r: any) => `- ${r.id ? r.id + ": " : ""}${r.description}`).join("\n"));
  p.push(list("Kết quả sau cùng", u.postconditions), list("Ràng buộc phi chức năng", u.non_functional_constraints));
  return p.filter(Boolean).join("\n\n");
}

export function srsDocument(projectName: string, version: string, usecases: any[]): string {
  const byModule = new Map<string, any[]>();
  for (const u of usecases) byModule.set(u.context?.module || "Chung", [...(byModule.get(u.context?.module || "Chung") ?? []), u]);
  const parts = [BANNER + `# Đặc tả yêu cầu phần mềm: ${projectName}`, `Phiên bản đặc tả SmartSpec: **${version}** · ${usecases.length} use case · ${byModule.size} module`];
  for (const [mod, list_] of Array.from(byModule.entries())) parts.push(`## Module: ${mod}`, ...list_.map(useCaseSection));
  return clip(parts.join("\n\n"));
}

// ---------------------------------------------------------------- test plan
export function testPlanDocument(projectName: string, testcases: any[], ucName: Map<string, string>): string {
  const count: Record<string, number> = {};
  for (const t of testcases) count[t.status ?? "not_executed"] = (count[t.status ?? "not_executed"] ?? 0) + 1;
  const total = testcases.length || 1;
  const passed = count.passed ?? 0;
  const parts = [BANNER + `# Kế hoạch & kết quả kiểm thử: ${projectName}`,
    `Tổng **${testcases.length}** test case · đạt **${passed}** (${Math.round((passed / total) * 100)}%) · lỗi **${count.failed ?? 0}** · bị chặn **${count.blocked ?? 0}** · chưa chạy **${count.not_executed ?? 0}**`,
    "| Test case | Loại | Ưu tiên | Trạng thái | Bug | Use case |", "|---|---|---|---|---|---|"];
  for (const t of testcases) {
    const ucs = (t.source_requirement_ids ?? []).map((x: string) => ucName.get(String(x)) ?? "").filter(Boolean).join(", ");
    parts.push(`| ${cell(t.title)} | ${cell(t.test_type)} | ${cell(t.priority)} | ${cell(t.status ?? "not_executed")} | ${cell(t.bug?.issue_key ?? "")} | ${cell(ucs)} |`);
  }
  return clip(parts.join("\n"));
}

// ---------------------------------------------------------------- wrappers
export const diagramDocument = (title: string, intro: string | undefined, body: string) =>
  clip(BANNER + `# ${title}\n\n${intro ? intro + "\n\n" : ""}${body}`);
