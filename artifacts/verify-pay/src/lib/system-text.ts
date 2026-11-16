// Translate deterministic verification explanations while preserving imported
// references, amounts, names, and the original audit trail in the database.
const arabic: Record<string, string> = {
  "Imported bank record": "السجل البنكي المستورد",
  "Expected amount": "المبلغ المتوقع",
  "Bank amount": "مبلغ الحركة البنكية",
  "Transaction date": "تاريخ الحركة",
  "Duplicate protection": "منع إعادة الاستخدام",
  "Receipt amount is missing.": "مبلغ الإيصال غير متوفر.",
  "Waiting for a uniquely referenced imported record.": "بانتظار سجل مستورد ذي مرجع مطابق وفريد.",
  "No uniquely referenced bank record found.": "لم يُعثر على سجل بنكي ذي مرجع مطابق وفريد.",
  "Ambiguous reference: multiple records match.": "المرجع غير حاسم: توجد عدة سجلات مطابقة.",
  "A valid date is required for automatic matching.": "يلزم تاريخ صحيح للمطابقة التلقائية.",
  "Receipt date is in the future.": "تاريخ الإيصال في المستقبل.",
  "Receipt date substantially predates this request.": "تاريخ الإيصال أقدم بكثير من تاريخ هذا الطلب.",
  "No bank date to compare.": "لا يوجد تاريخ حركة بنكية للمقارنة.",
  "Identical receipt bytes were uploaded for another payment.": "سبق رفع الملف نفسه لطلب دفع آخر.",
  "The referenced bank transaction is already assigned to another payment.": "الحركة البنكية المشار إليها مرتبطة بطلب دفع آخر.",
  "No reused receipt or transaction found.": "لم يُعثر على إيصال أو حركة سبق استخدامها.",
  "This receipt file was already used for another payment request.": "سبق استخدام ملف الإيصال هذا لطلب دفع آخر.",
  "This bank transaction is already matched to a different payment request.": "سبق ربط هذه الحركة البنكية بطلب دفع آخر.",
  "The receipt amount does not equal the payment request amount.": "مبلغ الإيصال لا يساوي المبلغ المطلوب.",
  "The receipt amount differs from the imported transaction amount.": "مبلغ الإيصال يختلف عن مبلغ الحركة البنكية المستوردة.",
  "The transaction date falls outside the permitted matching window.": "تاريخ الحركة خارج الفترة المسموح بها للمطابقة.",
  "Insufficient or ambiguous transaction details. Review the receipt and imported bank records; amount alone is not enough.": "تفاصيل الحركة غير كافية أو غير حاسمة. راجع الإيصال والسجلات البنكية المستوردة؛ المبلغ وحده لا يكفي.",
  "A similar amount/date exists, but its reference does not match. It has not been verified.": "توجد حركة بمبلغ وتاريخ مشابهين، لكن المرجع غير مطابق. لم يتم التحقق من الدفع.",
  "No matching imported transaction found yet. Import newer bank records and try again.": "لم يُعثر بعد على حركة مستوردة مطابقة. استورد سجلات بنكية أحدث ثم أعد المحاولة.",
  "Matched to records in your imported bank file only. This does not authenticate the receipt or independently confirm bank settlement.": "تمت المطابقة مع سجلات الملف البنكي المستورد فقط. هذا لا يثبت أصالة الإيصال ولا يؤكد التسوية البنكية بشكل مستقل.",
  "Illustrative demo receipt. No real payment is represented.": "إيصال تجريبي توضيحي، ولا يمثل دفعة حقيقية.",
};
export function systemText(value: string, lang: string): string {
  if (lang !== "ar") return value;
  if (arabic[value]) return arabic[value];
  const reference = value.match(/^Reference matches imported transaction (.+)\.$/);
  if (reference) return `المرجع مطابق للحركة المستوردة ${reference[1]}.`;
  const amounts = value.match(/^Expected (.+) KWD; receipt (.+) KWD\.$/);
  if (amounts) return `المتوقع ${amounts[1]} د.ك؛ مبلغ الإيصال ${amounts[2]} د.ك.`;
  const bank = value.match(/^Imported amount (.+) KWD\.$/);
  if (bank) return `المبلغ المستورد ${bank[1]} د.ك.`;
  const days = value.match(/^Receipt and imported bank dates are (.+) day\(s\) apart; allowed window is 3 days\.$/);
  if (days) return `الفارق بين تاريخ الإيصال والحركة المستوردة ${days[1]} يوم؛ الفترة المسموح بها ٣ أيام.`;
  return value;
}
