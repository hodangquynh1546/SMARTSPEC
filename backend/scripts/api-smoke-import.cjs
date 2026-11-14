const R = require("path").join(__dirname, "..", "node_modules") + "/";
const { MongoClient, ObjectId } = require(R + "mongodb");
const SS = "http://localhost:8000";
let pass = 0, fail = 0;
const t = (n, c, x = "") => { if (c) { pass++; console.log("✓ " + n); } else { fail++; console.log("✗ " + n + (x ? "  → " + x : "")); } };
const call = async (tok, m, p, b) => { const r = await fetch(SS + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const x = await r.text(); let d; try { d = JSON.parse(x) } catch { d = x } return { s: r.status, d }; };
const sh = (r) => `${r.s} ${typeof r.d === "string" ? r.d.slice(0, 90) : JSON.stringify(r.d).slice(0, 260)}`;
(async () => {
  const db = (await MongoClient.connect("mongodb://localhost:27017/smartspec_e2e?directConnection=true")).db();
  const id = Math.random().toString(36).slice(2, 7);
  const reg = async (n) => { const r = await call(null, "POST", "/api/auth/register", { email: `${n}-${id}@example.com`, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" }); return { tok: r.d.data.accessToken, id: r.d.data.sub }; };
  const A = await reg("own"), O = await reg("out"), V = await reg("view");

  // ---- tokens ----
  let r = await call(A.tok, "POST", "/api/tokens", { name: "Claude test" });
  t("token: create returns the raw token once", r.s === 201 && r.d.data.token.startsWith("ssp_"), sh(r));
  const PAT = r.d.data.token, patId = r.d.data.id;
  r = await call(A.tok, "GET", "/api/tokens");
  t("token: the list never contains the secret", r.s === 200 && r.d.data.length === 1 && !JSON.stringify(r.d).includes(PAT), sh(r));
  t("token: only the hash is stored", !!(await db.collection("access_tokens").findOne({ token_hash: { $exists: true }, user_id: new ObjectId(A.id) })) && !JSON.stringify(await db.collection("access_tokens").find({}).toArray()).includes(PAT));
  r = await call(PAT, "GET", "/api/projects/myproject");
  t("token: works like its owner on normal endpoints", r.s === 200, sh(r));
  r = await call(PAT, "POST", "/api/tokens", { name: "x" });
  t("token: a token cannot mint tokens", r.s === 403, sh(r));
  r = await call(PAT, "GET", "/api/admin/dashboard/stats");
  t("token: never acts as an admin", r.s === 403, sh(r));
  await db.collection("users").updateOne({ _id: new ObjectId(A.id) }, { $set: { system_role: "ADMIN" } });
  r = await call(PAT, "GET", "/api/users");
  t("token: even for an admin owner, admin endpoints refuse a token", r.s === 403, sh(r));
  await db.collection("users").updateOne({ _id: new ObjectId(A.id) }, { $set: { system_role: "PARTICIPANT" } });
  r = await call("ssp_not-a-token", "GET", "/api/projects/myproject");
  t("token: an unknown token is 401", r.s === 401, sh(r));

  // ---- project + use cases through the token ----
  r = await call(PAT, "POST", "/api/projects", { name: "Claude project", description: "d", language: "vi-VN" });
  const pid = r.d.data._id; const vid = r.d.data.current_version;
  t("token: create a project", !!pid, sh(r));
  await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: `view-${id}@example.com`, role: "viewer" });
  const tk = JSON.stringify((await call(V.tok, "GET", "/api/projects/me/invites")).d).match(/"invite_token":"([^"]+)"/)?.[1];
  await call(V.tok, "POST", `/api/projects/${pid}/members/${V.id}/accept`, { token: tk });
  for (const n of ["Đăng nhập", "Đặt hàng"]) {
    r = await call(PAT, "POST", `/api/usecaseManagement/versions/${vid}/usecases`, { name: n, description: n, actor: { name: "Khách" }, goal: "g", priority: "high", main_flow: [{ step: 1, actor: "Khách", action: "x", expected_result: "ok" }], context: { module: "Chung" } });
  }
  t("token: add use cases", (await db.collection("usecases").countDocuments({ project_id: new ObjectId(pid) })) === 2);
  r = await call(PAT, "POST", `/api/import/versions/${vid}/usecases`, { usecases: [
    { name: "Thanh toán", description: "d", actor: "Khách", goal: "g", priority: "high", main_flow: [{ step: 1, actor: "Khách", action: "trả tiền", expected_result: "ok" }], context: { module: "Đơn hàng" } },
    { name: "Đăng nhập", description: "đã đổi", actor: "Khách", goal: "mới", main_flow: [{ step: 1, actor: "Khách", action: "nhập", expected_result: "ok" }] } ] });
  t("import: bulk use cases — one new, one replaced by name", r.s === 201 && r.d.data.created.length === 1 && r.d.data.replaced.length === 1 && r.d.data.failed.length === 0, sh(r));
  t("import: the replaced use case really changed", (await db.collection("usecases").findOne({ project_id: new ObjectId(pid), name: "Đăng nhập" })).goal === "mới");
  t("import: still three use cases (no duplicate)", (await db.collection("usecases").countDocuments({ project_id: new ObjectId(pid) })) === 3);
  r = await call(PAT, "POST", `/api/import/versions/${vid}/usecases`, { usecases: [{ description: "no name" }, { name: "X" }] });
  t("import: use cases without a name or main_flow are refused up front", r.s === 400 && r.d.errors.length >= 2, sh(r));

  // ---- database import ----
  const DB = { name: "Shop", description: "CSDL cửa hàng", tables: [
    { name: "customers", columns: [{ name: "id", type: "uuid", is_primary_key: true }, { name: "email", type: "varchar", length: 255, unique: true, nullable: false }] },
    { name: "orders", columns: [{ name: "id", type: "uuid", is_primary_key: true }, { name: "customer_id", type: "uuid", is_foreign_key: true, references: "customers.id" }, { name: "total", type: "decimal" }] },
  ] };
  r = await call(PAT, "POST", `/api/import/versions/${vid}/database`, DB);
  t("import: database design accepted", r.s === 201 && r.d.data.tables === 2 && r.d.data.relationships === 1, sh(r));
  const dbDoc = await db.collection("databases").findOne({ name: "Shop", project_id: new ObjectId(pid) });
  t("import: FK reference normalised and relationship derived", dbDoc.tables[1].columns[1].references === "customers" && dbDoc.relationships[0].from_table === "orders", JSON.stringify(dbDoc?.relationships));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/database`, { ...DB, description: "v2" });
  t("import: same name again replaces (idempotent)", r.s === 201 && r.d.data.replaced === true && (await db.collection("databases").countDocuments({ project_id: new ObjectId(pid) })) === 1, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/database`, { name: "Bad", tables: [{ name: "a", columns: [{ name: "id", type: "int", is_primary_key: true }, { name: "x", type: "int", is_foreign_key: true, references: "nope" }] }, { name: "a", columns: [] }] });
  t("import: invalid design is refused with a list of problems Claude can fix", r.s === 400 && r.d.errors.length >= 2 && /nope|trùng|column/i.test(JSON.stringify(r.d.errors)), sh(r));
  t("import: nothing was written for the invalid design", (await db.collection("databases").countDocuments({ name: "Bad" })) === 0);
  const prev = await db.collection("previews").findOne({ base_version_id: new ObjectId(vid) });
  t("import: recorded as a preview change for the owner to approve", !!prev && prev.changes.some((c) => c.entity_type === "database"), JSON.stringify(prev?.changes?.map((c) => c.entity_type)));

  // ---- diagrams ----
  r = await call(PAT, "POST", `/api/import/versions/${vid}/usecase-diagram`, { name: "Tổng quan", actors: ["Khách"], usecases: ["Đăng nhập", "Đặt hàng"], associations: [{ actor: "Khách", usecase: "Đăng nhập" }, { actor: "Khách", usecase: "Đặt hàng" }], relationships: [{ source: "Đặt hàng", target: "Đăng nhập", type: "include" }] });
  t("import: use case diagram", r.s === 201, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/usecase-diagram`, { name: "Lỗi", actors: ["A"], usecases: ["B"], associations: [{ actor: "Z", usecase: "B" }] });
  t("import: a diagram referring to unknown names is refused", r.s === 400 && /không có trong danh sách/.test(r.d.message), sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/sequence-diagram`, { name: "Đặt hàng thành công", usecase: "Đặt hàng", lifelines: ["Khách", "Server", "DB"], fragments: [{ key: "f1", type: "alt", guard: "còn hàng" }, { key: "f2", type: "else", guard: "hết hàng", parent: "f1" }], messages: [{ from: "Khách", to: "Server", content: "đặtHàng()" }, { from: "Server", to: "DB", content: "kiểmTra()", fragment: "f1" }, { from: "Server", to: "Khách", content: "hết hàng", type: "reply", fragment: "f2" }] });
  t("import: sequence diagram linked to its use case", r.s === 201 && r.d.data.linkedUseCase === true, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/sequence-diagram`, { name: "Lỗi", lifelines: ["A", "B"], messages: [{ from: "A", to: "C", content: "x" }] });
  t("import: a message to an unknown lifeline is refused", r.s === 400, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/activity-diagram`, { name: "Đăng nhập", lanes: ["Khách", "Hệ thống"], nodes: [{ key: "s", type: "start", lane: "Khách" }, { key: "a", type: "action", label: "Nhập email", lane: "Khách" }, { key: "d", type: "decision", label: "Hợp lệ?", lane: "Hệ thống" }, { key: "e", type: "end", lane: "Hệ thống" }], edges: [{ from: "s", to: "a" }, { from: "a", to: "d" }, { from: "d", to: "e", condition: "có" }] });
  t("import: activity diagram", r.s === 201 && r.d.data.nodes === 4 && r.d.data.edges === 3, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/${vid}/activity-diagram`, { name: "Lỗi", nodes: [{ key: "a", type: "action" }, { key: "b", type: "action" }], edges: [] });
  t("import: an activity diagram without start/end/edges is refused", r.s === 400 && r.d.errors.length >= 3, sh(r));

  // ---- permissions ----
  r = await call(V.tok, "POST", `/api/import/versions/${vid}/database`, DB);
  t("import: a viewer cannot write", r.s === 403, sh(r));
  r = await call(O.tok, "POST", `/api/import/versions/${vid}/database`, DB);
  t("import: an outsider cannot write", r.s === 403, sh(r));
  r = await call(PAT, "POST", `/api/import/versions/not-an-id/database`, DB);
  t("import: a malformed version id is a 4xx", r.s >= 400 && r.s < 500, sh(r));

  // ---- finalized version: imports go to a working copy ----
  await db.collection("versions").updateOne({ _id: new ObjectId(vid) }, { $set: { version_temporary: false } });
  r = await call(PAT, "POST", `/api/import/versions/${vid}/database`, { ...DB, name: "Shop 2" });
  t("import: into a finalized version writes to a new working copy", r.s === 201 && r.d.data.versionId !== vid, sh(r));

  // ---- revocation ----
  r = await call(A.tok, "DELETE", `/api/tokens/${patId}`);
  t("token: revoke", r.s === 204, sh(r));
  r = await call(PAT, "GET", "/api/projects/myproject");
  t("token: a revoked token stops working at once", r.s === 401, sh(r));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
