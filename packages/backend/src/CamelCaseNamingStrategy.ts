/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

/**
 * PostgreSQL 不做 snake_case 转换，保持驼峰命名
 */
export class CamelCaseNamingStrategy
	extends DefaultNamingStrategy
	implements NamingStrategyInterface
{
	override columnName(
		propertyName: string,
		customName: string,
		embeddedPrefixes: string[],
	): string {
		const fullName = embeddedPrefixes.concat(customName || propertyName).join('_');
		return fullName;
	}

	override relationName(propertyName: string): string {
		return propertyName;
	}

	override joinTableName(
		firstTableName: string,
		secondTableName: string,
		firstPropertyName: string,
		secondPropertyName: string,
	): string {
		return `${firstTableName}_${firstPropertyName}_${secondTableName}_${secondPropertyName}`;
	}

	override joinTableColumnName(
		tableName: string,
		propertyName: string,
		columnName: string,
	): string {
		return `${tableName}_${columnName}`;
	}

	override eagerJoinRelationAlias(
		alias: string,
		propertyPath: string,
	): string {
		return `${alias}__${propertyPath.replace('.', '_')}`;
	}
}
