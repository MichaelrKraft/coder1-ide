import { ApifyClient } from 'apify-client'

// Initialize Apify client
export const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
})

// Helper to run an actor and get results (synchronous)
export async function runActor<T>(
  actorId: string,
  input: Record<string, unknown>
): Promise<T[]> {
  try {
    const run = await apifyClient.actor(actorId).call(input)
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    return items as T[]
  } catch (error) {
    console.error(`Error running Apify actor ${actorId}:`, error)
    throw error
  }
}

// Helper to run actor async (webhook callback)
export async function runActorAsync(
  actorId: string,
  input: Record<string, unknown>,
  webhookUrl: string
): Promise<string> {
  try {
    const run = await apifyClient.actor(actorId).start(input, {
      webhooks: [
        {
          eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
          requestUrl: webhookUrl,
        },
      ],
    })
    return run.id
  } catch (error) {
    console.error(`Error starting Apify actor async ${actorId}:`, error)
    throw error
  }
}

// Check actor run status
export async function getRunStatus(runId: string) {
  const run = await apifyClient.run(runId).get()
  return run
}

// Get results from a completed run
export async function getRunResults<T>(datasetId: string): Promise<T[]> {
  const { items } = await apifyClient.dataset(datasetId).listItems()
  return items as T[]
}

// Get results by run ID
export async function getResultsByRunId<T>(runId: string): Promise<T[]> {
  const run = await apifyClient.run(runId).get()
  if (!run?.defaultDatasetId) {
    throw new Error(`No dataset found for run ${runId}`)
  }
  return getRunResults<T>(run.defaultDatasetId)
}
