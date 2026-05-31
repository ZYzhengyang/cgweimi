<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
CG微米 (CGVMI) - Video Feed for Welcome Page
-->

<template>
<div :class="$style.root">
	<div
		ref="videoContainerEl"
		:class="$style.container"
		@scroll="onScroll"
	>
		<div
			v-for="note in videoNotes"
			:key="note.id"
			:class="$style.videoItem"
		>
			<div :class="$style.videoWrapper">
				<!-- 使用 Misskey 原生视频播放器 -->
				<MkMediaVideo
					v-if="note.files && note.files.length > 0 && note.files[0].type.startsWith('video/')"
					:video="note.files[0]"
					:class="$style.videoPlayer"
				/>
				<!-- 视频信息覆盖层 -->
				<div :class="$style.videoOverlay">
					<div :class="$style.userInfo">
						<MkAvatar :user="note.user" :class="$style.avatar"/>
						<span :class="$style.username">@{{ note.user.username }}</span>
					</div>
					<div v-if="note.text" :class="$style.caption">
						<Mfm :text="note.text" :author="note.user"/>
					</div>
					<div :class="$style.actions">
						<button class="_button" :class="$style.actionButton" @click="toggleLike(note)">
							<i class="ti ti-heart" :class="{ [$style.liked]: note.myReaction }"></i>
							<span>{{ note.reactionCount || 0 }}</span>
						</button>
						<button class="_button" :class="$style.actionButton">
							<i class="ti ti-message-circle"></i>
							<span>{{ note.repliesCount || 0 }}</span>
						</button>
						<button class="_button" :class="$style.actionButton">
							<i class="ti ti-repeat"></i>
							<span>{{ note.renoteCount || 0 }}</span>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- 加载更多 -->
		<div v-if="loading" :class="$style.loading">
			<MkLoading/>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkMediaVideo from '@/components/MkMediaVideo.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoContainerEl = useTemplateRef('videoContainerEl');

// 获取视频帖子
async function fetchVideoNotes(untilId?: string) {
	if (loading.value || !hasMore.value) return;

	loading.value = true;
	try {
		const notes = await misskeyApiGet('notes/featured', {
			limit: 10,
			fileType: 'video/',
			untilId: untilId,
		});

		if (notes.length === 0) {
			hasMore.value = false;
		} else {
			if (untilId) {
				videoNotes.value.push(...notes);
			} else {
				videoNotes.value = notes;
			}
		}
	} catch (err) {
		console.error('Failed to fetch video notes:', err);
	} finally {
		loading.value = false;
	}
}

// 滚动到底部时加载更多
function onScroll() {
	if (!videoContainerEl.value) return;

	const { scrollTop, scrollHeight, clientHeight } = videoContainerEl.value;
	if (scrollHeight - scrollTop - clientHeight < 200) {
		const lastNote = videoNotes.value[videoNotes.value.length - 1];
		if (lastNote) {
			fetchVideoNotes(lastNote.id);
		}
	}
}

// 点赞功能
async function toggleLike(note: Misskey.entities.Note) {
	if (!$i) return;

	try {
		if (note.myReaction) {
			await misskeyApiGet('notes/reactions/delete', { noteId: note.id });
			note.myReaction = null;
			note.reactionCount--;
		} else {
			await misskeyApiGet('notes/reactions/create', {
				noteId: note.id,
				reaction: '❤️',
			});
			note.myReaction = '❤️';
			note.reactionCount++;
		}
	} catch (err) {
		console.error('Failed to toggle reaction:', err);
	}
}

onMounted(() => {
	fetchVideoNotes();
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.container {
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scroll-snap-type: y mandatory;
	scroll-behavior: smooth;

	&::-webkit-scrollbar {
		display: none;
	}
}

.videoItem {
	width: 100%;
	height: 100%;
	scroll-snap-align: start;
	position: relative;
}

.videoWrapper {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;
}

.videoPlayer {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.videoOverlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 20px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
	color: #fff;
	pointer-events: none;

	& > * {
		pointer-events: auto;
	}
}

.userInfo {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}

.avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 2px solid #fff;
}

.username {
	font-weight: bold;
	font-size: 16px;
}

.caption {
	margin-bottom: 15px;
	font-size: 14px;
	line-height: 1.4;
	max-height: 60px;
	overflow: hidden;
}

.actions {
	display: flex;
	gap: 20px;
}

.actionButton {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	color: #fff;
	font-size: 12px;
	transition: transform 0.2s;

	&:hover {
		transform: scale(1.1);
	}

	i {
		font-size: 24px;
	}

	.liked {
		color: #ff2b2b;
	}
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
}
</style>
