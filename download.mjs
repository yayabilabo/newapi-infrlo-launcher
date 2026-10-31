import { createHash } from "node:crypto";
import { createWriteStream, unlinkSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";

const [url, output, expectedHash] = process.argv.slice(2);

if (!url || !output || !/^[a-f0-9]{64}$/i.test(expectedHash || "")) {
  console.error("Usage: node download.mjs URL OUTPUT SHA256");
  process.exit(2);
}

function open(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          Accept: "application/octet-stream",
          "User-Agent": "newapi-infrlo-launcher",
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location && redirects < 10) {
          response.resume();
          resolve(open(new URL(location, url).toString(), redirects + 1));
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`HTTP ${status} while downloading ${url}`));
          return;
        }

        resolve(response);
      },
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error("Download timed out"));
    });
    request.on("error", reject);
  });
}

async function main() {
  console.log(`GET ${url}`);
  const response = await open(url);
  const hash = createHash("sha256");
  response.on("data", (chunk) => hash.update(chunk));
  await pipeline(response, createWriteStream(output, { mode: 0o755 }));

  const actualHash = hash.digest("hex");
  if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error(
      `SHA-256 mismatch: expected ${expectedHash}, received ${actualHash}`,
    );
  }

  console.log(`SHA-256 verified: ${actualHash}`);
}

try {
  await main();
} catch (error) {
  try {
    unlinkSync(output);
  } catch {}
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
