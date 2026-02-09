import { describe, expect, it, vi, afterEach } from "vitest";
import { generateXeroExport } from "../xero";
import { generateQuickBooksExport } from "../quickbooks";
import { generateAutoCountExport } from "../autocount";
import { generateSQLAccountingExport } from "../sqlAccounting";

const baseSession = {
  _id: "session_1",
  name: "Main Session",
} as any;

const baseData = {
  session: baseSession,
  company: { _id: "company_1" } as any,
  matches: [],
  transactions: [],
  accrualDocuments: [],
  suspenseItems: [],
} as any;

describe("accounting exports", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates Xero CSV with matches and pending cash", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_1",
          status: "approved",
          cashTransaction: {
            date: "2024-02-05",
            amount: 150,
            description: "Payment received",
            reference: "REF-001",
          },
          accrualDocument: {
            counterparty: "Acme Corp",
            docNumber: "INV-001",
          },
        },
      ],
      transactions: [
        {
          type: "cash",
          status: "pending",
          date: "2024-02-06",
          amount: -75,
          description: "PAYMENT TO ABC SDN BHD 123",
          reference: "BANK-REF",
        },
      ],
    };

    const result = generateXeroExport(data, {});
    const lines = result.content.split("\n");

    expect(lines[0]).toBe("*Date,*Amount,*Payee,Description,Reference");
    expect(lines[1]).toBe("2024-02-05,150.00,Acme Corp,Payment received,INV-001");
    expect(lines[2]).toBe(
      "2024-02-06,-75.00,ABC SDN BHD,PAYMENT TO ABC SDN BHD 123,BANK-REF"
    );
    expect(result.fileName).toBe("Xero_Bank_Import_Main_Session_2024-02-10.csv");
    expect(result.mimeType).toBe("text/csv");
  });

  it("generates QuickBooks IIF for receipts and payments", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_receipt",
          status: "approved",
          cashTransaction: {
            date: "2024-02-05",
            amount: 200,
            description: "Receipt payment",
          },
        },
        {
          _id: "match_payment",
          status: "approved",
          cashTransaction: {
            date: "2024-02-07",
            amount: -120,
            description: "Vendor payment",
          },
        },
      ],
    };

    const result = generateQuickBooksExport(data, {
      accountCodes: {
        bankAccount: "Bank",
        receivables: "AR",
        payables: "AP",
      },
    });

    const lines = result.content.split("\n");
    expect(lines[0]).toBe("!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO");
    expect(lines[1]).toBe("!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO");
    expect(lines[2]).toBe("!ENDTRNS");

    expect(lines[3]).toContain("GENERAL JOURNAL\t02/05/2024\tBank\t200.00");
    expect(lines[4]).toContain("GENERAL JOURNAL\t02/05/2024\tAR\t-200.00");
    expect(lines[5]).toBe("ENDTRNS");
    expect(lines[6]).toContain("GENERAL JOURNAL\t02/07/2024\tAP\t120.00");
    expect(lines[7]).toContain("GENERAL JOURNAL\t02/07/2024\tBank\t-120.00");
    expect(lines[8]).toBe("ENDTRNS");

    expect(result.fileName).toBe("QuickBooks_Import_Main_Session_2024-02-10.iif");
    expect(result.mimeType).toBe("application/x-iif");
  });

  it("generates AutoCount CSV entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_1",
          status: "approved",
          cashTransaction: {
            date: "2024-02-05",
            amount: 500,
            description: "Receipt payment",
          },
        },
      ],
    };

    const result = generateAutoCountExport(data, {
      accountCodes: {
        bankAccount: "1101",
        receivables: "1201",
      },
    });

    const lines = result.content.split("\n");
    expect(lines[0]).toBe("DocDate,DocNo,AccNo,Description,Dr,Cr");
    expect(lines[1]).toBe("05/02/2024,JV20240001,1101,Receipt payment,500.00,0");
    expect(lines[2]).toBe("05/02/2024,JV20240001,1201,Receipt payment,0,500.00");
    expect(result.fileName).toBe("AutoCount_Import_Main_Session_2024-02-10.csv");
  });

  it("generates SQL Accounting CSV entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_1",
          status: "approved",
          cashTransaction: {
            date: "2024-02-05",
            amount: -250,
            description: "Vendor payment",
          },
        },
      ],
    };

    const result = generateSQLAccountingExport(data, {
      accountCodes: {
        bankAccount: "1102",
        payables: "2102",
      },
    });

    const lines = result.content.split("\n");
    expect(lines[0]).toBe("Date,Doc No,Account,Description,Debit,Credit,Project,Tax");
    expect(lines[1]).toBe("05/02/2024,JV20240001,2102,Vendor payment,250.00,0.00,,");
    expect(lines[2]).toBe("05/02/2024,JV20240001,1102,Vendor payment,0.00,250.00,,");
    expect(result.fileName).toBe("SQL_Accounting_Import_Main_Session_2024-02-10.csv");
  });
});
