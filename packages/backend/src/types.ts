/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * note - 通知オンにしているユーザーが投稿した
 * follow - フォローされた
 * mention - 投稿で自分が言及された
 * reply - 投稿に返信された
 * renote - 投稿がRenoteされた
 * quote - 投稿が引用Renoteされた
 * reaction - 投稿にリアクションされた
 * pollEnded - 自分のアンケートもしくは自分が投票したアンケートが終了した
 * scheduledNotePosted - 予約したノートが投稿された
 * scheduledNotePostFailed - 予約したノートの投稿に失敗した
 * receiveFollowRequest - フォローリクエストされた
 * followRequestAccepted - 自分の送ったフォローリクエストが承認された
 * roleAssigned - ロールが付与された
 * chatRoomInvitationReceived - チャットルームに招待された
 * achievementEarned - 実績を獲得
 * exportCompleted - エクスポートが完了
 * login - ログイン
 * createToken - トークン作成
 * app - アプリ通知
 * test - テスト通知（サーバー側）
 */
export const notificationTypes = [
	'note',
	'follow',
	'mention',
	'reply',
	'renote',
	'quote',
	'reaction',
	'pollEnded',
	'scheduledNotePosted',
	'scheduledNotePostFailed',
	'receiveFollowRequest',
	'followRequestAccepted',
	'roleAssigned',
	'chatRoomInvitationReceived',
	'achievementEarned',
	'exportCompleted',
	'login',
	'createToken',
	'app',
	'test',
] as const;

export const groupedNotificationTypes = [
	...notificationTypes,
	'reaction:grouped',
	'renote:grouped',
] as const;

export const obsoleteNotificationTypes = ['pollVote', 'groupInvited'] as const;

export const noteVisibilities = ['public', 'home', 'followers', 'specified'] as const;

export const noteReactionAcceptances = ['likeOnly', 'likeOnlyForRemote', 'nonSensitiveOnly', 'nonSensitiveOnlyForLocalLikeOnlyForRemote', null] as const;

export const mutedNoteReasons = ['word', 'manual', 'spam', 'other'] as const;

export const followingVisibilities = ['public', 'followers', 'private'] as const;
export const followersVisibilities = ['public', 'followers', 'private'] as const;

/**
 * ユーザーがエクスポートできるものの種類
 *
 * （主にエクスポート完了通知で使用するものであり、既存のDBの名称等と必ずしも一致しない）
 */
export const userExportableEntities = ['antenna', 'blocking', 'clip', 'customEmoji', 'favorite', 'following', 'muting', 'note', 'userList'] as const;

/**
 * ユーザーがインポートできるものの種類
 *
 * （主にインポート完了通知で使用するものであり、既存のDBの名称等と必ずしも一致しない）
 */
export const userImportableEntities = ['antenna', 'blocking', 'customEmoji', 'following', 'muting', 'userList'] as const;

export const moderationLogTypes = [
	'updateServerSettings',
	'suspend',
	'unsuspend',
	'updateUserNote',
	'addCustomEmoji',
	'updateCustomEmoji',
	'deleteCustomEmoji',
	'assignRole',
	'unassignRole',
	'createRole',
	'updateRole',
	'deleteRole',
	'clearQueue',
	'promoteQueue',
	'pauseQueue',
	'resumeQueue',
	'deleteDriveFile',
	'deleteNote',
	'createGlobalAnnouncement',
	'createUserAnnouncement',
	'updateGlobalAnnouncement',
	'updateUserAnnouncement',
	'deleteGlobalAnnouncement',
	'deleteUserAnnouncement',
	'resetPassword',
	'suspendRemoteInstance',
	'unsuspendRemoteInstance',
	'updateRemoteInstanceNote',
	'markSensitiveDriveFile',
	'unmarkSensitiveDriveFile',
	'resolveAbuseReport',
	'forwardAbuseReport',
	'updateAbuseReportNote',
	'createInvitation',
	'createAd',
	'updateAd',
	'deleteAd',
	'createAvatarDecoration',
	'updateAvatarDecoration',
	'deleteAvatarDecoration',
	'unsetUserAvatar',
	'unsetUserBanner',
	'createSystemWebhook',
	'updateSystemWebhook',
	'deleteSystemWebhook',
	'createAbuseReportNotificationRecipient',
	'updateAbuseReportNotificationRecipient',
	'deleteAbuseReportNotificationRecipient',
	'deleteAccount',
	'deletePage',
	'deleteFlash',
	'deleteGalleryPost',
	'deleteChatRoom',
	'updateProxyAccountDescription',
	'approveScrapedContent',
	'rejectScrapedContent',
] as const;

export type ModerationLogPayloads = {
	updateServerSettings: {
		before: unknown | null;
		after: unknown | null;
	};
	suspend: {
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	unsuspend: {
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	updateUserNote: {
		userId: string;
		userUsername: string;
		userHost: string | null;
		before: string | null;
		after: string | null;
	};
	addCustomEmoji: {
		emojiId: string;
		emoji: unknown;
	};
	updateCustomEmoji: {
		emojiId: string;
		before: unknown;
		after: unknown;
	};
	deleteCustomEmoji: {
		emojiId: string;
		emoji: unknown;
	};
	assignRole: {
		userId: string;
		userUsername: string;
		userHost: string | null;
		roleId: string;
		roleName: string;
		expiresAt: string | null;
	};
	unassignRole: {
		userId: string;
		userUsername: string;
		userHost: string | null;
		roleId: string;
		roleName: string;
	};
	createRole: {
		roleId: string;
		role: unknown;
	};
	updateRole: {
		roleId: string;
		before: unknown;
		after: unknown;
	};
	deleteRole: {
		roleId: string;
		role: unknown;
	};
	clearQueue: Record<string, never>;
	promoteQueue: Record<string, never>;
	pauseQueue: Record<string, never>;
	resumeQueue: Record<string, never>;
	deleteDriveFile: {
		fileId: string;
		fileUserId: string | null;
		fileUserUsername: string | null;
		fileUserHost: string | null;
	};
	deleteNote: {
		noteId: string;
		noteUserId: string;
		noteUserUsername: string;
		noteUserHost: string | null;
		note: unknown;
	};
	createGlobalAnnouncement: {
		announcementId: string;
		announcement: unknown;
	};
	createUserAnnouncement: {
		announcementId: string;
		announcement: unknown;
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	updateGlobalAnnouncement: {
		announcementId: string;
		before: unknown;
		after: unknown;
	};
	updateUserAnnouncement: {
		announcementId: string;
		before: unknown;
		after: unknown;
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	deleteGlobalAnnouncement: {
		announcementId: string;
		announcement: unknown;
	};
	deleteUserAnnouncement: {
		announcementId: string;
		announcement: unknown;
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	resetPassword: {
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	suspendRemoteInstance: {
		id: string;
		host: string;
	};
	unsuspendRemoteInstance: {
		id: string;
		host: string;
	};
	updateRemoteInstanceNote: {
		id: string;
		host: string;
		before: string | null;
		after: string | null;
	};
	markSensitiveDriveFile: {
		fileId: string;
		fileUserId: string | null;
		fileUserUsername: string | null;
		fileUserHost: string | null;
	};
	unmarkSensitiveDriveFile: {
		fileId: string;
		fileUserId: string | null;
		fileUserUsername: string | null;
		fileUserHost: string | null;
	};
	resolveAbuseReport: {
		reportId: string;
		report: unknown;
		forwarded?: boolean;
		resolvedAs?: string | null;
	};
	forwardAbuseReport: {
		reportId: string;
		report: unknown;
	};
	updateAbuseReportNote: {
		reportId: string;
		report: unknown;
		before: string;
		after: string;
	};
	createInvitation: {
		invitations: unknown[];
	};
	createAd: {
		adId: string;
		ad: unknown;
	};
	updateAd: {
		adId: string;
		before: unknown;
		after: unknown;
	};
	deleteAd: {
		adId: string;
		ad: unknown;
	};
	createAvatarDecoration: {
		avatarDecorationId: string;
		avatarDecoration: unknown;
	};
	updateAvatarDecoration: {
		avatarDecorationId: string;
		before: unknown;
		after: unknown;
	};
	deleteAvatarDecoration: {
		avatarDecorationId: string;
		avatarDecoration: unknown;
	};
	unsetUserAvatar: {
		userId: string;
		userUsername: string;
		userHost: string | null;
		fileId: string;
	};
	unsetUserBanner: {
		userId: string;
		userUsername: string;
		userHost: string | null;
		fileId: string;
	};
	createSystemWebhook: {
		systemWebhookId: string;
		webhook: unknown;
	};
	updateSystemWebhook: {
		systemWebhookId: string;
		before: unknown;
		after: unknown;
	};
	deleteSystemWebhook: {
		systemWebhookId: string;
		webhook: unknown;
	};
	createAbuseReportNotificationRecipient: {
		recipientId: string;
		recipient: unknown;
	};
	updateAbuseReportNotificationRecipient: {
		recipientId: string;
		before: unknown;
		after: unknown;
	};
	deleteAbuseReportNotificationRecipient: {
		recipientId: string;
		recipient: unknown;
	};
	deleteAccount: {
		userId: string;
		userUsername: string;
		userHost: string | null;
	};
	deletePage: {
		pageId: string;
		pageUserId: string;
		pageUserUsername: string;
		page: unknown;
	};
	deleteFlash: {
		flashId: string;
		flashUserId: string;
		flashUserUsername: string;
		flash: unknown;
	};
	deleteGalleryPost: {
		postId: string;
		postUserId: string;
		postUserUsername: string;
		post: unknown;
	};
	deleteChatRoom: {
		roomId: string;
		room: unknown;
	};
	updateProxyAccountDescription: {
		before: string | null;
		after: string | null;
	};
	approveScrapedContent: {
		scrapedContentId: string;
		source: string;
		author: string;
	};
	rejectScrapedContent: {
		scrapedContentId: string;
		source: string;
		author: string;
	};
};

export type Serialized<T> = {
	[K in keyof T]:
	T[K] extends Date
		? string
		: T[K] extends (Date | null)
			? (string | null)
			: T[K] extends Record<string, any>
				? Serialized<T[K]>
				: T[K] extends (Record<string, any> | null)
					? (Serialized<T[K]> | null)
					: T[K] extends (Record<string, any> | undefined)
						? (Serialized<T[K]> | undefined)
						: T[K];
};

export type FilterUnionByProperty<
	Union,
	Property extends string | number | symbol,
	Condition,
> = Union extends Record<Property, Condition> ? Union : never;

export type Awaitable<T> = T | Promise<T>;
