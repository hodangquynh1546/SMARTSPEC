import { io } from "../../../socket";

export type WorkhubSyncState = "syncing" | "synced" | "link_required" | "error";

export const workhubSocketService = {
  /** Tells everyone viewing the project how the WorkHub sync is doing. */
  emitSync(projectId: string, state: WorkhubSyncState, detail?: Record<string, unknown>) {
    io?.to(`project_${projectId}`).emit("workhub_event", { type: "WORKHUB_SYNC", projectId, state, ...detail, timestamp: new Date() });
  },
  /** Progress of one use case reported by WorkHub. */
  emitProgress(projectId: string, key: string, implementation: Record<string, unknown>) {
    io?.to(`project_${projectId}`).emit("workhub_event", { type: "WORKHUB_PROGRESS", projectId, key, implementation, timestamp: new Date() });
  },
  /** Bug of a failed test case, as reported by WorkHub. */
  emitBug(projectId: string, key: string, bug: Record<string, unknown>) {
    io?.to(`project_${projectId}`).emit("workhub_event", { type: "WORKHUB_BUG", projectId, key, bug, timestamp: new Date() });
  },
};
