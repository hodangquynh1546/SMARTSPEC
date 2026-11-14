import { activityDiagram, databaseDocument, erdDiagram, sequenceDiagram, slug, srsDocument, testPlanDocument, useCaseDiagram } from "./design.export";

const oid = (n: number) => `id${n}`;

describe("design export → Markdown/Mermaid", () => {
  it("use case diagram links actors to use cases and draws include/extend", () => {
    const out = useCaseDiagram({
      actors: [{ _id: oid(1), name: "Khách" }],
      usecases: [{ _id: oid(2), title: "Đăng nhập" }, { _id: oid(3), title: "Gửi OTP" }],
      associations: [{ actor_id: oid(1), usecase_id: oid(2) }],
      relationships: [{ source: oid(2), target: oid(3), type: "include" }],
    });
    expect(out).toContain("flowchart LR");
    expect(out).toContain("A0 --- U0");
    expect(out).toContain('U0 -.->|"«include»"| U1');
  });

  it("activity diagram groups nodes into swimlanes and labels decisions", () => {
    const out = activityDiagram({
      lanes: [{ _id: "lane1", name: "Hệ thống" }],
      nodes: [{ _id: "a", type: "start" }, { _id: "b", type: "decision", label: "Hợp lệ?", lane_id: "lane1" }, { _id: "c", type: "end" }],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c", condition: "Có" }],
    });
    expect(out).toContain('subgraph L0["Hệ thống"]');
    expect(out).toContain('N1{"Hợp lệ?"}');
    expect(out).toContain('N1 -->|"Có"| N2');
  });

  it("sequence diagram orders messages and nests alt/else/loop", () => {
    const out = sequenceDiagram({
      lifelines: [{ _id: "u", name: "Khách" }, { _id: "s", name: "Server" }],
      fragments: [
        { _id: "f1", type: "alt", guard_condition: "OTP đúng" },
        { _id: "f2", type: "else", guard_condition: "OTP sai", parent_fragment_id: "f1" },
        { _id: "f3", type: "loop", guard_condition: "3 lần", parent_fragment_id: "f2" },
      ],
      messages: [
        { order: 2, source_lifeline_id: "s", target_lifeline_id: "u", type: "reply", content: "ok", fragment_id: "f1" },
        { order: 1, source_lifeline_id: "u", target_lifeline_id: "s", type: "sync", content: "login()" },
        { order: 3, source_lifeline_id: "s", target_lifeline_id: "u", type: "reply", content: "lỗi", fragment_id: "f2" },
        { order: 4, source_lifeline_id: "u", target_lifeline_id: "s", type: "async", content: "thử lại", fragment_id: "f3" },
      ],
    });
    const lines = out.split("\n").map((l) => l.trim());
    expect(lines.indexOf("P0->>P1: login()")).toBeLessThan(lines.indexOf("alt OTP đúng"));
    expect(lines).toContain("else OTP sai");
    expect(lines.filter((l) => l === "end").length).toBe(2); // alt block + loop block
    expect(out).toContain("P0-)P1: thử lại");
    expect(lines.indexOf("loop 3 lần")).toBeGreaterThan(lines.indexOf("else OTP sai"));
  });

  it("ERD maps relationship types and keys", () => {
    const out = erdDiagram({
      tables: [{ name: "users", columns: [{ name: "id", type: "uuid", is_primary_key: true }] }, { name: "orders", columns: [{ name: "user_id", type: "uuid", is_foreign_key: true }] }],
      relationships: [{ from_table: "users", to_table: "orders", type: "one-to-many", name: "đặt" }],
    });
    expect(out).toContain("uuid id PK");
    expect(out).toContain("uuid user_id FK");
    expect(out).toContain('users ||--o{ orders : "đặt"');
  });

  it("database document has ERD, dictionary and DDL", () => {
    const doc = databaseDocument({ name: "Shop", tables: [{ name: "users", columns: [{ name: "id", type: "uuid", is_primary_key: true, nullable: false }] }], relationships: [] }, new Map());
    expect(doc).toContain("## Sơ đồ ERD");
    expect(doc).toContain("| id | uuid | ✔ |");
    expect(doc).toMatch(/CREATE TABLE/i);
  });

  it("database document is deterministic (no timestamps)", () => {
    const db = { name: "Shop", tables: [{ name: "users", columns: [{ name: "id", type: "uuid", is_primary_key: true }] }], relationships: [] };
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const a = databaseDocument(db, new Map());
    jest.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    const b = databaseDocument(db, new Map());
    jest.useRealTimers();
    expect(a).toBe(b);
    expect(a).not.toMatch(/Generated:/);
  });

  it("SRS groups use cases by module; test plan summarises results", () => {
    const srs = srsDocument("Shop", "1.2", [{ name: "Đăng nhập", context: { module: "Tài khoản" }, goal: "g", main_flow: [{ step: 1, actor: "K", action: "nhập", expected_result: "ok" }] }]);
    expect(srs).toContain("## Module: Tài khoản");
    expect(srs).toContain("1. K: nhập → ok");
    const plan = testPlanDocument("Shop", [{ title: "t1", status: "passed" }, { title: "t2", status: "failed", bug: { issue_key: "SH-9" } }], new Map());
    expect(plan).toContain("đạt **1** (50%)");
    expect(plan).toContain("SH-9");
  });

  it("labels are sanitised for Mermaid and slugs are stable", () => {
    const out = activityDiagram({ nodes: [{ _id: "a", type: "action", label: 'Gửi "mail"\n<b>' }], edges: [] });
    expect(out).toContain('N0["Gửi  mail  b"]');
    expect(slug("Kịch bản Thanh toán!")).toBe("kich-ban-thanh-toan");
  });
});
