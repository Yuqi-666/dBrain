import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as createPortProbe } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * How the PDF viewer reads an attachment.
 *
 * Two things are pinned here, and they are the two ways the original problem
 * came back:
 *
 * 1. **The options the viewer passes to pdfjs.** By default pdf.js asks for the
 *    whole body in one request and keeps reading it for as long as the node is
 *    open — it only uses byte ranges when streaming is off. On the library's own
 *    136 MiB / 603-page scan against a range-capable server, the default pulled
 *    130.7 MiB within four seconds; `disableStream` plus `disableAutoFetch`
 *    pulled 0.3 MiB and still had page 1 in about 100 ms.
 * 2. **That those options still do that.** pdf.js is a dependency: a version
 *    that changes what the flags mean must fail here rather than silently make
 *    a large node slow to open again.
 *
 * The fixture is a valid 3 MiB PDF with one page and one unreferenced stream, so
 * "the whole body" and "what the first page needs" are unmistakably different.
 * It is served by a range-capable server, which is what PocketBase was measured
 * to be (`Accept-Ranges: bytes`, `206` with `Content-Range`).
 */

const PDFJS = pathToFileURL(
  fileURLToPath(
    new URL("../../packages/ui/node_modules/pdfjs-dist/legacy/build/pdf.mjs", import.meta.url),
  ),
).href;
const VIEWER_SOURCE = fileURLToPath(
  new URL("../../packages/ui/src/components/pdf-viewer/use-pdf-document.ts", import.meta.url),
);

const pdfjs = await import(PDFJS);

/** A one-page PDF whose second stream is `padding` bytes of filler. */
function buildPdf(padding) {
  const latin = (text) => Buffer.from(text, "latin1");
  const content = latin("0 0 m\n");
  const filler = Buffer.alloc(padding, 0x41);
  const objects = [
    latin("<< /Type /Catalog /Pages 2 0 R >>"),
    latin("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    latin(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>",
    ),
    Buffer.concat([
      latin(`<< /Length ${content.length} >>\nstream\n`),
      content,
      latin("endstream"),
    ]),
    Buffer.concat([
      latin(`<< /Length ${filler.length} >>\nstream\n`),
      filler,
      latin("\nendstream"),
    ]),
  ];

  let pdf = latin("%PDF-1.7\n");
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, latin(`${index + 1} 0 obj\n`), body, latin("\nendobj\n")]);
  });
  const startxref = pdf.length;
  let xref = latin(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets) {
    xref = Buffer.concat([xref, latin(`${String(offset).padStart(10, "0")} 00000 n \n`)]);
  }
  return Buffer.concat([
    pdf,
    xref,
    latin(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`,
    ),
  ]);
}

const FIXTURE = buildPdf(3 * 1024 * 1024);

/** A free loopback port, so several of these can run side by side. */
async function freePort() {
  return new Promise((resolve) => {
    const probe = createPortProbe();
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

/** Serves `body` with `Accept-Ranges`, honouring a single byte range. */
async function serve(body) {
  const port = await freePort();
  const server = createServer((req, res) => {
    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : body.length - 1;
      res.writeHead(206, {
        "content-type": "application/pdf",
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${body.length}`,
        "content-length": String(end - start + 1),
      });
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, {
      "content-type": "application/pdf",
      "accept-ranges": "bytes",
      "content-length": String(body.length),
    });
    res.end(body);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${port}/fixture.pdf`, close: () => server.close() };
}

/**
 * Opens the fixture with `options`, holds the page open for `holdMs` (a browser
 * keeps the node open) and reports how many bytes pdf.js pulled.
 */
async function readBytes(url, options, holdMs) {
  const realFetch = globalThis.fetch;
  const stats = { bytes: 0 };
  globalThis.fetch = async (input, init) => {
    const response = await realFetch(input, init);
    if (!response.body) return response;
    const counted = response.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          stats.bytes += chunk.byteLength;
          controller.enqueue(chunk);
        },
      }),
    );
    return new Response(counted, { status: response.status, headers: response.headers });
  };

  let doc;
  try {
    doc = await pdfjs.getDocument({ url, ...options }).promise;
    await doc.getPage(1);
    await new Promise((resolve) => setTimeout(resolve, holdMs));
    return { bytes: stats.bytes, pages: doc.numPages };
  } finally {
    await doc?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 150));
    globalThis.fetch = realFetch;
  }
}

test("the viewer opens a pdf on demand, not by streaming it whole", async () => {
  const { url, close } = await serve(FIXTURE);
  try {
    // A quarter of a second is long enough for the whole fixture on loopback.
    const streamed = await readBytes(url, {}, 250);
    const onDemand = await readBytes(
      url,
      { disableStream: true, disableAutoFetch: true },
      250,
    );

    assert.equal(streamed.pages, 1);
    assert.equal(onDemand.pages, 1);
    console.log(
      `[pdf] file=${(FIXTURE.length / 1024).toFixed(0)}KiB streamed=${(streamed.bytes / 1024).toFixed(0)}KiB onDemand=${(onDemand.bytes / 1024).toFixed(0)}KiB`,
    );
    assert.ok(
      streamed.bytes > FIXTURE.length * 0.7,
      `the default should have streamed the file: ${streamed.bytes} of ${FIXTURE.length}`,
    );
    assert.ok(
      onDemand.bytes < FIXTURE.length * 0.4,
      `on demand should have read a fraction: ${onDemand.bytes} of ${FIXTURE.length}`,
    );
  } finally {
    close();
  }
});

test("the viewer keeps asking pdfjs for on-demand reads", () => {
  const source = readFileSync(VIEWER_SOURCE, "utf8");
  const call = /getDocument\(\{[\s\S]*?\n\s*\}\);/.exec(source)?.[0];
  assert.ok(call, "use-pdf-document.ts no longer calls getDocument with an options object");
  assert.match(call, /disableStream:\s*true/);
  assert.match(call, /disableAutoFetch:\s*true/);
  // Ranges must stay enabled: with `disableRange` pdf.js cannot read on demand.
  assert.doesNotMatch(call, /disableRange:\s*true/);
  // A CID-keyed font with a predefined CMap renders blank without the CMap
  // data, and a non-embedded font needs pdf.js's own standard-font files.
  assert.match(call, /cMapUrl:\s*"\/pdfjs\/cmaps\/"/);
  assert.match(call, /standardFontDataUrl:\s*"\/pdfjs\/standard_fonts\/"/);
});
