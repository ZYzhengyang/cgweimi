/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { get } from '@/utility/idb-proxy.js';

export async function getAccountFromId(id: string) {
	const accounts = await get('accounts') as { token: string; id: string; }[];
	if (!accounts) {
		if (_DEV_) console.log('Accounts are not recorded');
		return undefined;
	}
	return accounts.find(account => account.id === id);
}
