// API smoke test of SmartSpec flows that need no AI. Run against a backend started with MAIL_ENABLED=false
// AUTH_RATE_LIMIT=1000 WORKHUB_ENABLED=false and a throw-away MONGO_URI (database smartspec_e2e): node scripts/api-smoke-diagrams-testcases.cjs
const R = "../node_modules/";
const { MongoClient, ObjectId } = require(R + "mongodb");
const SS = "http://localhost:8000";
let pass = 0, fail = 0;
const t = (n, c, x = "") => { if (c) { pass++; console.log("✓ " + n); } else { fail++; console.log("✗ " + n + (x ? "  → " + x : "")); } };
const call = async (tok, m, p, b) => { const r = await fetch(SS + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const x = await r.text(); let d; try { d = JSON.parse(x) } catch { d = x } return { s: r.status, d }; };
const sh = (r) => `${r.s} ${typeof r.d === "string" ? r.d.slice(0, 90) : JSON.stringify(r.d).slice(0, 190)}`;
(async () => {
  const db = (await MongoClient.connect("mongodb://localhost:27017/smartspec_e2e?directConnection=true")).db();
  const id = Math.random().toString(36).slice(2, 7);
  const reg = async (n) => { const r = await call(null, "POST", "/api/auth/register", { email: `${n}-${id}@example.com`, password: "correct-horse-battery", confirmPassword: "correct-horse-battery" }); return { tok: r.d.data.accessToken, id: r.d.data.sub, email: `${n}-${id}@example.com` }; };
  const A = await reg("own"), V = await reg("view"), O = await reg("out");
  const p = (await call(A.tok, "POST", "/api/projects", { name: "P3", description: "d", language: "vi-VN" })).d.data;
  const pid = p._id, vid = p.current_version;
  await call(A.tok, "POST", `/api/projects/${pid}/members/invite`, { email: V.email, role: "viewer" });
  const tk = JSON.stringify((await call(V.tok, "GET", "/api/projects/me/invites")).d).match(/"invite_token":"([^"]+)"/)?.[1];
  await call(V.tok, "POST", `/api/projects/${pid}/members/${V.id}/accept`, { token: tk });

  // ===== ACTIVITY DIAGRAM (manual) =====
  let r = await call(A.tok, "POST", "/api/activity-diagrams/", { project_id: pid, version_id: vid, name: "Luồng" });
  t("activity: create", r.s === 200 || r.s === 201, sh(r));
  const ad = r.d?.data || r.d; const adId = ad?._id;
  await db.collection("activity_diagrams").updateOne({ _id: new ObjectId(adId) }, { $push: { nodes: { $each: [{ _id: new ObjectId(), type: "action", label: "Bước 1" }, { _id: new ObjectId(), type: "action", label: "Bước 2" }] } } });
  const d1 = await db.collection("activity_diagrams").findOne({ _id: new ObjectId(adId) });
  t("activity: starter start/end plus two seeded nodes", d1.nodes.length === 4, "nodes=" + d1.nodes.length);
  t("activity: the new diagram has a start->end edge with real ids", d1.edges.length >= 1 && d1.nodes.some((n) => String(n._id) === String(d1.edges[0].from)));
  const [n1, n2, n3] = [d1.nodes[0], d1.nodes[2], d1.nodes[3]].map((n) => String(n._id));
  r = await call(A.tok, "POST", `/api/activity-diagrams/${adId}/edges`, { from: n1, to: n2 });
  t("activity: add edge", r.s === 200 || r.s === 201, sh(r));
  await call(A.tok, "POST", `/api/activity-diagrams/${adId}/edges`, { from: n2, to: n3 });
  r = await call(A.tok, "POST", `/api/activity-diagrams/${adId}/edges`, { from: n2, to: "6af000000000000000000000" });
  t("activity: an edge to a node that does not exist is refused", r.s >= 400 && r.s < 500, sh(r));
  r = await call(A.tok, "POST", `/api/activity-diagrams/${adId}/validate`, {});
  t("activity: validate a good diagram", r.s === 200, sh(r));
  r = await call(A.tok, "DELETE", `/api/activity-diagrams/${adId}/nodes/${n2}`);
  t("activity: delete a node", r.s === 200, sh(r));
  const d2 = await db.collection("activity_diagrams").findOne({ _id: new ObjectId(adId) });
  t("activity: deleting a node removes the edges that touched it (no dangling edges)", d2.edges.every((e) => ![String(e.from), String(e.to)].includes(n2)), "edges=" + JSON.stringify(d2.edges.map((e) => [String(e.from).slice(-3), String(e.to).slice(-3)])));
  r = await call(V.tok, "PATCH", `/api/activity-diagrams/${adId}/nodes/${n2}`, { label: "viewer" });
  t("activity: a viewer cannot edit", r.s === 403, sh(r));
  r = await call(O.tok, "GET", `/api/activity-diagrams/${vid}`);
  t("activity: an outsider cannot list diagrams of the project", r.s === 403, sh(r));
  

  // ===== USE CASE DIAGRAM (seeded: generating needs AI) =====
  const act = new ObjectId(), u1 = new ObjectId(), u2 = new ObjectId();
  const ins = await db.collection("usecase_diagrams").insertOne({ project_id: new ObjectId(pid), version_id: new ObjectId(vid), name: "UCD", actors: [{ _id: act, name: "Khách" }], usecases: [{ _id: u1, title: "A" }, { _id: u2, title: "B" }], associations: [{ actor_id: act, usecase_id: u1 }], relationships: [{ source: u1, target: u2, type: "include" }] });
  const ucd = String(ins.insertedId);
  r = await call(A.tok, "GET", `/api/usecase-diagram/versions/${vid}/`);
  t("usecase diagram: list for the version", r.s === 200 && JSON.stringify(r.d).includes("UCD"), sh(r));
  r = await call(A.tok, "POST", `/api/usecase-diagram/${ucd}/actors`, { name: "Quản trị" });
  t("usecase diagram: add actor", r.s === 200 || r.s === 201, sh(r));
  r = await call(A.tok, "DELETE", `/api/usecase-diagram/${ucd}/actors/${act}`);
  t("usecase diagram: delete actor", r.s === 200, sh(r));
  let ud = await db.collection("usecase_diagrams").findOne({ _id: ins.insertedId });
  t("usecase diagram: deleting an actor removes its associations", ud.associations.length === 0, JSON.stringify(ud.associations));
  r = await call(A.tok, "DELETE", `/api/usecase-diagram/${ucd}/usecases/${u2}`);
  ud = await db.collection("usecase_diagrams").findOne({ _id: ins.insertedId });
  t("usecase diagram: deleting a use case removes relationships that touched it", ud.relationships.length === 0, JSON.stringify(ud.relationships));
  r = await call(V.tok, "POST", `/api/usecase-diagram/${ucd}/actors`, { name: "hack" });
  t("usecase diagram: a viewer cannot edit", r.s === 403, sh(r));
  r = await call(O.tok, "GET", `/api/usecase-diagram/${ucd}`);
  t("usecase diagram: an outsider cannot read it", r.s === 403 || r.s === 404, sh(r));

  // ===== TEST CASES: bulk operations =====
  r = await call(A.tok, "POST", `/api/testcases/projects/${pid}/versions/${vid}/testcases`, { testCases: [1, 2, 3].map((i) => ({ title: "TC" + i, test_type: "integration", priority: "medium", steps: [{ step_number: 1, action: "x", expected_immediate_result: "ok" }], source_requirement_ids: [] })) });
  t("testcases: create three", r.s === 200 || r.s === 201, sh(r));
  const tcs = await db.collection("testcases").find({ project_id: new ObjectId(pid) }).toArray();
  const ids = tcs.map((x) => String(x._id));
  t("testcases: three stored", tcs.length === 3, "n=" + tcs.length);
    r = await call(A.tok, "PUT", `/api/testcases/projects/${pid}/testcases/bulk-execute`, { testCaseIds: ids, executionData: { status: "passed", actual_result: "ok" } });
  t("testcases: bulk execute", r.s === 200, sh(r));
  const after = await db.collection("testcases").find({ project_id: new ObjectId(pid) }).toArray();
  t("testcases: all three are now passed", after.every((x) => x.status === "passed"), after.map((x) => x.status).join(","));
  r = await call(A.tok, "PUT", `/api/testcases/projects/${pid}/testcases/bulk-update`, { testCaseIds: ids, updateData: { priority: "high" } });
  t("testcases: bulk update", r.s === 200, sh(r));
  r = await call(A.tok, "GET", `/api/testcases/projects/${pid}/test-statistics`);
  t("testcases: statistics count them", r.s === 200 && JSON.stringify(r.d).includes("3"), sh(r));
  r = await call(V.tok, "DELETE", `/api/testcases/projects/${pid}/testcases/bulk-delete`, { testCaseIds: ids });
  t("testcases: a viewer cannot bulk delete", r.s === 403, sh(r));
  r = await call(O.tok, "GET", `/api/testcases/projects/${pid}/testcases`);
  t("testcases: an outsider cannot list them", r.s === 403, sh(r));
  r = await call(A.tok, "PUT", `/api/testcases/testcases/${ids[0]}/execute`, { status: "exploded" });
  t("testcases: an invalid status is a 4xx", r.s >= 400 && r.s < 500, sh(r));
  for (const f of ["pdf"]) { r = await call(A.tok, "GET", `/api/testcases/projects/${pid}/export-testcases?format=${f}`); t("testcases: export " + f, r.s === 200, sh(r)); }
  r = await call(A.tok, "DELETE", `/api/testcases/projects/${pid}/testcases/bulk-delete`, { testCaseIds: ids });
  t("testcases: bulk delete", r.s === 200, sh(r));
  t("testcases: all removed", (await db.collection("testcases").countDocuments({ project_id: new ObjectId(pid) })) === 0);

  // ===== LOGS =====
  r = await call(A.tok, "GET", `/api/logs/project?project_id=${pid}`);
  t("logs: the owner reads project logs", r.s === 200, sh(r));
  r = await call(O.tok, "GET", `/api/logs/project?project_id=${pid}`);
  t("logs: an outsider cannot read another project's logs", r.s === 403, sh(r));
  r = await call(A.tok, "GET", `/api/logs/system`);
  t("logs: a normal user cannot read system logs", r.s === 403, sh(r));
  r = await call(A.tok, "POST", `/api/logs/retention`, { days: 1 });
  t("logs: a normal user cannot purge logs", r.s === 403, sh(r));
  r = await call(A.tok, "GET", `/api/logs/export?projectId=${pid}`);
  t("logs: export", r.s === 200 || r.s === 403, sh(r));

  // ===== INPUTS =====
  r = await call(O.tok, "DELETE", `/api/input/versions/${vid}/inputs/${new ObjectId()}`);
  t("inputs: an outsider cannot delete inputs", r.s === 403, sh(r));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
