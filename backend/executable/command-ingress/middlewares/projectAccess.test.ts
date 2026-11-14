import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const OWNER = "507f1f77bcf86cd799439011";
const EDITOR = "507f1f77bcf86cd799439012";
const VIEWER = "507f1f77bcf86cd799439013";
const STRANGER = "507f1f77bcf86cd799439014";
const PROJECT_ID = "607f1f77bcf86cd799439021";
const DB_ID = "707f1f77bcf86cd799439031";

const chain = (value: unknown) => ({
  select: () => ({ lean: async () => value }),
});

const project = {
  _id: PROJECT_ID,
  owner_id: OWNER,
  members: [
    { user_id: EDITOR, role: "editor", status: "accepted" },
    { user_id: VIEWER, role: "viewer", status: "accepted" },
    { user_id: STRANGER, role: "editor", status: "pending" },
  ],
};

jest.mock("../../../internal/model/project", () => ({
  __esModule: true,
  default: { findById: (id: string) => chain(id === PROJECT_ID ? project : null) },
}));
jest.mock("../../../internal/model/database", () => ({
  __esModule: true,
  default: { findById: (id: string) => chain(id === DB_ID ? { project_id: PROJECT_ID } : null) },
}));
for (const m of ["version", "testcase", "usecase", "activity_diagram", "sequence_diagram", "usecase_diagram"]) {
  jest.mock(`../../../internal/model/${m}`, () => ({
    __esModule: true,
    default: { findById: () => chain(null) },
  }));
}

import express from "express";
import http from "http";
import { guardProjectResources } from "./projectAccess";

const buildServer = (userId: string) => {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use((req: any, _res, next) => {
    req.getSubject = () => userId;
    next();
  });
  guardProjectResources(router, ["databaseId"]);
  router.get("/:databaseId", (_req, res) => res.json({ ok: true }));
  router.delete("/:databaseId", (_req, res) => res.json({ ok: true }));
  router.post("/:databaseId/export-sql", (_req, res) => res.json({ ok: true }));
  app.use("/db", router);
  return http.createServer(app);
};

const call = (userId: string, method: string, path: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = buildServer(userId).listen(0, () => {
      const { port } = server.address() as any;
      const req = http.request({ port, method, path }, (res) => {
        res.resume();
        server.close(() => resolve(res.statusCode!));
      });
      req.on("error", reject);
      req.end();
    });
  });

describe("guardProjectResources", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cho phép owner và editor", async () => {
    expect(await call(OWNER, "DELETE", `/db/${DB_ID}`)).toBe(200);
    expect(await call(EDITOR, "DELETE", `/db/${DB_ID}`)).toBe(200);
  });

  it("chặn người ngoài dự án và thành viên chưa accept", async () => {
    expect(await call("507f1f77bcf86cd799439099", "GET", `/db/${DB_ID}`)).toBe(403);
    expect(await call(STRANGER, "GET", `/db/${DB_ID}`)).toBe(403);
  });

  it("viewer chỉ được đọc/xuất, không được ghi", async () => {
    expect(await call(VIEWER, "GET", `/db/${DB_ID}`)).toBe(200);
    expect(await call(VIEWER, "POST", `/db/${DB_ID}/export-sql`)).toBe(200);
    expect(await call(VIEWER, "DELETE", `/db/${DB_ID}`)).toBe(403);
  });

  it("tài nguyên không tồn tại hoặc id sai định dạng thì để service xử lý", async () => {
    expect(await call(STRANGER, "GET", "/db/807f1f77bcf86cd799439099")).toBe(200);
    expect(await call(STRANGER, "GET", "/db/not-an-id")).toBe(200);
  });
});
