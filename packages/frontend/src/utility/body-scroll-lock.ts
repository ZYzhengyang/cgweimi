/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Body scroll lock with reference counting.
 *
 * Multiple popup/modal components may need to prevent background scrolling
 * simultaneously. Naively setting `document.body.style.overflow = ''` on
 * unmount breaks other popups that are still visible. This module tracks how
 * many callers have requested the lock and only releases it when the count
 * returns to zero.
 */

let lockCount = 0;

export function lockBodyScroll(): void {
	lockCount++;
	document.body.style.overflow = 'hidden';
}

export function unlockBodyScroll(): void {
	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) {
		document.body.style.overflow = '';
	}
}
