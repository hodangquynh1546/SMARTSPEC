import { Schema } from "mongoose";

type Listener = (projectId: string) => void;
let listener: Listener | null = null;

/** The WorkHub sync registers itself here at startup; models only know this tiny contract. */
export const setDesignChangedListener = (fn: Listener | null) => { listener = fn; };

const notify = (projectId: unknown) => {
  if (projectId && listener) {
    try { listener(String(projectId)); } catch { /* never break a database write */ }
  }
};

const QUERY_OPS = ["findOneAndUpdate", "findOneAndDelete", "findOneAndReplace", "updateOne", "updateMany", "deleteOne", "deleteMany"] as const;

/**
 * Any change to a design artifact (diagrams, database design, test cases) tells the WorkHub sync, whichever code path
 * wrote it. Query operations that return no document first remember which project the target belongs to.
 */
export function attachDesignHooks(schema: Schema) {
  schema.post("save", function (doc: any) { notify(doc?.project_id); });
  schema.post("insertMany", function (docs: any) { for (const d of Array.isArray(docs) ? docs : [docs]) notify(d?.project_id); });
  schema.pre(QUERY_OPS as any, async function (this: any) {
    try {
      const f = this.getFilter?.() ?? {};
      if (f.project_id) { this._designProject = f.project_id; return; }
      const d = await this.model.findOne(f).select("project_id").lean();
      this._designProject = d?.project_id;
    } catch { /* best effort */ }
  });
  schema.post(QUERY_OPS as any, function (this: any, res: any) {
    notify(res?.project_id ?? this._designProject);
  });
}
