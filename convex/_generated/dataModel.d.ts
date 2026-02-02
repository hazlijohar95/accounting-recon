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
      _id: Id<"documents">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "bankType"
      | "companyId"
      | "documentType"
      | "errorMessage"
      | "extractedText"
      | "extractedTransactionCount"
      | "extractionConfidence"
      | "extractionJobId"
      | "extractionStatus"
      | "fileName"
      | "fileSize"
      | "fileType"
      | "periodEnd"
      | "periodStart"
      | "processedAt"
      | "storageId"
      | "storageUrl"
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
  matchedPairs: {
    document: {
      accrualDocumentId?: Id<"accrualDocuments">;
      accrualTransactionId?: Id<"transactions">;
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
      by_session: ["sessionId", "_creationTime"];
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
      userId: string;
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
      _id: Id<"transactions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "amount"
      | "category"
      | "companyId"
      | "createdAt"
      | "date"
      | "description"
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
      by_status: ["companyId", "status", "_creationTime"];
      by_type: ["companyId", "type", "_creationTime"];
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
  worksheetColumns: {
    document: {
      columnType: "text" | "number" | "formula";
      dataSource?: string;
      deletedAt?: number;
      formula?: string;
      inputColumnId?: Id<"worksheetColumns">;
      name: string;
      order: number;
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
      | "formula"
      | "inputColumnId"
      | "name"
      | "order"
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
      name: string;
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
      | "name"
      | "updatedAt"
      | "workspaceId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_workspace: ["workspaceId", "_creationTime"];
      by_workspace_active: ["workspaceId", "deletedAt", "_creationTime"];
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
