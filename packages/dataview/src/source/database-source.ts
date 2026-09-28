/**
 * `database` host adapter: a database node already is a normalized table, so
 * this is close to the identity function. It exists anyway so hosts never
 * construct a `DataViewSource` by hand (README §4.2).
 */
import type { DatabaseContent, DataViewSource } from "@workspace/interfaces";

export function databaseToDataViewSource(
  content: DatabaseContent | undefined,
  nodeId?: string,
): DataViewSource {
  return {
    kind: "database",
    nodeId,
    fields: content?.fields ?? [],
    rows: content?.rows ?? [],
  };
}
