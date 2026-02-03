/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  accrualDocuments: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        companyId: Id<"companies">;
        counterparty?: string;
        description?: string;
        docDate: string;
        docNumber?: string;
        docType:
          | "sales_invoice"
          | "purchase_invoice"
          | "pos_report"
          | "settlement"
          | "receipt";
        dueDate?: string;
        extractedText?: string;
        lineItems?: string;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        taxAmount?: number;
      },
      Id<"accrualDocuments">
    >;
    createBulk: FunctionReference<
      "mutation",
      "public",
      {
        documents: Array<{
          amount: number;
          companyId: Id<"companies">;
          counterparty?: string;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType:
            | "sales_invoice"
            | "purchase_invoice"
            | "pos_report"
            | "settlement"
            | "receipt";
          dueDate?: string;
          extractedText?: string;
          lineItems?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          taxAmount?: number;
        }>;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"accrualDocuments"> },
      {
        _creationTime: number;
        _id: Id<"accrualDocuments">;
        amount: number;
        companyId: Id<"companies">;
        counterparty?: string;
        createdAt: number;
        description?: string;
        docDate: string;
        docNumber?: string;
        docType:
          | "sales_invoice"
          | "purchase_invoice"
          | "pos_report"
          | "settlement"
          | "receipt";
        dueDate?: string;
        extractedText?: string;
        lineItems?: string;
        matchCount?: number;
        matchId?: Id<"matchedPairs">;
        matchedTotal?: number;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "partial" | "suspense";
        taxAmount?: number;
      } | null
    >;
    getCounts: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      {
        matched: number;
        partial: number;
        pending: number;
        suspense: number;
        total: number;
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        status?: "pending" | "matched" | "partial" | "suspense";
      },
      Array<{
        _creationTime: number;
        _id: Id<"accrualDocuments">;
        amount: number;
        companyId: Id<"companies">;
        counterparty?: string;
        createdAt: number;
        description?: string;
        docDate: string;
        docNumber?: string;
        docType:
          | "sales_invoice"
          | "purchase_invoice"
          | "pos_report"
          | "settlement"
          | "receipt";
        dueDate?: string;
        extractedText?: string;
        lineItems?: string;
        matchCount?: number;
        matchId?: Id<"matchedPairs">;
        matchedTotal?: number;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "partial" | "suspense";
        taxAmount?: number;
      }>
    >;
    listBySession: FunctionReference<
      "query",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        status?: "pending" | "matched" | "partial" | "suspense";
      },
      Array<{
        _creationTime: number;
        _id: Id<"accrualDocuments">;
        amount: number;
        companyId: Id<"companies">;
        counterparty?: string;
        createdAt: number;
        description?: string;
        docDate: string;
        docNumber?: string;
        docType:
          | "sales_invoice"
          | "purchase_invoice"
          | "pos_report"
          | "settlement"
          | "receipt";
        dueDate?: string;
        extractedText?: string;
        lineItems?: string;
        matchCount?: number;
        matchId?: Id<"matchedPairs">;
        matchedTotal?: number;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "partial" | "suspense";
        taxAmount?: number;
      }>
    >;
    markMatched: FunctionReference<
      "mutation",
      "public",
      { id: Id<"accrualDocuments">; matchId: Id<"matchedPairs"> },
      null
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"accrualDocuments"> },
      null
    >;
    resetToPending: FunctionReference<
      "mutation",
      "public",
      { id: Id<"accrualDocuments"> },
      null
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        amount?: number;
        counterparty?: string;
        description?: string;
        docDate?: string;
        docNumber?: string;
        dueDate?: string;
        id: Id<"accrualDocuments">;
        lineItems?: string;
        matchId?: Id<"matchedPairs">;
        status?: "pending" | "matched" | "partial" | "suspense";
        taxAmount?: number;
      },
      Id<"accrualDocuments">
    >;
  };
  agents: {
    addCredits: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        companyId: Id<"companies">;
        description: string;
        userId: Id<"users">;
      },
      any
    >;
    cancelPendingJobs: FunctionReference<
      "mutation",
      "public",
      {
        columnId?: Id<"worksheetColumns">;
        userId: Id<"users">;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createBatchJobs: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        dataSource: string;
        inputColumnKey?: string;
        maxRows?: number;
        prompt: string;
        userId: Id<"users">;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createJob: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        dataSource: string;
        input: string;
        prompt: string;
        rowId: Id<"worksheetRows">;
        userId: Id<"users">;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    getCreditBalance: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      any
    >;
    getCreditHistory: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; limit?: number },
      any
    >;
    getJobsForWorksheet: FunctionReference<
      "query",
      "public",
      { worksheetId: Id<"worksheets"> },
      any
    >;
    getJobStats: FunctionReference<
      "query",
      "public",
      { worksheetId: Id<"worksheets"> },
      any
    >;
    getPendingJobs: FunctionReference<
      "query",
      "public",
      { worksheetId: Id<"worksheets"> },
      any
    >;
    retryFailedJobs: FunctionReference<
      "mutation",
      "public",
      {
        columnId?: Id<"worksheetColumns">;
        userId: Id<"users">;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
  };
  analytics: {
    getExpenseBreakdown: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        limit?: number;
        periodEnd?: string;
        periodStart?: string;
      },
      Array<{ amount: number; category: string; percentage: number }>
    >;
    getMonthlyCashFlow: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; months?: number },
      Array<{
        inflow: number;
        month: string;
        monthKey: string;
        net: number;
        outflow: number;
      }>
    >;
    getRecentActivity: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; limit?: number },
      Array<{
        amount: number;
        date: string;
        description: string;
        id: Id<"transactions">;
        status: string;
        time: string;
        type: string;
      }>
    >;
    getReconciliationStats: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      {
        matchRate: number;
        matched: number;
        pending: number;
        suspense: number;
        total: number;
      }
    >;
    getTopExpenses: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; limit?: number },
      Array<{
        amount: number;
        category: string;
        date: string;
        description: string;
        id: Id<"transactions">;
      }>
    >;
  };
  categories: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        accountCode?: string;
        companyId?: Id<"companies">;
        keyword: string;
        mainCategory: string;
        subCategory: string;
      },
      Id<"categories">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"categories"> },
      {
        _creationTime: number;
        _id: Id<"categories">;
        accountCode?: string;
        companyId?: Id<"companies">;
        createdAt: number;
        isGlobal: boolean;
        keyword: string;
        mainCategory: string;
        subCategory: string;
      } | null
    >;
    getMainCategories: FunctionReference<
      "query",
      "public",
      { companyId?: Id<"companies"> },
      Array<string>
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      { companyId?: Id<"companies"> },
      Array<{
        _creationTime: number;
        _id: Id<"categories">;
        accountCode?: string;
        companyId?: Id<"companies">;
        createdAt: number;
        isGlobal: boolean;
        keyword: string;
        mainCategory: string;
        subCategory: string;
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"categories"> },
      null
    >;
    searchByKeyword: FunctionReference<
      "query",
      "public",
      { companyId?: Id<"companies">; keyword: string },
      Array<{
        _creationTime: number;
        _id: Id<"categories">;
        accountCode?: string;
        companyId?: Id<"companies">;
        createdAt: number;
        isGlobal: boolean;
        keyword: string;
        mainCategory: string;
        subCategory: string;
      }>
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        accountCode?: string;
        id: Id<"categories">;
        keyword?: string;
        mainCategory?: string;
        subCategory?: string;
      },
      Id<"categories">
    >;
  };
  companies: {
    completeOnboarding: FunctionReference<
      "mutation",
      "public",
      { id: Id<"companies"> },
      Id<"companies">
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        bankAccounts?: Array<{
          accountNumber: string;
          accountType: string;
          bank: string;
          isPrimary: boolean;
        }>;
        bankName?: string;
        currency: string;
        fiscalYearEnd?: string;
        industry?: string;
        industryCategory?: string;
        name: string;
        ownerId?: Id<"users">;
        primaryAccountNumber?: string;
        primaryBank?: string;
        registrationNumber?: string;
        taxNumber?: string;
        taxRegistered?: boolean;
        tradingAs?: string;
        userEmail?: string;
        userName?: string;
        workosUserId?: string;
      },
      { companyId: Id<"companies">; ownerId: Id<"users"> }
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"companies">; workosUserId?: string },
      {
        _creationTime: number;
        _id: Id<"companies">;
        bankAccounts?: Array<{
          accountNumber: string;
          accountType: string;
          bank: string;
          isPrimary: boolean;
        }>;
        bankName?: string;
        code?: string;
        createdAt: number;
        currency: string;
        fiscalYearEnd?: string;
        industry?: string;
        industryCategory?: string;
        isDeleted: boolean;
        name: string;
        onboardingCompleted?: boolean;
        ownerId: Id<"users">;
        primaryAccountNumber?: string;
        primaryBank?: string;
        registrationNumber?: string;
        taxNumber?: string;
        taxRegistered?: boolean;
        tradingAs?: string;
        updatedAt: number;
      } | null
    >;
    getByCode: FunctionReference<
      "query",
      "public",
      { code: string },
      {
        _creationTime: number;
        _id: Id<"companies">;
        bankAccounts?: Array<{
          accountNumber: string;
          accountType: string;
          bank: string;
          isPrimary: boolean;
        }>;
        bankName?: string;
        code?: string;
        createdAt: number;
        currency: string;
        fiscalYearEnd?: string;
        industry?: string;
        industryCategory?: string;
        isDeleted: boolean;
        name: string;
        onboardingCompleted?: boolean;
        ownerId: Id<"users">;
        primaryAccountNumber?: string;
        primaryBank?: string;
        registrationNumber?: string;
        taxNumber?: string;
        taxRegistered?: boolean;
        tradingAs?: string;
        updatedAt: number;
      } | null
    >;
    listByOwner: FunctionReference<
      "query",
      "public",
      { ownerId?: Id<"users">; workosUserId?: string },
      Array<{
        _creationTime: number;
        _id: Id<"companies">;
        bankAccounts?: Array<{
          accountNumber: string;
          accountType: string;
          bank: string;
          isPrimary: boolean;
        }>;
        bankName?: string;
        code?: string;
        createdAt: number;
        currency: string;
        fiscalYearEnd?: string;
        industry?: string;
        industryCategory?: string;
        isDeleted: boolean;
        name: string;
        onboardingCompleted?: boolean;
        ownerId: Id<"users">;
        primaryAccountNumber?: string;
        primaryBank?: string;
        registrationNumber?: string;
        taxNumber?: string;
        taxRegistered?: boolean;
        tradingAs?: string;
        updatedAt: number;
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"companies"> },
      null
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        bankAccounts?: Array<{
          accountNumber: string;
          accountType: string;
          bank: string;
          isPrimary: boolean;
        }>;
        bankName?: string;
        currency?: string;
        fiscalYearEnd?: string;
        id: Id<"companies">;
        industry?: string;
        industryCategory?: string;
        name?: string;
        onboardingCompleted?: boolean;
        primaryAccountNumber?: string;
        primaryBank?: string;
        registrationNumber?: string;
        taxNumber?: string;
        taxRegistered?: boolean;
        tradingAs?: string;
      },
      Id<"companies">
    >;
  };
  documents: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        fileName: string;
        fileSize: number;
        fileType: string;
        storageId?: string;
        storageUrl?: string;
      },
      Id<"documents">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"documents"> },
      {
        _creationTime: number;
        _id: Id<"documents">;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: string;
        storageUrl?: string;
        uploadedAt: number;
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        documentType?: "bank_statement" | "invoice" | "receipt" | "other";
      },
      Array<{
        _creationTime: number;
        _id: Id<"documents">;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: string;
        storageUrl?: string;
        uploadedAt: number;
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"documents"> },
      null
    >;
    updateExtractionStatus: FunctionReference<
      "mutation",
      "public",
      {
        extractedText?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        id: Id<"documents">;
      },
      Id<"documents">
    >;
  };
  errors: {
    clearOldErrors: FunctionReference<
      "mutation",
      "public",
      { daysOld: number },
      any
    >;
    clearResolvedErrors: FunctionReference<"mutation", "public", {}, any>;
    deleteError: FunctionReference<
      "mutation",
      "public",
      { errorId: Id<"errors"> },
      any
    >;
    getError: FunctionReference<
      "query",
      "public",
      { errorId: Id<"errors"> },
      any
    >;
    getErrorStats: FunctionReference<"query", "public", { days?: number }, any>;
    listErrors: FunctionReference<
      "query",
      "public",
      {
        cursor?: string;
        limit?: number;
        search?: string;
        showResolved?: boolean;
        type?:
          | "uncaught"
          | "promise"
          | "boundary"
          | "api"
          | "convex"
          | "manual";
      },
      any
    >;
    logError: FunctionReference<
      "mutation",
      "public",
      {
        componentName?: string;
        message: string;
        metadata?: any;
        stack?: string;
        type: "uncaught" | "promise" | "boundary" | "api" | "convex" | "manual";
        url: string;
        userAgent?: string;
      },
      any
    >;
    resolveError: FunctionReference<
      "mutation",
      "public",
      { errorId: Id<"errors"> },
      any
    >;
    unresolveError: FunctionReference<
      "mutation",
      "public",
      { errorId: Id<"errors"> },
      any
    >;
  };
  exports: {
    index: {
      generateAccountingExport: FunctionReference<
        "action",
        "public",
        {
          options?: {
            accountCodes?: {
              bankAccount?: string;
              expenses?: string;
              payables?: string;
              receivables?: string;
              revenue?: string;
            };
            includeJournalEntries?: boolean;
          };
          sessionId: Id<"reconciliationSessions">;
          software:
            | "sql_accounting"
            | "autocount"
            | "quickbooks_iif"
            | "xero_csv";
        },
        {
          error?: string;
          expiresAt?: number;
          fileName?: string;
          fileUrl?: string;
          success: boolean;
        }
      >;
      generateExport: FunctionReference<
        "action",
        "public",
        {
          format: "xlsx" | "csv";
          options?: {
            includeMatched?: boolean;
            includePending?: boolean;
            includeSuspense?: boolean;
          };
          reportType: "bank_recon" | "client_query" | "transaction_listing";
          sessionId: Id<"reconciliationSessions">;
        },
        {
          error?: string;
          expiresAt?: number;
          fileName?: string;
          fileUrl?: string;
          success: boolean;
        }
      >;
      generatePDFExport: FunctionReference<
        "action",
        "public",
        {
          options?: {
            includeJournal?: boolean;
            includeMatched?: boolean;
            includeSuspense?: boolean;
          };
          reportType: "bank_recon" | "client_query" | "transaction_listing";
          sessionId: Id<"reconciliationSessions">;
        },
        { error?: string; jobId?: string; success: boolean }
      >;
      getPDFJobStatus: FunctionReference<
        "query",
        "public",
        { jobId: string },
        {
          downloadUrl?: string;
          errorMessage?: string;
          fileName?: string;
          status: "pending" | "processing" | "completed" | "failed";
        } | null
      >;
    };
    pdf: {
      generatePDFExport: FunctionReference<
        "action",
        "public",
        {
          options?: {
            includeJournal?: boolean;
            includeMatched?: boolean;
            includeSuspense?: boolean;
          };
          reportType: "bank_recon" | "client_query" | "transaction_listing";
          sessionId: Id<"reconciliationSessions">;
        },
        { error?: string; jobId?: string; success: boolean }
      >;
      getPDFJobStatus: FunctionReference<
        "query",
        "public",
        { jobId: string },
        {
          downloadUrl?: string;
          errorMessage?: string;
          fileName?: string;
          status: "pending" | "processing" | "completed" | "failed";
        } | null
      >;
    };
  };
  extraction: {
    triggerExtraction: FunctionReference<
      "action",
      "public",
      { documentId: Id<"documents"> },
      { jobId: string; success: boolean }
    >;
  };
  import: {
    importAccrualDocuments: FunctionReference<
      "mutation",
      "public",
      {
        records: Array<{
          amount: number;
          counterparty?: string;
          date: string;
          description: string;
          docNumber?: string;
          docType?: string;
          dueDate?: string;
          taxAmount?: number;
        }>;
        sessionId: Id<"reconciliationSessions">;
      },
      {
        error?: string;
        errors: Array<string>;
        imported: number;
        success: boolean;
      }
    >;
    importCashTransactions: FunctionReference<
      "mutation",
      "public",
      {
        records: Array<{
          amount: number;
          category?: string;
          date: string;
          description: string;
          reference?: string;
        }>;
        sessionId: Id<"reconciliationSessions">;
      },
      {
        error?: string;
        errors: Array<string>;
        imported: number;
        success: boolean;
      }
    >;
  };
  matches: {
    approve: FunctionReference<
      "mutation",
      "public",
      { id: Id<"matchedPairs">; reviewerId?: Id<"users"> },
      Id<"matchedPairs">
    >;
    approveHighConfidence: FunctionReference<
      "mutation",
      "public",
      { reviewerId?: Id<"users">; sessionId: Id<"reconciliationSessions"> },
      number
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        accrualDocumentId?: Id<"accrualDocuments">;
        accrualTransactionId?: Id<"transactions">;
        cashTransactionId: Id<"transactions">;
        confidence: "high" | "medium" | "low";
        confidenceScore: number;
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
        matchReason?: string;
        sessionId: Id<"reconciliationSessions">;
      },
      Id<"matchedPairs">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"matchedPairs"> },
      {
        _creationTime: number;
        _id: Id<"matchedPairs">;
        accrualDocument: {
          _creationTime: number;
          _id: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          counterparty?: string;
          createdAt: number;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType:
            | "sales_invoice"
            | "purchase_invoice"
            | "pos_report"
            | "settlement"
            | "receipt";
          dueDate?: string;
          extractedText?: string;
          lineItems?: string;
          matchCount?: number;
          matchId?: Id<"matchedPairs">;
          matchedTotal?: number;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "partial" | "suspense";
          taxAmount?: number;
        } | null;
        accrualDocumentId?: Id<"accrualDocuments">;
        accrualTransaction: {
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        } | null;
        accrualTransactionId?: Id<"transactions">;
        cashTransaction: {
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        } | null;
        cashTransactionId: Id<"transactions">;
        confidence: "high" | "medium" | "low";
        confidenceScore: number;
        createdAt: number;
        isPartialMatch?: boolean;
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
        matchReason?: string;
        matchedAmount?: number;
        reviewedAt?: number;
        reviewedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        status: "pending" | "approved" | "rejected";
      } | null
    >;
    getCandidatesForManualMatch: FunctionReference<
      "query",
      "public",
      {
        amountTolerance?: number;
        cashTransactionId: Id<"transactions">;
        limit?: number;
        searchQuery?: string;
        sessionId: Id<"reconciliationSessions">;
      },
      any
    >;
    getCounts: FunctionReference<
      "query",
      "public",
      { sessionId: Id<"reconciliationSessions"> },
      {
        approved: number;
        highConfidence: number;
        lowConfidence: number;
        mediumConfidence: number;
        pending: number;
        rejected: number;
        total: number;
      } | null
    >;
    listBySession: FunctionReference<
      "query",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        status?: "pending" | "approved" | "rejected";
      },
      Array<{
        _creationTime: number;
        _id: Id<"matchedPairs">;
        accrualDocument: {
          _creationTime: number;
          _id: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          counterparty?: string;
          createdAt: number;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType:
            | "sales_invoice"
            | "purchase_invoice"
            | "pos_report"
            | "settlement"
            | "receipt";
          dueDate?: string;
          extractedText?: string;
          lineItems?: string;
          matchCount?: number;
          matchId?: Id<"matchedPairs">;
          matchedTotal?: number;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "partial" | "suspense";
          taxAmount?: number;
        } | null;
        accrualDocumentId?: Id<"accrualDocuments">;
        accrualTransaction: {
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        } | null;
        accrualTransactionId?: Id<"transactions">;
        cashTransaction: {
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        } | null;
        cashTransactionId: Id<"transactions">;
        confidence: "high" | "medium" | "low";
        confidenceScore: number;
        createdAt: number;
        isPartialMatch?: boolean;
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
        matchReason?: string;
        matchedAmount?: number;
        reviewedAt?: number;
        reviewedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        status: "pending" | "approved" | "rejected";
      }>
    >;
    reject: FunctionReference<
      "mutation",
      "public",
      { id: Id<"matchedPairs">; reviewerId?: Id<"users"> },
      Id<"matchedPairs">
    >;
  };
  matching: {
    engine: {
      previewMatching: FunctionReference<
        "action",
        "public",
        { sessionId: Id<"reconciliationSessions"> },
        any
      >;
      runMatchingEngine: FunctionReference<
        "action",
        "public",
        {
          config?: {
            amountTolerance?: number;
            amountVariancePercent?: number;
            exactDateWindow?: number;
            fuzzyDateWindow?: number;
            minFuzzySimilarity?: number;
            windowDateWindow?: number;
          };
          sessionId: Id<"reconciliationSessions">;
          useLLM?: boolean;
        },
        any
      >;
    };
    index: {
      previewMatching: FunctionReference<
        "action",
        "public",
        { sessionId: Id<"reconciliationSessions"> },
        any
      >;
      runLLMMatching: FunctionReference<
        "action",
        "public",
        {
          accrualItems: Array<{
            amount: number;
            counterparty?: string;
            date: string;
            description?: string;
            docNumber?: string;
            id: string;
          }>;
          cashItems: Array<{
            amount: number;
            date: string;
            description: string;
            id: string;
            reference?: string;
          }>;
          maxItems?: number;
        },
        any
      >;
      runMatchingEngine: FunctionReference<
        "action",
        "public",
        {
          config?: {
            amountTolerance?: number;
            amountVariancePercent?: number;
            exactDateWindow?: number;
            fuzzyDateWindow?: number;
            minFuzzySimilarity?: number;
            windowDateWindow?: number;
          };
          sessionId: Id<"reconciliationSessions">;
          useLLM?: boolean;
        },
        any
      >;
      runMockLLMMatching: FunctionReference<
        "action",
        "public",
        {
          accrualItems: Array<{
            amount: number;
            counterparty?: string;
            date: string;
            description?: string;
            docNumber?: string;
            id: string;
          }>;
          cashItems: Array<{
            amount: number;
            date: string;
            description: string;
            id: string;
            reference?: string;
          }>;
        },
        any
      >;
    };
    llm: {
      runLLMMatching: FunctionReference<
        "action",
        "public",
        {
          accrualItems: Array<{
            amount: number;
            counterparty?: string;
            date: string;
            description?: string;
            docNumber?: string;
            id: string;
          }>;
          cashItems: Array<{
            amount: number;
            date: string;
            description: string;
            id: string;
            reference?: string;
          }>;
          maxItems?: number;
        },
        any
      >;
      runMockLLMMatching: FunctionReference<
        "action",
        "public",
        {
          accrualItems: Array<{
            amount: number;
            counterparty?: string;
            date: string;
            description?: string;
            docNumber?: string;
            id: string;
          }>;
          cashItems: Array<{
            amount: number;
            date: string;
            description: string;
            id: string;
            reference?: string;
          }>;
        },
        any
      >;
    };
  };
  migrations: {
    "001_add_matching_cache": {
      checkMigrationStatus: FunctionReference<
        "query",
        "public",
        {},
        {
          currentVersion: number;
          needsMigration: boolean;
          targetVersion: number;
        }
      >;
      getMigrationInstructions: FunctionReference<
        "query",
        "public",
        {},
        string
      >;
    };
    "002_accrual_document_migration": {
      checkMigrationStatus: FunctionReference<
        "query",
        "public",
        {},
        {
          legacyOnlyPairs: number;
          migratedPairs: number;
          needsMigration: boolean;
          totalPairs: number;
        }
      >;
      cleanupLegacyFields: FunctionReference<
        "mutation",
        "public",
        { batchSize?: number; dryRun?: boolean },
        { cleaned: number; dryRun: boolean; remaining: number }
      >;
      migrateMatchedPairs: FunctionReference<
        "mutation",
        "public",
        { batchSize?: number },
        {
          complete: boolean;
          errors: number;
          migrated: number;
          skipped: number;
          total: number;
        }
      >;
      rollbackMigration: FunctionReference<
        "mutation",
        "public",
        { batchSize?: number },
        { remaining: number; rolledBack: number }
      >;
    };
  };
  onboarding: {
    deleteProgress: FunctionReference<
      "mutation",
      "public",
      { userId: string },
      any
    >;
    getProgress: FunctionReference<"query", "public", { userId: string }, any>;
    markCompleted: FunctionReference<
      "mutation",
      "public",
      { userId: string },
      any
    >;
    saveProgress: FunctionReference<
      "mutation",
      "public",
      {
        currentStep: number;
        data: {
          companyName?: string;
          fiscalYearEnd?: string;
          industryCategory?: string;
          primaryBank?: string;
          taxNumber?: string;
          taxRegistered?: string;
        };
        isCompleted?: boolean;
        userId: string;
      },
      any
    >;
  };
  sessions: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        createdBy?: Id<"users">;
        name: string;
        periodEnd?: string;
        periodStart?: string;
      },
      Id<"reconciliationSessions">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"reconciliationSessions"> },
      {
        _creationTime: number;
        _id: Id<"reconciliationSessions">;
        companyId: Id<"companies">;
        completedAt?: number;
        createdAt: number;
        createdBy: Id<"users">;
        matchedCount: number;
        name: string;
        periodEnd?: string;
        periodStart?: string;
        progress: number;
        status: "draft" | "processing" | "review" | "completed";
        suspenseCount: number;
        totalAccrualTransactions: number;
        totalCashTransactions: number;
      } | null
    >;
    getWithStats: FunctionReference<
      "query",
      "public",
      { id: Id<"reconciliationSessions"> },
      {
        _creationTime: number;
        _id: Id<"reconciliationSessions">;
        companyId: Id<"companies">;
        completedAt?: number;
        createdAt: number;
        createdBy: Id<"users">;
        matchedCount: number;
        name: string;
        periodEnd?: string;
        periodStart?: string;
        progress: number;
        stats: {
          accrualTransactions: number;
          approvedMatches: number;
          cashTransactions: number;
          pendingMatches: number;
          rejectedMatches: number;
          suspenseAccrual: number;
          suspenseCash: number;
          totalMatches: number;
          unmatchedAccrual: number;
          unmatchedCash: number;
        };
        status: "draft" | "processing" | "review" | "completed";
        suspenseCount: number;
        totalAccrualTransactions: number;
        totalCashTransactions: number;
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        status?: "draft" | "processing" | "review" | "completed";
      },
      Array<{
        _creationTime: number;
        _id: Id<"reconciliationSessions">;
        companyId: Id<"companies">;
        completedAt?: number;
        createdAt: number;
        createdBy: Id<"users">;
        matchedCount: number;
        name: string;
        periodEnd?: string;
        periodStart?: string;
        progress: number;
        status: "draft" | "processing" | "review" | "completed";
        suspenseCount: number;
        totalAccrualTransactions: number;
        totalCashTransactions: number;
      }>
    >;
    previewMatching: FunctionReference<
      "action",
      "public",
      { sessionId: Id<"reconciliationSessions"> },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"reconciliationSessions"> },
      null
    >;
    runMatching: FunctionReference<
      "action",
      "public",
      { sessionId: Id<"reconciliationSessions">; useLLM?: boolean },
      any
    >;
    updateProgress: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"reconciliationSessions">;
        matchedCount?: number;
        progress: number;
        suspenseCount?: number;
      },
      Id<"reconciliationSessions">
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"reconciliationSessions">;
        status: "draft" | "processing" | "review" | "completed";
      },
      Id<"reconciliationSessions">
    >;
  };
  settings: {
    deleteAccount: FunctionReference<"mutation", "public", {}, any>;
    exportUserData: FunctionReference<"mutation", "public", {}, any>;
    getUserPreferences: FunctionReference<"query", "public", {}, any>;
  };
  suspenseItems: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        companyId: Id<"companies">;
        description: string;
        reason: string;
        sessionId: Id<"reconciliationSessions">;
        sourceId: Id<"transactions"> | Id<"accrualDocuments">;
        sourceType: "cash" | "accrual";
        suggestedAction: string;
        transactionDate: string;
      },
      Id<"suspenseItems">
    >;
    createBulk: FunctionReference<
      "mutation",
      "public",
      {
        items: Array<{
          amount: number;
          companyId: Id<"companies">;
          description: string;
          reason: string;
          sessionId: Id<"reconciliationSessions">;
          sourceId: Id<"transactions"> | Id<"accrualDocuments">;
          sourceType: "cash" | "accrual";
          suggestedAction: string;
          transactionDate: string;
        }>;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"suspenseItems"> },
      {
        _creationTime: number;
        _id: Id<"suspenseItems">;
        amount: number;
        companyId: Id<"companies">;
        createdAt: number;
        description: string;
        reason: string;
        resolutionNotes?: string;
        resolvedAt?: number;
        resolvedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        sourceId: Id<"transactions"> | Id<"accrualDocuments">;
        sourceType: "cash" | "accrual";
        status: "open" | "queried" | "resolved";
        suggestedAction: string;
        transactionDate: string;
      } | null
    >;
    getCounts: FunctionReference<
      "query",
      "public",
      { sessionId: Id<"reconciliationSessions"> },
      {
        open: number;
        queried: number;
        resolved: number;
        total: number;
        totalAmount: number;
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; status?: "open" | "queried" | "resolved" },
      Array<{
        _creationTime: number;
        _id: Id<"suspenseItems">;
        amount: number;
        companyId: Id<"companies">;
        createdAt: number;
        description: string;
        reason: string;
        resolutionNotes?: string;
        resolvedAt?: number;
        resolvedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        sourceId: Id<"transactions"> | Id<"accrualDocuments">;
        sourceType: "cash" | "accrual";
        status: "open" | "queried" | "resolved";
        suggestedAction: string;
        transactionDate: string;
      }>
    >;
    listBySession: FunctionReference<
      "query",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        status?: "open" | "queried" | "resolved";
      },
      Array<{
        _creationTime: number;
        _id: Id<"suspenseItems">;
        amount: number;
        companyId: Id<"companies">;
        createdAt: number;
        description: string;
        reason: string;
        resolutionNotes?: string;
        resolvedAt?: number;
        resolvedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        sourceId: Id<"transactions"> | Id<"accrualDocuments">;
        sourceType: "cash" | "accrual";
        status: "open" | "queried" | "resolved";
        suggestedAction: string;
        transactionDate: string;
      }>
    >;
    markQueried: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suspenseItems"> },
      Id<"suspenseItems">
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suspenseItems"> },
      null
    >;
    reopen: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suspenseItems"> },
      Id<"suspenseItems">
    >;
    resolve: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"suspenseItems">;
        resolutionNotes: string;
        resolvedBy?: Id<"users">;
      },
      Id<"suspenseItems">
    >;
  };
  transactions: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        category?: string;
        companyId: Id<"companies">;
        date: string;
        description: string;
        reference?: string;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        type: "cash" | "accrual";
      },
      Id<"transactions">
    >;
    createBulk: FunctionReference<
      "mutation",
      "public",
      {
        transactions: Array<{
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          date: string;
          description: string;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          type: "cash" | "accrual";
        }>;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"transactions"> },
      {
        _creationTime: number;
        _id: Id<"transactions">;
        amount: number;
        category?: string;
        companyId: Id<"companies">;
        createdAt: number;
        date: string;
        description: string;
        matchId?: Id<"matchedPairs">;
        reference?: string;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "suspense";
        type: "cash" | "accrual";
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        limit?: number;
        status?: "pending" | "matched" | "suspense";
        type?: "cash" | "accrual";
      },
      Array<{
        _creationTime: number;
        _id: Id<"transactions">;
        amount: number;
        category?: string;
        companyId: Id<"companies">;
        createdAt: number;
        date: string;
        description: string;
        matchId?: Id<"matchedPairs">;
        reference?: string;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "suspense";
        type: "cash" | "accrual";
      }>
    >;
    listBySession: FunctionReference<
      "query",
      "public",
      { sessionId: Id<"reconciliationSessions">; type?: "cash" | "accrual" },
      Array<{
        _creationTime: number;
        _id: Id<"transactions">;
        amount: number;
        category?: string;
        companyId: Id<"companies">;
        createdAt: number;
        date: string;
        description: string;
        matchId?: Id<"matchedPairs">;
        reference?: string;
        sessionId?: Id<"reconciliationSessions">;
        sourceDocumentId?: Id<"documents">;
        status: "pending" | "matched" | "suspense";
        type: "cash" | "accrual";
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"transactions"> },
      null
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"transactions">;
        matchId?: Id<"matchedPairs">;
        status: "pending" | "matched" | "suspense";
      },
      Id<"transactions">
    >;
  };
  users: {
    create: FunctionReference<
      "mutation",
      "public",
      { avatarUrl?: string; email: string; name?: string; workosId?: string },
      Id<"users">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"users"> },
      {
        _creationTime: number;
        _id: Id<"users">;
        avatarUrl?: string;
        createdAt: number;
        email: string;
        name?: string;
        workosId?: string;
      } | null
    >;
    getByEmail: FunctionReference<
      "query",
      "public",
      { email: string },
      {
        _creationTime: number;
        _id: Id<"users">;
        avatarUrl?: string;
        createdAt: number;
        email: string;
        name?: string;
        workosId?: string;
      } | null
    >;
    getByWorkosId: FunctionReference<
      "query",
      "public",
      { workosId: string },
      {
        _creationTime: number;
        _id: Id<"users">;
        avatarUrl?: string;
        createdAt: number;
        email: string;
        name?: string;
        workosId?: string;
      } | null
    >;
    getCurrentUser: FunctionReference<
      "query",
      "public",
      {},
      {
        _creationTime: number;
        _id: Id<"users">;
        avatarUrl?: string;
        createdAt: number;
        email: string;
        name?: string;
        workosId?: string;
      } | null
    >;
    update: FunctionReference<
      "mutation",
      "public",
      { avatarUrl?: string; id: Id<"users">; name?: string },
      Id<"users">
    >;
  };
  worksheetChat: {
    addMessage: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        metadata?: {
          referencedCells?: Array<{ columnKey: string; rowNumber: number }>;
          toolCalls?: Array<{ name: string; result?: string }>;
        };
        role: "user" | "assistant";
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    clearHistory: FunctionReference<
      "mutation",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    getMessages: FunctionReference<
      "query",
      "public",
      { limit?: number; workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    getRecentMessages: FunctionReference<
      "query",
      "public",
      { limit?: number; workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
  };
  workspaces: {
    addColumn: FunctionReference<
      "mutation",
      "public",
      {
        columnType: "text" | "number" | "formula";
        dataSource?: string;
        formula?: string;
        inputColumnId?: Id<"worksheetColumns">;
        name: string;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    addRow: FunctionReference<
      "mutation",
      "public",
      {
        cells?: Record<string, any>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    addRows: FunctionReference<
      "mutation",
      "public",
      {
        rowsData: Array<Record<string, any>>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createWorksheet: FunctionReference<
      "mutation",
      "public",
      { name: string; workosUserId?: string; workspaceId: Id<"workspaces"> },
      any
    >;
    createWorkspace: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        description?: string;
        name: string;
        workosUserId?: string;
      },
      any
    >;
    deleteColumn: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        permanent?: boolean;
        workosUserId?: string;
      },
      any
    >;
    deleteRow: FunctionReference<
      "mutation",
      "public",
      {
        permanent?: boolean;
        rowId: Id<"worksheetRows">;
        workosUserId?: string;
      },
      any
    >;
    deleteRows: FunctionReference<
      "mutation",
      "public",
      {
        permanent?: boolean;
        rowIds: Array<Id<"worksheetRows">>;
        workosUserId?: string;
      },
      any
    >;
    deleteWorksheet: FunctionReference<
      "mutation",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    deleteWorkspace: FunctionReference<
      "mutation",
      "public",
      { workosUserId?: string; workspaceId: Id<"workspaces"> },
      any
    >;
    emptyTrash: FunctionReference<
      "mutation",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    getCellStatuses: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    getDeletedItems: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    getWorksheetData: FunctionReference<
      "query",
      "public",
      {
        includeDeleted?: boolean;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    getWorkspace: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; workspaceId: Id<"workspaces"> },
      any
    >;
    getWorkspaceWithWorksheets: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; workspaceId: Id<"workspaces"> },
      any
    >;
    listWorkspaces: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      any
    >;
    reorderColumns: FunctionReference<
      "mutation",
      "public",
      {
        columnIds: Array<Id<"worksheetColumns">>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    restoreColumn: FunctionReference<
      "mutation",
      "public",
      { columnId: Id<"worksheetColumns">; workosUserId?: string },
      any
    >;
    restoreRow: FunctionReference<
      "mutation",
      "public",
      { rowId: Id<"worksheetRows">; workosUserId?: string },
      any
    >;
    restoreRows: FunctionReference<
      "mutation",
      "public",
      { rowIds: Array<Id<"worksheetRows">>; workosUserId?: string },
      any
    >;
    updateCell: FunctionReference<
      "mutation",
      "public",
      {
        columnKey: string;
        expectedVersion?: number;
        rowId: Id<"worksheetRows">;
        value: any;
        workosUserId?: string;
      },
      any
    >;
    updateColumn: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        formula?: string;
        inputColumnId?: Id<"worksheetColumns"> | null;
        name?: string;
        workosUserId?: string;
      },
      any
    >;
    updateColumnWidth: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        width: number;
        workosUserId?: string;
      },
      any
    >;
    updateWorkspace: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        name?: string;
        workosUserId?: string;
        workspaceId: Id<"workspaces">;
      },
      any
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  agents: {
    deductCredits: FunctionReference<
      "mutation",
      "internal",
      {
        amount: number;
        companyId: Id<"companies">;
        description: string;
        jobId: Id<"agentJobs">;
      },
      any
    >;
    getNextBatch: FunctionReference<
      "query",
      "internal",
      { limit: number },
      any
    >;
    handleJobResult: FunctionReference<
      "mutation",
      "internal",
      {
        error?: string;
        jobId: string;
        result?: string;
        status: "completed" | "failed";
      },
      any
    >;
    markJobRunning: FunctionReference<
      "mutation",
      "internal",
      { jobId: Id<"agentJobs"> },
      any
    >;
    processJobs: FunctionReference<"action", "internal", any, any>;
    resetJobForRetry: FunctionReference<
      "mutation",
      "internal",
      { error: string; jobId: Id<"agentJobs">; retryCount: number },
      any
    >;
  };
  auth: {
    authKitAction: FunctionReference<
      "mutation",
      "internal",
      { action: Record<string, any> },
      Record<string, any>
    >;
    authKitEvent: FunctionReference<
      "mutation",
      "internal",
      { data: Record<string, any>; event: string },
      null
    >;
  };
  categories: {
    seedGlobalCategories: FunctionReference<
      "mutation",
      "internal",
      {},
      { count: number; message: string }
    >;
  };
  documents: {
    getPendingExtraction: FunctionReference<
      "query",
      "internal",
      {},
      Array<{
        _creationTime: number;
        _id: Id<"documents">;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: string;
        storageUrl?: string;
        uploadedAt: number;
      }>
    >;
  };
  errors: {
    scheduledCleanup: FunctionReference<"mutation", "internal", {}, any>;
  };
  exports: {
    index: {
      getExportData: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        any
      >;
      verifySessionAccess: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        {
          authorized: boolean;
          error: string | null;
          userId: Id<"users"> | null;
        }
      >;
    };
    pdf: {
      createPDFJob: FunctionReference<
        "mutation",
        "internal",
        {
          reportType: "bank_recon" | "client_query" | "transaction_listing";
          sessionId: Id<"reconciliationSessions">;
          userId: Id<"users">;
        },
        string
      >;
      handlePDFResults: FunctionReference<
        "mutation",
        "internal",
        {
          downloadUrl?: string;
          errorMessage?: string;
          fileName?: string;
          jobId: string;
          status: "pending" | "processing" | "completed" | "failed";
        },
        any
      >;
    };
  };
  extraction: {
    getDocument: FunctionReference<
      "query",
      "internal",
      { documentId: Id<"documents"> },
      {
        _creationTime: number;
        _id: Id<"documents">;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: string;
        storageUrl?: string;
        uploadedAt: number;
      } | null
    >;
    handleExtractionResults: FunctionReference<
      "mutation",
      "internal",
      {
        accrualDocument?: {
          amount: number;
          counterparty?: string;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType: string;
          dueDate?: string;
          lineItems?: string;
          taxAmount?: number;
        };
        bankType?: string;
        companyId: string;
        documentId: string;
        errorMessage?: string;
        extractedText?: string;
        extractionConfidence?: number;
        jobId: string;
        periodEnd?: string;
        periodStart?: string;
        status: string;
        transactionCount?: number;
        transactions?: Array<{
          amount: number;
          date: string;
          description: string;
          reference?: string;
        }>;
      },
      null
    >;
    updateDocumentJobId: FunctionReference<
      "mutation",
      "internal",
      { documentId: Id<"documents">; jobId: string },
      null
    >;
    updateDocumentStatus: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        errorMessage?: string;
        status: "pending" | "processing" | "completed" | "failed";
      },
      null
    >;
  };
  import: {
    getCompany: FunctionReference<
      "query",
      "internal",
      { companyId: Id<"companies"> },
      any
    >;
    getSession: FunctionReference<
      "query",
      "internal",
      { sessionId: Id<"reconciliationSessions"> },
      any
    >;
  };
  matching: {
    engine: {
      createMatchedPair: FunctionReference<
        "mutation",
        "internal",
        {
          accrualDocumentId: Id<"accrualDocuments">;
          cashTransactionId: Id<"transactions">;
          confidenceScore: number;
          matchLayer: 1 | 2 | 3 | 4 | 5;
          matchReason: string;
          sessionId: Id<"reconciliationSessions">;
        },
        Id<"matchedPairs">
      >;
      createSuspenseItem: FunctionReference<
        "mutation",
        "internal",
        {
          accrualDocId?: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          description: string;
          sessionId: Id<"reconciliationSessions">;
          sourceType: "cash" | "accrual";
          transactionDate: string;
          transactionId?: Id<"transactions">;
        },
        Id<"suspenseItems">
      >;
      getSessionWithCompany: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        {
          company: {
            _creationTime: number;
            _id: Id<"companies">;
            bankAccounts?: Array<{
              accountNumber: string;
              accountType: string;
              bank: string;
              isPrimary: boolean;
            }>;
            bankName?: string;
            code?: string;
            createdAt: number;
            currency: string;
            fiscalYearEnd?: string;
            industry?: string;
            industryCategory?: string;
            isDeleted: boolean;
            name: string;
            onboardingCompleted?: boolean;
            ownerId: Id<"users">;
            primaryAccountNumber?: string;
            primaryBank?: string;
            registrationNumber?: string;
            taxNumber?: string;
            taxRegistered?: boolean;
            tradingAs?: string;
            updatedAt: number;
          } | null;
          session: {
            _creationTime: number;
            _id: Id<"reconciliationSessions">;
            companyId: Id<"companies">;
            completedAt?: number;
            createdAt: number;
            createdBy: Id<"users">;
            matchedCount: number;
            name: string;
            periodEnd?: string;
            periodStart?: string;
            progress: number;
            status: "draft" | "processing" | "review" | "completed";
            suspenseCount: number;
            totalAccrualTransactions: number;
            totalCashTransactions: number;
          };
        } | null
      >;
      getUnmatchedAccrualDocuments: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        Array<{
          _creationTime: number;
          _id: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          counterparty?: string;
          createdAt: number;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType:
            | "sales_invoice"
            | "purchase_invoice"
            | "pos_report"
            | "settlement"
            | "receipt";
          dueDate?: string;
          extractedText?: string;
          lineItems?: string;
          matchCount?: number;
          matchId?: Id<"matchedPairs">;
          matchedTotal?: number;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "partial" | "suspense";
          taxAmount?: number;
        }>
      >;
      getUnmatchedCashTransactions: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        Array<{
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        }>
      >;
      updateSessionStats: FunctionReference<
        "mutation",
        "internal",
        {
          matchedCount?: number;
          progress?: number;
          sessionId: Id<"reconciliationSessions">;
          status?: "draft" | "processing" | "review" | "completed";
          suspenseCount?: number;
        },
        null
      >;
    };
    index: {
      createMatchedPair: FunctionReference<
        "mutation",
        "internal",
        {
          accrualDocumentId: Id<"accrualDocuments">;
          cashTransactionId: Id<"transactions">;
          confidenceScore: number;
          matchLayer: 1 | 2 | 3 | 4 | 5;
          matchReason: string;
          sessionId: Id<"reconciliationSessions">;
        },
        Id<"matchedPairs">
      >;
      createSuspenseItem: FunctionReference<
        "mutation",
        "internal",
        {
          accrualDocId?: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          description: string;
          sessionId: Id<"reconciliationSessions">;
          sourceType: "cash" | "accrual";
          transactionDate: string;
          transactionId?: Id<"transactions">;
        },
        Id<"suspenseItems">
      >;
      getSessionWithCompany: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        {
          company: {
            _creationTime: number;
            _id: Id<"companies">;
            bankAccounts?: Array<{
              accountNumber: string;
              accountType: string;
              bank: string;
              isPrimary: boolean;
            }>;
            bankName?: string;
            code?: string;
            createdAt: number;
            currency: string;
            fiscalYearEnd?: string;
            industry?: string;
            industryCategory?: string;
            isDeleted: boolean;
            name: string;
            onboardingCompleted?: boolean;
            ownerId: Id<"users">;
            primaryAccountNumber?: string;
            primaryBank?: string;
            registrationNumber?: string;
            taxNumber?: string;
            taxRegistered?: boolean;
            tradingAs?: string;
            updatedAt: number;
          } | null;
          session: {
            _creationTime: number;
            _id: Id<"reconciliationSessions">;
            companyId: Id<"companies">;
            completedAt?: number;
            createdAt: number;
            createdBy: Id<"users">;
            matchedCount: number;
            name: string;
            periodEnd?: string;
            periodStart?: string;
            progress: number;
            status: "draft" | "processing" | "review" | "completed";
            suspenseCount: number;
            totalAccrualTransactions: number;
            totalCashTransactions: number;
          };
        } | null
      >;
      getUnmatchedAccrualDocuments: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        Array<{
          _creationTime: number;
          _id: Id<"accrualDocuments">;
          amount: number;
          companyId: Id<"companies">;
          counterparty?: string;
          createdAt: number;
          description?: string;
          docDate: string;
          docNumber?: string;
          docType:
            | "sales_invoice"
            | "purchase_invoice"
            | "pos_report"
            | "settlement"
            | "receipt";
          dueDate?: string;
          extractedText?: string;
          lineItems?: string;
          matchCount?: number;
          matchId?: Id<"matchedPairs">;
          matchedTotal?: number;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "partial" | "suspense";
          taxAmount?: number;
        }>
      >;
      getUnmatchedCashTransactions: FunctionReference<
        "query",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        Array<{
          _creationTime: number;
          _id: Id<"transactions">;
          amount: number;
          category?: string;
          companyId: Id<"companies">;
          createdAt: number;
          date: string;
          description: string;
          matchId?: Id<"matchedPairs">;
          reference?: string;
          sessionId?: Id<"reconciliationSessions">;
          sourceDocumentId?: Id<"documents">;
          status: "pending" | "matched" | "suspense";
          type: "cash" | "accrual";
        }>
      >;
      updateSessionStats: FunctionReference<
        "mutation",
        "internal",
        {
          matchedCount?: number;
          progress?: number;
          sessionId: Id<"reconciliationSessions">;
          status?: "draft" | "processing" | "review" | "completed";
          suspenseCount?: number;
        },
        null
      >;
    };
  };
  workspaces: {
    updateCellStatus: FunctionReference<
      "mutation",
      "internal",
      {
        columnKey: string;
        error?: string;
        rowId: Id<"worksheetRows">;
        status: "idle" | "pending" | "running" | "complete" | "error";
        value?: any;
      },
      any
    >;
  };
};

export declare const components: {
  workOSAuthKit: {
    lib: {
      enqueueWebhookEvent: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey: string;
          event: string;
          eventId: string;
          eventTypes?: Array<string>;
          logLevel?: "DEBUG";
          onEventHandle?: string;
          updatedAt?: string;
        },
        any
      >;
      getAuthUser: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: string;
          email: string;
          emailVerified: boolean;
          externalId?: null | string;
          firstName?: null | string;
          id: string;
          lastName?: null | string;
          lastSignInAt?: null | string;
          locale?: null | string;
          metadata: Record<string, any>;
          profilePictureUrl?: null | string;
          updatedAt: string;
        } | null
      >;
    };
  };
};
