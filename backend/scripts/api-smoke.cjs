// API smoke test of SmartSpec business flows that need no AI (projects, use cases, versions, database design, test cases,
// sharing, trash, admin, accounts). Run against a backend started with MAIL_ENABLED=false AUTH_RATE_LIMIT=1000 and a
// throw-away MONGO_URI (database smartspec_e2e): node scripts/api-smoke.cjs

const R = "../node_modules/";
const { MongoClient, ObjectId } = require(R + "mongodb");
const SS = "http://localhost:8000";
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { if (cond) { pass++; console.log("✓ " + name); } else { fail++; console.log("✗ " + name + (extra ? "  → " + extra : "")); } };
const call = async (tok, m, p, b) => { const r = await fetch(SS + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const x = await r.text(); let d; try { d = JSON.parse(x) } catch { d = x } return { s: r.status, d, raw: x }; };
const short = (r) => `${r.s} ${typeof r.d === "string" ? r.d.slice(0, 100) : JSON.stringify(r.d).slice(0, 160)}`;
(async () => {
  const db = (await MongoClient.connect("mongodb://localhost:27017/smartspec_e2e?directConnection=true")).db();
  const id = Math.random().toString(36).slice(2, 7);
  const reg = async (n) => { const r = await call(null, "POST", "/api/auth/register", { email: `${n}-${id}@example.com`, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" }); return { tok: r.d.data.accessToken, id: r.d.data.sub, email: `${n}-${id}@example.com` }; };
  const A = await reg("owner"), B = await reg("member"), C = await reg("outsider");

  // ===== PROJECTS =====
  let r = await call(A.tok, "POST", "/api/projects", { name: "Probe", description: "desc", language: "vi-VN" });
  t("project: create", r.s === 200 || r.s === 201, short(r));
  const proj = r.d?.data || r.d;
  const pid = proj?._id || proj?.id;
  t("project: create returns id + owner member + current_version", !!pid && !!proj.current_version, JSON.stringify(proj).slice(0, 200));
  r = await call(A.tok, "GET", "/api/projects/myproject");
  t("project: myproject lists it", JSON.stringify(r.d).includes(pid), short(r));
  r = await call(A.tok, "GET", "/api/projects/" + pid);
  t("project: detail", r.s === 200, short(r));
  const detail = r.d?.data || r.d;
  const vid = (detail?.versions?.[0]?._id) || proj.current_version;
  t("project: detail does not create a second empty version", (detail?.versions || []).length === 1, "versions=" + (detail?.versions || []).length);
  r = await call(C.tok, "GET", "/api/projects/" + pid);
  t("project: outsider cannot read it", r.s === 403 || r.s === 404, short(r));
  r = await call(A.tok, "PUT", "/api/projects/" + pid, { name: "Probe 2", description: "d2" });
  t("project: update name", r.s === 200 && JSON.stringify(r.d).includes("Probe 2"), short(r));
  r = await call(A.tok, "GET", "/api/projects/recent");
  t("project: recent", r.s === 200, short(r));
  r = await call(A.tok, "GET", "/api/projects/shared");
  t("project: shared (empty)", r.s === 200, short(r));

  // ===== USE CASES (manual) =====
  const uc = { name: "Đăng nhập", description: "d", actor: { name: "Khách" }, goal: "g", priority: "high", main_flow: [{ step: 1, actor: "Khách", action: "nhập", expected_result: "ok" }], context: { module: "Tài khoản" } };
  r = await call(A.tok, "POST", `/api/usecaseManagement/versions/${vid}/usecases`, uc);
  t("usecase: add manually", r.s === 200 || r.s === 201, short(r));
  r = await call(A.tok, "GET", `/api/usecaseManagement/versions/${vid}/usecases`);
  const list = r.d?.data?.usecases || r.d?.data || r.d?.usecases || [];
  t("usecase: list returns it", r.s === 200 && JSON.stringify(r.d).includes("Đăng nhập"), short(r));
  const ucId = (Array.isArray(list) ? list : []).find((x) => x.name === "Đăng nhập")?._id;
  t("usecase: has id", !!ucId, JSON.stringify(r.d).slice(0, 200));
  r = await call(A.tok, "PUT", `/api/usecaseManagement/versions/${vid}/usecases/${ucId}`, { ...uc, goal: "mục tiêu mới" });
  t("usecase: update on the working version", r.s === 200, short(r));
  r = await call(C.tok, "POST", `/api/usecaseManagement/versions/${vid}/usecases`, { ...uc, name: "hack" });
  t("usecase: outsider cannot add", r.s === 403, short(r));

  // ===== VERSIONS =====
  r = await call(A.tok, "GET", `/api/versions/project/${pid}`);
  t("version: list", r.s === 200, short(r));
  await db.collection("versions").updateOne({ _id: new ObjectId(vid) }, { $set: { version_temporary: false, status: "completed", stage: "completed" } });
  // editing a finalized version bumps; the edit must still apply to the right use case
  r = await call(A.tok, "PUT", `/api/usecaseManagement/versions/${vid}/usecases/${ucId}`, { ...uc, goal: "sau khi chốt" });
  t("usecase: editing a finalized version works (auto bump + id remap)", r.s === 200, short(r));
  r = await call(A.tok, "GET", `/api/versions/project/${pid}`);
  t("version: bump created a new version", JSON.stringify(r.d).match(/_id/g)?.length >= 2, short(r));

  // ===== DATABASE DESIGN =====
  const dbVersion = (await db.collection("versions").find({ project_id: new ObjectId(pid) }).sort({ created_at: -1 }).limit(1).next())._id.toString();
  const ins = await db.collection("databases").insertOne({ project_id: new ObjectId(pid), version_id: new ObjectId(dbVersion), name: "DB", tables: [], relationships: [], created_at: new Date() });
  const dbId = String(ins.insertedId);
  t("database: (seeded design — generating one needs AI)", true);
  if (dbId) {
    r = await call(A.tok, "POST", `/api/databases/${dbId}/tables`, { name: "users", columns: [{ name: "id", type: "uuid", is_primary_key: true, nullable: false }, { name: "email", type: "varchar", length: 255, unique: true }] });
    t("database: add table", r.s === 200 || r.s === 201, short(r));
    r = await call(A.tok, "POST", `/api/databases/${dbId}/tables`, { name: "orders", columns: [{ name: "id", type: "uuid", is_primary_key: true, nullable: false }, { name: "user_id", type: "uuid", is_foreign_key: true, references: "users" }] });
    t("database: add second table with FK", r.s === 200 || r.s === 201, short(r));
    r = await call(A.tok, "POST", `/api/databases/${dbId}/tables`, { name: "users", columns: [{ name: "id", type: "uuid" }] });
    t("database: duplicate table name is refused", r.s >= 400, short(r));
    r = await call(A.tok, "GET", `/api/databases/${dbId}/tables/orders/relationships`);
    t("database: relationships are derived from the foreign key", r.s === 200 && JSON.stringify(r.d).includes("users"), short(r));
    r = await call(A.tok, "GET", `/api/databases/${dbId}/export-sql?dialect=postgresql`);
    t("database: export SQL", r.s === 200 && /CREATE TABLE/i.test(r.raw), short(r));
    r = await call(A.tok, "GET", `/api/databases/${dbId}/stats`);
    t("database: stats", r.s === 200, short(r));
    r = await call(A.tok, "DELETE", `/api/databases/${dbId}/tables/orders`);
    t("database: delete table", r.s === 200, short(r));
  }

  // ===== TEST CASES =====
  r = await call(A.tok, "POST", `/api/testcases/projects/${pid}/versions/${dbVersion}/testcases`, { testCases: [{ title: "Đăng nhập đúng", test_type: "integration", priority: "high", steps: [{ step_number: 1, action: "nhập", expected_immediate_result: "ok" }], source_requirement_ids: [] }] });
  t("testcase: create", r.s === 200 || r.s === 201, short(r));
  const tcd = r.d?.data || r.d;
  const tc = Array.isArray(tcd) ? tcd[0] : (tcd?.testCases?.[0] || tcd?.created?.[0] || tcd);
  const tcId = tc?._id || tc?.id;
  t("testcase: create returns the new test case with an id", !!tcId, JSON.stringify(r.d).slice(0, 200));
  if (tcId) {
    r = await call(A.tok, "PUT", `/api/testcases/testcases/${tcId}/execute`, { status: "passed", actual_result: "ok" });
    t("testcase: execute passed", r.s === 200, short(r));
    r = await call(A.tok, "GET", `/api/testcases/projects/${pid}/test-statistics`);
    t("testcase: statistics", r.s === 200, short(r));
    for (const f of ["json", "csv", "excel"]) {
      r = await call(A.tok, "GET", `/api/testcases/projects/${pid}/export-testcases?format=${f}&version_id=${dbVersion}`);
      t("testcase: export " + f, r.s === 200, short(r));
    }
    r = await call(A.tok, "PUT", `/api/testcases/testcases/${tcId}`, { title: "Đăng nhập đúng (sửa)" });
    t("testcase: update", r.s === 200, short(r));
    r = await call(A.tok, "DELETE", `/api/testcases/testcases/${tcId}`);
    t("testcase: delete", r.s === 200 || r.s === 204, short(r));
  }

  // ===== SHARING =====
  r = await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: B.email, role: "editor" });
  t("share: invite a member", r.s === 200 || r.s === 201, short(r));
  r = await call(B.tok, "GET", "/api/projects/me/invites");
  t("share: invitee sees the invite", r.s === 200 && JSON.stringify(r.d).includes(pid), short(r));
  const invToken = JSON.stringify(r.d).match(/"invite_token":"([^"]+)"/)?.[1];
  t("share: the invite carries a token", !!invToken, JSON.stringify(r.d).slice(0, 200));
  r = await call(A.tok, "GET", `/api/projects/${pid}/members/invites`);
  t("share: owner lists project invites", r.s === 200, short(r));
  const memberId = B.id;
  r = await call(B.tok, "POST", `/api/projects/${pid}/members/${memberId}/accept`, { token: invToken });
  t("share: accept", r.s === 200, short(r));
  r = await call(B.tok, "GET", "/api/projects/" + pid);
  t("share: member can open the project", r.s === 200, short(r));
  r = await call(B.tok, "GET", "/api/projects/shared");
  t("share: appears in 'shared'", JSON.stringify(r.d).includes(pid), short(r));
  r = await call(B.tok, "PUT", "/api/projects/" + pid, { name: "member rename" });
  t("share: an editor cannot rename the project (owner only)", r.s === 403 || r.s === 404, short(r));
  r = await call(B.tok, "DELETE", "/api/projects/" + pid);
  t("share: an editor cannot trash the project", r.s !== 200 && r.s !== 204, short(r));
  r = await call(A.tok, "DELETE", `/api/projects/${pid}/members/${memberId}`);
  t("share: owner removes the member", r.s === 200 || r.s === 204, short(r));
  r = await call(B.tok, "GET", "/api/projects/" + pid);
  t("share: removed member loses access", r.s === 403 || r.s === 404, short(r));
  r = await call(A.tok, "GET", "/api/projects/users/search?q=" + B.email.slice(0, 6));
  t("share: user search", r.s === 200, short(r));

  // ===== TRASH =====
  r = await call(A.tok, "DELETE", "/api/projects/" + pid);
  t("trash: move to trash", r.s === 200 || r.s === 204, short(r));
  r = await call(A.tok, "GET", "/api/projects/trashed");
  t("trash: listed", JSON.stringify(r.d).includes(pid), short(r));
  r = await call(A.tok, "GET", "/api/projects/myproject");
  t("trash: no longer in my projects", !JSON.stringify(r.d).includes(pid), short(r));
  r = await call(A.tok, "POST", `/api/projects/${pid}/restore`, {});
  t("trash: restore", r.s === 200, short(r));

  // ===== USERS / ADMIN / MISC =====
  r = await call(A.tok, "GET", "/api/users");
  t("admin: a normal user cannot list all users", r.s === 403, short(r));
  r = await call(A.tok, "GET", "/api/keys");
  t("admin: a normal user cannot read API keys", r.s === 403, short(r));
  r = await call(A.tok, "GET", "/api/auth/me");
  t("user: own profile endpoint", r.s === 200 && r.d.data.email === A.email, short(r));
  r = await call(A.tok, "GET", "/api/logs?projectId=" + pid);
  t("logs: project logs", r.s === 200, short(r));
  r = await call(null, "GET", "/api/projects/myproject");
  t("auth: protected endpoints refuse anonymous callers", r.s === 401, short(r));

  // ===== ADMIN =====
  const adminEmail = `adm-${id}@example.com`;
  await call(null, "POST", "/api/auth/register", { email: adminEmail, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" });
  await db.collection("users").updateOne({ email: adminEmail }, { $set: { system_role: "ADMIN" } });
  const ad = (await call(null, "POST", "/api/auth/login", { email: adminEmail, password: "correct-horse-battery" })).d.data;
  r = await call(A.tok, "GET", "/api/admin/dashboard/stats");
  t("admin: stats refuse a normal user", r.s === 403, short(r));
  r = await call(ad.accessToken, "GET", "/api/admin/dashboard/stats");
  t("admin: dashboard stats", r.s === 200 && r.d.data.users.total >= 4 && r.d.data.projects, short(r));
  r = await call(ad.accessToken, "GET", "/api/admin/dashboard/activities");
  t("admin: recent activities", r.s === 200 && Array.isArray(r.d.data), short(r));
  r = await call(ad.accessToken, "GET", "/api/admin/system/info");
  t("admin: system info", r.s === 200 && r.d.data.mongo === "connected", short(r));
  r = await call(ad.accessToken, "GET", "/api/admin/system/logs?limit=5");
  t("admin: system logs", r.s === 200 && Array.isArray(r.d.data.logs), short(r));
  const newEmail = `made-${id}@example.com`;
  r = await call(ad.accessToken, "POST", "/api/users", { email: newEmail, name: "Made", password: "an-admin-set-pass-1", system_role: "PARTICIPANT" });
  t("admin: create a user", r.s === 201, short(r));
  r = await call(null, "POST", "/api/auth/login", { email: newEmail, password: "an-admin-set-pass-1" });
  t("admin: the created user can sign in", r.s === 200, short(r));
  const madeId = (await db.collection("users").findOne({ email: newEmail }))._id.toString();
  r = await call(ad.accessToken, "POST", "/api/users", { email: newEmail, password: "an-admin-set-pass-1" });
  t("admin: creating a duplicate is refused (400)", r.s === 400, short(r));
  r = await call(ad.accessToken, "POST", "/api/users", { email: `w-${id}@example.com`, password: "short" });
  t("admin: weak password refused when creating", r.s === 400, short(r));
  r = await call(ad.accessToken, "PATCH", `/api/users/${madeId}/status`, { active: false });
  t("admin: deactivate a user", r.s === 200, short(r));
  r = await call(null, "POST", "/api/auth/login", { email: newEmail, password: "an-admin-set-pass-1" });
  t("admin: a deactivated user cannot sign in", r.s === 403, short(r));
  r = await call(ad.accessToken, "PATCH", `/api/users/${(await db.collection("users").findOne({ email: adminEmail }))._id}/status`, { active: false });
  t("admin: cannot deactivate yourself", r.s >= 400, short(r));
  r = await call(ad.accessToken, "POST", "/api/users/bulk-action", { userIds: [madeId], action: "activate" });
  t("admin: bulk activate", r.s === 200 && r.d.data.done === 1, short(r));
  r = await call(ad.accessToken, "POST", "/api/users/search", { content: "(" });
  t("admin: a regex character in the search box does not crash", r.s === 200, short(r));
  r = await call(ad.accessToken, "PATCH", `/api/users/${madeId}`, { name: "Renamed" });
  t("admin: update a user without a birth date", r.s === 200, short(r));
  // self-service
  r = await call(A.tok, "PATCH", "/api/users/update-profile", { name: "Me", status: "INACTIVE" });
  t("user: cannot change own status through the profile", r.s === 200 && (await db.collection("users").findOne({ email: A.email })).status !== "INACTIVE", short(r));
  r = await call(A.tok, "POST", "/api/users/change-password", { oldPassword: "correct-horse-battery", newPassword: "short" });
  t("user: change-password enforces the password rule", r.s >= 400, short(r));
  r = await call(A.tok, "POST", "/api/users/change-email", { newEmail: `Changed-${id}@Example.com` });
  t("user: change e-mail (normalised, marked unverified)", r.s === 200, short(r));
  const au = await db.collection("users").findOne({ _id: new ObjectId(A.id) });
  t("user: e-mail stored lower-case and unverified", au.email === `changed-${id}@example.com` && au.email_verified === false, au.email);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
