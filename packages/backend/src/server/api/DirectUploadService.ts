/*
 * CG微米 - 直传 COS 服务
 * 文件已经通过预签名 URL 上传到 COS，这里只负责注册数据库记录
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import type { MiMeta } from '@/models/Meta.js';
import type { MiLocalUser } from '@/models/User.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { MiDriveFile } from '@/models/DriveFile.js';
import { FileInfoService } from '@/core/FileInfoService.js';
import { IdService } from '@/core/IdService.js';
import { AuthenticateService } from '@/server/api/AuthenticateService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { bindThis } from '@/decorators.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID, createHmac, createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink, writeFile } from 'node:fs/promises';

@Injectable()
export class DirectUploadService {

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private idService: IdService,
		private fileInfoService: FileInfoService,
		private authenticateService: AuthenticateService,
		private driveFileEntityService: DriveFileEntityService,
	) {}

	/**
	 * MIME を FILE_TYPE_BROWSERSAFE で検証する。
	 * type が未指定・空・ホワイトリスト外なら null を返す。
	 * 預署名 URL 生成時点で reject することで、COS に危険な Content-Type を
	 * 書き込ませない（XSS の一次防御）。
	 */
	private validateMime(type: unknown): string | null {
		if (typeof type !== 'string' || type.length === 0 || type.length > 255) return null;
		if (!/^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,126}\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,126}$/.test(type)) return null;
		return FILE_TYPE_BROWSERSAFE.includes(type) ? type : null;
	}

	/**
	 * ファイル名から取り出した拡張子。
	 * HTML / SVG / JS / 実行可能スクリプト系を弾く。
	 * 拡張子なしは空文字を返す（許可）。危険な拡張子なら null。
	 */
	private validateExt(name: unknown): string | null {
		if (typeof name !== 'string' || name.length === 0 || name.length > 255) return null;
		const m = name.match(/\.([a-zA-Z0-9_-]+)$/);
		if (!m) return '';
		const ext = m[1].toLowerCase();
		const blocked = new Set([
			'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'xsl', 'xls', 'xlsx',
			'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'vbs', 'wsf', 'wsh', 'hta',
			'php', 'phtml', 'phps', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py', 'rb', 'sh', 'bash',
			'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif',
			'jar', 'war',
		]);
		if (blocked.has(ext)) return null;
		return ext;
	}

	/**
	 * 手写 AWS Signature V4 生成预签名 PUT URL
	 */
	private generatePresignedUrl(key: string, contentType: string, expiresIn = 3600): string {
		const accessKey = this.meta.objectStorageAccessKey!;
		const secretKey = this.meta.objectStorageSecretKey!;
		console.log('[DirectUpload] COS config:', {
			accessKey: accessKey ? `${accessKey.substring(0, 8)}...` : 'NULL',
			secretKey: secretKey ? '***' : 'NULL',
			endpoint: this.meta.objectStorageEndpoint,
			bucket: this.meta.objectStorageBucket,
			region: this.meta.objectStorageRegion,
		});
		const region = this.meta.objectStorageRegion || 'ap-shanghai';
		const bucket = this.meta.objectStorageBucket!;
		const endpoint = this.meta.objectStorageEndpoint || `cos.${region}.myqcloud.com`;
		const host = `${bucket}.${endpoint}`;

		const now = new Date();
		const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
		const amzDate = `${dateStamp}T${now.toISOString().substring(11, 19).replace(/:/g, '')}Z`;
		const credential = `${accessKey}/${dateStamp}/${region}/s3/aws4_request`;
		const canonicalUri = '/' + key.split('/').map(s => encodeURIComponent(s)).join('/');

		const queryParams: [string, string][] = [
			['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
			['X-Amz-Credential', credential],
			['X-Amz-Date', amzDate],
			['X-Amz-Expires', String(expiresIn)],
			['X-Amz-SignedHeaders', 'content-type;host'],
		];

		const canonicalQueryString = queryParams
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join('&');

		const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
		const signedHeaders = 'content-type;host';
		const payloadHash = 'UNSIGNED-PAYLOAD';

		const canonicalRequest = ['PUT', canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
		const scope = `${dateStamp}/${region}/s3/aws4_request`;
		const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');

		const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
		const kRegion = createHmac('sha256', kDate).update(region).digest();
		const kService = createHmac('sha256', kRegion).update('s3').digest();
		const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
		const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

		return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
	}

	@bindThis
	public async createPresignedUrl(request: FastifyRequest, reply: FastifyReply) {
		if (!this.meta.useObjectStorage) {
			return reply.code(400).send({ error: 'Object storage not enabled' });
		}

		const { name, type } = request.body as { name?: string; type?: string };
		if (!name || !type) {
			return reply.code(400).send({ error: 'Missing name or type' });
		}

		// MIME を FILE_TYPE_BROWSERSAFE で検証（text/html, image/svg+xml などを拒否）
		const safeType = this.validateMime(type);
		if (safeType === null) {
			return reply.code(400).send({ error: 'Unsupported MIME type' });
		}

		// ファイル名の拡張子チェック（HTML/SVG/JS 等は COS 上のキーになり得ない）
		const ext = this.validateExt(name);
		if (ext === null) {
			return reply.code(400).send({ error: 'Unsupported file extension' });
		}

		const prefix = this.meta.objectStoragePrefix ? `${this.meta.objectStoragePrefix}/` : '';
		const uuid = randomUUID();
		const key = `${prefix}direct-${uuid}${ext ? '.' + ext : ''}`;
		// accessKey 不含 prefix（用于 /files/:key 路由）
		const accessKey = `direct-${uuid}${ext ? '.' + ext : ''}`;

		try {
			const uploadUrl = this.generatePresignedUrl(key, safeType);
			return reply.send({ uploadUrl, key, accessKey, method: 'PUT', headers: { 'Content-Type': safeType } });
		} catch (error: unknown) {
			console.error('[DirectUpload] presign error:', error);
			return reply.code(500).send({ error: 'Failed to generate upload URL' });
		}
	}

	@bindThis
	public async registerUpload(request: FastifyRequest, reply: FastifyReply) {
		try {
			const body = request.body as Record<string, unknown>;
			const token = body?.i as string | null | undefined;
			const [user] = await this.authenticateService.authenticate(token);

			if (!user) {
				return reply.code(401).send({ error: 'Authentication required' });
			}

		const { key: rawKey, accessKey: rawAccessKey, name: rawName, type: rawType, folderId: rawFolderId, isSensitive: rawIsSensitive, comment: rawComment } = body;
		const key = rawKey as string;
		const accessKey = rawAccessKey as string | undefined;
		const name = rawName as string;
		const type = rawType as string;
		const folderId = rawFolderId as string | null | undefined;
		const isSensitive = rawIsSensitive as boolean | undefined;
		const comment = rawComment as string | null | undefined;
		if (!key || !name || !type) {
			return reply.code(400).send({ error: 'Missing key, name, or type' });
		}

			// registerUpload 側でも MIME / 拡張子を検証（createPresignedUrl を経ない直接呼び出し対策）
			if (this.validateMime(type) === null) {
				return reply.code(400).send({ error: 'Unsupported MIME type' });
			}
			const extFromName = this.validateExt(name);
			if (extFromName === null) {
				return reply.code(400).send({ error: 'Unsupported file extension' });
			}

			// 下载文件：key 已包含 prefix，直接拼 endpoint
			const fileUrl = `https://${this.meta.objectStorageBucket}.${this.meta.objectStorageEndpoint}/${key}`;

			const ext = extFromName || 'tmp';
			const tmpPath = join(tmpdir(), `direct-upload-${randomUUID()}.${ext}`);

			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 30_000);
				try {
					const response = await fetch(fileUrl, { signal: controller.signal });
					if (!response.ok) {
						return reply.code(500).send({ error: `Download failed: ${response.status}` });
					}
					const buffer = Buffer.from(await response.arrayBuffer());
					await writeFile(tmpPath, buffer);
				} finally {
					clearTimeout(timeout);
				}

				// 分析文件元数据
				const info = await this.fileInfoService.getFileInfo(tmpPath, { fileName: name, skipSensitiveDetection: false });

				// 実際に COS からダウンロードしたファイルの MIME を FILE_TYPE_BROWSERSAFE で検証。
				// 攻撃者が Content-Type を偽装して HTML を上げても、検知 MIME が一致しなければ登録拒否。
				const detectedType = FILE_TYPE_BROWSERSAFE.includes(info.type.mime) ? info.type.mime : null;
				if (detectedType === null) {
					return reply.code(400).send({ error: 'Detected MIME type is not allowed' });
				}
				const finalType = detectedType;

				// 使用 Misskey /files/ URL（同源，避免跨域问题）
				const fileAccessKey = accessKey || key;

				// 生成缩略图 URL（如果有的话，由 DriveService 处理，这里先不生成）
				// 直接写数据库记录
				const fileId = this.idService.gen();
				// url: 前端播放用（nginx 代理 COS，同源）
				// uri: COS 直连地址（备用）
				const cosProxyUrl = `${this.config.url}/cos-files/${key}`;
				const driveFile = await this.driveFilesRepository.insertOne({
					id: fileId,
					userId: user.id,
					name: name,
					type: finalType,
					md5: info.md5,
					size: info.size,
					comment: comment ?? null,
					properties: info.width && info.height ? { width: info.width, height: info.height } : {},
					storedInternal: false,
					isLink: false,  // 不走 FileResolver 的下载逻辑
					url: cosProxyUrl,
					thumbnailUrl: null,
					webpublicUrl: null,
					accessKey: fileAccessKey,
					thumbnailAccessKey: null,
					webpublicAccessKey: null,
					webpublicType: null,
					folderId: folderId ?? null,
				isSensitive: isSensitive ?? false,
				maybeSensitive: info.sensitive,
				maybePorn: info.porn,
				});

				const packed = await this.driveFileEntityService.pack(driveFile, { self: true });
				return reply.send(packed);

			} finally {
				try { await unlink(tmpPath); } catch {}
			}

		} catch (error: unknown) {
			console.error('[DirectUpload] error:', (error as Error).message);
			return reply.code(500).send({ error: (error as Error).message || 'Registration failed' });
		}
	}
}
