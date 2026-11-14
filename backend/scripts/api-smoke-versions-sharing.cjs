// API smoke test of SmartSpec flows that need no AI. Run against a backend started with MAIL_ENABLED=false
// AUTH_RATE_LIMIT=1000 WORKHUB_ENABLED=false and a throw-away MONGO_URI (database smartspec_e2e): node scripts/api-smoke-versions-sharing.cjs
const R = "../node_modules/";
const { MongoClient, ObjectId } = require(R + "mongodb");
const SS = "http://localhost:8000";
let pass = 0, fail = 0;
const t = (n, c, x = "") => { if (c) { pass++; console.log("✓ " + n); } else { fail++; console.log("✗ " + n + (x ? "  → " + x : "")); } };
const call = async (tok, m, p, b) => { const r = await fetch(SS + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const x = await r.text(); let d; try { d = JSON.parse(x) } catch { d = x } return { s: r.status, d }; };
const sh = (r) => `${r.s} ${typeof r.d === "string" ? r.d.slice(0, 90) : JSON.stringify(r.d).slice(0, 170)}`;
(async () => {
  const db = (await MongoClient.connect("mongodb://localhost:27017/smartspec_e2e?directConnection=true")).db();
  const id = Math.random().toString(36).slice(2, 7);
  const reg = async (n) => { const r = await call(null, "POST", "/api/auth/register", { email: `${n}-${id}@example.com`, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" }); return { tok: r.d.data.accessToken, id: r.d.data.sub, email: `${n}-${id}@example.com` }; };
  const A = await reg("own"), B = await reg("mem"), V = await reg("view");
  let r = await call(A.tok, "POST", "/api/projects", { name: "P2", description: "d", language: "vi-VN" });
  const pid = r.d.data._id; const vid = r.d.data.current_version;
  const ver = async (v) => db.collection("versions").findOne({ _id: new ObjectId(v) });
  const uc = (n) => ({ name: n, description: n, actor: { name: "K" }, goal: "g", priority: "medium", main_flow: [{ step: 1, actor: "K", action: "x", expected_result: "ok" }], context: { module: "M" } });

  // ----- version workflow on a draft -----
  let v0 = await ver(vid);
  t("version: a new project starts as a draft 1.0", v0.version_number === "1.0" && v0.version_temporary === true, JSON.stringify({ n: v0.version_number, temp: v0.version_temporary, st: v0.status }));
  r = await call(A.tok, "POST", `/api/usecaseManagement/versions/${vid}/usecases`, uc("UC1"));
  t("version: adding to the draft edits it in place", r.s === 200 || r.s === 201, sh(r));
  const all = await db.collection("versions").find({ project_id: new ObjectId(pid) }).sort({ created_at: 1 }).toArray();
  t("version: still one version (the draft)", all.length === 1, all.map((x) => x.version_number + (x.version_temporary ? "*" : "")).join(","));
  const work = all[all.length - 1]; const wid = String(work._id);
  t("version: the working copy is temporary", work.version_temporary === true, JSON.stringify({ n: work.version_number, t: work.version_temporary }));
  const pr = await call(A.tok, "GET", `/api/versions/${wid}/preview`);
  t("version: a preview of the pending change exists", pr.s === 200 && pr.d.data && pr.d.data.changes?.length >= 1, sh(pr));
  // viewer / member cannot approve
  await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: B.email, role: "editor" });
  const inv = (await call(B.tok, "GET", "/api/projects/me/invites")).d;
  const tok = JSON.stringify(inv).match(/"invite_token":"([^"]+)"/)?.[1];
  await call(B.tok, "POST", `/api/projects/${pid}/members/${B.id}/accept`, { token: tok });
  r = await call(B.tok, "POST", `/api/versions/${wid}/approve`, { changeType: "minor" });
  t("version: an editor cannot approve", r.s === 403, sh(r));
  r = await call(A.tok, "POST", `/api/versions/${wid}/approve`, { changeType: "minor", comment: "ok" });
  t("version: owner approves (finalize)", r.s === 200, sh(r));
  const fin = await ver(wid);
  t("version: after approve it is final and numbered 1.1", fin.version_temporary === false && fin.version_number === "1.1", `${fin.version_number} temp=${fin.version_temporary}`);
  const prj = await db.collection("projects").findOne({ _id: new ObjectId(pid) });
  t("version: the project's current version is the approved one", String(prj.current_version) === wid, String(prj.current_version));
  r = await call(A.tok, "POST", `/api/versions/${wid}/approve`, { changeType: "minor" });
  t("version: approving twice is refused", r.s >= 400, sh(r));

  // edit again -> new working copy; revert a change; rollback
  const ucs1 = (await call(A.tok, "GET", `/api/usecaseManagement/versions/${wid}/usecases`)).d.data;
  const ucId = ucs1.find((x) => x.name === "UC1")?._id;
  r = await call(A.tok, "PUT", `/api/usecaseManagement/versions/${wid}/usecases/${ucId}`, { ...uc("UC1"), goal: "đổi" });
  t("version: editing the finalized version works", r.s === 200, sh(r));
  const all2 = await db.collection("versions").find({ project_id: new ObjectId(pid) }).sort({ created_at: 1 }).toArray();
  const w2 = String(all2[all2.length - 1]._id);
  t("version: editing a finalized version makes a working copy (2 versions)", all2.length === 2 && w2 !== wid, all2.map((x) => x.version_number).join(","));
  const pr2 = (await call(A.tok, "GET", `/api/versions/${w2}/preview`)).d.data;
  const chg = pr2?.changes?.[0]?.change_id;
  t("version: preview lists the edit", !!chg, JSON.stringify(pr2).slice(0, 150));
  r = await call(A.tok, "POST", `/api/versions/${w2}/change/${chg}/revert`, {});
  t("version: revert a single change", r.s === 200, sh(r));
  const back = (await call(A.tok, "GET", `/api/usecaseManagement/versions/${w2}/usecases`)).d.data.find((x) => x.name === "UC1");
  t("version: the revert restored the previous goal", back && back.goal === "g", JSON.stringify(back?.goal));
  r = await call(A.tok, "POST", `/api/versions/${w2}/rollback`, {});
  t("version: the owner alone can roll back (no need for every member to agree)", r.s === 200 && /completed|Rollback/i.test(JSON.stringify(r.d)) && !/waiting/i.test(JSON.stringify(r.d)), sh(r));
  const all3 = await db.collection("versions").countDocuments({ project_id: new ObjectId(pid) });
  t("version: back to 1 version after rollback", all3 === 1, "count=" + all3);
  r = await call(A.tok, "DELETE", `/api/versions/${wid}`);
  t("version: cannot delete the current version", r.s === 400, sh(r));
  const rbx = await call(B.tok, "DELETE", `/api/versions/${wid}`);
  t("version: an editor cannot delete a version", rbx.s === 403 || rbx.s === 400, sh(rbx));
  r = await call(A.tok, "PATCH", `/api/versions/projects/${pid}/current-version/${vid}`, {});
  t("version: owner can switch the current version back", r.s === 200, sh(r));
  r = await call(B.tok, "PATCH", `/api/versions/projects/${pid}/current-version/${wid}`, {});
  t("version: an editor cannot switch the current version", r.s === 403, sh(r));
  r = await call(A.tok, "PATCH", `/api/versions/${vid}/editing`, {});
  t("version: mark editing", r.s === 200, sh(r));
  r = await call(A.tok, "PATCH", `/api/versions/${vid}/locked`, {});
  t("version: mark locked", r.s === 200, sh(r));

  // ----- usecase validation -----
  const cur = String((await db.collection("projects").findOne({ _id: new ObjectId(pid) })).current_version);
  r = await call(A.tok, "POST", `/api/usecaseManagement/versions/${cur}/usecases`, { description: "no name" });
  t("usecase: a use case without a name is refused (4xx)", r.s >= 400 && r.s < 500, sh(r));
  r = await call(A.tok, "POST", `/api/usecaseManagement/versions/${cur}/usecases`, uc("A".repeat(300)));
  t("usecase: very long names do not crash (<500)", r.s < 500, sh(r));
  r = await call(A.tok, "POST", `/api/usecaseManagement/versions/not-an-id/usecases`, uc("x"));
  t("usecase: a malformed version id is a 4xx, not a 500", r.s >= 400 && r.s < 500, sh(r));

  // ----- sharing edge cases -----
  const C = await reg("c");
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: A.email, role: "editor" });
  t("share: inviting yourself is refused", r.s >= 400, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: B.email, role: "editor" });
  t("share: inviting an existing member is refused", r.s >= 400, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: `ghost-${id}@example.com`, role: "editor" });
  t("share: inviting an unknown e-mail is handled (no 500)", r.s < 500, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: C.email, role: "owner" });
  t("share: you cannot invite someone as a second owner", r.s >= 400, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: C.email, role: "viewer" });
  const cinv = JSON.stringify((await call(C.tok, "GET", "/api/projects/me/invites")).d).match(/"invite_token":"([^"]+)"/)?.[1];
  r = await call(C.tok, "POST", `/api/projects/${pid}/members/${C.id}/reject`, { token: cinv });
  t("share: the invitee can reject", r.s === 200, sh(r));
  r = await call(C.tok, "GET", "/api/projects/" + pid);
  t("share: a rejected invitee has no access", r.s === 403 || r.s === 404, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: C.email, role: "viewer" });
  r = await call(A.tok, "DELETE", `/api/projects/${pid}/members/${C.id}/cancel`);
  t("share: the owner cancels a pending invite", r.s === 200 || r.s === 204, sh(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/leave`, {});
  t("share: the owner cannot leave their own project", r.s >= 400, sh(r));
  r = await call(B.tok, "POST", `/api/projects/${pid}/leave`, {});
  t("share: a member can leave", r.s === 200, sh(r));
  r = await call(B.tok, "GET", "/api/projects/" + pid);
  t("share: after leaving there is no access", r.s === 403 || r.s === 404, sh(r));

  // ----- notifications -----
  r = await call(B.tok, "GET", "/api/notifications/me");
  t("notifications: list", r.s === 200, sh(r));
  const notes = (r.d.data?.notifications || r.d.data || []);
  if (Array.isArray(notes) && notes[0]) {
    r = await call(B.tok, "PATCH", `/api/notifications/is-read/${(notes[0]._id || notes[0].id)}`, { is_read: true });
    t("notifications: mark read", r.s === 200, sh(r));
    r = await call(A.tok, "DELETE", `/api/notifications/${(notes[0]._id || notes[0].id)}`);
    t("notifications: another user cannot delete mine", r.s >= 400, sh(r));
  } else t("notifications: (none present to test marking)", true);

  // ----- stats / keys (admin) -----
  const adminEmail = `adm-${id}@example.com`;
  await call(null, "POST", "/api/auth/register", { email: adminEmail, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" });
  await db.collection("users").updateOne({ email: adminEmail }, { $set: { system_role: "ADMIN" } });
  const ad = (await call(null, "POST", "/api/auth/login", { email: adminEmail, password: "correct-horse-battery" })).d.data.accessToken;
  for (const p of ["/api/stats/quick", "/api/stats/system", "/api/stats/usage-summary", "/api/stats/provider-usage", "/api/stats/trends", "/api/stats/activities", "/api/stats/settings", "/api/stats/users/analytics"]) {
    r = await call(ad, "GET", p);
    t("stats: " + p, r.s === 200, sh(r));
  }
  r = await call(A.tok, "GET", "/api/stats/system");
  t("stats: a normal user cannot read system stats", r.s === 403, sh(r));
  r = await call(ad, "POST", "/api/keys", { key_value: "AIzaFAKE" + id, provider: "gemini", model_name: "gemini-1.5-flash", is_active: false });
  t("keys: create", r.s === 200 || r.s === 201, sh(r));
  r = await call(ad, "GET", "/api/keys");
  t("keys: list works for the admin", r.s === 200, sh(r));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
