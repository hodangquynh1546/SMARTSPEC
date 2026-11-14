import logger from "../../../../../lib/logger";
import Project from "../../../../../internal/model/project";
import Usecase from "../../../../../internal/model/usecase";
import Testcase from "../../../../../internal/model/testcase";
import UsecaseDiagram from "../../../../../internal/model/usecase_diagram";
import ActivityDiagram from "../../../../../internal/model/activity_diagram";
import SequenceDiagram from "../../../../../internal/model/sequence_diagram";
import DatabaseDesign from "../../../../../internal/model/database";
import { setDesignChangedListener } from "../../../../../internal/hooks/design-changed";
import { ROOT_FOLDER, activityDiagram, databaseDocument, diagramDocument, sequenceDiagram, slug, srsDocument, testPlanDocument, useCaseDiagram, type DesignDoc } from "./design.export";
import Version from "../../../../../internal/model/version";
import User from "../../../../../internal/model/user";
import env from "../../../utils/env";
import { bridgeClient, BridgeError } from "./bridge.client";
import { workhubSocketService } from "./workhub.socket.service";

const DEBOUNCE_MS = 8_000;

export interface BridgeProgress {
  issueKey: string; issueId: string; url: string; status: string; priority: string | null;
  assignee: { id: string; name: string; avatar: string | null } | null;
  sprint: { name: string; status: string } | null;
  startDate: string | null; dueDate: string | null; storyPoints: number | null;
  blocked: boolean; blockedReason: string | null; startedAt: string | null; doneAt: string | null;
  childCount: number; childDoneCount: number; deleted: boolean;
}
export interface BridgeBatch {
  ssProjectId: string;
  items: { ssKey: string; kind?: "usecase" | "testcase"; progress: BridgeProgress }[];
  activeSprint: { name: string; goal: string | null; startDate: string | null; endDate: string | null } | null;
}

export const toBug = (p: BridgeProgress) => ({
  issue_key: p.issueKey, issue_id: p.issueId, url: p.url, status: p.status, priority: p.priority,
  assignee: p.assignee?.name ?? null, assignee_avatar: p.assignee?.avatar ?? null, sprint: p.sprint?.name ?? null,
  blocked: p.blocked, deleted: p.deleted,
});

export const toImplementation = (p: BridgeProgress) => ({
  issue_key: p.issueKey, issue_id: p.issueId, url: p.url, status: p.status, priority: p.priority,
  assignee: p.assignee?.name ?? null, assignee_id: p.assignee?.id ?? null, assignee_avatar: p.assignee?.avatar ?? null,
  sprint: p.sprint?.name ?? null, sprint_status: p.sprint?.status ?? null,
  start_date: p.startDate, due_date: p.dueDate, story_points: p.storyPoints,
  blocked: p.blocked, blocked_reason: p.blockedReason, started_at: p.startedAt, done_at: p.doneAt,
  child_count: p.childCount, child_done_count: p.childDoneCount, deleted: p.deleted,
});

/**
 * Pushes the specification of a project to WorkHub (through ForgeBridge) automatically whenever it changes, and
 * records the progress WorkHub reports back. Everything here is best-effort: a Bridge outage never fails a SmartSpec
 * request; the next change (or "sync now") retries.
 */
export class WorkhubSyncService {
  private timers = new Map<string, NodeJS.Timeout>();
  private actors = new Map<string, string>();
  private running = new Set<string>();
  private rerun = new Set<string>();

  /** Called from the usecase/version socket services: any change to a project's spec ends up here. */
  schedule(projectId: string, actorUserId?: string, delayMs = DEBOUNCE_MS) {
    if (!env.WORKHUB_ENABLED) return;
    if (actorUserId) this.actors.set(projectId, actorUserId);
    clearTimeout(this.timers.get(projectId));
    this.timers.set(projectId, setTimeout(() => {
      this.timers.delete(projectId);
      this.syncProject(projectId, this.actors.get(projectId)).catch((e) => logger.warn(`WorkHub sync ${projectId} failed: ${e?.message ?? e}`));
    }, delayMs));
  }

  /** After a user links WorkHub: create the workspace/team/project for everything they own. */
  async syncAllOwnedBy(userId: string) {
    const projects = await Project.find({ owner_id: userId, "status.is_trashed": { $ne: true } }).select("_id").lean();
    for (const p of projects) this.schedule(String(p._id), userId, 0);
    return projects.length;
  }

  /** Newest completed version that actually has use cases (an empty auto-created version must not hide the real spec). */
  private async specVersion(projectId: string): Promise<any | null> {
    const versions: any[] = await Version.find({ project_id: projectId, status: "completed" }).sort({ created_at: -1 }).limit(10).lean();
    for (const v of versions) {
      if (await Usecase.exists({ version_id: v._id })) return v;
    }
    return versions[0] ?? null;
  }

  /** Every design artifact of the version as a WorkHub document (SRS, diagrams, ERD + DDL, test plan). */
  async buildDesignDocs(project: any, version: any, usecases: any[]): Promise<DesignDoc[]> {
    const keyOf = (u: any) => u.lineage_id || String(u._id);
    const keyById = new Map<string, string>(usecases.map((u) => [String(u._id), keyOf(u)]));
    const nameById = new Map<string, string>(usecases.map((u) => [String(u._id), u.name]));
    const keyByName = new Map<string, string>(usecases.map((u) => [String(u.name).trim().toLowerCase(), keyOf(u)]));
    const byNameIn = (text: string) => usecases.filter((u) => text.toLowerCase().includes(String(u.name).trim().toLowerCase())).map(keyOf);
    const vid = version._id;
    const [ucds, acts, seqs, dbs, tcs]: any[][] = await Promise.all([
      UsecaseDiagram.find({ version_id: vid }).lean(), ActivityDiagram.find({ version_id: vid }).lean(), SequenceDiagram.find({ version_id: vid }).lean(),
      DatabaseDesign.find({ version_id: vid }).lean(), Testcase.find({ version_id: vid }).lean(),
    ]);
    const docs: DesignDoc[] = [];
    const vnum = version.version_number ?? `${version.version_major}.${version.version_minor}`;
    docs.push({ key: "srs", title: "Đặc tả yêu cầu (SRS)", type: "SRS", folder: [ROOT_FOLDER], markdown: srsDocument(project.name, vnum, usecases), useCaseKeys: [] });
    for (const d of ucds) {
      const keys = (d.usecases ?? []).map((u: any) => keyByName.get(String(u.title).trim().toLowerCase())).filter(Boolean) as string[];
      docs.push({ key: `ucd:${slug(d.name)}`, title: `Use case diagram: ${d.name}`.slice(0, 200), type: "TECHNICAL_DESIGN", folder: [ROOT_FOLDER, "Sơ đồ", "Use case"], markdown: diagramDocument(`Use case diagram: ${d.name}`, d.description, useCaseDiagram(d)), useCaseKeys: Array.from(new Set(keys)) });
    }
    for (const d of acts) {
      docs.push({ key: `act:${slug(d.name)}`, title: `Activity diagram: ${d.name}`.slice(0, 200), type: "TECHNICAL_DESIGN", folder: [ROOT_FOLDER, "Sơ đồ", "Activity"], markdown: diagramDocument(`Activity diagram: ${d.name}`, d.description, activityDiagram(d)), useCaseKeys: byNameIn(String(d.name)) });
    }
    for (const d of seqs) {
      const ref = d.usecase_ref_id ? keyById.get(String(d.usecase_ref_id)) : undefined;
      docs.push({ key: `seq:${slug(d.name)}`, title: `Sequence diagram: ${d.name}`.slice(0, 200), type: "TECHNICAL_DESIGN", folder: [ROOT_FOLDER, "Sơ đồ", "Sequence"], markdown: diagramDocument(`Sequence diagram: ${d.name}`, d.description, sequenceDiagram(d)), useCaseKeys: ref ? [ref] : byNameIn(String(d.name)) });
    }
    for (const d of dbs) {
      const keys = new Set<string>();
      for (const t of d.tables ?? []) for (const c of t.columns ?? []) for (const u of c.related_usecase_ids ?? []) { const k = keyById.get(String(u)); if (k) keys.add(k); }
      docs.push({ key: `erd:${slug(d.name)}`, title: `Thiết kế CSDL: ${d.name}`.slice(0, 200), type: "TECHNICAL_DESIGN", folder: [ROOT_FOLDER, "Cơ sở dữ liệu"], markdown: databaseDocument(d, nameById), useCaseKeys: Array.from(keys) });
    }
    if (tcs.length) docs.push({ key: "testplan", title: "Kế hoạch & kết quả kiểm thử", type: "TEST_PLAN", folder: [ROOT_FOLDER, "Kiểm thử"], markdown: testPlanDocument(project.name, tcs, nameById), useCaseKeys: [] });
    return docs;
  }

  async buildPayload(projectId: string) {
    const project: any = await Project.findById(projectId).lean();
    if (!project || project.status?.is_trashed) return null;
    const version: any = await this.specVersion(projectId);
    if (!version) return null;
    const usecases: any[] = await Usecase.find({ version_id: version._id, status: { $ne: "deprecated" } }).lean();
    const memberRows = [{ user_id: project.owner_id, role: "owner" }, ...(project.members ?? []).filter((m: any) => m.status === "accepted")];
    const users: any[] = await User.find({ _id: { $in: memberRows.map((m: any) => m.user_id) } }).select("email").lean();
    const emailOf = new Map(users.map((u) => [String(u._id), u.email as string]));
    const design = await this.buildDesignDocs(project, version, usecases).catch((e) => { logger.warn(`design export failed: ${e?.message ?? e}`); return null; });
    return {
      design,
      members: memberRows.map((m: any) => ({ ssUserId: String(m.user_id), email: emailOf.get(String(m.user_id)) ?? "", role: m.role })).filter((m) => m.email),
      project: { id: String(project._id), name: project.name, description: project.description },
      version: { id: String(version._id), number: version.version_number ?? `${version.version_major}.${version.version_minor}` },
      usecases: usecases.map((u) => ({
        key: u.lineage_id || String(u._id),
        name: u.name,
        type: u.type,
        description: u.description,
        goal: u.goal,
        business_reason: u.business_reason,
        priority: u.priority,
        actor: u.actor ? { name: u.actor.name } : null,
        context: u.context ? { module: u.context.module } : null,
        preconditions: u.preconditions,
        main_flow: u.main_flow,
        alternative_flows: u.alternative_flows,
        exceptions: u.exceptions,
        postconditions: u.postconditions,
        rules: u.rules,
        non_functional_constraints: u.non_functional_constraints,
      })),
    };
  }

  /** Returns the Bridge result, or null when there is nothing to sync yet (no completed version). */
  async syncProject(projectId: string, actorUserId?: string) {
    if (this.running.has(projectId)) { this.rerun.add(projectId); return null; }
    this.running.add(projectId);
    try {
      const payload = await this.buildPayload(projectId);
      if (!payload) return null;
      const project: any = await Project.findById(projectId).select("owner_id").lean();
      // Prefer the person who made the change; fall back to the owner (whoever linked first becomes the WorkHub owner).
      const candidates = [actorUserId, String(project?.owner_id)].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
      workhubSocketService.emitSync(projectId, "syncing");
      for (const ssUserId of candidates) {
        try {
          const result = await bridgeClient.sync({ ...payload, actorSsUserId: ssUserId });
          await this.refreshImplementation(projectId).catch(() => undefined);
          workhubSocketService.emitSync(projectId, "synced", { workhub: result.workhub, created: result.created, updated: result.updated, flagged: result.flagged });
          return result;
        } catch (e) {
          if (e instanceof BridgeError && e.code === "WORKHUB_LINK_REQUIRED") continue;
          throw e;
        }
      }
      workhubSocketService.emitSync(projectId, "link_required");
      return null;
    } catch (e: any) {
      workhubSocketService.emitSync(projectId, "error", { message: e?.message ?? String(e) });
      throw e;
    } finally {
      this.running.delete(projectId);
      if (this.rerun.delete(projectId)) this.schedule(projectId, undefined, 1_000);
    }
  }

  /** Copies what the Bridge knows onto the use cases, so SmartSpec can show it without asking. */
  async refreshImplementation(projectId: string) {
    const status = await bridgeClient.projectStatus(projectId);
    if (!status?.linked) return;
    for (const [key, it] of Object.entries<any>(status.items ?? {})) {
      if (it.progress) await this.writeImplementation(projectId, key, toImplementation(it.progress));
    }
  }

  private async writeImplementation(projectId: string, key: string, impl: Record<string, unknown>) {
    const or: any[] = [{ lineage_id: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    await Usecase.updateMany({ project_id: projectId, $or: or }, { $set: { implementation: { ...impl, updated_at: new Date() } } });
  }

  /** WorkHub → SmartSpec: linked issues changed (status, assignee, sprint, dates, points, deletion…). */
  async applyBatch(b: BridgeBatch) {
    for (const it of b.items ?? []) {
      if (it.kind === "testcase") {
        await this.writeBug(b.ssProjectId, it.ssKey, toBug(it.progress));
        continue;
      }
      const impl = toImplementation(it.progress);
      await this.writeImplementation(b.ssProjectId, it.ssKey, impl);
      workhubSocketService.emitProgress(b.ssProjectId, it.ssKey, impl);
    }
    await Project.updateOne({ _id: b.ssProjectId }, { $set: { workhub: { active_sprint: b.activeSprint ?? null, updated_at: new Date() } } });
    workhubSocketService.emitSync(b.ssProjectId, "synced", { changed: b.items?.length ?? 0, activeSprint: b.activeSprint ?? null });
  }

  /** SmartSpec → WorkHub: change the status of a use case's task. WorkHub stays the owner; the result is mirrored right away. */
  async changeStatus(projectId: string, key: string, status: string, actorUserId: string) {
    const progress: BridgeProgress = await bridgeClient.changeStatus(projectId, key, status, actorUserId);
    const impl = toImplementation(progress);
    await this.writeImplementation(projectId, key, impl);
    workhubSocketService.emitProgress(projectId, key, impl);
    return impl;
  }

  /** Change the status of the bug of a failed test case from SmartSpec (e.g. QA closes it after a passing re-run). */
  async changeBugStatus(projectId: string, key: string, status: string, actorUserId: string) {
    const progress: BridgeProgress = await bridgeClient.changeBugStatus(projectId, key, status, actorUserId);
    const bug = toBug(progress);
    await this.writeBug(projectId, key, bug);
    return bug;
  }

  async recreate(projectId: string, key: string) {
    const progress: BridgeProgress = await bridgeClient.recreate(projectId, key);
    const impl = toImplementation(progress);
    await this.writeImplementation(projectId, key, impl);
    workhubSocketService.emitProgress(projectId, key, impl);
    return impl;
  }

  /** Everything the Tasks tab needs: use cases of the latest completed version with their WorkHub progress. */
  async board(projectId: string) {
    const project: any = await Project.findById(projectId).select("workhub").lean();
    const version: any = await this.specVersion(projectId);
    if (!version) return { items: [], summary: null, modules: [], activeSprint: null };
    const ucs: any[] = await Usecase.find({ version_id: version._id, status: { $ne: "deprecated" } }).lean();
    const items = ucs.map((u) => ({
      id: String(u._id), key: u.lineage_id || String(u._id), name: u.name, module: u.context?.module || "Chung",
      priority: u.priority, actor: u.actor?.name ?? null, implementation: u.implementation ?? null,
    }));
    const tcs: any[] = await Testcase.find({ version_id: version._id, "bug.issue_key": { $exists: true, $ne: "" } }).select("title bug source_requirement_ids status").lean();
    const bugsByUc = new Map<string, any[]>();
    for (const t of tcs) {
      if (t.bug?.deleted) continue;
      for (const id of (t.source_requirement_ids ?? []).map(String)) {
        bugsByUc.set(id, [...(bugsByUc.get(id) ?? []), { testcase: t.title, key: t.bug.issue_key, status: t.bug.status, url: t.bug.url, testStatus: t.status }]);
      }
    }
    for (const it of items as any[]) it.bugs = bugsByUc.get(it.id) ?? [];
    const statuses = ["TO_DO", "IN_PROGRESS", "CODE_REVIEW", "TESTING", "DONE"];
    const count = (list: typeof items) => {
      const c: Record<string, number> = { NOT_SYNCED: 0, DELETED: 0 };
      for (const s of statuses) c[s] = 0;
      for (const i of list) {
        if (!i.implementation?.issue_key) c.NOT_SYNCED++;
        else if (i.implementation.deleted) c.DELETED++;
        else c[i.implementation.status] = (c[i.implementation.status] ?? 0) + 1;
      }
      return c;
    };
    const byModule = new Map<string, typeof items>();
    for (const i of items) byModule.set(i.module, [...(byModule.get(i.module) ?? []), i]);
    const pct = (c: Record<string, number>, total: number) => (total ? Math.round(((c.DONE ?? 0) / total) * 100) : 0);
    const total = items.length;
    const all = count(items);
    return {
      version: { id: String(version._id), number: version.version_number },
      items,
      summary: { total, counts: all, percentDone: pct(all, total) },
      modules: Array.from(byModule.entries()).map(([name, list]) => { const c = count(list); return { name, total: list.length, counts: c, percentDone: pct(c, list.length) }; }),
      activeSprint: project?.workhub?.active_sprint ?? null,
    };
  }

  private async writeBug(projectId: string, key: string, bug: Record<string, unknown>) {
    const or: any[] = [{ lineage_id: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    await Testcase.updateMany({ project_id: projectId, $or: or }, { $set: { bug: { ...bug, updated_at: new Date() } } });
    workhubSocketService.emitBug(projectId, key, bug);
  }

  /**
   * A test case was executed: failures become Bugs in WorkHub, later passes are noted on the bug. Always best-effort:
   * a missing link or a Bridge outage never affects running tests.
   */
  async reportTestcase(testcaseId: string, actorUserId?: string) {
    if (!env.WORKHUB_ENABLED) return null;
    const tc: any = await Testcase.findById(testcaseId).lean();
    if (!tc || !["failed", "passed", "blocked"].includes(tc.status)) return null;
    const projectId = String(tc.project_id);
    const project: any = await Project.findById(projectId).select("owner_id").lean();
    if (!project) return null;
    const key = tc.lineage_id || String(tc._id);
    const ids = (tc.source_requirement_ids ?? []).map(String).filter((x: string) => /^[a-f\d]{24}$/i.test(x));
    const ucs: any[] = ids.length ? await Usecase.find({ _id: { $in: ids } }).select("lineage_id name").lean() : [];
    const last = (tc.execution_history ?? [])[0];
    const payload = {
      actorSsUserId: actorUserId ?? String(project.owner_id),
      project: { id: projectId },
      testcase: {
        key, title: tc.title, description: tc.description, status: tc.status, test_type: tc.test_type,
        severity: tc.severity, priority: tc.priority, preconditions: tc.preconditions,
        steps: (tc.steps ?? []).map((s: any) => ({ step: s.step_number, action: s.action, expected: s.expected_immediate_result })),
        expected: tc.expected_results?.business_level ?? "", actual: tc.actual_result ?? "",
        exceptions: (tc.exceptions ?? []).map((e: any) => e.message).filter(Boolean),
        environment: tc.environment?.runtime_env ?? null, executedAt: tc.executed_at ?? last?.executed_at ?? null,
        useCaseKeys: ucs.map((u) => u.lineage_id || String(u._id)),
      },
    };
    try {
      const r = await bridgeClient.reportTestcase(payload);
      if (r?.progress) await this.writeBug(projectId, key, toBug(r.progress));
      return r;
    } catch (e: any) {
      if (e instanceof BridgeError && ["WORKHUB_LINK_REQUIRED", "PROJECT_NOT_LINKED"].includes(e.code)) return null;
      logger.warn(`WorkHub testcase report failed: ${e?.message ?? e}`);
      return null;
    }
  }

  /** Project moved to the SmartSpec trash: the WorkHub project becomes read-only (archived). Best effort. */
  async projectTrashed(projectId: string) {
    if (!env.WORKHUB_ENABLED) return;
    clearTimeout(this.timers.get(projectId));
    try { await bridgeClient.archiveProject(projectId); } catch (e: any) { logger.warn(`WorkHub archive ${projectId} failed: ${e?.message ?? e}`); }
  }

  /** Restored from the trash: reopen the WorkHub project, then bring it up to date. */
  async projectRestored(projectId: string) {
    if (!env.WORKHUB_ENABLED) return;
    try { await bridgeClient.restoreProject(projectId); } catch (e: any) { logger.warn(`WorkHub restore ${projectId} failed: ${e?.message ?? e}`); }
    this.schedule(projectId, undefined, 500);
  }

  /** Owner pauses/resumes syncing of one project (nothing is deleted in WorkHub). */
  async setPaused(projectId: string, paused: boolean) {
    const r = await bridgeClient.setPaused(projectId, paused);
    if (!paused) this.schedule(projectId, undefined, 300);
    workhubSocketService.emitSync(projectId, paused ? "paused" : "syncing");
    return r;
  }

  /**
   * Called right after sign-up / sign-in, when the password is known: links the user's WorkHub account without any
   * extra step. With createIfMissing a WorkHub account is created when the address has none. Best effort.
   */
  async autoLink(userId: string, email: string, password: string, name: string | undefined, createIfMissing: boolean) {
    if (!env.WORKHUB_ENABLED) return;
    const status = await bridgeClient.userStatus(userId).catch(() => null);
    if (!status || status.linked) return; // Bridge down, or already linked
    try {
      await this.linkUser(userId, { email, password, register: false });
    } catch (e: any) {
      if (e instanceof BridgeError && e.code === "INVALID_CREDENTIALS" && createIfMissing) {
        await this.linkUser(userId, { email, password, register: true, fullName: name }).catch(() => undefined);
      } else {
        logger.warn(`WorkHub auto-link for ${email} skipped: ${e?.message ?? e}`);
      }
    }
  }

  async unlinkUser(userId: string) {
    return bridgeClient.unlinkUser(userId);
  }

  async userStatus(userId: string) {
    try {
      const s = await bridgeClient.userStatus(userId);
      return { bridge: true, ...s };
    } catch (e: any) {
      return { bridge: false, linked: false, error: e?.message };
    }
  }

  async linkUser(userId: string, input: { email?: string; password: string; register?: boolean; fullName?: string }) {
    let email = input.email;
    if (!email) email = ((await User.findById(userId).select("email").lean()) as any)?.email;
    if (!email) throw new BridgeError(400, "BAD_REQUEST", "Thiếu email");
    const r = await bridgeClient.linkUser(userId, { email, password: input.password, register: input.register, fullName: input.fullName });
    const projects = await this.syncAllOwnedBy(userId);
    return { ...r, linked: true, projectsQueued: projects };
  }
}

export const workhubSyncService = new WorkhubSyncService();
// Diagrams, database design or test cases changed (any code path) → debounced re-sync of the design documents
setDesignChangedListener((projectId) => workhubSyncService.schedule(projectId));
