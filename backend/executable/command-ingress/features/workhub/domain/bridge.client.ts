import env from "../../../utils/env";

export class BridgeError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    Object.setPrototypeOf(this, BridgeError.prototype); // tsconfig target thấp: instanceof sẽ sai nếu thiếu dòng này
  }
}

/** Server-to-server client for ForgeBridge (the sync service between SmartSpec and WorkHub). */
export class BridgeClient {
  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(env.BRIDGE_URL.replace(/\/$/, "") + path, {
        method,
        headers: { "X-Bridge-Key": env.BRIDGE_SECRET, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e: any) {
      throw new BridgeError(503, "BRIDGE_UNAVAILABLE", `Không kết nối được ForgeBridge: ${e?.message ?? e}`);
    }
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
    if (!res.ok) throw new BridgeError(res.status, data?.code ?? `HTTP_${res.status}`, data?.message ?? text.slice(0, 200));
    return data as T;
  }

  userStatus(ssUserId: string) {
    return this.call<{ linked: boolean; email?: string; fullName?: string }>("GET", `/v1/users/${ssUserId}`);
  }

  linkUser(ssUserId: string, input: { email: string; password: string; register?: boolean; fullName?: string }) {
    return this.call<{ email: string; fullName: string; registered: boolean }>("POST", `/v1/users/${ssUserId}/link`, input);
  }

  projectStatus(ssProjectId: string) {
    return this.call<any>("GET", `/v1/projects/${ssProjectId}`);
  }

  changeStatus(ssProjectId: string, key: string, status: string, actorSsUserId: string) {
    return this.call<any>("POST", `/v1/projects/${ssProjectId}/items/${encodeURIComponent(key)}/status`, { status, actorSsUserId });
  }

  recreate(ssProjectId: string, key: string) {
    return this.call<any>("POST", `/v1/projects/${ssProjectId}/items/${encodeURIComponent(key)}/recreate`);
  }

  reportTestcase(payload: unknown) {
    return this.call<any>("POST", "/v1/testcases/report", payload);
  }

  reconcile(ssProjectId: string) {
    return this.call<{ changed: number }>("POST", `/v1/projects/${ssProjectId}/reconcile`);
  }

  sync(payload: unknown) {
    return this.call<any>("POST", "/v1/sync", payload);
  }
}

export const bridgeClient = new BridgeClient();
