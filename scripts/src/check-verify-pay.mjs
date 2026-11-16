import assert from "node:assert/strict";

// API smoke check. Creates a fresh isolated DEMO workspace, never signs in or
// accesses a real business, and does not log cookies or signed upload URLs.
const base = process.env.CHECK_BASE_URL || "http://localhost:80";
let cookie = "";
async function request(path, body, expected = 200, overrideCookie = cookie) {
  const r = await fetch(`${base}/api/vp${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(overrideCookie ? { cookie: overrideCookie } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!cookie && r.headers.get("set-cookie")) cookie = r.headers.get("set-cookie").split(";")[0];
  if (r.status !== expected) {
    const error = await r.json().catch(() => ({}));
    assert.fail(`Unexpected response for ${path.split("?")[0]}: ${r.status}; ${error.error ?? "request failed"}`);
  }
  return r;
}
const json = async (path, body, expected) => (await request(path, body, expected)).json();
const profile = await json("/profile");
assert.equal(profile.isDemo, true);
const summary = await json("/dashboard");
assert.equal(summary.totalRequests, 10);
assert.equal(summary.bankRecordCount, 12);
assert.equal(summary.verifiedPayments, 4);
const payments = await json("/payments");
const pending = payments.find((p) => p.orderId === "ORD-1045");
assert(pending);
const sample = await request(`/sample-receipt.pdf?paymentId=${pending.id}`);
const pdf = Buffer.from(await sample.arrayBuffer());
assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
async function upload(paymentId, bytes, name = "sample-receipt.pdf") {
  const up = await json("/receipts/upload-url", { paymentId, name, size: bytes.length, contentType: "application/pdf" }, 201);
  const put = await fetch(up.uploadURL, { method: "PUT", headers: { "content-type": "application/pdf" }, body: bytes });
  assert(put.ok, "Direct private-storage upload failed.");
  return up.receiptId;
}
const receiptId = await upload(pending.id, pdf);
const extracted = await json(`/receipts/${receiptId}/extract`, {});
const ocrSuccess = extracted.amount === pending.amount && extracted.reference === "KWT900105";
console.log(`Receipt OCR: ${ocrSuccess ? "extracted amount and reference correctly" : "manual correction required"}`);
const correctFields = {
  amount: pending.amount, reference: "KWT900105", transactionDate: pending.createdAt.slice(0, 10),
  sender: pending.customerName, receiver: "Bayt Studio",
};
const verified = await json(`/receipts/${receiptId}/verify`, correctFields);
assert.equal(verified.status, "VERIFIED");
assert(verified.matchedTransaction);
console.log("Imported-record verification and protected file storage: passed");
const storedFile = await request(`/receipts/${receiptId}/file`);
assert.equal(Buffer.from(await storedFile.arrayBuffer()).equals(pdf), true);
const repeat = await json(`/receipts/${receiptId}/verify`, correctFields);
assert.equal(repeat.status, "VERIFIED");
const create = (orderId, amount) => json("/payments", { customerName: "Sample customer", orderId, amount, description: "API smoke check, illustrative only" }, 201);
const duplicateRequest = await create("CHECK-DUPLICATE", pending.amount);
const duplicateReceipt = await upload(duplicateRequest.id, pdf);
const duplicate = await json(`/receipts/${duplicateReceipt}/verify`, correctFields);
assert.equal(duplicate.status, "DUPLICATE");
console.log("Duplicate receipt hash and reused transaction detection: passed");
await request(`/payments/${pending.id}`, undefined, 404, "");
await request(`/receipts/${receiptId}/file`, undefined, 404, "");
console.log("Cross-workspace payment and receipt access blocked: passed");
const sampleCsv = await (await request("/sample-bank.csv")).text();
const imported = await json("/imports", { fileName: "sample.csv", csv: sampleCsv }, 201);
assert.equal(imported.imported, 2);
const reimported = await json("/imports", { fileName: "sample-copy.csv", csv: sampleCsv }, 201);
assert.equal(reimported.duplicates, 2);
assert.equal(reimported.imported, 0);
const invalid = await json("/imports", { fileName: "invalid.csv", csv: "transaction_id,reference,amount,date\nBAD1,BADREF,-5,2026-13-40\n" }, 201);
assert.equal(invalid.rejected, 1);
console.log("CSV import, duplicate rows, and invalid-row rejection: passed");
// Use distinct PDF bytes to ensure the reference/amount rules, not the hash
// detector, are responsible for the following results.
const receiptFor = async (payment, marker) => upload(payment.id, Buffer.concat([pdf, Buffer.from(`\n% ${marker}\n`)]));
const today = new Date().toISOString().slice(0, 10);
const noBank = await create("CHECK-PENDING", 777.123);
const pendingId = await receiptFor(noBank, "pending");
assert.equal((await json(`/receipts/${pendingId}/verify`, { ...correctFields, amount: 777.123, reference: "NOIMPORTEDROW", transactionDate: today })).status, "PENDING");
const mismatchRequest = await create("CHECK-MISMATCH", 25);
const mismatchId = await receiptFor(mismatchRequest, "mismatch");
assert.equal((await json(`/receipts/${mismatchId}/verify`, { ...correctFields, amount: 15, reference: "NOIMPORTEDROW", transactionDate: today })).status, "MISMATCH");
const manualId = await receiptFor(noBank, "manual");
assert.equal((await json(`/receipts/${manualId}/verify`, { ...correctFields, amount: 777.123, reference: "", transactionDate: "" })).status, "MANUAL_REVIEW");
console.log("Pending, amount mismatch, and missing-fields manual-review outcomes: passed");
await request("/payments", { customerName: "Demo", orderId: "BAD-FILS", amount: 1.1234, description: "" }, 400);
const report = await json("/reports");
assert(report.attempts.some((a) => a.id === verified.id));
const csv = await (await request("/export.csv?status=VERIFIED")).text();
assert(csv.includes(pending.orderId));
assert(!csv.includes(noBank.orderId));
assert(csv.includes("DEMO"));
console.log("KWD precision, history persistence, report generation, and filtered CSV export: passed");
console.log(ocrSuccess ? "All API smoke checks passed, including live PDF OCR." : "API smoke checks passed except live OCR; manual extraction fallback was used.");
if (!ocrSuccess) process.exitCode = 2;
