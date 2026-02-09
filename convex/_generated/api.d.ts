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
        workosUserId?: string;
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
        workosUserId?: string;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"accrualDocuments">; workosUserId?: string },
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
    getBySourceDocument: FunctionReference<
      "query",
      "public",
      { sourceDocumentId: Id<"documents">; workosUserId?: string },
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
      { companyId: Id<"companies">; workosUserId?: string },
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
        workosUserId?: string;
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
        workosUserId?: string;
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
      {
        id: Id<"accrualDocuments">;
        matchId: Id<"matchedPairs">;
        workosUserId?: string;
      },
      null
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"accrualDocuments">; workosUserId?: string },
      null
    >;
    resetToPending: FunctionReference<
      "mutation",
      "public",
      { id: Id<"accrualDocuments">; workosUserId?: string },
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
        workosUserId?: string;
      },
      Id<"accrualDocuments">
    >;
  };
  agentEngine: {
    getFindingsForReconciliation: FunctionReference<
      "query",
      "public",
      {
        reconciliationSessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      any
    >;
    getFindingsForSession: FunctionReference<
      "query",
      "public",
      { agentSessionId: Id<"agentSessions">; workosUserId?: string },
      any
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
  agentSession: {
    addDocuments: FunctionReference<
      "mutation",
      "public",
      {
        documentIds: Array<Id<"documents">>;
        sessionId: Id<"agentSessions">;
        workosUserId?: string;
      },
      null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        documentIds: Array<Id<"documents">>;
        workosUserId?: string;
      },
      Id<"agentSessions">
    >;
    dismiss: FunctionReference<
      "mutation",
      "public",
      { sessionId: Id<"agentSessions">; workosUserId?: string },
      null
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"agentSessions">; workosUserId?: string },
      any
    >;
    getActiveForCompany: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      any
    >;
    getForReconciliation: FunctionReference<
      "query",
      "public",
      {
        reconciliationSessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      any
    >;
    getTokenUsageStats: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; limit?: number; workosUserId?: string },
      any
    >;
    proceed: FunctionReference<
      "action",
      "public",
      { sessionId: Id<"agentSessions">; workosUserId?: string },
      { reconciliationSessionId: Id<"reconciliationSessions"> }
    >;
    removeDocuments: FunctionReference<
      "mutation",
      "public",
      {
        documentIds: Array<Id<"documents">>;
        sessionId: Id<"agentSessions">;
        workosUserId?: string;
      },
      null
    >;
    respondToFinding: FunctionReference<
      "mutation",
      "public",
      {
        findingId: Id<"agentFindings">;
        status: "acknowledged" | "resolved" | "dismissed";
        userResponse?: string;
        workosUserId?: string;
      },
      null
    >;
    setAllLanesSelection: FunctionReference<
      "mutation",
      "public",
      {
        mode: "all" | "primary_only";
        sessionId: Id<"agentSessions">;
        workosUserId?: string;
      },
      null
    >;
    toggleLaneSelection: FunctionReference<
      "mutation",
      "public",
      {
        isSelected: boolean;
        laneIndex: number;
        sessionId: Id<"agentSessions">;
        workosUserId?: string;
      },
      null
    >;
    triggerReanalysis: FunctionReference<
      "action",
      "public",
      { sessionId: Id<"agentSessions">; workosUserId?: string },
      null
    >;
    updateStep: FunctionReference<
      "mutation",
      "public",
      {
        sessionId: Id<"agentSessions">;
        step: "upload" | "analyze" | "validate" | "proceed";
        workosUserId?: string;
      },
      null
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
        workosUserId?: string;
      },
      Array<{ amount: number; category: string; percentage: number }>
    >;
    getMonthlyCashFlow: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; months?: number; workosUserId?: string },
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
      { companyId: Id<"companies">; limit?: number; workosUserId?: string },
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
      { companyId: Id<"companies">; workosUserId?: string },
      {
        matchRate: number;
        matched: number;
        pending: number;
        suspense: number;
        total: number;
        totalCashIn: number;
        totalCashOut: number;
      }
    >;
    getTopExpenses: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; limit?: number; workosUserId?: string },
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
  cloudinaryExtraction: {
    triggerCloudinaryExtraction: FunctionReference<
      "action",
      "public",
      { documentId: Id<"documents">; force?: boolean; workosUserId?: string },
      { jobId: string; message?: string; success: boolean }
    >;
  };
  companies: {
    completeOnboarding: FunctionReference<
      "mutation",
      "public",
      { id: Id<"companies">; workosUserId?: string },
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
      { id: Id<"companies">; workosUserId?: string },
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
        workosUserId?: string;
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
        contentType: string;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        fileName: string;
        fileSize: number;
        fileType: string;
        storageId: Id<"_storage">;
        workosUserId?: string;
      },
      Id<"documents">
    >;
    generateUploadUrl: FunctionReference<
      "mutation",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      string
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"documents">; workosUserId?: string },
      {
        _creationTime: number;
        _id: Id<"documents">;
        accountHolderName?: string;
        accountNumber?: string;
        aiBasisType?: "cash" | "accrual";
        aiClassification?: string;
        aiClassificationConfidence?: number;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedCompanyName?: string;
        extractedCounterparties?: Array<string>;
        extractedCurrency?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionPhase?:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        extractionProgress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: Id<"_storage">;
        uploadAnalysisId?: Id<"uploadAnalyses">;
        uploadedAt: number;
      } | null
    >;
    listByCompany: FunctionReference<
      "query",
      "public",
      {
        companyId: Id<"companies">;
        documentType?: "bank_statement" | "invoice" | "receipt" | "other";
        workosUserId?: string;
      },
      Array<{
        _creationTime: number;
        _id: Id<"documents">;
        accountHolderName?: string;
        accountNumber?: string;
        aiBasisType?: "cash" | "accrual";
        aiClassification?: string;
        aiClassificationConfidence?: number;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedCompanyName?: string;
        extractedCounterparties?: Array<string>;
        extractedCurrency?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionPhase?:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        extractionProgress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: Id<"_storage">;
        uploadAnalysisId?: Id<"uploadAnalyses">;
        uploadedAt: number;
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"documents">; workosUserId?: string },
      null
    >;
    resetExtraction: FunctionReference<
      "mutation",
      "public",
      { id: Id<"documents">; workosUserId?: string },
      boolean
    >;
    updateExtractionStatus: FunctionReference<
      "mutation",
      "public",
      {
        extractedText?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        id: Id<"documents">;
        workosUserId?: string;
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
        { error?: string; jobId?: string; success: boolean }
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
        { error?: string; jobId?: string; success: boolean }
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
      getExportJobStatus: FunctionReference<
        "query",
        "public",
        { jobId: string },
        {
          downloadUrl?: string;
          errorMessage?: string;
          fileName?: string;
          status: "processing" | "completed" | "failed";
        } | null
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
      retryPDFExport: FunctionReference<
        "action",
        "public",
        { jobId: string },
        { error?: string; jobId?: string; success: boolean }
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
      retryPDFExport: FunctionReference<
        "action",
        "public",
        { jobId: string },
        { error?: string; jobId?: string; success: boolean }
      >;
    };
  };
  extraction: {
    triggerExtraction: FunctionReference<
      "action",
      "public",
      { documentId: Id<"documents">; force?: boolean; workosUserId?: string },
      { jobId: string; message?: string; success: boolean }
    >;
  };
  extractionQueue: {
    bulkRetryDLQ: FunctionReference<
      "mutation",
      "public",
      { queueId: Id<"extractionQueue"> },
      number
    >;
    bulkRetryItems: FunctionReference<
      "mutation",
      "public",
      { itemIds: Array<Id<"extractionQueueItems">> },
      number
    >;
    cancelQueue: FunctionReference<
      "mutation",
      "public",
      { queueId: Id<"extractionQueue"> },
      boolean
    >;
    createQueue: FunctionReference<
      "mutation",
      "public",
      {
        batchName?: string;
        companyId: Id<"companies">;
        documentIds: Array<Id<"documents">>;
        priority?: number;
      },
      Id<"extractionQueue">
    >;
    deleteDLQItem: FunctionReference<
      "mutation",
      "public",
      { itemId: Id<"extractionQueueItems"> },
      boolean
    >;
    getActiveQueues: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      Array<{
        _id: Id<"extractionQueue">;
        batchName?: string;
        completedCount: number;
        createdAt: number;
        currentPosition: number;
        estimatedSecondsRemaining?: number;
        failedCount: number;
        priority: number;
        startedAt?: number;
        status: string;
        totalDocuments: number;
      }>
    >;
    getDocumentQueuePosition: FunctionReference<
      "query",
      "public",
      { documentId: Id<"documents"> },
      {
        estimatedWaitSeconds: number | null;
        position: number;
        queueId: Id<"extractionQueue">;
        status: string;
        totalInQueue: number;
      } | null
    >;
    getFailedItems: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      Array<{
        _id: Id<"extractionQueueItems">;
        createdAt: number;
        documentId: Id<"documents">;
        documentName: string;
        failedAt: number;
        lastError?: string;
        maxRetries: number;
        priority: number;
        queueId: Id<"extractionQueue">;
        queueName?: string;
        retryCount: number;
      }>
    >;
    getQueueItems: FunctionReference<
      "query",
      "public",
      { queueId: Id<"extractionQueue"> },
      Array<{
        _id: Id<"extractionQueueItems">;
        documentId: Id<"documents">;
        errorMessage?: string;
        position: number;
        processingTimeMs?: number;
        status: string;
      }>
    >;
    getQueueStats: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies"> },
      {
        completed: number;
        estimatedSecondsRemaining: number | null;
        failed: number;
        processing: number;
        totalQueued: number;
      }
    >;
  };
  geminiExtraction: {
    extractWithGemini: FunctionReference<
      "action",
      "public",
      {
        documentId: Id<"documents">;
        skipSessionCreation?: boolean;
        workosUserId?: string;
      },
      {
        errorMessage?: string;
        modelUsed?: string;
        sessionId?: Id<"reconciliationSessions">;
        success: boolean;
        transactionCount: number;
      }
    >;
    reExtractDocument: FunctionReference<
      "action",
      "public",
      { companyId: Id<"companies">; documentId: Id<"documents"> },
      { errorMessage?: string; success: boolean; transactionCount: number }
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
  lib: {
    auditLogger: {
      getAuditHistoryForResource: FunctionReference<
        "query",
        "public",
        {
          limit?: number;
          resourceId: string;
          resourceType:
            | "document"
            | "transaction"
            | "accrualDocument"
            | "match"
            | "session"
            | "company"
            | "queue"
            | "suspense"
            | "export";
        },
        Array<{
          _id: Id<"auditLog">;
          action:
            | "document_upload"
            | "document_delete"
            | "extraction_start"
            | "extraction_complete"
            | "extraction_fail"
            | "extraction_retry"
            | "match_create"
            | "match_approve"
            | "match_reject"
            | "match_manual"
            | "match_bulk_approve"
            | "match_bulk_reject"
            | "session_create"
            | "session_start"
            | "session_complete"
            | "export_generate"
            | "export_download"
            | "settings_change"
            | "company_update"
            | "queue_create"
            | "queue_pause"
            | "queue_resume"
            | "queue_cancel"
            | "transaction_edit"
            | "transaction_delete"
            | "suspense_query"
            | "suspense_resolve";
          metadata?: any;
          timestamp: number;
          userId: Id<"users">;
        }>
      >;
      getCompanyAuditTrail: FunctionReference<
        "query",
        "public",
        {
          companyId: Id<"companies">;
          filters?: {
            action?:
              | "document_upload"
              | "document_delete"
              | "extraction_start"
              | "extraction_complete"
              | "extraction_fail"
              | "extraction_retry"
              | "match_create"
              | "match_approve"
              | "match_reject"
              | "match_manual"
              | "match_bulk_approve"
              | "match_bulk_reject"
              | "session_create"
              | "session_start"
              | "session_complete"
              | "export_generate"
              | "export_download"
              | "settings_change"
              | "company_update"
              | "queue_create"
              | "queue_pause"
              | "queue_resume"
              | "queue_cancel"
              | "transaction_edit"
              | "transaction_delete"
              | "suspense_query"
              | "suspense_resolve";
            endTime?: number;
            resourceType?:
              | "document"
              | "transaction"
              | "accrualDocument"
              | "match"
              | "session"
              | "company"
              | "queue"
              | "suspense"
              | "export";
            startTime?: number;
            userId?: Id<"users">;
          };
          pagination?: { cursor?: string; limit?: number };
        },
        {
          events: Array<{
            _id: Id<"auditLog">;
            action:
              | "document_upload"
              | "document_delete"
              | "extraction_start"
              | "extraction_complete"
              | "extraction_fail"
              | "extraction_retry"
              | "match_create"
              | "match_approve"
              | "match_reject"
              | "match_manual"
              | "match_bulk_approve"
              | "match_bulk_reject"
              | "session_create"
              | "session_start"
              | "session_complete"
              | "export_generate"
              | "export_download"
              | "settings_change"
              | "company_update"
              | "queue_create"
              | "queue_pause"
              | "queue_resume"
              | "queue_cancel"
              | "transaction_edit"
              | "transaction_delete"
              | "suspense_query"
              | "suspense_resolve";
            metadata?: any;
            resourceId?: string;
            resourceType:
              | "document"
              | "transaction"
              | "accrualDocument"
              | "match"
              | "session"
              | "company"
              | "queue"
              | "suspense"
              | "export";
            timestamp: number;
            userId: Id<"users">;
          }>;
          nextCursor: string | null;
        }
      >;
      getUserAuditActivity: FunctionReference<
        "query",
        "public",
        { limit?: number; userId: Id<"users"> },
        Array<{
          _id: Id<"auditLog">;
          action:
            | "document_upload"
            | "document_delete"
            | "extraction_start"
            | "extraction_complete"
            | "extraction_fail"
            | "extraction_retry"
            | "match_create"
            | "match_approve"
            | "match_reject"
            | "match_manual"
            | "match_bulk_approve"
            | "match_bulk_reject"
            | "session_create"
            | "session_start"
            | "session_complete"
            | "export_generate"
            | "export_download"
            | "settings_change"
            | "company_update"
            | "queue_create"
            | "queue_pause"
            | "queue_resume"
            | "queue_cancel"
            | "transaction_edit"
            | "transaction_delete"
            | "suspense_query"
            | "suspense_resolve";
          companyId: Id<"companies">;
          resourceId?: string;
          resourceType:
            | "document"
            | "transaction"
            | "accrualDocument"
            | "match"
            | "session"
            | "company"
            | "queue"
            | "suspense"
            | "export";
          timestamp: number;
        }>
      >;
    };
  };
  matches: {
    approve: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"matchedPairs">;
        reviewerId?: Id<"users">;
        workosUserId?: string;
      },
      Id<"matchedPairs">
    >;
    approveHighConfidence: FunctionReference<
      "mutation",
      "public",
      {
        reviewerId?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
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
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
        matchReason?: string;
        sessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      Id<"matchedPairs">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"matchedPairs">; workosUserId?: string },
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
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
        matchReason?: string;
        matchedAmount?: number;
        partialMatchGroupId?: string;
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
        workosUserId?: string;
      },
      any
    >;
    getCounts: FunctionReference<
      "query",
      "public",
      { sessionId: Id<"reconciliationSessions">; workosUserId?: string },
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
    hasReviewedMatchForCompany: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      boolean
    >;
    listBySession: FunctionReference<
      "query",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        status?: "pending" | "approved" | "rejected";
        workosUserId?: string;
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
        matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
        matchReason?: string;
        matchedAmount?: number;
        partialMatchGroupId?: string;
        reviewedAt?: number;
        reviewedBy?: Id<"users">;
        sessionId: Id<"reconciliationSessions">;
        status: "pending" | "approved" | "rejected";
      }>
    >;
    reject: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"matchedPairs">;
        reviewerId?: Id<"users">;
        workosUserId?: string;
      },
      Id<"matchedPairs">
    >;
  };
  matching: {
    index: {
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
    "003_backfill_aggregates": {
      backfillMatches: FunctionReference<
        "mutation",
        "public",
        { cursor?: string },
        any
      >;
      backfillTransactions: FunctionReference<
        "mutation",
        "public",
        { cursor?: string },
        any
      >;
      clearAggregates: FunctionReference<
        "mutation",
        "public",
        { confirmClear: "I_UNDERSTAND_THIS_DELETES_ALL_AGGREGATES" },
        any
      >;
    };
    "004_clear_all_data": {
      clearAll: FunctionReference<"mutation", "public", {}, any>;
    };
  };
  nativePdfExtraction: {
    cleanupPageImages: FunctionReference<
      "mutation",
      "public",
      {
        documentId: Id<"documents">;
        storageIds: Array<Id<"_storage">>;
        workosUserId?: string;
      },
      { deleted: number }
    >;
    completeExtraction: FunctionReference<
      "mutation",
      "public",
      {
        documentId: Id<"documents">;
        totalTransactions: number;
        workosUserId?: string;
      },
      null
    >;
    extractPageWithBedrock: FunctionReference<
      "action",
      "public",
      {
        documentId: Id<"documents">;
        documentType: string;
        pageNumber: number;
        pageStorageId: Id<"_storage">;
        totalPages: number;
        workosUserId?: string;
      },
      { errorMessage?: string; success: boolean; transactionCount: number }
    >;
    failExtraction: FunctionReference<
      "mutation",
      "public",
      {
        documentId: Id<"documents">;
        errorMessage: string;
        workosUserId?: string;
      },
      null
    >;
    finalizeExtraction: FunctionReference<
      "action",
      "public",
      { documentId: Id<"documents">; totalTransactions: number },
      { sessionId?: Id<"reconciliationSessions"> }
    >;
    storePageImage: FunctionReference<
      "mutation",
      "public",
      {
        documentId: Id<"documents">;
        pageNumber: number;
        storageId: Id<"_storage">;
        totalPages: number;
        workosUserId?: string;
      },
      Id<"_storage">
    >;
    updateExtractionPhase: FunctionReference<
      "mutation",
      "public",
      {
        documentId: Id<"documents">;
        phase:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        progress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
        workosUserId?: string;
      },
      null
    >;
  };
  onboarding: {
    cleanupLegacyProgress: FunctionReference<"mutation", "public", {}, any>;
    deleteProgress: FunctionReference<"mutation", "public", {}, any>;
    getProgress: FunctionReference<"query", "public", {}, any>;
    markCompleted: FunctionReference<"mutation", "public", {}, any>;
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
      },
      any
    >;
  };
  reconciliationChat: {
    addMessage: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        metadata?: {
          stepCount?: number;
          toolCalls?: Array<{ toolCallId: string; toolName: string }>;
        };
        role: "user" | "assistant";
        sessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      any
    >;
    clearHistory: FunctionReference<
      "mutation",
      "public",
      { sessionId: Id<"reconciliationSessions">; workosUserId?: string },
      any
    >;
    getMessages: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        sessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
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
        workosUserId?: string;
      },
      Id<"reconciliationSessions">
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"reconciliationSessions">; workosUserId?: string },
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
      { id: Id<"reconciliationSessions">; workosUserId?: string },
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
          accrualDocuments: number;
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
        workosUserId?: string;
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
      { sessionId: Id<"reconciliationSessions">; workosUserId?: string },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"reconciliationSessions">; workosUserId?: string },
      null
    >;
    resyncDocuments: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        sessionId?: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      {
        linkedAccrual: number;
        linkedCash: number;
        sessionId: Id<"reconciliationSessions">;
      }
    >;
    runMatching: FunctionReference<
      "action",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        useLLM?: boolean;
        workosUserId?: string;
      },
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
        workosUserId?: string;
      },
      Id<"reconciliationSessions">
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"reconciliationSessions">;
        status: "draft" | "processing" | "review" | "completed";
        workosUserId?: string;
      },
      Id<"reconciliationSessions">
    >;
  };
  settings: {
    deleteAccount: FunctionReference<"mutation", "public", {}, any>;
    exportUserData: FunctionReference<"mutation", "public", {}, any>;
    getUserPreferences: FunctionReference<"query", "public", {}, any>;
    updateUserPreferences: FunctionReference<
      "mutation",
      "public",
      {
        dateFormat?: string;
        emailProductUpdates?: boolean;
        emailReconciliation?: boolean;
        emailWeeklyDigest?: boolean;
        numberFormat?: string;
      },
      any
    >;
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
        workosUserId?: string;
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
        workosUserId?: string;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"suspenseItems">; workosUserId?: string },
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
      { sessionId: Id<"reconciliationSessions">; workosUserId?: string },
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
      {
        companyId: Id<"companies">;
        status?: "open" | "queried" | "resolved";
        workosUserId?: string;
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
    listBySession: FunctionReference<
      "query",
      "public",
      {
        sessionId: Id<"reconciliationSessions">;
        status?: "open" | "queried" | "resolved";
        workosUserId?: string;
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
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suspenseItems">; workosUserId?: string },
      null
    >;
    reopen: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suspenseItems">; workosUserId?: string },
      Id<"suspenseItems">
    >;
    resolve: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"suspenseItems">;
        resolutionNotes: string;
        resolvedBy?: Id<"users">;
        workosUserId?: string;
      },
      Id<"suspenseItems">
    >;
  };
  transactions: {
    bulkDelete: FunctionReference<
      "mutation",
      "public",
      { ids: Array<Id<"transactions">>; workosUserId?: string },
      { deleted: number; failed: number }
    >;
    bulkUpdateCategory: FunctionReference<
      "mutation",
      "public",
      {
        category: string;
        ids: Array<Id<"transactions">>;
        workosUserId?: string;
      },
      { failed: number; updated: number }
    >;
    bulkUpdateStatus: FunctionReference<
      "mutation",
      "public",
      {
        ids: Array<Id<"transactions">>;
        status: "pending" | "matched" | "suspense";
        workosUserId?: string;
      },
      { failed: number; updated: number }
    >;
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
        workosUserId?: string;
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
        workosUserId?: string;
      },
      Array<string>
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"transactions">; workosUserId?: string },
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
        workosUserId?: string;
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
      {
        sessionId: Id<"reconciliationSessions">;
        type?: "cash" | "accrual";
        workosUserId?: string;
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
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"transactions">; workosUserId?: string },
      null
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        amount?: number;
        category?: string;
        date?: string;
        description?: string;
        id: Id<"transactions">;
        reference?: string;
        workosUserId?: string;
      },
      Id<"transactions">
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"transactions">;
        matchId?: Id<"matchedPairs">;
        status: "pending" | "matched" | "suspense";
        workosUserId?: string;
      },
      Id<"transactions">
    >;
  };
  uploadAnalysis: {
    addDocuments: FunctionReference<
      "mutation",
      "public",
      {
        analysisId: Id<"uploadAnalyses">;
        documentIds: Array<Id<"documents">>;
        workosUserId?: string;
      },
      any
    >;
    approveAndProceed: FunctionReference<
      "action",
      "public",
      { analysisId: Id<"uploadAnalyses">; workosUserId?: string },
      any
    >;
    checkReady: FunctionReference<
      "query",
      "public",
      { id: Id<"uploadAnalyses">; workosUserId?: string },
      any
    >;
    createBatch: FunctionReference<
      "mutation",
      "public",
      {
        companyId: Id<"companies">;
        documentIds: Array<Id<"documents">>;
        workosUserId?: string;
      },
      any
    >;
    dismiss: FunctionReference<
      "mutation",
      "public",
      { analysisId: Id<"uploadAnalyses">; workosUserId?: string },
      any
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"uploadAnalyses">; workosUserId?: string },
      any
    >;
    getLatestForCompany: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      any
    >;
    markApproved: FunctionReference<
      "mutation",
      "public",
      {
        analysisId: Id<"uploadAnalyses">;
        sessionId: Id<"reconciliationSessions">;
        workosUserId?: string;
      },
      any
    >;
    reclassifyDocument: FunctionReference<
      "mutation",
      "public",
      {
        analysisId: Id<"uploadAnalyses">;
        basisType: "cash" | "accrual";
        classification: string;
        documentId: Id<"documents">;
        workosUserId?: string;
      },
      any
    >;
    runAnalysis: FunctionReference<
      "action",
      "public",
      { analysisId: Id<"uploadAnalyses"> },
      any
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
      { avatarUrl?: string; name?: string },
      Id<"users">
    >;
  };
  worksheetCharts: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        chartType: "bar" | "line" | "pie" | "area" | "scatter";
        dataRange: string;
        labelColumn?: number;
        options?: {
          animate: boolean;
          colors?: Array<string>;
          height?: number;
          orientation?: "horizontal" | "vertical";
          showDots?: boolean;
          showGrid?: boolean;
          showLabels: boolean;
          showLegend: boolean;
        };
        title: string;
        valueColumns: Array<number>;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"worksheetCharts">; workosUserId: string },
      any
    >;
    listByWorksheet: FunctionReference<
      "query",
      "public",
      { workosUserId: string; worksheetId: Id<"worksheets"> },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetCharts">; workosUserId: string },
      any
    >;
    reorder: FunctionReference<
      "mutation",
      "public",
      {
        chartIds: Array<Id<"worksheetCharts">>;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        chartType?: "bar" | "line" | "pie" | "area" | "scatter";
        dataRange?: string;
        id: Id<"worksheetCharts">;
        labelColumn?: number;
        options?: {
          animate: boolean;
          colors?: Array<string>;
          height?: number;
          orientation?: "horizontal" | "vertical";
          showDots?: boolean;
          showGrid?: boolean;
          showLabels: boolean;
          showLegend: boolean;
        };
        title?: string;
        valueColumns?: Array<number>;
        workosUserId: string;
      },
      any
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
  worksheetColumns: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        columnType: "text" | "number" | "formula";
        dataSource?: string;
        formula?: string;
        inputColumnId?: Id<"worksheetColumns">;
        name: string;
        validation?: {
          allowedValues?: Array<string>;
          errorMessage?: string;
          max?: number;
          min?: number;
          pattern?: string;
          required?: boolean;
          type: "list" | "number" | "date" | "text";
        };
        width?: number;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"worksheetColumns">; workosUserId: string },
      any
    >;
    listByWorksheet: FunctionReference<
      "query",
      "public",
      {
        includeDeleted?: boolean;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetColumns">; workosUserId: string },
      any
    >;
    reorder: FunctionReference<
      "mutation",
      "public",
      {
        columnIds: Array<Id<"worksheetColumns">>;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        columnType?: "text" | "number" | "formula";
        dataSource?: string;
        formula?: string;
        id: Id<"worksheetColumns">;
        inputColumnId?: Id<"worksheetColumns">;
        name?: string;
        width?: number;
        workosUserId: string;
      },
      any
    >;
    updateValidation: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"worksheetColumns">;
        validation?: {
          allowedValues?: Array<string>;
          errorMessage?: string;
          max?: number;
          min?: number;
          pattern?: string;
          required?: boolean;
          type: "list" | "number" | "date" | "text";
        };
        workosUserId: string;
      },
      any
    >;
  };
  worksheetConditionalFormats: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        conditions: Array<{
          formatting: {
            backgroundColor?: string;
            bold?: boolean;
            italic?: boolean;
            strikethrough?: boolean;
            textColor?: string;
            underline?: boolean;
          };
          operator:
            | "gt"
            | "gte"
            | "lt"
            | "lte"
            | "eq"
            | "neq"
            | "contains"
            | "startsWith"
            | "endsWith"
            | "between";
          value: any;
          value2?: any;
        }>;
        enabled?: boolean;
        name: string;
        priority?: number;
        range: {
          columnIndex?: number;
          endCell?: string;
          rowIndex?: number;
          startCell?: string;
        };
        ruleType:
          | "threshold"
          | "between"
          | "equals"
          | "contains"
          | "confidenceBand"
          | "statusColor"
          | "matchLayer";
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createPreset: FunctionReference<
      "mutation",
      "public",
      {
        columnIndex: number;
        name?: string;
        presetType: "confidenceBand" | "statusColor" | "matchLayer";
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"worksheetConditionalFormats">; workosUserId: string },
      any
    >;
    listByWorksheet: FunctionReference<
      "query",
      "public",
      {
        enabledOnly?: boolean;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetConditionalFormats">; workosUserId: string },
      any
    >;
    reorder: FunctionReference<
      "mutation",
      "public",
      {
        ruleIds: Array<Id<"worksheetConditionalFormats">>;
        workosUserId: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    toggle: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetConditionalFormats">; workosUserId: string },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        conditions?: Array<{
          formatting: {
            backgroundColor?: string;
            bold?: boolean;
            italic?: boolean;
            strikethrough?: boolean;
            textColor?: string;
            underline?: boolean;
          };
          operator:
            | "gt"
            | "gte"
            | "lt"
            | "lte"
            | "eq"
            | "neq"
            | "contains"
            | "startsWith"
            | "endsWith"
            | "between";
          value: any;
          value2?: any;
        }>;
        enabled?: boolean;
        id: Id<"worksheetConditionalFormats">;
        name?: string;
        priority?: number;
        range?: {
          columnIndex?: number;
          endCell?: string;
          rowIndex?: number;
          startCell?: string;
        };
        ruleType?:
          | "threshold"
          | "between"
          | "equals"
          | "contains"
          | "confidenceBand"
          | "statusColor"
          | "matchLayer";
        workosUserId: string;
      },
      any
    >;
  };
  worksheetDataSources: {
    addLinkedColumns: FunctionReference<
      "mutation",
      "public",
      {
        columnIndices: Array<number>;
        id: Id<"worksheetDataSources">;
        workosUserId?: string;
      },
      any
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        linkedColumns: Array<number>;
        readonly?: boolean;
        refreshInterval?: number;
        sourceConfig: any;
        sourceType: "manual" | "reconciliation" | "csv_import";
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    getByWorksheet: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    isColumnLinked: FunctionReference<
      "query",
      "public",
      {
        columnIndex: number;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    listByWorkspace: FunctionReference<
      "query",
      "public",
      { workosUserId?: string; workspaceId: Id<"workspaces"> },
      any
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetDataSources">; workosUserId?: string },
      any
    >;
    removeByWorksheet: FunctionReference<
      "mutation",
      "public",
      { workosUserId?: string; worksheetId: Id<"worksheets"> },
      any
    >;
    removeLinkedColumns: FunctionReference<
      "mutation",
      "public",
      {
        columnIndices: Array<number>;
        id: Id<"worksheetDataSources">;
        workosUserId?: string;
      },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"worksheetDataSources">;
        linkedColumns?: Array<number>;
        readonly?: boolean;
        refreshInterval?: number;
        sourceConfig?: any;
        workosUserId?: string;
      },
      any
    >;
    updateRefreshTimestamp: FunctionReference<
      "mutation",
      "public",
      { id: Id<"worksheetDataSources">; workosUserId?: string },
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
    createColumns: FunctionReference<
      "mutation",
      "public",
      {
        columns: Array<{
          columnType: "text" | "number" | "formula";
          dataSource?: string;
          formula?: string;
          name: string;
          order: number;
          width?: number;
        }>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createRows: FunctionReference<
      "mutation",
      "public",
      {
        rows: Array<{ cells: Record<string, any>; rowNumber: number }>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    createTemplateFromWorksheet: FunctionReference<
      "mutation",
      "public",
      {
        category?: "reconciliation" | "accounting" | "custom";
        description?: string;
        includeSampleData?: boolean;
        name: string;
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
    createWorksheetFromTemplate: FunctionReference<
      "mutation",
      "public",
      {
        includeSampleData?: boolean;
        name?: string;
        templateId: Id<"sheetTemplates">;
        workosUserId?: string;
        workspaceId: Id<"workspaces">;
      },
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
    deleteTemplate: FunctionReference<
      "mutation",
      "public",
      { templateId: Id<"sheetTemplates">; workosUserId?: string },
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
    duplicateWorksheet: FunctionReference<
      "mutation",
      "public",
      {
        includeData?: boolean;
        newName?: string;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
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
    getTemplate: FunctionReference<
      "query",
      "public",
      { templateId: Id<"sheetTemplates"> },
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
    listTemplates: FunctionReference<
      "query",
      "public",
      {
        category?: "blank" | "reconciliation" | "accounting" | "custom";
        companyId?: Id<"companies">;
        workosUserId?: string;
      },
      any
    >;
    listWorkspaces: FunctionReference<
      "query",
      "public",
      { companyId: Id<"companies">; workosUserId?: string },
      any
    >;
    renameColumn: FunctionReference<
      "mutation",
      "public",
      { columnId: Id<"worksheetColumns">; name: string; workosUserId?: string },
      any
    >;
    renameWorksheet: FunctionReference<
      "mutation",
      "public",
      { name: string; workosUserId?: string; worksheetId: Id<"worksheets"> },
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
    reorderWorksheets: FunctionReference<
      "mutation",
      "public",
      {
        workosUserId?: string;
        worksheetIds: Array<Id<"worksheets">>;
        workspaceId: Id<"workspaces">;
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
    updateColumnExtended: FunctionReference<
      "mutation",
      "public",
      {
        columnId: Id<"worksheetColumns">;
        columnType?:
          | "text"
          | "number"
          | "date"
          | "dropdown"
          | "checkbox"
          | "currency"
          | "percentage"
          | "formula";
        dropdownOptions?: Array<string>;
        excelFormula?: string;
        format?: string;
        hidden?: boolean;
        name?: string;
        width?: number;
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
    updateRows: FunctionReference<
      "mutation",
      "public",
      {
        rows: Array<{ cells: Record<string, any>; rowNumber: number }>;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
      },
      any
    >;
    updateWorksheet: FunctionReference<
      "mutation",
      "public",
      {
        frozenColumns?: number;
        frozenRows?: number;
        name?: string;
        order?: number;
        workosUserId?: string;
        worksheetId: Id<"worksheets">;
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
  agentEngine: {
    clearFindings: FunctionReference<
      "mutation",
      "internal",
      { agentSessionId: Id<"agentSessions"> },
      null
    >;
    getAnalysisData: FunctionReference<
      "query",
      "internal",
      { documentIds: Array<Id<"documents">> },
      any
    >;
    getCompanyInfo: FunctionReference<
      "query",
      "internal",
      { companyId: Id<"companies"> },
      any
    >;
    runAgentAnalysisInternal: FunctionReference<
      "action",
      "internal",
      { agentSessionId: Id<"agentSessions"> },
      any
    >;
    storeFindings: FunctionReference<
      "mutation",
      "internal",
      {
        agentSessionId: Id<"agentSessions">;
        companyId: Id<"companies">;
        findings: Array<{
          description: string;
          details?: string;
          relatedDocumentIds?: Array<Id<"documents">>;
          relatedTransactionIds?: Array<Id<"transactions">>;
          severity: "critical" | "warning" | "info";
          title: string;
          type: string;
        }>;
      },
      null
    >;
    tryStartAnalysis: FunctionReference<
      "mutation",
      "internal",
      { sessionId: Id<"agentSessions"> },
      boolean
    >;
    updateFindingStatus: FunctionReference<
      "mutation",
      "internal",
      {
        findingId: Id<"agentFindings">;
        status: "open" | "acknowledged" | "resolved" | "dismissed";
        userResponse?: string;
      },
      null
    >;
  };
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
  agentSession: {
    completeAnalysis: FunctionReference<
      "mutation",
      "internal",
      {
        sessionId: Id<"agentSessions">;
        summary: string;
        tokenUsage?: {
          completionTokens: number;
          promptTokens: number;
          totalTokens: number;
        };
      },
      null
    >;
    createInternal: FunctionReference<
      "mutation",
      "internal",
      {
        companyId: Id<"companies">;
        documentIds: Array<Id<"documents">>;
        uploadAnalysisId?: Id<"uploadAnalyses">;
        userId: Id<"users">;
      },
      Id<"agentSessions">
    >;
    expireStaleSessionsGlobal: FunctionReference<
      "mutation",
      "internal",
      {},
      number
    >;
    getInternal: FunctionReference<
      "query",
      "internal",
      { sessionId: Id<"agentSessions"> },
      any
    >;
    linkReconciliationSession: FunctionReference<
      "mutation",
      "internal",
      {
        reconciliationSessionId: Id<"reconciliationSessions">;
        sessionId: Id<"agentSessions">;
      },
      null
    >;
    resetForReanalysis: FunctionReference<
      "mutation",
      "internal",
      { sessionId: Id<"agentSessions"> },
      null
    >;
    setCompanyLanes: FunctionReference<
      "mutation",
      "internal",
      {
        companyLanes: Array<{
          companyId?: Id<"companies">;
          detectedCompanyName: string;
          documentIds: Array<Id<"documents">>;
          isSelected: boolean;
        }>;
        sessionId: Id<"agentSessions">;
      },
      null
    >;
    updateStatus: FunctionReference<
      "mutation",
      "internal",
      {
        sessionId: Id<"agentSessions">;
        status:
          | "active"
          | "analyzing"
          | "ready"
          | "proceeded"
          | "dismissed"
          | "expired";
      },
      null
    >;
    updateStepInternal: FunctionReference<
      "mutation",
      "internal",
      {
        sessionId: Id<"agentSessions">;
        step: "upload" | "analyze" | "validate" | "proceed";
      },
      null
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
  cloudinaryExtraction: {
    getDocument: FunctionReference<
      "query",
      "internal",
      { documentId: Id<"documents"> },
      {
        _id: Id<"documents">;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        extractionJobId?: string;
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileType: string;
        storageId?: Id<"_storage">;
      } | null
    >;
    handleExtractionResults: FunctionReference<
      "mutation",
      "internal",
      {
        companyId: Id<"companies">;
        documentId: Id<"documents">;
        documentType: string;
        jobId: string;
        result: {
          bankName?: string;
          confidence: number;
          errorMessage?: string;
          extractedText: string;
          invoiceData?: {
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
          periodEnd?: string;
          periodStart?: string;
          success: boolean;
          transactions?: Array<{
            amount: number;
            date: string;
            description: string;
            reference?: string;
          }>;
        };
      },
      null
    >;
    startExtraction: FunctionReference<
      "mutation",
      "internal",
      { documentId: Id<"documents">; jobId: string },
      null
    >;
    streamPageTransactions: FunctionReference<
      "mutation",
      "internal",
      {
        companyId: Id<"companies">;
        documentId: Id<"documents">;
        pageNumber: number;
        pagesCompleted: number;
        totalPages: number;
        transactions: Array<{
          amount: number;
          boundingBox?: {
            amount?: { height: number; width: number; x: number; y: number };
            date?: { height: number; width: number; x: number; y: number };
            description?: {
              height: number;
              width: number;
              x: number;
              y: number;
            };
            reference?: { height: number; width: number; x: number; y: number };
          };
          confidence?: {
            amount?: number;
            date?: number;
            description?: number;
            reference?: number;
          };
          date: string;
          description: string;
          reference?: string;
        }>;
      },
      { insertedCount: number; totalStreamed: number }
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
    updateExtractionProgress: FunctionReference<
      "mutation",
      "internal",
      {
        currentPage: number;
        documentId: Id<"documents">;
        pagesCompleted?: number;
        streamedTransactionCount?: number;
        totalPages: number;
      },
      null
    >;
  };
  documents: {
    cleanupStaleExtractions: FunctionReference<"mutation", "internal", {}, any>;
    getPendingExtraction: FunctionReference<
      "query",
      "internal",
      {},
      Array<{
        _creationTime: number;
        _id: Id<"documents">;
        accountHolderName?: string;
        accountNumber?: string;
        aiBasisType?: "cash" | "accrual";
        aiClassification?: string;
        aiClassificationConfidence?: number;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedCompanyName?: string;
        extractedCounterparties?: Array<string>;
        extractedCurrency?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionPhase?:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        extractionProgress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: Id<"_storage">;
        uploadAnalysisId?: Id<"uploadAnalyses">;
        uploadedAt: number;
      }>
    >;
    getStorageUrl: FunctionReference<
      "query",
      "internal",
      { storageId: Id<"_storage"> },
      string | null
    >;
  };
  errors: {
    scheduledCleanup: FunctionReference<"mutation", "internal", {}, any>;
  };
  exports: {
    index: {
      cleanupExpiredExportJobs: FunctionReference<
        "mutation",
        "internal",
        {},
        any
      >;
      completeExportJob: FunctionReference<
        "mutation",
        "internal",
        {
          fileName: string;
          jobId: Id<"exportJobs">;
          mimeType: string;
          storageId: Id<"_storage">;
        },
        any
      >;
      createExportJob: FunctionReference<
        "mutation",
        "internal",
        {
          exportType: "csv" | "xlsx" | "accounting";
          reportType?: string;
          sessionId: Id<"reconciliationSessions">;
          userId: Id<"users">;
        },
        Id<"exportJobs">
      >;
      failExportJob: FunctionReference<
        "mutation",
        "internal",
        { errorMessage: string; jobId: Id<"exportJobs"> },
        any
      >;
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
      cleanupStalePDFJobs: FunctionReference<"mutation", "internal", {}, any>;
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
      getJobById: FunctionReference<
        "query",
        "internal",
        { jobId: string },
        any
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
        accountHolderName?: string;
        accountNumber?: string;
        aiBasisType?: "cash" | "accrual";
        aiClassification?: string;
        aiClassificationConfidence?: number;
        bankType?: string;
        companyId: Id<"companies">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
        errorMessage?: string;
        extractedCompanyName?: string;
        extractedCounterparties?: Array<string>;
        extractedCurrency?: string;
        extractedText?: string;
        extractedTransactionCount?: number;
        extractionConfidence?: number;
        extractionJobId?: string;
        extractionPhase?:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        extractionProgress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
        extractionStatus: "pending" | "processing" | "completed" | "failed";
        fileName: string;
        fileSize: number;
        fileType: string;
        periodEnd?: string;
        periodStart?: string;
        processedAt?: number;
        storageId?: Id<"_storage">;
        uploadAnalysisId?: Id<"uploadAnalyses">;
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
  extractionQueue: {
    getRetryableItems: FunctionReference<
      "query",
      "internal",
      {},
      Array<{
        _id: Id<"extractionQueueItems">;
        documentId: Id<"documents">;
        queueId: Id<"extractionQueue">;
      }>
    >;
    processRetryableItems: FunctionReference<"mutation", "internal", {}, any>;
  };
  geminiExtraction: {
    clearDocumentExtractions: FunctionReference<
      "mutation",
      "internal",
      { companyId?: Id<"companies">; documentId: Id<"documents"> },
      null
    >;
    getCompanyOwner: FunctionReference<
      "query",
      "internal",
      { companyId: Id<"companies"> },
      Id<"users"> | null
    >;
    getDocumentStorageInfo: FunctionReference<
      "query",
      "internal",
      { documentId: Id<"documents"> },
      { fileType: string; storageId: Id<"_storage"> } | null
    >;
    setExtractedCount: FunctionReference<
      "mutation",
      "internal",
      { count: number; documentId: Id<"documents"> },
      null
    >;
    storeExtractedText: FunctionReference<
      "mutation",
      "internal",
      { documentId: Id<"documents">; extractedText: string },
      null
    >;
    updateDocumentType: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
      },
      null
    >;
    updateGeminiPhase: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        errorMessage?: string;
        phase:
          | "uploading"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        phaseMessage?: string;
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
  lib: {
    auditLogger: {
      logAudit: FunctionReference<
        "mutation",
        "internal",
        {
          action:
            | "document_upload"
            | "document_delete"
            | "extraction_start"
            | "extraction_complete"
            | "extraction_fail"
            | "extraction_retry"
            | "match_create"
            | "match_approve"
            | "match_reject"
            | "match_manual"
            | "match_bulk_approve"
            | "match_bulk_reject"
            | "session_create"
            | "session_start"
            | "session_complete"
            | "export_generate"
            | "export_download"
            | "settings_change"
            | "company_update"
            | "queue_create"
            | "queue_pause"
            | "queue_resume"
            | "queue_cancel"
            | "transaction_edit"
            | "transaction_delete"
            | "suspense_query"
            | "suspense_resolve";
          companyId: Id<"companies">;
          ipAddress?: string;
          metadata?: any;
          resourceId?: string;
          resourceType:
            | "document"
            | "transaction"
            | "accrualDocument"
            | "match"
            | "session"
            | "company"
            | "queue"
            | "suspense"
            | "export";
          userAgent?: string;
          userId: Id<"users">;
        },
        Id<"auditLog">
      >;
    };
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
          matchLayer: 1 | 2 | 3 | 4 | 5 | 7;
          matchReason: string;
          sessionId: Id<"reconciliationSessions">;
        },
        Id<"matchedPairs">
      >;
      createPartialMatches: FunctionReference<
        "mutation",
        "internal",
        {
          accrualDocumentIds: Array<Id<"accrualDocuments">>;
          cashTransactionId: Id<"transactions">;
          confidenceScore: number;
          matchReason: string;
          matchedAmounts: Array<number>;
          sessionId: Id<"reconciliationSessions">;
          totalMatchedAmount: number;
        },
        Array<Id<"matchedPairs">>
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
      previewMatching: FunctionReference<
        "action",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        any
      >;
      resetSuspenseForRerun: FunctionReference<
        "mutation",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        number
      >;
      runMatchingEngine: FunctionReference<
        "action",
        "internal",
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
          matchLayer: 1 | 2 | 3 | 4 | 5 | 7;
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
      previewMatching: FunctionReference<
        "action",
        "internal",
        { sessionId: Id<"reconciliationSessions"> },
        any
      >;
      runMatchingEngine: FunctionReference<
        "action",
        "internal",
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
  nativePdfExtraction: {
    getDocumentInfo: FunctionReference<
      "query",
      "internal",
      { documentId: Id<"documents"> },
      { companyId: Id<"companies">; documentType: string } | null
    >;
    insertAccrualDocument: FunctionReference<
      "mutation",
      "internal",
      {
        companyId: Id<"companies">;
        documentId: Id<"documents">;
        invoiceData: {
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
      },
      null
    >;
    streamPageTransactions: FunctionReference<
      "mutation",
      "internal",
      {
        companyId: Id<"companies">;
        documentId: Id<"documents">;
        pageNumber: number;
        totalPages: number;
        transactions: Array<{
          amount: number;
          date: string;
          description: string;
          reference?: string;
        }>;
      },
      { insertedCount: number; totalStreamed: number }
    >;
    updateDocumentMetadata: FunctionReference<
      "mutation",
      "internal",
      {
        accountHolderName?: string;
        accountNumber?: string;
        bankName?: string;
        confidence?: number;
        documentId: Id<"documents">;
        extractedCompanyName?: string;
        extractedCounterparties?: Array<string>;
        extractedCurrency?: string;
        periodEnd?: string;
        periodStart?: string;
      },
      null
    >;
    updateDocumentTypeInternal: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
      },
      null
    >;
    updatePhaseInternal: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        errorMessage?: string;
        phase:
          | "uploading"
          | "converting"
          | "extracting"
          | "processing"
          | "complete"
          | "failed";
        progress?: {
          currentPage: number;
          pagesCompleted?: number;
          phaseMessage?: string;
          streamedTransactionCount?: number;
          totalPages: number;
        };
      },
      null
    >;
  };
  reconciliationChat: {
    deleteExpired: FunctionReference<"mutation", "internal", {}, any>;
  };
  sessions: {
    autoCreateAndLink: FunctionReference<
      "mutation",
      "internal",
      { companyId: Id<"companies">; sessionName?: string; userId: Id<"users"> },
      Id<"reconciliationSessions">
    >;
    getSessionCounts: FunctionReference<
      "query",
      "internal",
      { sessionId: Id<"reconciliationSessions"> },
      {
        accrualCount: number;
        cashCount: number;
        status: "draft" | "processing" | "review" | "completed";
      }
    >;
    updateStatusInternal: FunctionReference<
      "mutation",
      "internal",
      {
        id: Id<"reconciliationSessions">;
        status: "draft" | "processing" | "review" | "completed";
      },
      null
    >;
  };
  uploadAnalysis: {
    getCompanyForAnalysis: FunctionReference<
      "query",
      "internal",
      { companyId: Id<"companies"> },
      any
    >;
    getDocumentsForAnalysis: FunctionReference<
      "query",
      "internal",
      { documentIds: Array<Id<"documents">> },
      any
    >;
    getInternal: FunctionReference<
      "query",
      "internal",
      { analysisId: Id<"uploadAnalyses"> },
      any
    >;
    linkSession: FunctionReference<
      "mutation",
      "internal",
      {
        analysisId: Id<"uploadAnalyses">;
        sessionId: Id<"reconciliationSessions">;
      },
      any
    >;
    setStatus: FunctionReference<
      "mutation",
      "internal",
      {
        analysisId: Id<"uploadAnalyses">;
        status: "pending" | "analyzing" | "ready" | "approved" | "dismissed";
      },
      any
    >;
    storeResults: FunctionReference<
      "mutation",
      "internal",
      {
        analysisId: Id<"uploadAnalyses">;
        detectedCompany: {
          accountNumber?: string;
          bankName?: string;
          matchDetails?: string;
          matchStatus: "match" | "partial_match" | "mismatch" | "unknown";
          name: string;
          registrationNumber?: string;
        };
        documentClassifications: Array<{
          aiClassification: string;
          basisType: "cash" | "accrual";
          confidence: number;
          documentId: Id<"documents">;
          errorMessage?: string;
          extractionStatus: string;
          fileName: string;
          pageCount?: number;
          reason?: string;
          transactionCount?: number;
          userOverride?: {
            basisType: "cash" | "accrual";
            classification: string;
          };
        }>;
      },
      any
    >;
    updateDocumentClassification: FunctionReference<
      "mutation",
      "internal",
      {
        aiBasisType: "cash" | "accrual";
        documentId: Id<"documents">;
        documentType: "bank_statement" | "invoice" | "receipt" | "other";
      },
      any
    >;
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
  aggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
};
