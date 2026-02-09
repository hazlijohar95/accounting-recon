/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  accrualDocuments: {
    document: {
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
      _id: Id<"accrualDocuments">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amount"
      | "companyId"
      | "counterparty"
      | "createdAt"
      | "description"
      | "docDate"
      | "docNumber"
      | "docType"
      | "dueDate"
      | "extractedText"
      | "lineItems"
      | "matchCount"
      | "matchedTotal"
      | "matchId"
      | "sessionId"
      | "sourceDocumentId"
      | "status"
      | "taxAmount";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_counterparty: ["sessionId", "counterparty", "_creationTime"];
      by_date: ["companyId", "docDate", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_date: ["sessionId", "docDate", "_creationTime"];
      by_session_status: ["sessionId", "status", "_creationTime"];
      by_session_type: ["sessionId", "docType", "_creationTime"];
      by_source_document: ["sourceDocumentId", "_creationTime"];
      by_status: ["companyId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  agentJobs: {
    document: {
      columnId: Id<"worksheetColumns">;
      completedAt?: number;
      creditsCost?: number;
      dataSource: string;
      error?: string;
      input: string;
      prompt: string;
      result?: string;
      retryCount: number;
      rowId: Id<"worksheetRows">;
      startedAt?: number;
      status: "pending" | "running" | "completed" | "failed";
      worksheetId: Id<"worksheets">;
      _id: Id<"agentJobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "columnId"
      | "completedAt"
      | "creditsCost"
      | "dataSource"
      | "error"
      | "input"
      | "prompt"
      | "result"
      | "retryCount"
      | "rowId"
      | "startedAt"
      | "status"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_column: ["columnId", "_creationTime"];
      by_row: ["rowId", "_creationTime"];
      by_status: ["status", "_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_status: ["worksheetId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  auditLog: {
    document: {
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
      timestamp: number;
      userAgent?: string;
      userId: Id<"users">;
      _id: Id<"auditLog">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "action"
      | "companyId"
      | "ipAddress"
      | "metadata"
      | "resourceId"
      | "resourceType"
      | "timestamp"
      | "userAgent"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_action: ["action", "_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_action: ["companyId", "action", "_creationTime"];
      by_company_time: ["companyId", "timestamp", "_creationTime"];
      by_resource: ["resourceType", "resourceId", "_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_time: ["userId", "timestamp", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  categories: {
    document: {
      accountCode?: string;
      companyId?: Id<"companies">;
      createdAt: number;
      isGlobal: boolean;
      keyword: string;
      mainCategory: string;
      subCategory: string;
      _id: Id<"categories">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accountCode"
      | "companyId"
      | "createdAt"
      | "isGlobal"
      | "keyword"
      | "mainCategory"
      | "subCategory";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_global: ["isGlobal", "_creationTime"];
      by_keyword: ["keyword", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  companies: {
    document: {
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
      _id: Id<"companies">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "bankAccounts"
      | "bankName"
      | "code"
      | "createdAt"
      | "currency"
      | "fiscalYearEnd"
      | "industry"
      | "industryCategory"
      | "isDeleted"
      | "name"
      | "onboardingCompleted"
      | "ownerId"
      | "primaryAccountNumber"
      | "primaryBank"
      | "registrationNumber"
      | "taxNumber"
      | "taxRegistered"
      | "tradingAs"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_code: ["code", "_creationTime"];
      by_name: ["name", "_creationTime"];
      by_owner: ["ownerId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  companyCredits: {
    document: {
      balance: number;
      companyId: Id<"companies">;
      totalPurchased: number;
      totalUsed: number;
      updatedAt: number;
      _id: Id<"companyCredits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "balance"
      | "companyId"
      | "totalPurchased"
      | "totalUsed"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  counters: {
    document: {
      key: string;
      updatedAt: number;
      value: number;
      _id: Id<"counters">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "key" | "updatedAt" | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  creditTransactions: {
    document: {
      amount: number;
      companyId: Id<"companies">;
      createdAt: number;
      createdBy?: Id<"users">;
      description: string;
      jobId?: Id<"agentJobs">;
      type: "purchase" | "usage" | "refund";
      _id: Id<"creditTransactions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amount"
      | "companyId"
      | "createdAt"
      | "createdBy"
      | "description"
      | "jobId"
      | "type";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_time: ["companyId", "createdAt", "_creationTime"];
      by_job: ["jobId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  documents: {
    document: {
      aiBasisType?: "cash" | "accrual";
      aiClassification?: string;
      aiClassificationConfidence?: number;
      bankType?: string;
      companyId: Id<"companies">;
      documentType: "bank_statement" | "invoice" | "receipt" | "other";
      errorMessage?: string;
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
      _id: Id<"documents">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "aiBasisType"
      | "aiClassification"
      | "aiClassificationConfidence"
      | "bankType"
      | "companyId"
      | "documentType"
      | "errorMessage"
      | "extractedText"
      | "extractedTransactionCount"
      | "extractionConfidence"
      | "extractionJobId"
      | "extractionPhase"
      | "extractionProgress"
      | "extractionProgress.currentPage"
      | "extractionProgress.pagesCompleted"
      | "extractionProgress.phaseMessage"
      | "extractionProgress.streamedTransactionCount"
      | "extractionProgress.totalPages"
      | "extractionStatus"
      | "fileName"
      | "fileSize"
      | "fileType"
      | "periodEnd"
      | "periodStart"
      | "processedAt"
      | "storageId"
      | "uploadAnalysisId"
      | "uploadedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_documentType: ["companyId", "documentType", "_creationTime"];
      by_job: ["extractionJobId", "_creationTime"];
      by_status: ["extractionStatus", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  errors: {
    document: {
      componentName?: string;
      count: number;
      fingerprint: string;
      firstSeenAt: number;
      isResolved: boolean;
      lastSeenAt: number;
      message: string;
      metadata?: any;
      resolvedAt?: number;
      resolvedBy?: Id<"users">;
      stack?: string;
      type: "uncaught" | "promise" | "boundary" | "api" | "convex" | "manual";
      url: string;
      userAgent?: string;
      userId?: Id<"users">;
      _id: Id<"errors">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "componentName"
      | "count"
      | "fingerprint"
      | "firstSeenAt"
      | "isResolved"
      | "lastSeenAt"
      | "message"
      | "metadata"
      | "resolvedAt"
      | "resolvedBy"
      | "stack"
      | "type"
      | "url"
      | "userAgent"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_created: ["lastSeenAt", "_creationTime"];
      by_fingerprint: ["fingerprint", "_creationTime"];
      by_resolved: ["isResolved", "lastSeenAt", "_creationTime"];
      by_type: ["type", "lastSeenAt", "_creationTime"];
      by_user: ["userId", "lastSeenAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  extractionQueue: {
    document: {
      avgProcessingTimeMs?: number;
      batchName?: string;
      companyId: Id<"companies">;
      completedAt?: number;
      completedCount: number;
      createdAt: number;
      currentPosition: number;
      estimatedSecondsRemaining?: number;
      failedCount: number;
      isPaused?: boolean;
      pausedAt?: number;
      priority: number;
      startedAt?: number;
      status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      totalDocuments: number;
      userId: Id<"users">;
      _id: Id<"extractionQueue">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "avgProcessingTimeMs"
      | "batchName"
      | "companyId"
      | "completedAt"
      | "completedCount"
      | "createdAt"
      | "currentPosition"
      | "estimatedSecondsRemaining"
      | "failedCount"
      | "isPaused"
      | "pausedAt"
      | "priority"
      | "startedAt"
      | "status"
      | "totalDocuments"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_priority_created: ["priority", "createdAt", "_creationTime"];
      by_status: ["status", "_creationTime"];
      by_status_priority_created: [
        "status",
        "priority",
        "createdAt",
        "_creationTime",
      ];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  extractionQueueItems: {
    document: {
      completedAt?: number;
      documentId: Id<"documents">;
      errorMessage?: string;
      isDLQ?: boolean;
      lastError?: string;
      maxRetries?: number;
      nextRetryAt?: number;
      position: number;
      processingTimeMs?: number;
      queueId: Id<"extractionQueue">;
      retryCount?: number;
      startedAt?: number;
      status: "pending" | "processing" | "completed" | "failed" | "skipped";
      _id: Id<"extractionQueueItems">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "completedAt"
      | "documentId"
      | "errorMessage"
      | "isDLQ"
      | "lastError"
      | "maxRetries"
      | "nextRetryAt"
      | "position"
      | "processingTimeMs"
      | "queueId"
      | "retryCount"
      | "startedAt"
      | "status";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_dlq: ["isDLQ", "_creationTime"];
      by_document: ["documentId", "_creationTime"];
      by_next_retry: ["nextRetryAt", "_creationTime"];
      by_queue: ["queueId", "_creationTime"];
      by_queue_position: ["queueId", "position", "_creationTime"];
      by_queue_status: ["queueId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  matchedPairs: {
    document: {
      accrualDocumentId?: Id<"accrualDocuments">;
      accrualTransactionId?: Id<"transactions">;
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
      _id: Id<"matchedPairs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accrualDocumentId"
      | "accrualTransactionId"
      | "cashTransactionId"
      | "confidence"
      | "confidenceScore"
      | "createdAt"
      | "isPartialMatch"
      | "matchedAmount"
      | "matchLayer"
      | "matchReason"
      | "partialMatchGroupId"
      | "reviewedAt"
      | "reviewedBy"
      | "sessionId"
      | "status";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_accrual_doc: ["accrualDocumentId", "_creationTime"];
      by_accrual_txn: ["accrualTransactionId", "_creationTime"];
      by_cash_txn: ["cashTransactionId", "_creationTime"];
      by_partial_group: ["partialMatchGroupId", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_confidence: ["sessionId", "confidence", "_creationTime"];
      by_session_layer: ["sessionId", "matchLayer", "_creationTime"];
      by_status: ["sessionId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  onboardingProgress: {
    document: {
      createdAt: number;
      currentStep: number;
      data: {
        companyName?: string;
        fiscalYearEnd?: string;
        industryCategory?: string;
        primaryBank?: string;
        taxNumber?: string;
        taxRegistered?: string;
      };
      isCompleted: boolean;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"onboardingProgress">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "currentStep"
      | "data"
      | "data.companyName"
      | "data.fiscalYearEnd"
      | "data.industryCategory"
      | "data.primaryBank"
      | "data.taxNumber"
      | "data.taxRegistered"
      | "isCompleted"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_completed: ["isCompleted", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  pdfExportJobs: {
    document: {
      completedAt?: number;
      createdAt: number;
      downloadUrl?: string;
      errorMessage?: string;
      expiresAt?: number;
      fileName?: string;
      reportType: "bank_recon" | "client_query" | "transaction_listing";
      sessionId: Id<"reconciliationSessions">;
      status: "pending" | "processing" | "completed" | "failed";
      userId: Id<"users">;
      _id: Id<"pdfExportJobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "completedAt"
      | "createdAt"
      | "downloadUrl"
      | "errorMessage"
      | "expiresAt"
      | "fileName"
      | "reportType"
      | "sessionId"
      | "status"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_status: ["status", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  rateLimits: {
    document: {
      action: string;
      timestamps: Array<number>;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"rateLimits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "action"
      | "timestamps"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_action: ["userId", "action", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  reconciliationChatMessages: {
    document: {
      companyId: Id<"companies">;
      content: string;
      createdAt: number;
      expiresAt: number;
      metadata?: {
        stepCount?: number;
        toolCalls?: Array<{ toolCallId: string; toolName: string }>;
      };
      role: "user" | "assistant";
      sessionId: Id<"reconciliationSessions">;
      userId: Id<"users">;
      _id: Id<"reconciliationChatMessages">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "companyId"
      | "content"
      | "createdAt"
      | "expiresAt"
      | "metadata"
      | "metadata.stepCount"
      | "metadata.toolCalls"
      | "role"
      | "sessionId"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_expires: ["expiresAt", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_time: ["sessionId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  reconciliationSessions: {
    document: {
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
      _id: Id<"reconciliationSessions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "companyId"
      | "completedAt"
      | "createdAt"
      | "createdBy"
      | "matchedCount"
      | "name"
      | "periodEnd"
      | "periodStart"
      | "progress"
      | "status"
      | "suspenseCount"
      | "totalAccrualTransactions"
      | "totalCashTransactions";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_status: ["companyId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  sheetTemplates: {
    document: {
      category: "blank" | "reconciliation" | "accounting" | "custom";
      columns: Array<{
        columnType: string;
        dropdownOptions?: Array<string>;
        format?: string;
        name: string;
        validation?: any;
        width?: number;
      }>;
      companyId?: Id<"companies">;
      createdAt: number;
      createdBy?: Id<"users">;
      description?: string;
      isBuiltIn: boolean;
      name: string;
      sampleData?: Array<Record<string, any>>;
      thumbnailUrl?: string;
      updatedAt: number;
      _id: Id<"sheetTemplates">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "category"
      | "columns"
      | "companyId"
      | "createdAt"
      | "createdBy"
      | "description"
      | "isBuiltIn"
      | "name"
      | "sampleData"
      | "thumbnailUrl"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_built_in: ["isBuiltIn", "_creationTime"];
      by_category: ["category", "_creationTime"];
      by_company: ["companyId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  suspenseItems: {
    document: {
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
      _id: Id<"suspenseItems">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amount"
      | "companyId"
      | "createdAt"
      | "description"
      | "reason"
      | "resolutionNotes"
      | "resolvedAt"
      | "resolvedBy"
      | "sessionId"
      | "sourceId"
      | "sourceType"
      | "status"
      | "suggestedAction"
      | "transactionDate";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_status: ["sessionId", "status", "_creationTime"];
      by_status: ["companyId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  transactions: {
    document: {
      amount: number;
      boundingBoxes?: {
        amount?: { height: number; width: number; x: number; y: number };
        date?: { height: number; width: number; x: number; y: number };
        description?: { height: number; width: number; x: number; y: number };
        pageNumber: number;
        reference?: { height: number; width: number; x: number; y: number };
      };
      category?: string;
      companyId: Id<"companies">;
      createdAt: number;
      date: string;
      description: string;
      editedAt?: number;
      editedBy?: Id<"users">;
      editedFields?: Array<string>;
      fieldConfidence?: {
        amount?: number;
        date?: number;
        description?: number;
        reference?: number;
      };
      matchId?: Id<"matchedPairs">;
      reference?: string;
      sessionId?: Id<"reconciliationSessions">;
      sourceDocumentId?: Id<"documents">;
      status: "pending" | "matched" | "suspense";
      type: "cash" | "accrual";
      _id: Id<"transactions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amount"
      | "boundingBoxes"
      | "boundingBoxes.amount"
      | "boundingBoxes.amount.height"
      | "boundingBoxes.amount.width"
      | "boundingBoxes.amount.x"
      | "boundingBoxes.amount.y"
      | "boundingBoxes.date"
      | "boundingBoxes.date.height"
      | "boundingBoxes.date.width"
      | "boundingBoxes.date.x"
      | "boundingBoxes.date.y"
      | "boundingBoxes.description"
      | "boundingBoxes.description.height"
      | "boundingBoxes.description.width"
      | "boundingBoxes.description.x"
      | "boundingBoxes.description.y"
      | "boundingBoxes.pageNumber"
      | "boundingBoxes.reference"
      | "boundingBoxes.reference.height"
      | "boundingBoxes.reference.width"
      | "boundingBoxes.reference.x"
      | "boundingBoxes.reference.y"
      | "category"
      | "companyId"
      | "createdAt"
      | "date"
      | "description"
      | "editedAt"
      | "editedBy"
      | "editedFields"
      | "fieldConfidence"
      | "fieldConfidence.amount"
      | "fieldConfidence.date"
      | "fieldConfidence.description"
      | "fieldConfidence.reference"
      | "matchId"
      | "reference"
      | "sessionId"
      | "sourceDocumentId"
      | "status"
      | "type";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_type_status: ["companyId", "type", "status", "_creationTime"];
      by_date: ["companyId", "date", "_creationTime"];
      by_session: ["sessionId", "_creationTime"];
      by_session_date: ["sessionId", "date", "_creationTime"];
      by_session_type: ["sessionId", "type", "_creationTime"];
      by_session_type_status: ["sessionId", "type", "status", "_creationTime"];
      by_source_document: ["sourceDocumentId", "_creationTime"];
      by_status: ["companyId", "status", "_creationTime"];
      by_type: ["companyId", "type", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  uploadAnalyses: {
    document: {
      companyId: Id<"companies">;
      createdAt: number;
      detectedCompany?: {
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
      documentIds: Array<Id<"documents">>;
      sessionId?: Id<"reconciliationSessions">;
      stats?: {
        accrualDocuments: number;
        accrualItems: number;
        cashDocuments: number;
        cashTransactions: number;
        failedDocuments: number;
        totalDocuments: number;
        totalPages: number;
      };
      status: "pending" | "analyzing" | "ready" | "approved" | "dismissed";
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"uploadAnalyses">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "companyId"
      | "createdAt"
      | "detectedCompany"
      | "detectedCompany.accountNumber"
      | "detectedCompany.bankName"
      | "detectedCompany.matchDetails"
      | "detectedCompany.matchStatus"
      | "detectedCompany.name"
      | "detectedCompany.registrationNumber"
      | "documentClassifications"
      | "documentIds"
      | "sessionId"
      | "stats"
      | "stats.accrualDocuments"
      | "stats.accrualItems"
      | "stats.cashDocuments"
      | "stats.cashTransactions"
      | "stats.failedDocuments"
      | "stats.totalDocuments"
      | "stats.totalPages"
      | "status"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_status: ["companyId", "status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  uploadRateLimits: {
    document: {
      companyId: Id<"companies">;
      timestamps: Array<number>;
      updatedAt: number;
      _id: Id<"uploadRateLimits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "companyId"
      | "timestamps"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  userPreferences: {
    document: {
      dateFormat?: string;
      emailProductUpdates?: boolean;
      emailReconciliation?: boolean;
      emailWeeklyDigest?: boolean;
      numberFormat?: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"userPreferences">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "dateFormat"
      | "emailProductUpdates"
      | "emailReconciliation"
      | "emailWeeklyDigest"
      | "numberFormat"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  users: {
    document: {
      avatarUrl?: string;
      createdAt: number;
      email: string;
      name?: string;
      workosId?: string;
      _id: Id<"users">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "avatarUrl"
      | "createdAt"
      | "email"
      | "name"
      | "workosId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_email: ["email", "_creationTime"];
      by_workos: ["workosId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetCharts: {
    document: {
      chartType: "bar" | "line" | "pie" | "area" | "scatter";
      createdAt: number;
      dataRange: string;
      labelColumn?: number;
      options: {
        animate: boolean;
        colors?: Array<string>;
        height?: number;
        orientation?: "horizontal" | "vertical";
        showDots?: boolean;
        showGrid?: boolean;
        showLabels: boolean;
        showLegend: boolean;
      };
      position: number;
      title: string;
      updatedAt: number;
      valueColumns: Array<number>;
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetCharts">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "chartType"
      | "createdAt"
      | "dataRange"
      | "labelColumn"
      | "options"
      | "options.animate"
      | "options.colors"
      | "options.height"
      | "options.orientation"
      | "options.showDots"
      | "options.showGrid"
      | "options.showLabels"
      | "options.showLegend"
      | "position"
      | "title"
      | "updatedAt"
      | "valueColumns"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_position: ["worksheetId", "position", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetColumns: {
    document: {
      columnType:
        | "text"
        | "number"
        | "date"
        | "dropdown"
        | "checkbox"
        | "currency"
        | "percentage"
        | "formula";
      dataSource?: string;
      deletedAt?: number;
      dropdownOptions?: Array<string>;
      excelFormula?: string;
      format?: string;
      formula?: string;
      hidden?: boolean;
      inputColumnId?: Id<"worksheetColumns">;
      name: string;
      order: number;
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
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetColumns">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "columnType"
      | "dataSource"
      | "deletedAt"
      | "dropdownOptions"
      | "excelFormula"
      | "format"
      | "formula"
      | "hidden"
      | "inputColumnId"
      | "name"
      | "order"
      | "validation"
      | "validation.allowedValues"
      | "validation.errorMessage"
      | "validation.max"
      | "validation.min"
      | "validation.pattern"
      | "validation.required"
      | "validation.type"
      | "width"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_input_column: ["inputColumnId", "_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_active: ["worksheetId", "deletedAt", "_creationTime"];
      by_worksheet_order: ["worksheetId", "order", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetConditionalFormats: {
    document: {
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
      createdAt: number;
      enabled: boolean;
      name: string;
      priority: number;
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
      updatedAt: number;
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetConditionalFormats">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "conditions"
      | "createdAt"
      | "enabled"
      | "name"
      | "priority"
      | "range"
      | "range.columnIndex"
      | "range.endCell"
      | "range.rowIndex"
      | "range.startCell"
      | "ruleType"
      | "updatedAt"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_enabled: ["worksheetId", "enabled", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetDataSources: {
    document: {
      createdAt: number;
      lastRefreshedAt?: number;
      linkedColumns: Array<number>;
      readonly: boolean;
      refreshInterval?: number;
      sourceConfig:
        | {}
        | {
            includeMatches?: boolean;
            includeSuspense?: boolean;
            matchStatusFilter?: "pending" | "approved" | "rejected";
            sessionId: Id<"reconciliationSessions">;
            suspenseStatusFilter?: "open" | "queried" | "resolved";
          }
        | {
            columnMapping: Record<string, number>;
            fileName: string;
            importedAt: number;
          };
      sourceType: "manual" | "reconciliation" | "csv_import";
      updatedAt: number;
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetDataSources">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "lastRefreshedAt"
      | "linkedColumns"
      | "readonly"
      | "refreshInterval"
      | "sourceConfig"
      | "sourceConfig.columnMapping"
      | `sourceConfig.columnMapping.${string}`
      | "sourceConfig.fileName"
      | "sourceConfig.importedAt"
      | "sourceConfig.includeMatches"
      | "sourceConfig.includeSuspense"
      | "sourceConfig.matchStatusFilter"
      | "sourceConfig.sessionId"
      | "sourceConfig.suspenseStatusFilter"
      | "sourceType"
      | "updatedAt"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_source_type: ["sourceType", "_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetMessages: {
    document: {
      content: string;
      createdAt: number;
      metadata?: {
        referencedCells?: Array<{ columnKey: string; rowNumber: number }>;
        toolCalls?: Array<{ name: string; result?: string }>;
      };
      role: "user" | "assistant";
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetMessages">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "content"
      | "createdAt"
      | "metadata"
      | "metadata.referencedCells"
      | "metadata.toolCalls"
      | "role"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_time: ["worksheetId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheetRows: {
    document: {
      cellErrors?: Record<string, string>;
      cellStatus: Record<
        string,
        "idle" | "pending" | "running" | "complete" | "error"
      >;
      cells: Record<string, any>;
      createdAt: number;
      deletedAt?: number;
      rowNumber: number;
      updatedAt: number;
      version?: number;
      worksheetId: Id<"worksheets">;
      _id: Id<"worksheetRows">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "cellErrors"
      | `cellErrors.${string}`
      | "cells"
      | `cells.${string}`
      | "cellStatus"
      | `cellStatus.${string}`
      | "createdAt"
      | "deletedAt"
      | "rowNumber"
      | "updatedAt"
      | "version"
      | "worksheetId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_worksheet: ["worksheetId", "_creationTime"];
      by_worksheet_active: ["worksheetId", "deletedAt", "_creationTime"];
      by_worksheet_row: ["worksheetId", "rowNumber", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  worksheets: {
    document: {
      createdAt: number;
      deletedAt?: number;
      frozenColumns?: number;
      frozenRows?: number;
      name: string;
      order?: number;
      templateId?: Id<"sheetTemplates">;
      updatedAt: number;
      workspaceId: Id<"workspaces">;
      _id: Id<"worksheets">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "deletedAt"
      | "frozenColumns"
      | "frozenRows"
      | "name"
      | "order"
      | "templateId"
      | "updatedAt"
      | "workspaceId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_workspace: ["workspaceId", "_creationTime"];
      by_workspace_active: ["workspaceId", "deletedAt", "_creationTime"];
      by_workspace_order: ["workspaceId", "order", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  workspaces: {
    document: {
      companyId: Id<"companies">;
      createdAt: number;
      createdBy: Id<"users">;
      description?: string;
      name: string;
      updatedAt: number;
      _id: Id<"workspaces">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "companyId"
      | "createdAt"
      | "createdBy"
      | "description"
      | "name"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_company: ["companyId", "_creationTime"];
      by_company_name: ["companyId", "name", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
