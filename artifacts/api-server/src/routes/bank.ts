import { Router, type IRouter } from "express";
import { db, bankTransactions, bankImports } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { ListBankTransactionsQueryParams, ListBankTransactionsResponse, ListImportsResponse, ImportBankTransactionsBody, ImportBankTransactionsResponse } from "@workspace/api-zod";
import { normalizedReference, isValidDate, toFils } from "../lib/money";
import { Problem } from "../lib/problem";
import { bankJson } from "../lib/serializers";

const router: IRouter = Router();
router.get("/transactions", async (req, res): Promise<void> => {
  const q = ListBankTransactionsQueryParams.parse(req.query);
  let rows = await db.select().from(bankTransactions).where(eq(bankTransactions.businessId, req.businessId)).orderBy(desc(bankTransactions.date));
  if (q.search) { const s = q.search.toLowerCase(); rows = rows.filter((b) => `${b.sender} ${b.reference} ${b.transactionId} ${b.description}`.toLowerCase().includes(s)); }
  res.json(ListBankTransactionsResponse.parse(rows.map(bankJson)));
});
router.get("/imports", async (req, res): Promise<void> => {
  const rows = await db.select().from(bankImports).where(eq(bankImports.businessId, req.businessId)).orderBy(desc(bankImports.createdAt));
  res.json(ListImportsResponse.parse(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))));
});
router.post("/imports", async (req, res): Promise<void> => {
  const body = ImportBankTransactionsBody.parse(req.body);
  let rows: Record<string, string>[];
  try {
    let headers: string[] = [];
    rows = parse(body.csv, { bom: true, columns: (hs: string[]) => {
      headers = hs.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
      if (new Set(headers).size !== headers.length) throw new Error("Duplicate CSV headers.");
      if (!["transaction_id", "reference", "amount", "date"].every((h) => headers.includes(h))) throw new Error("Required CSV headers: transaction_id, reference, amount, date. Optional: description, sender.");
      return headers;
    }, skip_empty_lines: true, trim: true, max_record_size: 10000 });
  } catch (e) { throw new Problem(400, e instanceof Error ? e.message : "Invalid CSV file."); }
  if (rows.length === 0 || rows.length > 5000) throw new Problem(400, "CSV must contain between 1 and 5,000 transaction rows.");
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.businessId}))`);
    let imported = 0, duplicates = 0, rejected = 0;
    const errors: string[] = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      try {
        if (!row.transaction_id?.trim()) throw new Error("Missing transaction ID.");
        if (!/^\d+(\.\d{1,3})?$/.test(row.amount ?? "")) throw new Error("Amount must be positive KWD with up to 3 decimals; no separators or currency symbols.");
        const amountFils = toFils(Number(row.amount));
        if (!isValidDate(row.date ?? "")) throw new Error("Date must be a real date in YYYY-MM-DD format.");
        if ((row.currency ?? "KWD").toUpperCase() !== "KWD") throw new Error("Only KWD credits are supported.");
        if (row.type && !["credit", "incoming", "cr"].includes(row.type.toLowerCase())) throw new Error("Only incoming credit transactions are supported.");
        if (Object.values(row).some((v) => v.length > 1000)) throw new Error("Field exceeds 1,000 characters.");
        const transactionId = normalizedReference(row.transaction_id);
        const reference = normalizedReference(row.reference ?? "");
        if (!transactionId) throw new Error("Transaction ID contains no letters or numbers.");
        const inserted = await tx.insert(bankTransactions).values({
          id: randomUUID(), businessId: req.businessId, transactionId, reference, amountFils,
          date: row.date!, description: row.description ?? "", sender: row.sender ?? "",
        }).onConflictDoNothing().returning({ id: bankTransactions.id });
        if (inserted.length) imported++;
        else { duplicates++; if (errors.length < 100) errors.push(`Row ${index + 2}: duplicate transaction ID or reference skipped.`); }
      } catch (e) { rejected++; if (errors.length < 100) errors.push(`Row ${index + 2}: ${e instanceof Error ? e.message : "Invalid row."}`); }
    }
    const [record] = await tx.insert(bankImports).values({ id: randomUUID(), businessId: req.businessId, fileName: body.fileName, imported, duplicates, rejected, errors }).returning();
    return record!;
  });
  res.status(201).json(ImportBankTransactionsResponse.parse({ ...result, createdAt: result.createdAt.toISOString() }));
});
router.get("/sample-bank.csv", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  res.attachment("verify-pay-bank-template.csv").type("text/csv").send(
    "transaction_id,reference,amount,date,description,sender\r\n" +
    `DEMO700200,KWT900106,150.000,${today},Weekend collection order,Khaled Al-Dosari\r\n` +
    `DEMO700201,KWT900107,45.000,${today},Ceramic coffee set,Sara Al-Hajri\r\n`,
  );
});
export default router;
