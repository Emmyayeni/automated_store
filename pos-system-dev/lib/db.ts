import { drizzle } from "drizzle-orm/neon-http"
import { neon, neonConfig } from "@neondatabase/serverless"
import { config } from "dotenv"
import { promises as dns } from "node:dns"
import https from "node:https"

config({ path: ".env" }) // or .env.local

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

async function fetchThroughIpv4(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url)
  const requestHeaders = new Headers(
    input instanceof Request ? input.headers : init?.headers,
  )
  const body =
    input instanceof Request
      ? await input.arrayBuffer()
      : typeof init?.body === "string"
        ? Buffer.from(init.body)
        : init?.body instanceof Uint8Array
          ? Buffer.from(init.body)
          : undefined
  const addresses = await dns.resolve4(requestUrl.hostname)
  let lastError: unknown

  for (const address of addresses) {
    try {
      const response = await new Promise<Response>((resolve, reject) => {
        const request = https.request(
          {
            hostname: address,
            port: requestUrl.port || 443,
            path: `${requestUrl.pathname}${requestUrl.search}`,
            method: init?.method || (input instanceof Request ? input.method : "GET"),
            headers: Object.fromEntries(requestHeaders.entries()),
            servername: requestUrl.hostname,
          },
          (upstream) => {
            const chunks: Buffer[] = []
            upstream.on("data", (chunk: Buffer) => chunks.push(chunk))
            upstream.on("end", () => {
              resolve(
                new Response(Buffer.concat(chunks), {
                  status: upstream.statusCode,
                  statusText: upstream.statusMessage,
                  headers: upstream.headers as Record<string, string>,
                }),
              )
            })
            upstream.on("error", reject)
          },
        )

        request.on("error", reject)
        if (body) request.write(body)
        request.end()
      })

      return response
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Unable to connect to database host ${requestUrl.hostname}`)
}

neonConfig.fetchFunction = fetchThroughIpv4

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql)

// For legacy compatibility - migrate to use db instead
export { sql }