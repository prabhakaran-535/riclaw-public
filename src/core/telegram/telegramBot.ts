import type { TelegramClient } from "../../integrations/telegram/telegramClient.js";
import type { TelegramCallbackQuery, TelegramMessage } from "../../integrations/telegram/telegramTypes.js";
import type { EditRequestReplyResult, TelegramAdminUseCases, TelegramBuildUseCases } from "./telegramUseCases.js";

type BuildAppDraft = {
  appName?: string;
  description?: string;
  featureList?: string;
};

type ConversationState =
  | {
      mode: "idle";
    }
  | {
      mode: "build_app";
      step: "awaiting_name" | "awaiting_description" | "awaiting_features";
      draft: BuildAppDraft;
    }
  | {
      mode: "app_details";
    }
  | {
      mode: "revision_history";
    }
  | {
      mode: "rollback";
      step: "awaiting_project" | "awaiting_revision";
      projectKey?: string;
    };

type HandleMessageResult = {
  jobId?: string;
  handled: boolean;
};

const BUILD_APP_LABEL = "Build An App";
const MY_APPS_LABEL = "List My Apps";
const APP_DETAILS_LABEL = "View App Details";
const REVISION_HISTORY_LABEL = "View Revision History";
const ROLLBACK_LABEL = "Rollback Revision";
const PROGRESS_LABEL = "Progress of the App";
const STOP_LABEL = "Stop Generating the App";
const EDIT_CALLBACK_PREFIX = "pending_edit";
const ROLLBACK_CALLBACK_PREFIX = "pending_rollback";

function normalizeCommand(text: string): string {
  return text.trim().toLowerCase();
}

export class TelegramBot {
  private readonly conversations = new Map<string, ConversationState>();

  constructor(
    private readonly telegramClient: TelegramClient,
    private readonly buildUseCases: TelegramBuildUseCases,
    private readonly adminUseCases: TelegramAdminUseCases
  ) {}

  async handleMessage(message: TelegramMessage): Promise<HandleMessageResult> {
    const text = message.text.trim();
    if (!text) {
      return { handled: false };
    }

    const command = normalizeCommand(text);
    if (command === "/start" || command === "/menu") {
      this.conversations.set(message.chatId, { mode: "idle" });
      await this.sendMenu(message.chatId);
      return { handled: true };
    }

    if (command === "/cancel") {
      this.conversations.set(message.chatId, { mode: "idle" });
      await this.sendMenu(message.chatId, "Cancelled the current flow.");
      return { handled: true };
    }

    if (command.startsWith("/allow") || command.startsWith("/revoke") || command === "/listusers") {
      return this.handleAdminCommand(message, command);
    }

    if (command === "/apps" || text === MY_APPS_LABEL) {
      return this.handleListApps(message);
    }

    if (command === "/app" || text === APP_DETAILS_LABEL) {
      this.conversations.set(message.chatId, { mode: "app_details" });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Send the project ID or slug for the app you want to inspect.",
        { removeKeyboard: true }
      );
      return { handled: true };
    }

    if (command.startsWith("/app ")) {
      return this.handleAppDetailsCommand(message, message.text.trim().slice(5).trim());
    }

    if (command === "/revisions" || text === REVISION_HISTORY_LABEL) {
      this.conversations.set(message.chatId, { mode: "revision_history" });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Send the project ID or slug for the revision history you want to view.",
        { removeKeyboard: true }
      );
      return { handled: true };
    }

    if (command.startsWith("/revisions ")) {
      return this.handleRevisionHistoryCommand(message, message.text.trim().slice(11).trim());
    }

    if (command === "/rollback" || text === ROLLBACK_LABEL) {
      this.conversations.set(message.chatId, { mode: "rollback", step: "awaiting_project" });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Send the project ID or slug for the app you want to roll back.",
        { removeKeyboard: true }
      );
      return { handled: true };
    }

    if (command.startsWith("/rollback ")) {
      return this.handleRollbackCommand(message, message.text.trim().slice(10).trim());
    }

    if (text === PROGRESS_LABEL) {
      return this.handleProgressRequest(message);
    }

    if (text === STOP_LABEL) {
      return this.handleStopRequest(message);
    }

    const current = this.conversations.get(message.chatId) ?? { mode: "idle" as const };
    if (text === BUILD_APP_LABEL) {
      if (!this.buildUseCases.canStartBuild(message.userId)) {
        await this.telegramClient.sendMessage(
          message.chatId,
          "You are not authorized to create apps with RIClaw."
        );
        return { handled: true };
      }
      this.conversations.set(message.chatId, {
        mode: "build_app",
        step: "awaiting_name",
        draft: {}
      });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Enter the app name.",
        { removeKeyboard: true }
      );
      return { handled: true };
    }

    if (current.mode === "build_app") {
      return this.handleBuildAppStep(message, current);
    }

    if (current.mode === "app_details") {
      this.conversations.set(message.chatId, { mode: "idle" });
      return this.handleAppDetailsCommand(message, text);
    }

    if (current.mode === "revision_history") {
      this.conversations.set(message.chatId, { mode: "idle" });
      return this.handleRevisionHistoryCommand(message, text);
    }

    if (current.mode === "rollback") {
      return this.handleRollbackStep(message, current);
    }

    const editRequestResult = this.buildUseCases.submitEditRequestReply({
      userId: message.userId,
      chatId: message.chatId,
      replyToMessageId: message.replyToMessageId,
      replyMessageId: message.messageId,
      requestedChange: message.text
    });
    if (editRequestResult.kind !== "not_edit_reply") {
      return this.handleEditRequestReply(message, editRequestResult);
    }

    return this.handlePotentialClarification(message);
  }

  async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<HandleMessageResult> {
    const parsed = this.parseCallback(callbackQuery.data);
    if (!parsed) {
      await this.telegramClient.answerCallbackQuery(callbackQuery.id, "Unsupported action.");
      return { handled: true };
    }

    if (parsed.kind === "pending_edit" && parsed.action === "confirm") {
      const result = this.buildUseCases.confirmPendingEditRequest({
        pendingEditRequestId: parsed.requestId,
        userId: callbackQuery.userId
      });
      await this.telegramClient.answerCallbackQuery(callbackQuery.id);

      if (result.kind === "not_found") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "That edit request could not be found anymore.");
        return { handled: true };
      }

      if (result.kind === "unauthorized_requester") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "Only the original requester can confirm this edit.");
        return { handled: true };
      }

      if (result.kind === "already_resolved") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          result.status === "cancelled"
            ? "That edit request was already cancelled."
            : "That edit request was already confirmed."
        );
        return { handled: true };
      }

      if (result.kind === "change_in_progress") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          `RIClaw already has an active or pending change for "${result.appName}".`
        );
        return { handled: true };
      }

      if (result.kind === "no_live_revision") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          `RIClaw could not find a successful live revision for "${result.appName}".`
        );
        return { handled: true };
      }

      await this.telegramClient.sendMessage(
        callbackQuery.chatId,
        `Starting a revision build for "${result.appName}".`,
        { keyboardLabels: [PROGRESS_LABEL, STOP_LABEL], resizeKeyboard: true }
      );
      return { handled: true, jobId: result.jobId };
    }

    if (parsed.kind === "pending_edit") {
      const result = this.buildUseCases.cancelPendingEditRequest({
        pendingEditRequestId: parsed.requestId,
        userId: callbackQuery.userId
      });
      await this.telegramClient.answerCallbackQuery(callbackQuery.id);

      if (result.kind === "not_found") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "That edit request could not be found anymore.");
        return { handled: true };
      }

      if (result.kind === "unauthorized_requester") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "Only the original requester can cancel this edit.");
        return { handled: true };
      }

      if (result.kind === "already_resolved") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          result.status === "confirmed"
            ? "That edit request was already confirmed."
            : "That edit request was already cancelled."
        );
        return { handled: true };
      }

      await this.telegramClient.sendMessage(
        callbackQuery.chatId,
        `Cancelled the pending edit for "${result.appName}".`
      );
      return { handled: true };
    }

    if (parsed.action === "confirm") {
      const result = this.buildUseCases.confirmPendingRollbackRequest({
        pendingRollbackRequestId: parsed.requestId,
        userId: callbackQuery.userId
      });
      await this.telegramClient.answerCallbackQuery(callbackQuery.id);

      if (result.kind === "not_found") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "That rollback request could not be found anymore.");
        return { handled: true };
      }

      if (result.kind === "unauthorized_requester") {
        await this.telegramClient.sendMessage(callbackQuery.chatId, "Only the original requester can confirm this rollback.");
        return { handled: true };
      }

      if (result.kind === "already_resolved") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          result.status === "cancelled"
            ? "That rollback request was already cancelled."
            : "That rollback request was already confirmed."
        );
        return { handled: true };
      }

      if (result.kind === "change_in_progress") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          `RIClaw already has an active or pending change for "${result.appName}".`
        );
        return { handled: true };
      }

      if (result.kind === "target_not_available") {
        await this.telegramClient.sendMessage(
          callbackQuery.chatId,
          `RIClaw could not use the selected rollback target for "${result.appName}".`
        );
        return { handled: true };
      }

      await this.telegramClient.sendMessage(
        callbackQuery.chatId,
        `Starting rollback for "${result.appName}" using revision ${result.revisionNumber}.`,
        { keyboardLabels: [PROGRESS_LABEL, STOP_LABEL], resizeKeyboard: true }
      );
      return { handled: true, jobId: result.jobId };
    }

    const result = this.buildUseCases.cancelPendingRollbackRequest({
      pendingRollbackRequestId: parsed.requestId,
      userId: callbackQuery.userId
    });
    await this.telegramClient.answerCallbackQuery(callbackQuery.id);

    if (result.kind === "not_found") {
      await this.telegramClient.sendMessage(callbackQuery.chatId, "That rollback request could not be found anymore.");
      return { handled: true };
    }

    if (result.kind === "unauthorized_requester") {
      await this.telegramClient.sendMessage(callbackQuery.chatId, "Only the original requester can cancel this rollback.");
      return { handled: true };
    }

    if (result.kind === "already_resolved") {
      await this.telegramClient.sendMessage(
        callbackQuery.chatId,
        result.status === "confirmed"
          ? "That rollback request was already confirmed."
          : "That rollback request was already cancelled."
      );
      return { handled: true };
    }

    await this.telegramClient.sendMessage(
      callbackQuery.chatId,
      `Cancelled the pending rollback for "${result.appName}" revision ${result.revisionNumber}.`
    );
    return { handled: true };
  }

  private async handleAdminCommand(message: TelegramMessage, command: string): Promise<HandleMessageResult> {
    if (command === "/listusers") {
      const result = this.adminUseCases.listUsers(message.userId);
      if (!result.ok) {
        await this.telegramClient.sendMessage(message.chatId, "Only RIClaw owners can use admin commands.");
        return { handled: true };
      }

      const lines = result.users?.length
        ? result.users.map((user) => `${user.telegramUserId} - ${user.role} - ${user.status}`)
        : ["No authorized users found."];
      await this.telegramClient.sendMessage(message.chatId, lines.join("\n"));
      return { handled: true };
    }

    const parts = message.text.trim().split(/\s+/);
    if (parts.length < 2) {
      await this.telegramClient.sendMessage(
        message.chatId,
        command.startsWith("/allow")
          ? "Usage: /allow <telegram_user_id> [owner|builder]"
          : "Usage: /revoke <telegram_user_id>"
      );
      return { handled: true };
    }

    if (command.startsWith("/allow")) {
      const result = this.adminUseCases.allowUser({
        actorUserId: message.userId,
        targetUserId: parts[1],
        role: parts[2] === "owner" ? "owner" : "builder"
      });
      if (!result.ok) {
        await this.telegramClient.sendMessage(
          message.chatId,
          result.reason === "not_owner"
            ? "Only RIClaw owners can use admin commands."
            : "Telegram user IDs should be numeric."
        );
        return { handled: true };
      }

      await this.telegramClient.sendMessage(message.chatId, result.message ?? "User authorized.");
      return { handled: true };
    }

    const result = this.adminUseCases.revokeUser({
      actorUserId: message.userId,
      targetUserId: parts[1]
    });
    if (!result.ok) {
      await this.telegramClient.sendMessage(
        message.chatId,
        result.reason === "not_owner"
          ? "Only RIClaw owners can use admin commands."
          : "Telegram user IDs should be numeric."
      );
      return { handled: true };
    }

    await this.telegramClient.sendMessage(message.chatId, result.message ?? "User revoked.");
    return { handled: true };
  }

  private async handleBuildAppStep(
    message: TelegramMessage,
    state: Extract<ConversationState, { mode: "build_app" }>
  ): Promise<HandleMessageResult> {
    if (state.step === "awaiting_name") {
      this.conversations.set(message.chatId, {
        mode: "build_app",
        step: "awaiting_description",
        draft: {
          ...state.draft,
          appName: message.text.trim()
        }
      });
      await this.telegramClient.sendMessage(message.chatId, "Enter the app description.");
      return { handled: true };
    }

    if (state.step === "awaiting_description") {
      this.conversations.set(message.chatId, {
        mode: "build_app",
        step: "awaiting_features",
        draft: {
          ...state.draft,
          description: message.text.trim()
        }
      });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Enter the list of features. You can send them as bullets, commas, or separate lines."
      );
      return { handled: true };
    }

    this.conversations.set(message.chatId, { mode: "idle" });
    const result = this.buildUseCases.submitBuildRequest({
      userId: message.userId,
      chatId: message.chatId,
      draft: {
        appName: state.draft.appName ?? "Untitled App",
        description: state.draft.description ?? "",
        featureList: message.text.trim()
      }
    });

    if (!result.ok) {
      await this.telegramClient.sendMessage(
        message.chatId,
        "You are not authorized to create apps with RIClaw."
      );
      return { handled: true };
    }

    await this.telegramClient.sendMessage(
      message.chatId,
      result.summaryLines.join("\n"),
      { keyboardLabels: [PROGRESS_LABEL, STOP_LABEL], resizeKeyboard: true }
    );
    return { handled: true, jobId: result.jobId };
  }

  private async handleRollbackStep(
    message: TelegramMessage,
    state: Extract<ConversationState, { mode: "rollback" }>
  ): Promise<HandleMessageResult> {
    if (state.step === "awaiting_project") {
      this.conversations.set(message.chatId, {
        mode: "rollback",
        step: "awaiting_revision",
        projectKey: message.text.trim()
      });
      await this.telegramClient.sendMessage(
        message.chatId,
        "Send the revision number you want to roll back to."
      );
      return { handled: true };
    }

    this.conversations.set(message.chatId, { mode: "idle" });
    return this.startRollback(message, state.projectKey ?? "", message.text.trim());
  }

  private async handlePotentialClarification(message: TelegramMessage): Promise<HandleMessageResult> {
    const result = this.buildUseCases.answerClarification({
      chatId: message.chatId,
      text: message.text
    });

    if (result.kind === "no_pending") {
      await this.sendMenu(
        message.chatId,
        "Choose an option from the menu to get started."
      );
      return { handled: true };
    }

    if (result.kind === "invalid_option") {
      await this.telegramClient.sendMessage(
        message.chatId,
        "Please choose one of the clarification options below so RIClaw can continue.",
        {
          keyboardLabels: result.options,
          resizeKeyboard: true,
          oneTimeKeyboard: true
        }
      );
      return { handled: true, jobId: result.jobId };
    }

    await this.telegramClient.sendMessage(
      message.chatId,
      "Thanks. RIClaw has the clarification it needs and is continuing your build.",
      { keyboardLabels: [PROGRESS_LABEL, STOP_LABEL], resizeKeyboard: true }
    );
    return { handled: true, jobId: result.jobId };
  }

  private async handleEditRequestReply(
    message: TelegramMessage,
    result: Exclude<EditRequestReplyResult, { kind: "not_edit_reply" }>
  ): Promise<HandleMessageResult> {
    if (result.kind === "unauthorized_requester") {
      await this.telegramClient.sendMessage(
        message.chatId,
        "Only the original requester can ask for edits on this app."
      );
      return { handled: true };
    }

    if (result.kind === "change_in_progress") {
      await this.telegramClient.sendMessage(
        message.chatId,
        `RIClaw already has an active or pending change for "${result.appName}".`
      );
      return { handled: true };
    }

    const confirmationMessage = await this.telegramClient.sendMessage(
      message.chatId,
      `Confirm this edit for "${result.appName}"?\n\n${result.requestedChange}`,
      {
        inlineButtons: [
          {
            text: "Confirm Edit",
            callbackData: `${EDIT_CALLBACK_PREFIX}:confirm:${result.pendingEditRequestId}`
          },
          {
            text: "Cancel",
            callbackData: `${EDIT_CALLBACK_PREFIX}:cancel:${result.pendingEditRequestId}`
          }
        ],
        replyToMessageId: message.messageId
      }
    );
    this.buildUseCases.recordPendingEditConfirmationMessage(
      result.pendingEditRequestId,
      confirmationMessage.messageId
    );
    return { handled: true };
  }

  private parseCallback(
    data: string
  ): { kind: "pending_edit" | "pending_rollback"; action: "confirm" | "cancel"; requestId: string } | null {
    const parts = data.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const kind = parts[0] === EDIT_CALLBACK_PREFIX
      ? "pending_edit"
      : parts[0] === ROLLBACK_CALLBACK_PREFIX
        ? "pending_rollback"
        : null;
    if (!kind) {
      return null;
    }

    if (parts[1] !== "confirm" && parts[1] !== "cancel") {
      return null;
    }

    return {
      kind,
      action: parts[1],
      requestId: parts[2]
    };
  }

  private async handleListApps(message: TelegramMessage): Promise<HandleMessageResult> {
    const result = this.buildUseCases.listApps(message.userId);
    if (result.apps.length === 0) {
      await this.telegramClient.sendMessage(
        message.chatId,
        "You do not have any apps yet.",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    const lines = ["Your apps:"];
    for (const app of result.apps) {
      lines.push(`- ${app.appName}`);
      lines.push(`  Project ID: ${app.projectId}`);
      lines.push(`  Slug: ${app.slug}`);
      if (app.latestRevisionNumber != null) {
        lines.push(`  Latest revision: ${app.latestRevisionNumber}`);
      }
      if (app.latestDeploymentUrl) {
        lines.push(`  Latest link: ${app.latestDeploymentUrl}`);
      }
    }
    await this.telegramClient.sendMessage(message.chatId, lines.join("\n"), {
      keyboardLabels: this.menuLabels(message.chatId),
      resizeKeyboard: true
    });
    return { handled: true };
  }

  private async handleAppDetailsCommand(message: TelegramMessage, projectKey: string): Promise<HandleMessageResult> {
    const result = this.buildUseCases.getAppDetails({
      userId: message.userId,
      projectKey
    });
    if (result.kind === "not_found") {
      await this.telegramClient.sendMessage(
        message.chatId,
        "RIClaw could not find one of your apps for that project ID or slug.",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    const lines = [
      `App: ${result.appName}`,
      `Project ID: ${result.projectId}`,
      `Slug: ${result.slug}`,
      `Revision count: ${result.totalRevisionCount}`
    ];
    if (result.latestRevisionNumber != null) {
      lines.push(`Latest revision: ${result.latestRevisionNumber}`);
    }
    if (result.latestRevisionStatus) {
      lines.push(`Latest status: ${result.latestRevisionStatus}`);
    }
    if (result.latestDeploymentUrl) {
      lines.push(`Latest link: ${result.latestDeploymentUrl}`);
    }

    await this.telegramClient.sendMessage(message.chatId, lines.join("\n"), {
      keyboardLabels: this.menuLabels(message.chatId),
      resizeKeyboard: true
    });
    return { handled: true };
  }

  private async handleRevisionHistoryCommand(message: TelegramMessage, projectKey: string): Promise<HandleMessageResult> {
    const result = this.buildUseCases.getRevisionHistory({
      userId: message.userId,
      projectKey
    });
    if (result.kind === "not_found") {
      await this.telegramClient.sendMessage(
        message.chatId,
        "RIClaw could not find one of your apps for that project ID or slug.",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    const lines = [`Revision history for ${result.appName}:`];
    for (const revision of result.revisions) {
      lines.push(`- Revision ${revision.revisionNumber} (${revision.status})`);
      lines.push(`  Created: ${revision.createdAt}`);
      if (revision.deploymentUrl) {
        lines.push(`  Link: ${revision.deploymentUrl}`);
      }
    }
    await this.telegramClient.sendMessage(message.chatId, lines.join("\n"), {
      keyboardLabels: this.menuLabels(message.chatId),
      resizeKeyboard: true
    });
    return { handled: true };
  }

  private async handleRollbackCommand(message: TelegramMessage, args: string): Promise<HandleMessageResult> {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      await this.telegramClient.sendMessage(
        message.chatId,
        "Usage: /rollback <project_id_or_slug> <revision_number>",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    return this.startRollback(message, parts[0], parts[1]);
  }

  private async startRollback(
    message: TelegramMessage,
    projectKey: string,
    revisionNumberText: string
  ): Promise<HandleMessageResult> {
    const revisionNumber = Number(revisionNumberText);
    if (!Number.isInteger(revisionNumber) || revisionNumber <= 0) {
      await this.telegramClient.sendMessage(
        message.chatId,
        "Revision numbers must be positive integers.",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    const result = this.buildUseCases.startRollbackRequest({
      userId: message.userId,
      chatId: message.chatId,
      projectKey,
      revisionNumber
    });

    if (result.kind === "not_found") {
      await this.telegramClient.sendMessage(
        message.chatId,
        "RIClaw could not find one of your apps for that project ID or slug.",
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    if (result.kind === "change_in_progress") {
      await this.telegramClient.sendMessage(
        message.chatId,
        `RIClaw already has an active or pending change for "${result.appName}".`,
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    if (result.kind === "revision_not_found") {
      await this.telegramClient.sendMessage(
        message.chatId,
        `RIClaw could not find that revision for "${result.appName}".`,
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    if (result.kind === "revision_not_completed") {
      await this.telegramClient.sendMessage(
        message.chatId,
        `Revision ${result.revisionNumber} for "${result.appName}" is not a successful revision and cannot be used for rollback.`,
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    if (result.kind === "already_latest") {
      await this.telegramClient.sendMessage(
        message.chatId,
        `Revision ${result.revisionNumber} is already the latest live revision for "${result.appName}".`,
        { keyboardLabels: this.menuLabels(message.chatId), resizeKeyboard: true }
      );
      return { handled: true };
    }

    const confirmationMessage = await this.telegramClient.sendMessage(
      message.chatId,
      `Confirm rollback for "${result.appName}" to revision ${result.revisionNumber}?\n\nRIClaw will create a new revision job from that successful revision.`,
      {
        inlineButtons: [
          {
            text: "Confirm Rollback",
            callbackData: `${ROLLBACK_CALLBACK_PREFIX}:confirm:${result.pendingRollbackRequestId}`
          },
          {
            text: "Cancel",
            callbackData: `${ROLLBACK_CALLBACK_PREFIX}:cancel:${result.pendingRollbackRequestId}`
          }
        ]
      }
    );
    this.buildUseCases.recordPendingRollbackConfirmationMessage(
      result.pendingRollbackRequestId,
      confirmationMessage.messageId
    );
    return { handled: true };
  }

  private async handleProgressRequest(message: TelegramMessage): Promise<HandleMessageResult> {
    const result = this.buildUseCases.getActiveBuildProgress(message.chatId);
    if (result.kind === "no_active_build") {
      await this.sendWithMenu(message.chatId, "There is no active build right now.");
      return { handled: true };
    }

    const lines = [
      `Build progress for job ${result.jobId}`,
      `Status: ${result.statusLabel}`,
      `Progress: ${result.progressPercent}%`
    ];

    if (result.currentPhase) {
      lines.push(`Current phase: ${result.currentPhase}`);
    }

    if (result.awaitingClarification) {
      lines.push("Next step: answer the clarification question in chat.");
    } else {
      lines.push(`Estimated time left: ${result.etaText}`);
    }

    await this.telegramClient.sendMessage(message.chatId, lines.join("\n"), {
      keyboardLabels: this.menuLabels(message.chatId),
      resizeKeyboard: true
    });
    return { handled: true, jobId: result.jobId };
  }

  private async handleStopRequest(message: TelegramMessage): Promise<HandleMessageResult> {
    const result = this.buildUseCases.stopActiveBuild(message.chatId);
    if (result.kind === "no_active_build") {
      await this.sendWithMenu(message.chatId, "There is no active build to stop.");
      return { handled: true };
    }

    await this.sendWithMenu(message.chatId, result.message);
    return { handled: true, jobId: result.jobId };
  }

  private async sendMenu(chatId: string, intro = "What would you like RIClaw to do?"): Promise<void> {
    await this.sendWithMenu(chatId, intro);
  }

  private async sendWithMenu(chatId: string, text: string): Promise<void> {
    const keyboardLabels = this.menuLabels(chatId);
    await this.telegramClient.sendMessage(chatId, text, {
      keyboardLabels,
      resizeKeyboard: true
    });
  }

  private menuLabels(chatId: string): string[] {
    return this.buildUseCases.hasActiveBuild(chatId)
      ? [BUILD_APP_LABEL, MY_APPS_LABEL, APP_DETAILS_LABEL, REVISION_HISTORY_LABEL, ROLLBACK_LABEL, PROGRESS_LABEL, STOP_LABEL]
      : [BUILD_APP_LABEL, MY_APPS_LABEL, APP_DETAILS_LABEL, REVISION_HISTORY_LABEL, ROLLBACK_LABEL];
  }
}
