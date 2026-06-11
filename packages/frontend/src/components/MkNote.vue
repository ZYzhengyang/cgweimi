<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	v-if="!hardMuted && !hideByPlugin && muted === false"
	ref="rootEl"
	v-hotkey="keymap"
	:class="[$style.root, { [$style.showActionsOnlyHover]: prefer.s.showNoteActionsOnlyHover, [$style.skipRender]: prefer.s.skipNoteRender }]"
	tabindex="0"
>
	<MkNoteSub v-if="appearNote.replyId && !renoteCollapsed" :note="appearNote?.reply ?? null" :class="$style.replyTo"/>
	<div v-if="pinned" :class="$style.tip"><i class="ti ti-pin"></i> {{ i18n.ts.pinnedNote }}</div>
	<div v-if="isRenote" :class="$style.renote">
		<div v-if="note.channel" :class="$style.colorBar" :style="{ background: note.channel.color }"></div>
		<MkAvatar :class="$style.renoteAvatar" :user="note.user" link preview/>
		<i class="ti ti-repeat" style="margin-right: 4px;"></i>
		<I18n :src="i18n.ts.renotedBy" tag="span" :class="$style.renoteText">
			<template #user>
				<MkA v-user-preview="note.userId" :class="$style.renoteUserName" :to="userPage(note.user)">
					<MkUserName :user="note.user"/>
				</MkA>
			</template>
		</I18n>
		<div :class="$style.renoteInfo">
			<button ref="renoteTime" :class="$style.renoteTime" class="_button" @mousedown.prevent="showRenoteMenu()">
				<i class="ti ti-dots" :class="$style.renoteMenu"></i>
				<MkTime :time="note.createdAt"/>
			</button>
			<span v-if="note.visibility !== 'public'" style="margin-left: 0.5em;" :title="i18n.ts._visibility[note.visibility]">
				<i v-if="note.visibility === 'home'" class="ti ti-home"></i>
				<i v-else-if="note.visibility === 'followers'" class="ti ti-lock"></i>
				<i v-else-if="note.visibility === 'specified'" ref="specified" class="ti ti-mail"></i>
			</span>
			<span v-if="note.localOnly" style="margin-left: 0.5em;" :title="i18n.ts._visibility['disableFederation']"><i class="ti ti-rocket-off"></i></span>
			<span v-if="note.channel" style="margin-left: 0.5em;" :title="note.channel.name"><i class="ti ti-device-tv"></i></span>
		</div>
	</div>
	<div v-if="isRenote && note.renote == null" :class="$style.deleted">
		{{ i18n.ts.deletedNote }}
	</div>
	<div v-else-if="renoteCollapsed" :class="$style.collapsedRenoteTarget">
		<MkAvatar :class="$style.collapsedRenoteTargetAvatar" :user="appearNote.user" link preview/>
		<Mfm :text="getNoteSummary(appearNote)" :plain="true" :nowrap="true" :author="appearNote.user" :nyaize="'respect'" :class="$style.collapsedRenoteTargetText" @click="renoteCollapsed = false"/>
	</div>
	<article v-else :class="$style.article" @contextmenu.stop="onContextmenu" @click="openPopup">
		<div v-if="appearNote.channel" :class="$style.colorBar" :style="{ background: appearNote.channel.color }"></div>
		<div :class="$style.main">
			<!-- 顶部：头像+昵称+时间 -->
			<div :class="$style.noteHeader">
				<MkAvatar :class="$style.noteHeaderAvatar" :user="appearNote.user" :link="!mock" :preview="!mock"/>
				<div :class="$style.noteHeaderInfo">
					<MkNoteHeader :note="appearNote" :mini="true"/>
				</div>
			</div>
			<MkInstanceTicker v-if="showTicker" :host="appearNote.user.host" :instance="appearNote.user.instance"/>
			<div style="container-type: inline-size;">
				<p v-if="appearNote.cw != null" :class="$style.cw">
					<Mfm
						v-if="appearNote.cw != ''"
						:text="appearNote.cw"
						:author="appearNote.user"
						:nyaize="'respect'"
						:enableEmojiMenu="true"
						:enableEmojiMenuReaction="true"
					/>
					<MkCwButton v-model="showContent" :text="appearNote.text" :renote="appearNote.renote" :files="appearNote.files" :poll="appearNote.poll" style="margin: 4px 0;"/>
				</p>
				<div v-show="appearNote.cw == null || showContent" :class="[{ [$style.contentCollapsed]: collapsed }]">
					<div :class="$style.text">
						<span v-if="appearNote.isHidden" style="opacity: 0.5">({{ i18n.ts.private }})</span>
						<MkA v-if="appearNote.replyId" :class="$style.replyIcon" :to="`/notes/${appearNote.replyId}`"><i class="ti ti-arrow-back-up"></i></MkA>
						<Mfm
							v-if="appearNote.text"
							:parsedNodes="parsed"
							:text="appearNote.text"
							:author="appearNote.user"
							:nyaize="'respect'"
							:emojiUrls="appearNote.emojis"
							:enableEmojiMenu="true"
							:enableEmojiMenuReaction="true"
							class="_selectable"
						/>
						<div v-if="translating || translation" :class="$style.translation">
							<MkLoading v-if="translating" mini/>
							<div v-else-if="translation">
								<b>{{ i18n.tsx.translatedFrom({ x: translation.sourceLang }) }}: </b>
								<Mfm :text="translation.text" :author="appearNote.user" :nyaize="'respect'" :emojiUrls="appearNote.emojis" class="_selectable"/>
							</div>
						</div>
					</div>
					<MkPoll
						v-if="appearNote.poll"
						:noteId="appearNote.id"
						:multiple="appearNote.poll.multiple"
						:expiresAt="appearNote.poll.expiresAt"
						:choices="$appearNote.pollChoices"
						:author="appearNote.user"
						:emojiUrls="appearNote.emojis"
						:class="$style.poll"
					/>
					<div v-if="isEnabledUrlPreview">
						<MkUrlPreview v-for="url in urls" :key="url" :url="url" :compact="true" :detail="false" :class="$style.urlPreview"/>
					</div>
					<div v-if="appearNote.renoteId" :class="$style.quote"><MkNoteSimple :note="appearNote?.renote ?? null" :class="$style.quoteNote"/></div>
					<button v-if="(isLong && collapsed) || (hasMoreImages && !showAllImages)" :class="$style.collapsed" class="_button" @click="collapsed = false; showAllImages = true">
						<span :class="$style.collapsedLabel">{{ i18n.ts.showMore }}</span>
					</button>
					<button v-else-if="(isLong && !collapsed) || showAllImages" :class="$style.showLess" class="_button" @click="collapsed = true; showAllImages = false">
						<span :class="$style.showLessLabel">{{ i18n.ts.showLess }}</span>
					</button>
				</div>
				<!-- 媒体内容：统一显示所有媒体（视频+图片） -->
				<div v-if="appearNote.files && appearNote.files.length > 0" :class="$style.gallery" style="margin-top: 8px;">
					<MkMediaList ref="galleryEl" :mediaList="appearNote.files" :maxDisplay="4" @expand="openDetailPopup(4)"/>
				</div>
				<MkA v-if="appearNote.channel && !inChannel" :class="$style.channel" :to="`/channels/${appearNote.channel.id}`"><i class="ti ti-device-tv"></i> {{ appearNote.channel.name }}</MkA>
			</div>
			<MkReactionsViewer
				v-if="appearNote.reactionAcceptance !== 'likeOnly'"
				style="margin-top: 6px;"
				:reactions="$appearNote.reactions"
				:reactionEmojis="$appearNote.reactionEmojis"
				:myReaction="$appearNote.myReaction"
				:noteId="appearNote.id"
				:maxNumber="16"
				@mockUpdateMyReaction="emitUpdReaction"
			>
				<template #more>
					<MkA :to="`/notes/${appearNote.id}/reactions`" :class="[$style.reactionOmitted]">{{ i18n.ts.more }}</MkA>
				</template>
			</MkReactionsViewer>
			<footer :class="$style.footer">
				<!-- 💬 回复 -->
				<button v-if="isPostActionVisible('reply')" :class="$style.replyButton" class="_button" @click="toggleCommentInput()">
					<i class="ti ti-message-circle"></i>
					<p v-if="appearNote.repliesCount > 0" :class="$style.footerButtonCount">{{ compactNumber(appearNote.repliesCount) }}</p>
				</button>
				<!-- 🔁 转发 -->
				<button
					v-if="isPostActionVisible('renote') && canRenote"
					ref="renoteButton"
					:class="$style.renoteButton"
					class="_button"
					@mousedown.prevent="renote()"
				>
					<i class="ti ti-repeat"></i>
					<p v-if="appearNote.renoteCount > 0" :class="$style.footerButtonCount">{{ compactNumber(appearNote.renoteCount) }}</p>
				</button>
				<button v-else-if="isPostActionVisible('renote') && !canRenote" :class="$style.renoteButton" class="_button" disabled>
					<i class="ti ti-ban"></i>
				</button>
				<!-- ❤️ 点赞 -->
				<button v-if="isPostActionVisible('react')" ref="reactButton" :class="$style.likeButton" class="_button" @click="toggleReact()">
					<i v-if="appearNote.reactionAcceptance === 'likeOnly' && $appearNote.myReaction != null" class="ti ti-heart-filled" :class="{ [$style.bounceLike]: isBouncing }" style="color: var(--MI_THEME-love);" @animationend="isBouncing = false"></i>
					<i v-else-if="$appearNote.myReaction != null" class="ti ti-heart-filled" style="color: var(--MI_THEME-accent);"></i>
					<i v-else class="ti ti-heart"></i>
					<p v-if="(appearNote.reactionAcceptance === 'likeOnly' || prefer.s.showReactionsCount) && $appearNote.reactionCount > 0" :class="$style.footerButtonCount">{{ compactNumber($appearNote.reactionCount) }}</p>
				</button>
				<!-- ↗️ 分享 -->
				<button :class="$style.shareButton" class="_button" @click="shareNote()">
					<i class="ti ti-share"></i>
				</button>
			</footer>
			<!-- 评论列表 + 输入框（微博风格） -->
			<div v-if="showCommentInput" :class="$style.commentBox" @click.stop>
				<!-- 加载中 -->
				<div v-if="commentLoading" :class="$style.commentLoading"><MkLoading mini/></div>
				<!-- 评论列表（时间倒序） -->
				<div v-else-if="commentReplies.length > 0" :class="$style.commentList">
					<div v-for="cmt in commentReplies" :key="cmt.id" :class="$style.commentItem">
						<MkAvatar :user="cmt.user" :class="$style.commentAvatar"/>
						<div :class="$style.commentBody">
							<span :class="$style.commentName">{{ cmt.user?.name ?? cmt.user?.username }}</span>
							<Mfm v-if="cmt.text" :text="cmt.text" :author="cmt.user" :emojiUrls="cmt.emojis" class="_selectable" :class="$style.commentText"/>
							<div :class="$style.commentTime"><MkTime :time="cmt.createdAt"/></div>
						</div>
					</div>
				</div>
				<!-- 空状态 -->
				<div v-else :class="$style.commentEmpty">暂无评论</div>
				<!-- 输入框 -->
				<div :class="$style.commentInputWrap">
					<textarea
						ref="commentTextarea"
						v-model="commentText"
						:class="$style.commentTextarea"
						placeholder="写评论..."
						rows="1"
						@keydown.enter.exact.prevent="submitComment"
					></textarea>
					<button
						class="_button"
						:class="$style.commentEmojiBtn"
						@click="showEmojiPicker($event)"
					>
						<i class="ti ti-mood-happy"></i>
					</button>
					<button
						class="_button"
						:class="$style.commentSubmitBtn"
						:disabled="!commentText.trim()"
						@click="submitComment"
					>
						<i class="ti ti-send"></i>
					</button>
				</div>
			</div>
		</div>
	</article>
</div>
<div v-else-if="!hardMuted && !hideByPlugin" :class="$style.muted" @click="muted = false">
	<I18n v-if="muted === 'sensitiveMute'" :src="i18n.ts.userSaysSomethingSensitive" tag="small">
		<template #name>
			<MkA v-user-preview="appearNote.userId" :to="userPage(appearNote.user)">
				<MkUserName :user="appearNote.user"/>
			</MkA>
		</template>
	</I18n>
	<I18n v-else-if="showSoftWordMutedWord !== true" :src="i18n.ts.userSaysSomething" tag="small">
		<template #name>
			<MkA v-user-preview="appearNote.userId" :to="userPage(appearNote.user)">
				<MkUserName :user="appearNote.user"/>
			</MkA>
		</template>
	</I18n>
	<I18n v-else :src="i18n.ts.userSaysSomethingAbout" tag="small">
		<template #name>
			<MkA v-user-preview="appearNote.userId" :to="userPage(appearNote.user)">
				<MkUserName :user="appearNote.user"/>
			</MkA>
		</template>
		<template #word>
			{{ Array.isArray(muted) ? muted.map(words => Array.isArray(words) ? words.join() : words).slice(0, 3).join(' ') : muted }}
		</template>
	</I18n>
</div>
<div v-else>
	<!--
		MkDateSeparatedList uses TransitionGroup which requires single element in the child elements
		so MkNote create empty div instead of no elements
	-->
</div>
</template>

<script lang="ts" setup>
import { computed, inject, onMounted, ref, useTemplateRef, provide, nextTick } from 'vue';
import * as mfm from 'mfm-js';
import * as Misskey from 'misskey-js';
import { isLink } from '@@/js/is-link.js';
import { shouldCollapsed } from '@@/js/collapsed.js';
import { host } from '@@/js/config.js';
import type { Ref } from 'vue';
import type { MenuItem } from '@/types/menu.js';
import type { OpenOnRemoteOptions } from '@/utility/please-login.js';
import type { Keymap } from '@/utility/hotkey.js';
import MkNoteSub from '@/components/MkNoteSub.vue';
import MkNoteHeader from '@/components/MkNoteHeader.vue';
import MkNoteSimple from '@/components/MkNoteSimple.vue';
import MkReactionsViewer from '@/components/MkReactionsViewer.vue';
import MkReactionsViewerDetails from '@/components/MkReactionsViewer.details.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import MkCwButton from '@/components/MkCwButton.vue';
import MkPoll from '@/components/MkPoll.vue';
import MkUsersTooltip from '@/components/MkUsersTooltip.vue';
import MkUrlPreview from '@/components/MkUrlPreview.vue';
import MkWorkPopup from '@/components/MkWorkPopup.vue';
import MkInstanceTicker from '@/components/MkInstanceTicker.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkTime from '@/components/global/MkTime.vue';
import { pleaseLogin } from '@/utility/please-login.js';
import { checkWordMute } from '@/utility/check-word-mute.js';
import { notePage } from '@/filters/note.js';
import { userPage } from '@/filters/user.js';
import * as os from '@/os.js';
import * as sound from '@/utility/sound.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';
import { reactionPicker } from '@/utility/reaction-picker.js';
import { emojiPicker } from '@/utility/emoji-picker.js';
import { extractUrlFromMfm } from '@/utility/extract-url-from-mfm.js';
import { $i, iAmAdmin } from '@/i.js';
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { getAbuseNoteMenu, getCopyNoteLinkMenu, getNoteClipMenu, getNoteMenu, getRenoteMenu } from '@/utility/get-note-menu.js';
import { noteEvents, useNoteCapture } from '@/composables/use-note-capture.js';
import { deepClone } from '@/utility/clone.js';
import { useTooltip } from '@/composables/use-tooltip.js';
import { claimAchievement } from '@/utility/achievements.js';
import { getNoteSummary } from '@/utility/get-note-summary.js';
import MkRippleEffect from '@/components/MkRippleEffect.vue';
import { showMovedDialog } from '@/utility/show-moved-dialog.js';
import { isEnabledUrlPreview } from '@/utility/url-preview.js';
import { focusPrev, focusNext } from '@/utility/focus.js';
import { getAppearNote } from '@/utility/get-appear-note.js';
import { prefer } from '@/preferences.js';
import { getPluginHandlers } from '@/plugin.js';
import { DI } from '@/di.js';
import { globalEvents } from '@/events.js';

const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
function compactNumber(n: number | undefined | null): string {
	if (n == null || n <= 0) return '';
	return compactFormat.format(n);
}

const props = withDefaults(defineProps<{
	note: Misskey.entities.Note;
	pinned?: boolean;
	mock?: boolean;
	withHardMute?: boolean;
}>(), {
	mock: false,
});

provide(DI.mock, props.mock);

const emit = defineEmits<{
	(ev: 'reaction', emoji: string): void;
	(ev: 'removeReaction', emoji: string): void;
}>();

const inTimeline = inject<boolean>('inTimeline', false);
const tl_withSensitive = inject<Ref<boolean>>('tl_withSensitive', ref(true));
const inChannel = inject(DI.inChannel, null);
const currentClip = inject<Ref<Misskey.entities.Clip> | null>('currentClip', null);

let note = deepClone(props.note);

// plugin
const noteViewInterruptors = getPluginHandlers('note_view_interruptor');
const hideByPlugin = ref(false);
if (noteViewInterruptors.length > 0) {
	let result: Misskey.entities.Note | null = deepClone(note);
	for (const interruptor of noteViewInterruptors) {
		try {
			result = interruptor.handler(result!) as Misskey.entities.Note | null;
		} catch (err) {
			console.error(err);
		}
	}
	if (result == null) {
		hideByPlugin.value = true;
	} else {
		note = result as Misskey.entities.Note;
	}
}

const isRenote = Misskey.note.isPureRenote(note);
const appearNote = getAppearNote(note) ?? note;
const { $note: $appearNote, subscribe: subscribeManuallyToNoteCapture } = useNoteCapture({
	note: appearNote,
	parentNote: note,
	mock: props.mock,
});

const rootEl = useTemplateRef('rootEl');
const menuButton = useTemplateRef('menuButton');
const renoteButton = useTemplateRef('renoteButton');
const renoteTime = useTemplateRef('renoteTime');
const reactButton = useTemplateRef('reactButton');
const clipButton = useTemplateRef('clipButton');
const galleryEl = useTemplateRef('galleryEl');
const commentTextarea = useTemplateRef('commentTextarea');
const isMyRenote = $i && ($i.id === note.userId);
const showContent = ref(false);
const parsed = computed(() => appearNote.text ? mfm.parse(appearNote.text) : null);
const urls = computed(() => parsed.value ? extractUrlFromMfm(parsed.value).filter((url) => appearNote.renote?.url !== url && appearNote.renote?.uri !== url) : null);
const isLong = shouldCollapsed(appearNote, urls.value ?? []);
const collapsed = ref(appearNote.cw == null && isLong);
const showAllImages = ref(false);
const hasMoreImages = computed(() => (appearNote.files?.filter(f => f.type.startsWith('image/')).length || 0) > 9);
const muted = ref(checkMute(appearNote, $i?.mutedWords));
const hardMuted = ref(props.withHardMute && checkMute(appearNote, $i?.hardMutedWords, true));
const isBouncing = ref(false);
const showCommentInput = ref(false);
const commentText = ref('');
const commentReplies = ref<Misskey.entities.Note[]>([]);
const commentLoading = ref(false);
const showSoftWordMutedWord = computed(() => prefer.s.showSoftWordMutedWord);
const translation = ref<Misskey.entities.NotesTranslateResponse | null>(null);
const translating = ref(false);
const showTicker = (prefer.s.instanceTicker === 'always') || (prefer.s.instanceTicker === 'remote' && appearNote.user.instance);
const canRenote = computed(() => ['public', 'home'].includes(appearNote.visibility) || (appearNote.visibility === 'followers' && appearNote.userId === $i?.id));
const renoteCollapsed = ref(
	prefer.s.collapseRenotes && isRenote && (
		($i && ($i.id === note.userId || $i.id === appearNote.userId)) || // `||` must be `||`! See https://github.com/misskey-dev/misskey/issues/13131
		($appearNote.myReaction != null)
	),
);

const pleaseLoginContext = computed<OpenOnRemoteOptions>(() => ({
	type: 'lookup',
	url: `https://${host}/notes/${appearNote.id}`,
}));

/* eslint-disable no-redeclare */
/** checkOnlyでは純粋なワードミュート結果をbooleanで返却す�?*/
function checkMute(noteToCheck: Misskey.entities.Note, mutedWords: Array<string | string[]> | undefined | null, checkOnly: true): boolean;
function checkMute(noteToCheck: Misskey.entities.Note, mutedWords: Array<string | string[]> | undefined | null, checkOnly?: false): Array<string | string[]> | false | 'sensitiveMute';

function checkMute(noteToCheck: Misskey.entities.Note, mutedWords: Array<string | string[]> | undefined | null, checkOnly = false): Array<string | string[]> | boolean | 'sensitiveMute' {
	if (mutedWords != null) {
		const result = checkWordMute(noteToCheck, $i, mutedWords);
		if (Array.isArray(result)) {
			return checkOnly ? (result.length > 0) : result;
		}

		const replyResult = noteToCheck.reply && checkWordMute(noteToCheck.reply, $i, mutedWords);
		if (Array.isArray(replyResult)) {
			return checkOnly ? (replyResult.length > 0) : replyResult;
		}

		const renoteResult = noteToCheck.renote && checkWordMute(noteToCheck.renote, $i, mutedWords);
		if (Array.isArray(renoteResult)) {
			return checkOnly ? (renoteResult.length > 0) : renoteResult;
		}
	}

	if (checkOnly) return false;

	if (inTimeline && tl_withSensitive.value === false && noteToCheck.files?.some((v) => v.isSensitive)) {
		return 'sensitiveMute';
	}

	return false;
}
/* eslint-enable no-redeclare */

const keymap = {
	'r': () => {
		if (renoteCollapsed.value) return;
		reply();
	},
	'e|a|plus': () => {
		if (renoteCollapsed.value) return;
		react();
	},
	'q': () => {
		if (renoteCollapsed.value) return;
		renote();
	},
	'm': () => {
		if (renoteCollapsed.value) return;
		showMenu();
	},
	'c': () => {
		if (renoteCollapsed.value) return;
		if (!prefer.s.showClipButtonInNoteFooter) return;
		clip();
	},
	'o': () => {
		if (renoteCollapsed.value) return;
		galleryEl.value?.openGallery();
	},
	'v|enter': () => {
		if (renoteCollapsed.value) {
			renoteCollapsed.value = false;
		} else if (appearNote.cw != null) {
			showContent.value = !showContent.value;
		} else if (isLong || hasMoreImages.value) {
			collapsed.value = !collapsed.value;
			showAllImages.value = !showAllImages.value;
		}
	},
	'esc': {
		allowRepeat: true,
		callback: () => blur(),
	},
	'up|k|shift+tab': {
		allowRepeat: true,
		callback: () => focusBefore(),
	},
	'down|j|tab': {
		allowRepeat: true,
		callback: () => focusAfter(),
	},
} as const satisfies Keymap;

provide(DI.mfmEmojiReactCallback, (reaction) => {
	sound.playMisskeySfx('reaction');
	misskeyApi('notes/reactions/create', {
		noteId: appearNote.id,
		reaction: reaction,
	}).then(() => {
		noteEvents.emit(`reacted:${appearNote.id}`, {
			userId: $i!.id,
			reaction: reaction,
		});
	});
});

if (!props.mock) {
	useTooltip(renoteButton, async (showing) => {
		const renotes = await misskeyApi('notes/renotes', {
			noteId: appearNote.id,
			limit: 11,
		});

		const users = renotes.map(x => x.user);

		if (users.length < 1 || renoteButton.value == null) return;

		const { dispose } = os.popup(MkUsersTooltip, {
			showing,
			users,
			count: appearNote.renoteCount,
			anchorElement: renoteButton.value,
		}, {
			closed: () => dispose(),
		});
	});

	if (appearNote.reactionAcceptance === 'likeOnly') {
		useTooltip(reactButton, async (showing) => {
			const reactions = await misskeyApiGet('notes/reactions', {
				noteId: appearNote.id,
				limit: 10,
				_cacheKey_: $appearNote.reactionCount,
			});

			const users = reactions.map(x => x.user);

			if (users.length < 1) return;

			const { dispose } = os.popup(MkReactionsViewerDetails, {
				showing,
				reaction: '❤️',
				users,
				count: $appearNote.reactionCount,
				anchorElement: reactButton.value!,
			}, {
				closed: () => dispose(),
			});
		});
	}
}

async function renote() {
	if (props.mock) return;

	const isLoggedIn = await pleaseLogin({ openOnRemote: pleaseLoginContext.value });
	if (!isLoggedIn) return;

	showMovedDialog();

	const { menu } = getRenoteMenu({ note: note, renoteButton, mock: props.mock });
	os.popupMenu(menu, renoteButton.value);

	subscribeManuallyToNoteCapture();
}

function openPopup(ev: MouseEvent) {
	// 如果点击的是链接、按钮等，不打开弹窗
	const target = ev.target as HTMLElement;
	if (target.closest('a') || target.closest('button') || target.closest('._button')) return;

	openDetailPopup();
}

// 打开详情弹窗（主页帖子 + 作品栏统一）
function openDetailPopup(startIndex?: number) {
	const { dispose } = os.popup(MkWorkPopup, { note: appearNote, startIndex }, {
		closed: () => dispose(),
	});
}

// 帖子操作按钮权限
function isPostActionVisible(action: string): boolean {
	if (iAmAdmin) return true;
	const hidden = instance.clientOptions?.hiddenUIElements?.postActions ?? [];
	return !hidden.includes(action);
}

async function reply() {
	if (props.mock) return;

	const isLoggedIn = await pleaseLogin({ openOnRemote: pleaseLoginContext.value });
	if (!isLoggedIn) return;

	os.post({
		reply: appearNote,
		channel: appearNote.channel,
	}).then(() => {
		focus();
	});
}

async function toggleCommentInput() {
	showCommentInput.value = !showCommentInput.value;
	if (showCommentInput.value) {
		// 加载已有评论
		commentLoading.value = true;
		try {
			const replies = await misskeyApi('notes/replies', {
				noteId: appearNote.id,
				limit: 50,
			});
			// 按时间倒序（最新在前）
			commentReplies.value = replies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} catch (err) {
			console.error('Failed to load replies:', err);
			commentReplies.value = [];
		}
		commentLoading.value = false;
		// 自动聚焦输入框
		nextTick(() => {
			commentTextarea.value?.focus();
		});
	}
}

async function submitComment() {
	if (!commentText.value.trim()) return;

	const isLoggedIn = await pleaseLogin({ openOnRemote: pleaseLoginContext.value });
	if (!isLoggedIn) return;

	try {
		const result = await misskeyApi('notes/create', {
			text: commentText.value.trim(),
			replyId: appearNote.id,
		});
		commentText.value = '';
		appearNote.repliesCount = (appearNote.repliesCount || 0) + 1;
		// 刷新评论列表（倒序，最新在前）
		if (result.createdNote) {
			commentReplies.value = [result.createdNote, ...commentReplies.value];
		}
		os.toast('评论已发送');
	} catch (e) {
		console.error('Failed to post comment:', e);
		os.toast('评论发送失败');
	}
}

function showEmojiPicker(ev: MouseEvent) {
	const target = ev.currentTarget as HTMLElement;
	if (!target) return;
	emojiPicker.show(target, (emoji: string) => {
		commentText.value += emoji;
	});
}

async function react() {
	const isLoggedIn = await pleaseLogin({ openOnRemote: pleaseLoginContext.value });
	if (!isLoggedIn) return;

	showMovedDialog();
	if (appearNote.reactionAcceptance === 'likeOnly') {
		sound.playMisskeySfx('reaction');

		if (props.mock) {
			return;
		}

		misskeyApi('notes/reactions/create', {
			noteId: appearNote.id,
			reaction: '❤️',
		}).then(() => {
			noteEvents.emit(`reacted:${appearNote.id}`, {
				userId: $i!.id,
				reaction: '❤️',
			});
		});
		const el = reactButton.value;
		if (el && prefer.s.animation) {
			const rect = el.getBoundingClientRect();
			const x = rect.left + (el.offsetWidth / 2);
			const y = rect.top + (el.offsetHeight / 2);
			const { dispose } = os.popup(MkRippleEffect, { x, y }, {
				end: () => dispose(),
			});
		}
		isBouncing.value = false;
		void nextTick(() => {
			isBouncing.value = true;
		});
	} else {
		blur();
		reactionPicker.show(reactButton.value ?? null, note, async (reaction) => {
			if (prefer.s.confirmOnReact) {
				const confirm = await os.confirm({
					type: 'question',
					text: i18n.tsx.reactAreYouSure({ emoji: reaction.replace('@.', '') }),
				});

				if (confirm.canceled) return;
			}

			sound.playMisskeySfx('reaction');

			if (props.mock) {
				emit('reaction', reaction);
				$appearNote.reactions[reaction] = 1;
				$appearNote.reactionCount++;
				$appearNote.myReaction = reaction;
				return;
			}

			misskeyApi('notes/reactions/create', {
				noteId: appearNote.id,
				reaction: reaction,
			}).then(() => {
				noteEvents.emit(`reacted:${appearNote.id}`, {
					userId: $i!.id,
					reaction: reaction,
				});
			});

			if (appearNote.text && appearNote.text.length > 100 && (Date.now() - new Date(appearNote.createdAt).getTime() < 1000 * 3)) {
				claimAchievement('reactWithoutRead');
			}
		}, () => {
			focus();
		});
	}
}

function undoReact(): void {
	const oldReaction = $appearNote.myReaction;
	if (!oldReaction) return;

	if (props.mock) {
		emit('removeReaction', oldReaction);
		return;
	}

	misskeyApi('notes/reactions/delete', {
		noteId: appearNote.id,
	}).then(() => {
		noteEvents.emit(`unreacted:${appearNote.id}`, {
			userId: $i!.id,
			reaction: oldReaction,
		});
	});
}

function toggleReact() {
	if ($appearNote.myReaction == null) {
		react();
	} else {
		undoReact();
	}
}

async function shareNote() {
	const url = `https://${host}/notes/${appearNote.id}`;
	try {
		await navigator.clipboard.writeText(url);
	} catch {
		const ta = document.createElement('textarea');
		ta.value = url;
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		document.body.removeChild(ta);
	}
	os.success();
}

function onContextmenu(ev: PointerEvent): void {
	if (props.mock) {
		return;
	}

	if (ev.target && isLink(ev.target as HTMLElement)) return;
	if (window.getSelection()?.toString() !== '') return;

	if (prefer.s.useReactionPickerForContextMenu) {
		ev.preventDefault();
		react();
	} else {
		const { menu, cleanup } = getNoteMenu({ note: note, translating, translation, currentClip: currentClip?.value });
		os.contextMenu(menu, ev).then(focus).finally(cleanup);
	}
}

function showMenu(): void {
	if (props.mock) {
		return;
	}

	const { menu, cleanup } = getNoteMenu({ note: note, translating, translation, currentClip: currentClip?.value });
	os.popupMenu(menu, menuButton.value).then(focus).finally(cleanup);
}

async function clip(): Promise<void> {
	if (props.mock) {
		return;
	}

	os.popupMenu(await getNoteClipMenu({ note: note, currentClip: currentClip?.value }), clipButton.value).then(focus);
}

async function showRenoteMenu() {
	if (props.mock) {
		return;
	}
	const isLoggedIn = await pleaseLogin({ openOnRemote: pleaseLoginContext.value });
	if (!isLoggedIn) return;

	function getUnrenote(): MenuItem {
		return {
			text: i18n.ts.unrenote,
			icon: 'ti ti-trash',
			danger: true,
			action: () => {
				misskeyApi('notes/delete', {
					noteId: note.id,
				}).then(() => {
					globalEvents.emit('noteDeleted', note.id);
				});
			},
		};
	}

	const renoteDetailsMenu: MenuItem[] = [{
		type: 'link',
		text: i18n.ts.renoteDetails,
		icon: 'ti ti-info-circle',
		to: notePage(note),
	}];

	if (
		props.note.channelId != null &&
		(inChannel == null || props.note.channelId !== inChannel.value)
	) {
		renoteDetailsMenu.push({
			type: 'link',
			text: i18n.ts.viewRenotedChannel,
			icon: 'ti ti-device-tv',
			to: `/channels/${props.note.channelId}`,
		});
	}

	if (isMyRenote) {
		os.popupMenu([
			...renoteDetailsMenu,
			getCopyNoteLinkMenu(note, i18n.ts.copyLinkRenote),
			{ type: 'divider' },
			getUnrenote(),
		], renoteTime.value);
	} else {
		os.popupMenu([
			...renoteDetailsMenu,
			getCopyNoteLinkMenu(note, i18n.ts.copyLinkRenote),
			{ type: 'divider' },
			getAbuseNoteMenu(note, i18n.ts.reportAbuseRenote),
			...(($i?.isModerator || $i?.isAdmin) ? [getUnrenote()] : []),
		], renoteTime.value);
	}
}

function focus() {
	rootEl.value?.focus();
}

function blur() {
	rootEl.value?.blur();
}

function focusBefore() {
	focusPrev(rootEl.value);
}

function focusAfter() {
	focusNext(rootEl.value);
}

function emitUpdReaction(emoji: string, delta: number) {
	if (delta < 0) {
		emit('removeReaction', emoji);
	} else if (delta > 0) {
		emit('reaction', emoji);
	}
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	font-size: 1.05em;
	overflow: clip;
	contain: content;
	/* X/微博风格：分割线分隔，无卡片阴影 */
	border-bottom: 1px solid var(--MI_THEME-divider);
	margin-bottom: 0;
	border-radius: 0;
	background: transparent;
	transition: none;

	&:focus-visible {
		outline: none;

		&::after {
			content: "";
			pointer-events: none;
			display: block;
			position: absolute;
			z-index: 10;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			margin: auto;
			width: calc(100% - 8px);
			height: calc(100% - 8px);
			border: dashed 2px var(--MI_THEME-focus);
			border-radius: var(--MI-radius);
			box-sizing: border-box;
		}
	}

	.footer {
		position: relative;
		z-index: 1;
	}

	&.showActionsOnlyHover {
		.footer {
			visibility: hidden;
			position: absolute;
			top: 12px;
			right: 12px;
			padding: 0 4px;
			margin-bottom: 0 !important;
			background: var(--MI_THEME-popup);
			border-radius: 8px;
			box-shadow: 0px 4px 32px var(--MI_THEME-shadow);
		}

		.footerButton {
			font-size: 90%;
		}
	}

	&.showActionsOnlyHover:hover {
		.footer {
			visibility: visible;
		}
	}
}

.skipRender {
	// TODO: これが有効だとTransitionGroupでnoteを追加するときに一瞬がくっとなってしまうのをどうにかしたい
	// Transitionが完了するのを待ってからskipRenderを付与すれば解決しそうだけどパフォーマンス的な影響が不明
	content-visibility: auto;
	contain-intrinsic-size: 0 150px;
}

.tip {
	display: flex;
	align-items: center;
	padding: 12px 20px 4px 20px;
	line-height: 24px;
	font-size: 90%;
	white-space: pre;
	color: var(--MI_THEME-orange);
}

.tip + .article {
	padding-top: 8px;
}

.replyTo {
	opacity: 0.7;
	padding-bottom: 0;
}

.renote {
	position: relative;
	display: flex;
	align-items: center;
	padding: 12px 20px 4px 20px;
	line-height: 28px;
	white-space: pre;
	color: var(--MI_THEME-renote);

	& + .article {
		padding-top: 8px;
	}

	> .colorBar {
		height: calc(100% - 6px);
	}
}

.renoteAvatar {
	flex-shrink: 0;
	display: inline-block;
	width: 28px;
	height: 28px;
	margin: 0 8px 0 0;
}

.renoteText {
	overflow: hidden;
	flex-shrink: 1;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.renoteUserName {
	font-weight: bold;
}

.renoteInfo {
	margin-left: auto;
	font-size: 0.9em;
}

.renoteTime {
	flex-shrink: 0;
	color: inherit;
}

.renoteMenu {
	margin-right: 4px;
}

.collapsedRenoteTarget {
	display: flex;
	align-items: center;
	line-height: 28px;
	white-space: pre;
	padding: 0 32px 18px;
}

.collapsedRenoteTargetAvatar {
	flex-shrink: 0;
	display: inline-block;
	width: 28px;
	height: 28px;
	margin: 0 8px 0 0;
}

.collapsedRenoteTargetText {
	overflow: hidden;
	flex-shrink: 1;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 90%;
	opacity: 0.7;
	cursor: pointer;

	&:hover {
		text-decoration: underline;
	}
}

.article {
	position: relative;
	display: flex;
	padding: 16px 20px;
	cursor: pointer;
}

.colorBar {
	position: absolute;
	top: 8px;
	left: 8px;
	width: 5px;
	height: calc(100% - 16px);
	border-radius: 999px;
	pointer-events: none;
}

.main {
	flex: 1;
	min-width: 0;
}

.cw {
	cursor: default;
	display: block;
	margin: 0;
	padding: 0;
	overflow-wrap: break-word;
}

.showLess {
	width: 100%;
	margin-top: 14px;
	position: sticky;
	bottom: calc(var(--MI-stickyBottom, 0px) + 14px);
}

.showLessLabel {
	display: inline-block;
	background: var(--MI_THEME-popup);
	padding: 6px 10px;
	font-size: 0.8em;
	border-radius: 999px;
	box-shadow: 0 2px 6px rgb(0 0 0 / 20%);
}

.contentCollapsed {
	position: relative;
	max-height: 9em;
	overflow: clip;
}

.collapsed {
	display: block;
	position: absolute;
	bottom: 0;
	left: 0;
	z-index: 2;
	width: 100%;
	height: 64px;
	background: linear-gradient(0deg, var(--MI_THEME-panel), color(from var(--MI_THEME-panel) srgb r g b / 0));

	&:hover > .collapsedLabel {
		background: var(--MI_THEME-panelHighlight);
	}
}

.collapsedLabel {
	display: inline-block;
	background: var(--MI_THEME-panel);
	padding: 6px 10px;
	font-size: 0.8em;
	border-radius: 999px;
	box-shadow: 0 2px 6px rgb(0 0 0 / 20%);
}

.text {
	overflow-wrap: break-word;
}

.replyIcon {
	color: var(--MI_THEME-accent);
	margin-right: 0.5em;
}

.translation {
	border: solid 0.5px var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	padding: 12px;
	margin-top: 8px;
}

.urlPreview {
	margin-top: 8px;
}

.poll {
	font-size: 80%;
}

.quote {
	padding: 8px 0;
}

.quoteNote {
	padding: 16px;
	border: dashed 1px var(--MI_THEME-renote);
	border-radius: 8px;
	overflow: clip;
}

.channel {
	opacity: 0.7;
	font-size: 80%;
}

.footer {
	margin-bottom: -14px;
	display: flex;
	justify-content: space-between;
	max-width: 425px;
}

.replyButton {
	margin: 0;
	padding: 8px 0;
	color: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-fg) 70%);
	flex-shrink: 0;
	transition: color 0.2s ease;

	&:hover {
		color: #1d9bf0;
	}
}

.renoteButton {
	margin: 0;
	padding: 8px 0;
	color: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-fg) 70%);
	flex-shrink: 0;
	transition: color 0.2s ease;

	&:hover {
		color: #00ba7c;
	}
}

.likeButton {
	margin: 0;
	padding: 8px 0;
	color: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-fg) 70%);
	flex-shrink: 0;
	transition: color 0.2s ease;

	&:hover {
		color: #f91880;
	}

	&.active {
		color: var(--MI_THEME-accent);
	}
}

.shareButton {
	margin: 0;
	padding: 8px 0;
	color: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-fg) 70%);
	flex-shrink: 0;
	transition: color 0.2s ease;

	&:hover {
		color: var(--MI_THEME-fgHighlighted);
	}
}

.footerButtonCount {
	display: inline;
	margin: 0 0 0 4px;
	font-size: 0.85em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.commentBox {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--MI_THEME-divider);
}

.commentLoading {
	display: flex;
	justify-content: center;
	padding: 16px 0;
}

.commentEmpty {
	text-align: center;
	padding: 12px 0;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.commentList {
	margin-bottom: 12px;
}

.commentItem {
	display: flex;
	gap: 10px;
	padding: 8px 0;
	&:not(:last-child) {
		border-bottom: 1px solid var(--MI_THEME-divider);
	}
}

.commentAvatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex-shrink: 0;
}

.commentBody {
	flex: 1;
	min-width: 0;
}

.commentName {
	font-size: 12px;
	font-weight: 600;
	color: var(--MI_THEME-accent);
}

.commentText {
	font-size: 13px;
	margin-top: 2px;
	line-height: 1.5;
}

.commentTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.commentInputWrap {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.commentTextarea {
	flex: 1;
	padding: 10px 14px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 20px;
	font-size: 14px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	outline: none;
	resize: none;
	min-height: 20px;
	max-height: 120px;
	font-family: inherit;
	transition: border-color 0.15s;

	&:focus {
		border-color: var(--MI_THEME-accent);
	}

	&::placeholder {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.commentEmojiBtn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 18px;
	flex-shrink: 0;
	transition: color 0.15s;

	&:hover {
		color: var(--MI_THEME-accent);
	}
}

.commentSubmitBtn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-accent);
	color: #fff;
	font-size: 16px;
	flex-shrink: 0;
	transition: opacity 0.15s;

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&:hover:not(:disabled) {
		opacity: 0.9;
	}
}

// --- 宽屏适配: 1000px+ timeline 单列布局 ---
@container (min-width: 700px) {
	.article {
		padding: 20px 28px;
	}

	.renote {
		padding: 12px 28px 4px 28px;
	}

	.tip {
		padding: 12px 28px 4px 28px;
	}
}

@container (max-width: 580px) {
	.root {
		font-size: 0.95em;
	}

	.renote {
		padding: 12px 26px 0 26px;
	}

	.article {
		padding: 24px 26px;
	}
}

@container (max-width: 500px) {
	.root {
		font-size: 0.9em;
	}

	.renote {
		padding: 10px 22px 0 22px;
	}

	.article {
		padding: 20px 22px;
	}

	.footer {
		margin-bottom: -8px;
	}
}

@container (max-width: 480px) {
	.renote {
		padding: 8px 16px 0 16px;
	}

	.tip {
		padding: 8px 16px 0 16px;
	}

	.collapsedRenoteTarget {
		padding: 0 16px 9px;
		margin-top: 4px;
	}

	.article {
		padding: 14px 16px;
	}
}

@container (max-width: 350px) {
	.colorBar {
		top: 6px;
		left: 6px;
		width: 4px;
		height: calc(100% - 12px);
	}
}

@container (max-width: 250px) {
	.quoteNote {
		padding: 12px;
	}
}

.muted {
	padding: 8px;
	text-align: center;
	opacity: 0.7;
}

.reactionOmitted {
	display: inline-block;
	margin-left: 8px;
	opacity: .8;
	font-size: 95%;
}

.deleted {
	text-align: center;
	padding: 32px;
	margin: 6px 32px 28px;
	--color: light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.15));
	background-size: auto auto;
	background-image: repeating-linear-gradient(135deg, transparent, transparent 10px, var(--color) 4px, var(--color) 14px);
	border-radius: 8px;
}

@keyframes bounceLike {
	0% { transform: scale(1); }
	15% { transform: scale(0.85); }
	40% { transform: scale(1.25); }
	65% { transform: scale(0.95); }
	85% { transform: scale(1.05); }
	100% { transform: scale(1); }
}

.bounceLike {
	display: inline-block;
	animation: bounceLike 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

// 帖子头部：头像+昵称+时间（X/微博风格：头像左对齐）
.noteHeader {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 14px 8px;
}

.noteHeaderAvatar {
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	border-radius: 50%;
}

.noteHeaderInfo {
	flex: 1;
	min-width: 0;
}

</style>
