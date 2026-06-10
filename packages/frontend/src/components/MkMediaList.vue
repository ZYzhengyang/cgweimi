<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<XBanner v-for="media in mediaList.filter(media => !previewable(media))" :key="media.id" :media="media"/>
	<div v-if="displayedMedia.length > 0" :class="$style.container">
		<div
			ref="gallery"
			:class="[
				$style.medias,
				...(prefer.s.showMediaListByGridInWideArea ? [$style.gridInWideArea] : []),
				displayedMedia.length === 1 ? [$style.n1, {
					[$style.n116_9]: prefer.s.mediaListWithOneImageAppearance === '16_9',
					[$style.n11_1]: prefer.s.mediaListWithOneImageAppearance === '1_1',
					[$style.n12_3]: prefer.s.mediaListWithOneImageAppearance === '2_3',
				}] : displayedMedia.length === 2 ? $style.n2 : displayedMedia.length === 3 ? $style.n3 : displayedMedia.length === 4 ? $style.n4 : displayedMedia.length === 5 ? $style.n5 : displayedMedia.length === 6 ? $style.n6 : displayedMedia.length === 7 ? $style.n7 : displayedMedia.length === 8 ? $style.n8 : $style.n9,
			]"
		>
			<template v-for="(media, index) in displayedMedia" :key="media.id">
				<div :class="[$style.mediaWrap, $style.media]">
					<XVideo v-if="media.type.startsWith('video')" :video="media"/>
					<XImage v-else-if="media.type.startsWith('image')" class="image" :data-id="media.id" :image="media" :raw="raw"/>
					<div v-if="remainingCount > 0 && index === displayedMedia.length - 1" :class="$style.moreOverlay" @click.stop="emit('expand')">
						+{{ remainingCount }}
					</div>
				</div>
			</template>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { FILE_TYPE_BROWSERSAFE } from '@@/js/const.js';
import XBanner from '@/components/MkMediaBanner.vue';
import XImage from '@/components/MkMediaImage.vue';
import XVideo from '@/components/MkMediaVideo.vue';
import * as os from '@/os.js';
import { focusParent } from '@/utility/focus.js';
import { prefer } from '@/preferences.js';

const props = defineProps<{
	mediaList: Misskey.entities.DriveFile[];
	raw?: boolean;
	maxDisplay?: number;
}>();

const emit = defineEmits<{
	expand: [];
}>();

const gallery = useTemplateRef('gallery');
const pswpZIndex = os.claimZIndex('middle');
window.document.documentElement.style.setProperty('--mk-pswp-root-z-index', pswpZIndex.toString());
const previewableMedia = computed(() => props.mediaList.filter(media => previewable(media)));
const displayedMedia = computed(() => {
	if (props.maxDisplay && previewableMedia.value.length > props.maxDisplay) {
		return previewableMedia.value.slice(0, props.maxDisplay);
	}
	return previewableMedia.value;
});
const remainingCount = computed(() => {
	if (props.maxDisplay && previewableMedia.value.length > props.maxDisplay) {
		return previewableMedia.value.length - props.maxDisplay;
	}
	return 0;
});
let lightbox: PhotoSwipeLightbox | null = null;

let activeEl: HTMLElement | null = null;

const popstateHandler = (): void => {
	if (lightbox?.pswp && lightbox.pswp.isOpen === true) {
		lightbox.pswp.close();
	}
};

async function calcAspectRatio() {
	if (!gallery.value) return;

	const img = props.mediaList[0];

	if (props.mediaList.length !== 1 || !(img.properties.width && img.properties.height)) {
		gallery.value.style.aspectRatio = '';
		return;
	}

	const ratioMax = (ratio: number) => {
		if (img.properties.width == null || img.properties.height == null) return '';
		return `${Math.max(ratio, img.properties.width / img.properties.height).toString()} / 1`;
	};

	switch (prefer.s.mediaListWithOneImageAppearance) {
		case '16_9':
			gallery.value.style.aspectRatio = ratioMax(16 / 9);
			break;
		case '1_1':
			gallery.value.style.aspectRatio = ratioMax(1 / 1);
			break;
		case '2_3':
			gallery.value.style.aspectRatio = ratioMax(2 / 3);
			break;
		default:
			gallery.value.style.aspectRatio = '';
			break;
	}
}

onMounted(() => {
	calcAspectRatio();

	if (gallery.value == null) return; // TSを黙らすため

	lightbox = new PhotoSwipeLightbox({
		dataSource: props.mediaList
			.filter(media => {
				if (media.type === 'image/svg+xml') return true; // svgのwebpublicはpngなのでtrue
				return media.type.startsWith('image') && FILE_TYPE_BROWSERSAFE.includes(media.type);
			})
			.map(media => {
				const item = {
					src: media.url,
					w: media.properties.width,
					h: media.properties.height,
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					alt: media.comment || media.name,
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					comment: media.comment || media.name,
				};
				if (media.properties.orientation != null && media.properties.orientation >= 5) {
					[item.w, item.h] = [item.h, item.w];
				}
				return item;
			}),
		gallery: gallery.value,
		mainClass: 'pswp',
		children: '.image',
		thumbSelector: '.image',
		loop: false,
		padding: window.innerWidth > 500 ? {
			top: 32,
			bottom: 90,
			left: 32,
			right: 32,
		} : {
			top: 0,
			bottom: 78,
			left: 0,
			right: 0,
		},
		imageClickAction: 'close',
		tapAction: 'close',
		bgOpacity: 1,
		showAnimationDuration: 100,
		hideAnimationDuration: 100,
		returnFocus: false,
		pswpModule: PhotoSwipe,
	});

	lightbox.addFilter('itemData', (itemData) => {
		// element is children
		const { element } = itemData;

		const id = element?.dataset.id;
		const file = props.mediaList.find(media => media.id === id);
		if (!file) return itemData;

		itemData.src = file.url;
		itemData.w = Number(file.properties.width);
		itemData.h = Number(file.properties.height);
		if (file.properties.orientation != null && file.properties.orientation >= 5) {
			[itemData.w, itemData.h] = [itemData.h, itemData.w];
		}
		itemData.msrc = file.thumbnailUrl ?? undefined;
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		itemData.alt = file.comment || file.name;
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		itemData.comment = file.comment || file.name;
		itemData.thumbCropped = true;

		return itemData;
	});

	lightbox.on('uiRegister', () => {
		lightbox?.pswp?.ui?.registerElement({
			name: 'altText',
			className: 'pswp__alt-text-container',
			appendTo: 'wrapper',
			onInit: (el, pswp) => {
				const textBox = window.document.createElement('p');
				textBox.className = 'pswp__alt-text _acrylic';
				el.appendChild(textBox);

				pswp.on('change', () => {
					textBox.textContent = pswp.currSlide?.data.comment;
				});
			},
		});
	});

	lightbox.on('afterInit', () => {
		activeEl = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
		focusParent(activeEl, true, true);
		lightbox?.pswp?.element?.focus({
			preventScroll: true,
		});
		window.history.pushState(null, '', '#pswp');
	});

	lightbox.on('destroy', () => {
		focusParent(activeEl, true, false);
		activeEl = null;
		if (window.location.hash === '#pswp') {
			window.history.back();
		}
	});

	window.addEventListener('popstate', popstateHandler);

	lightbox.init();
});

onUnmounted(() => {
	window.removeEventListener('popstate', popstateHandler);
	lightbox?.destroy();
	lightbox = null;
	activeEl = null;
});

const previewable = (file: Misskey.entities.DriveFile): boolean => {
	if (file.type === 'image/svg+xml') return true; // svgのwebpublic/thumbnailはpngなのでtrue
	// FILE_TYPE_BROWSERSAFEに適合しないものはブラウザで表示するのに不適切
	return (file.type.startsWith('video') || file.type.startsWith('image')) && FILE_TYPE_BROWSERSAFE.includes(file.type);
};

const openGallery = () => {
	if (props.mediaList.filter(media => previewable(media)).length > 0) {
		lightbox?.loadAndOpen(0);
	}
};

defineExpose({
	openGallery,
});
</script>

<style lang="scss" module>
.root {
	container-type: inline-size;
}

.container {
	position: relative;
	width: 100%;
}

.medias {
	display: grid;
	grid-gap: 2px;
	border-radius: 16px;
	overflow: hidden;

	height: 100%;
	width: 100%;

	&.n1 {
		grid-template-rows: 1fr;
		border-radius: 16px;

		// default but fallback (expand)
		min-height: 64px;
		max-height: clamp(
			64px,
			50cqh,
			min(512px, 50vh)
		);

		&.n116_9 {
			min-height: initial;
			max-height: initial;
			aspect-ratio: 16 / 9; // fallback
		}

		&.n11_1{
			min-height: initial;
			max-height: initial;
			aspect-ratio: 1 / 1; // fallback
		}

		&.n12_3 {
			min-height: initial;
			max-height: initial;
			aspect-ratio: 2 / 3; // fallback
		}
	}

	&.n2 {
		max-height: 280px;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr;
	}

	&.n3 {
		max-height: 280px;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;

		> .media:first-child {
			grid-row: 1 / 3;
		}
	}

	&.n4 {
		max-height: 280px;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}

	&.n5 {
		max-height: 280px;
		grid-template-columns: repeat(6, 1fr);
		grid-template-rows: 1fr 1fr;

		> .media:nth-child(1) { grid-column: 1 / 4; }
		> .media:nth-child(2) { grid-column: 4 / 7; }
		> .media:nth-child(3) { grid-column: 1 / 3; }
		> .media:nth-child(4) { grid-column: 3 / 5; }
		> .media:nth-child(5) { grid-column: 5 / 7; }
	}

	&.n6 {
		max-height: 280px;
		grid-template-columns: 1fr 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}

	&.n7 {
		max-height: 280px;
		grid-template-columns: repeat(12, 1fr);
		grid-template-rows: 1fr 1fr;

		> .media:nth-child(1) { grid-column: 1 / 5; }
		> .media:nth-child(2) { grid-column: 5 / 9; }
		> .media:nth-child(3) { grid-column: 9 / 13; }
		> .media:nth-child(4) { grid-column: 1 / 4; }
		> .media:nth-child(5) { grid-column: 4 / 7; }
		> .media:nth-child(6) { grid-column: 7 / 10; }
		> .media:nth-child(7) { grid-column: 10 / 13; }
	}

	&.n8 {
		max-height: 280px;
		grid-template-columns: repeat(12, 1fr);
		grid-template-rows: 1fr 1fr 1fr;

		> .media:nth-child(1) { grid-column: 1 / 5; }
		> .media:nth-child(2) { grid-column: 5 / 9; }
		> .media:nth-child(3) { grid-column: 9 / 13; }
		> .media:nth-child(4) { grid-column: 1 / 5; }
		> .media:nth-child(5) { grid-column: 5 / 9; }
		> .media:nth-child(6) { grid-column: 9 / 13; }
		> .media:nth-child(7) { grid-column: 1 / 7; }
		> .media:nth-child(8) { grid-column: 7 / 13; }
	}

	&.n9 {
		max-height: 280px;
		grid-template-columns: 1fr 1fr 1fr;
		grid-template-rows: 1fr 1fr 1fr;
	}
}

.media {
	overflow: hidden;
	min-height: 0;

	// X 风格：图片裁切填满，覆盖 MkMediaImage 的 contain
	:global(.image) {
		object-fit: cover !important;
	}
}

.mediaWrap {
	position: relative;
	overflow: hidden;
	min-height: 0;
}

/* X 风格：只有四角图片有圆角 */
.n2 > .media:nth-child(1) { border-radius: 16px 0 0 16px; }
.n2 > .media:nth-child(2) { border-radius: 0 16px 16px 0; }

.n3 > .media:nth-child(1) { border-radius: 16px 0 0 16px; }
.n3 > .media:nth-child(2) { border-radius: 0 16px 0 0; }
.n3 > .media:nth-child(3) { border-radius: 0 0 16px 0; }

.n4 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n4 > .media:nth-child(2) { border-radius: 0 16px 0 0; }
.n4 > .media:nth-child(3) { border-radius: 0 0 0 16px; }
.n4 > .media:nth-child(4) { border-radius: 0 0 16px 0; }

/* 5图：上2下3 */
.n5 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n5 > .media:nth-child(2) { border-radius: 0 16px 0 0; }
.n5 > .media:nth-child(3) { border-radius: 0 0 0 16px; }
.n5 > .media:nth-child(5) { border-radius: 0 0 16px 0; }

/* 6图：3+3 */
.n6 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n6 > .media:nth-child(3) { border-radius: 0 16px 0 0; }
.n6 > .media:nth-child(4) { border-radius: 0 0 0 16px; }
.n6 > .media:nth-child(6) { border-radius: 0 0 16px 0; }

/* 7图：上3下4 */
.n7 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n7 > .media:nth-child(3) { border-radius: 0 16px 0 0; }
.n7 > .media:nth-child(4) { border-radius: 0 0 0 16px; }
.n7 > .media:nth-child(7) { border-radius: 0 0 16px 0; }

/* 8图：上3中3下2 */
.n8 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n8 > .media:nth-child(3) { border-radius: 0 16px 0 0; }
.n8 > .media:nth-child(7) { border-radius: 0 0 0 16px; }
.n8 > .media:nth-child(8) { border-radius: 0 0 16px 0; }

/* 9图：3x3 */
.n9 > .media:nth-child(1) { border-radius: 16px 0 0 0; }
.n9 > .media:nth-child(3) { border-radius: 0 16px 0 0; }
.n9 > .media:nth-child(7) { border-radius: 0 0 0 16px; }
.n9 > .media:nth-child(9) { border-radius: 0 0 16px 0; }

.moreOverlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.45);
	color: #fff;
	font-size: 28px;
	font-weight: 700;
	border-radius: inherit;
	cursor: pointer;
	transition: background 0.2s;
	&:hover {
		background: rgba(0, 0, 0, 0.6);
	}
}

@container (min-width: 500px) {
	.medias.gridInWideArea {
		display: grid;
		aspect-ratio: auto;
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: auto;
		grid-gap: 2px;
		border-radius: 16px;
		overflow: hidden;

		> .media {
			aspect-ratio: 1 / 1;
		}
	}
}

:global(.pswp) {
	--pswp-root-z-index: var(--mk-pswp-root-z-index, 2000700) !important;
	--pswp-bg: var(--MI_THEME-modalBg) !important;
}
</style>

<style lang="scss">
.pswp__bg {
	background: var(--MI_THEME-modalBg);
	backdrop-filter: var(--MI-modalBgFilter);
}

.pswp__alt-text-container {
	display: flex;
	flex-direction: row;
	align-items: center;

	position: absolute;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);

	width: 75%;
	max-width: 800px;
}

.pswp__alt-text {
	color: var(--MI_THEME-fg);
	margin: 0 auto;
	text-align: center;
	padding: var(--MI-margin);
	border-radius: var(--MI-radius);
	max-height: 8em;
	overflow-y: auto;
	text-shadow: var(--MI_THEME-bg) 0 0 10px, var(--MI_THEME-bg) 0 0 3px, var(--MI_THEME-bg) 0 0 3px;
	white-space: pre-line;
}
</style>
