import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { inflateRawSync } from "node:zlib";

const [url, output, zipHash, memberName, binaryHash] = process.argv.slice(2);

if (
  !url ||
  !output ||
  !/^[a-f0-9]{64}$/i.test(zipHash || "") ||
  !memberName ||
  !/^[a-f0-9]{64}$/i.test(binaryHash || "")
) {
  console.error(
    "Usage: node download.mjs URL OUTPUT ZIP_SHA256 MEMBER BINARY_SHA256",
  );
  process.exit(2);
}

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          Accept: "application/octet-stream",
          "User-Agent": "axonhub-infrlo-launcher",
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location && redirects < 10) {
          response.resume();
          resolve(download(new URL(location, url).toString(), redirects + 1));
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`HTTP ${status} while downloading ${url}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );

    request.setTimeout(60000, () => {
      request.destroy(new Error("Download timed out"));
    });
    request.on("error", reject);
  });
}

function extractMember(archive, wantedName) {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const minimumEocdOffset = Math.max(0, archive.length - 0xffff - 22);
  let eocdOffset = -1;

  for (let offset = archive.length - 22; offset >= minimumEocdOffset; offset--) {
    if (archive.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("ZIP end-of-central-directory record not found");
  }

  const entries = archive.readUInt16LE(eocdOffset + 10);
  let offset = archive.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entries; index++) {
    if (archive.readUInt32LE(offset) !== centralSignature) {
      throw new Error(`Invalid ZIP central-directory entry ${index}`);
    }

    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString("utf8", offset + 46, offset + 46 + nameLength);

    if (name === wantedName) {
      if (archive.readUInt32LE(localOffset) !== localSignature) {
        throw new Error(`Invalid ZIP local header for ${name}`);
      }

      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(
        dataOffset,
        dataOffset + compressedSize,
      );

      let data;
      if (method === 0) {
        data = compressed;
      } else if (method === 8) {
        data = inflateRawSync(compressed);
      } else {
        throw new Error(`Unsupported ZIP compression method ${method}`);
      }

      if (data.length !== uncompressedSize) {
        throw new Error(
          `ZIP size mismatch for ${name}: expected ${uncompressedSize}, received ${data.length}`,
        );
      }

      return data;
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`ZIP entry ${wantedName} not found`);
}

async function main() {
  console.log(`GET ${url}`);
  const archive = await download(url);
  const actualZipHash = createHash("sha256").update(archive).digest("hex");

  if (actualZipHash.toLowerCase() !== zipHash.toLowerCase()) {
    throw new Error(
      `ZIP SHA-256 mismatch: expected ${zipHash}, received ${actualZipHash}`,
    );
  }

  const binary = extractMember(archive, memberName);
  const actualBinaryHash = createHash("sha256").update(binary).digest("hex");

  if (actualBinaryHash.toLowerCase() !== binaryHash.toLowerCase()) {
    throw new Error(
      `Binary SHA-256 mismatch: expected ${binaryHash}, received ${actualBinaryHash}`,
    );
  }

  writeFileSync(output, binary, { mode: 0o755 });
  console.log(`Verified ZIP and extracted ${memberName}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
