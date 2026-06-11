import { pathToFileURL } from "node:url";

import { syncKnowledgeBase } from "../runtime/knowledge";

export async function runKnowledgeSyncJob() {
  const result = await syncKnowledgeBase();

  return {
    job: "knowledge-sync",
    ...result,
  } as const;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runKnowledgeSyncJob()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
