<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="currentTab" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<SearchMarker path="/admin/settings" :label="i18n.ts.general" :keywords="['general', 'settings']" icon="ti ti-settings">
			<div class="_gaps_m">

				<!-- 基本信息 -->
				<template v-if="currentTab === 'basic'">
				<SearchMarker v-slot="slotProps" :keywords="['information', 'meta']">
					<MkFolder :defaultOpen="true">
						<template #icon><SearchIcon><i class="ti ti-info-circle"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts.info }}</SearchLabel></template>
						<template v-if="infoForm.modified.value" #footer>
							<MkFormFooter :form="infoForm"/>
						</template>

						<div class="_gaps">
							<SearchMarker :keywords="['name']">
								<MkInput v-model="infoForm.state.name">
									<template #label><SearchLabel>{{ i18n.ts.instanceName }}</SearchLabel><span v-if="infoForm.modifiedStates.name" class="_modified">{{ i18n.ts.modified }}</span></template>
								</MkInput>
							</SearchMarker>

							<SearchMarker :keywords="['shortName']">
								<MkInput v-model="infoForm.state.shortName">
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.shortName }}</SearchLabel> ({{ i18n.ts.optional }})<span v-if="infoForm.modifiedStates.shortName" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts._serverSettings.shortNameDescription }}</SearchText></template>
								</MkInput>
							</SearchMarker>

							<SearchMarker :keywords="['description']">
								<MkTextarea v-model="infoForm.state.description">
									<template #label><SearchLabel>{{ i18n.ts.instanceDescription }}</SearchLabel><span v-if="infoForm.modifiedStates.description" class="_modified">{{ i18n.ts.modified }}</span></template>
								</MkTextarea>
							</SearchMarker>

							<FormSplit :minWidth="300">
								<SearchMarker :keywords="['maintainer', 'name']">
									<MkInput v-model="infoForm.state.maintainerName">
										<template #label><SearchLabel>{{ i18n.ts.maintainerName }}</SearchLabel><span v-if="infoForm.modifiedStates.maintainerName" class="_modified">{{ i18n.ts.modified }}</span></template>
									</MkInput>
								</SearchMarker>

								<SearchMarker :keywords="['maintainer', 'email', 'contact']">
									<MkInput v-model="infoForm.state.maintainerEmail" type="email">
										<template #label><SearchLabel>{{ i18n.ts.maintainerEmail }}</SearchLabel><span v-if="infoForm.modifiedStates.maintainerEmail" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #prefix><i class="ti ti-mail"></i></template>
									</MkInput>
								</SearchMarker>
							</FormSplit>

							<SearchMarker :keywords="['tos', 'termsOfService']">
								<MkInput v-model="infoForm.state.tosUrl" type="url">
									<template #label><SearchLabel>{{ i18n.ts.tosUrl }}</SearchLabel><span v-if="infoForm.modifiedStates.tosUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #prefix><i class="ti ti-link"></i></template>
								</MkInput>
							</SearchMarker>

							<SearchMarker :keywords="['privacyPolicy']">
								<MkInput v-model="infoForm.state.privacyPolicyUrl" type="url">
									<template #label><SearchLabel>{{ i18n.ts.privacyPolicyUrl }}</SearchLabel><span v-if="infoForm.modifiedStates.privacyPolicyUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #prefix><i class="ti ti-link"></i></template>
								</MkInput>
							</SearchMarker>

							<SearchMarker :keywords="['inquiry', 'contact']">
								<MkInput v-model="infoForm.state.inquiryUrl" type="url">
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.inquiryUrl }}</SearchLabel><span v-if="infoForm.modifiedStates.inquiryUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts._serverSettings.inquiryUrlDescription }}</SearchText></template>
									<template #prefix><i class="ti ti-link"></i></template>
								</MkInput>
							</SearchMarker>

							<SearchMarker :keywords="['repository', 'url']">
								<MkInput v-model="infoForm.state.repositoryUrl" type="url">
									<template #label><SearchLabel>{{ i18n.ts.repositoryUrl }}</SearchLabel><span v-if="infoForm.modifiedStates.repositoryUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts.repositoryUrlDescription }}</SearchText></template>
									<template #prefix><i class="ti ti-link"></i></template>
								</MkInput>
							</SearchMarker>

							<MkInfo v-if="!instance.providesTarball && !infoForm.state.repositoryUrl" warn>
								{{ i18n.ts.repositoryUrlOrTarballRequired }}
							</MkInfo>

							<SearchMarker :keywords="['impressum', 'legalNotice']">
								<MkInput v-model="infoForm.state.impressumUrl" type="url">
									<template #label><SearchLabel>{{ i18n.ts.impressumUrl }}</SearchLabel><span v-if="infoForm.modifiedStates.impressumUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts.impressumDescription }}</SearchText></template>
									<template #prefix><i class="ti ti-link"></i></template>
								</MkInput>
							</SearchMarker>
						</div>
					</MkFolder>
				</SearchMarker>

				<SearchMarker v-slot="slotProps" :keywords="['pinned', 'users']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-user-star"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts.pinnedUsers }}</SearchLabel></template>
						<template v-if="pinnedUsersForm.modified.value" #footer>
							<MkFormFooter :form="pinnedUsersForm"/>
						</template>

						<MkTextarea v-model="pinnedUsersForm.state.pinnedUsers">
							<template #label>{{ i18n.ts.pinnedUsers }}<span v-if="pinnedUsersForm.modifiedStates.pinnedUsers" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption><SearchText>{{ i18n.ts.pinnedUsersDescription }}</SearchText></template>
						</MkTextarea>
					</MkFolder>
				</SearchMarker>
				</template>

				<!-- 服务配置 -->
				<template v-if="currentTab === 'service'">
				<SearchMarker v-slot="slotProps" :keywords="['serviceWorker']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-world-cog"></i></SearchIcon></template>
						<template #label><SearchLabel>ServiceWorker</SearchLabel></template>
						<template v-if="serviceWorkerForm.modified.value" #footer>
							<MkFormFooter :form="serviceWorkerForm"/>
						</template>

						<div class="_gaps">
							<SearchMarker>
								<MkSwitch v-model="serviceWorkerForm.state.enableServiceWorker">
									<template #label><SearchLabel>{{ i18n.ts.enableServiceworker }}</SearchLabel><span v-if="serviceWorkerForm.modifiedStates.enableServiceWorker" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts.serviceworkerInfo }}</SearchText></template>
								</MkSwitch>
							</SearchMarker>

							<template v-if="serviceWorkerForm.state.enableServiceWorker">
								<SearchMarker>
									<MkInput v-model="serviceWorkerForm.state.swPublicKey">
										<template #label><SearchLabel>Public key</SearchLabel><span v-if="serviceWorkerForm.modifiedStates.swPublicKey" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #prefix><i class="ti ti-key"></i></template>
									</MkInput>
								</SearchMarker>

								<SearchMarker>
									<MkInput v-model="serviceWorkerForm.state.swPrivateKey">
										<template #label><SearchLabel>Private key</SearchLabel><span v-if="serviceWorkerForm.modifiedStates.swPrivateKey" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #prefix><i class="ti ti-key"></i></template>
									</MkInput>
								</SearchMarker>
							</template>
						</div>
					</MkFolder>
				</SearchMarker>

				<SearchMarker v-slot="slotProps" :keywords="['ads']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-ad"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts._ad.adsSettings }}</SearchLabel></template>
						<template v-if="adForm.modified.value" #footer>
							<MkFormFooter :form="adForm"/>
						</template>

						<div class="_gaps">
							<div class="_gaps_s">
								<SearchMarker>
									<MkInput v-model="adForm.state.notesPerOneAd" :min="0" type="number">
										<template #label><SearchLabel>{{ i18n.ts._ad.notesPerOneAd }}</SearchLabel><span v-if="adForm.modifiedStates.notesPerOneAd" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._ad.setZeroToDisable }}</template>
									</MkInput>
								</SearchMarker>

								<MkInfo v-if="adForm.state.notesPerOneAd > 0 && adForm.state.notesPerOneAd < 20" :warn="true">
									{{ i18n.ts._ad.adsTooClose }}
								</MkInfo>
							</div>
						</div>
					</MkFolder>
				</SearchMarker>

				<SearchMarker v-slot="slotProps" :keywords="['url', 'preview']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-world-search"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.title }}</SearchLabel></template>
						<template v-if="urlPreviewForm.modified.value" #footer>
							<MkFormFooter :form="urlPreviewForm"/>
						</template>

						<div class="_gaps">
							<SearchMarker>
								<MkSwitch v-model="urlPreviewForm.state.urlPreviewEnabled">
									<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.enable }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewEnabled" class="_modified">{{ i18n.ts.modified }}</span></template>
								</MkSwitch>
							</SearchMarker>

							<template v-if="urlPreviewForm.state.urlPreviewEnabled">
								<SearchMarker :keywords="['allow', 'redirect']">
									<MkSwitch v-model="urlPreviewForm.state.urlPreviewAllowRedirect">
										<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.allowRedirect }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewAllowRedirect" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.allowRedirectDescription }}</template>
									</MkSwitch>
								</SearchMarker>

								<SearchMarker :keywords="['contentLength']">
									<MkSwitch v-model="urlPreviewForm.state.urlPreviewRequireContentLength">
										<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.requireContentLength }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewRequireContentLength" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.requireContentLengthDescription }}</template>
									</MkSwitch>
								</SearchMarker>

								<SearchMarker :keywords="['contentLength']">
									<MkInput v-model="urlPreviewForm.state.urlPreviewMaximumContentLength" type="number">
										<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.maximumContentLength }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewMaximumContentLength" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.maximumContentLengthDescription }}</template>
									</MkInput>
								</SearchMarker>

								<SearchMarker :keywords="['timeout']">
									<MkInput v-model="urlPreviewForm.state.urlPreviewTimeout" type="number">
										<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.timeout }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewTimeout" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.timeoutDescription }}</template>
									</MkInput>
								</SearchMarker>

								<SearchMarker :keywords="['userAgent']">
									<MkInput v-model="urlPreviewForm.state.urlPreviewUserAgent" type="text">
										<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.userAgent }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewUserAgent" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.userAgentDescription }}</template>
									</MkInput>
								</SearchMarker>

								<div>
									<SearchMarker :keywords="['proxy']">
										<MkInput v-model="urlPreviewForm.state.urlPreviewSummaryProxyUrl" type="text">
											<template #label><SearchLabel>{{ i18n.ts._urlPreviewSetting.summaryProxy }}</SearchLabel><span v-if="urlPreviewForm.modifiedStates.urlPreviewSummaryProxyUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
											<template #caption>[{{ i18n.ts.notUsePleaseLeaveBlank }}] {{ i18n.ts._urlPreviewSetting.summaryProxyDescription }}</template>
										</MkInput>
									</SearchMarker>

									<div :class="$style.subCaption">
										{{ i18n.ts._urlPreviewSetting.summaryProxyDescription2 }}
										<ul style="padding-left: 20px; margin: 4px 0">
											<li>{{ i18n.ts._urlPreviewSetting.timeout }} / key:timeout</li>
											<li>{{ i18n.ts._urlPreviewSetting.maximumContentLength }} / key:contentLengthLimit</li>
											<li>{{ i18n.ts._urlPreviewSetting.requireContentLength }} / key:contentLengthRequired</li>
											<li>{{ i18n.ts._urlPreviewSetting.userAgent }} / key:userAgent</li>
										</ul>
									</div>
								</div>
							</template>
						</div>
					</MkFolder>
				</SearchMarker>
				</template>

				<!-- 联邦设置 -->
				<template v-if="currentTab === 'federation'">
				<SearchMarker v-slot="slotProps" :keywords="['federation']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-planet"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts.federation }}</SearchLabel></template>
						<template v-if="federationForm.savedState.federation === 'all'" #suffix>{{ i18n.ts.all }}</template>
						<template v-else-if="federationForm.savedState.federation === 'specified'" #suffix>{{ i18n.ts.specifyHost }}</template>
						<template v-else-if="federationForm.savedState.federation === 'none'" #suffix>{{ i18n.ts.none }}</template>
						<template v-if="federationForm.modified.value" #footer>
							<MkFormFooter :form="federationForm"/>
						</template>

						<div class="_gaps">
							<SearchMarker>
								<MkRadios
									v-model="federationForm.state.federation"
									:options="[
										{ value: 'all', label: i18n.ts.all },
										{ value: 'specified', label: i18n.ts.specifyHost },
										{ value: 'none', label: i18n.ts.none },
									]"
								>
									<template #label><SearchLabel>{{ i18n.ts.behavior }}</SearchLabel><span v-if="federationForm.modifiedStates.federation" class="_modified">{{ i18n.ts.modified }}</span></template>
								</MkRadios>
							</SearchMarker>

							<SearchMarker :keywords="['hosts']">
								<MkTextarea v-if="federationForm.state.federation === 'specified'" v-model="federationForm.state.federationHosts">
									<template #label><SearchLabel>{{ i18n.ts.federationAllowedHosts }}</SearchLabel><span v-if="federationForm.modifiedStates.federationHosts" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption>{{ i18n.ts.federationAllowedHostsDescription }}</template>
								</MkTextarea>
							</SearchMarker>

							<SearchMarker :keywords="['suspended', 'software']">
								<MkFolder>
									<template #icon><i class="ti ti-list"></i></template>
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.deliverSuspendedSoftware }}</SearchLabel></template>
									<template #footer>
										<div class="_buttons">
											<MkButton @click="federationForm.state.deliverSuspendedSoftware.push({software: '', versionRange: ''})"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
										</div>
									</template>

									<div :class="$style.metadataRoot" class="_gaps_s">
										<MkInfo>{{ i18n.ts._serverSettings.deliverSuspendedSoftwareDescription }}</MkInfo>
										<div v-for="(element, index) in federationForm.state.deliverSuspendedSoftware" :key="index" v-panel :class="$style.fieldDragItem">
											<button class="_button" :class="$style.dragItemRemove" @click="federationForm.state.deliverSuspendedSoftware.splice(index, 1)"><i class="ti ti-x"></i></button>
											<div :class="$style.dragItemForm">
												<FormSplit :minWidth="200">
													<MkInput v-model="element.software" small :placeholder="i18n.ts.softwareName">
													</MkInput>
													<MkInput v-model="element.versionRange" small :placeholder="i18n.ts.version">
													</MkInput>
												</FormSplit>
											</div>
										</div>
									</div>
								</MkFolder>
							</SearchMarker>

							<SearchMarker :keywords="['sign', 'get']">
								<MkSwitch v-model="federationForm.state.signToActivityPubGet">
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.signToActivityPubGet }}</SearchLabel><span v-if="federationForm.modifiedStates.signToActivityPubGet" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts._serverSettings.signToActivityPubGet_description }}</SearchText></template>
								</MkSwitch>
							</SearchMarker>

							<SearchMarker :keywords="['proxy', 'remote', 'files']">
								<MkSwitch v-model="federationForm.state.proxyRemoteFiles">
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.proxyRemoteFiles }}</SearchLabel><span v-if="federationForm.modifiedStates.proxyRemoteFiles" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts._serverSettings.proxyRemoteFiles_description }}</SearchText></template>
								</MkSwitch>
							</SearchMarker>

							<SearchMarker :keywords="['allow', 'external', 'redirect']">
								<MkSwitch v-model="federationForm.state.allowExternalApRedirect">
									<template #label><SearchLabel>{{ i18n.ts._serverSettings.allowExternalApRedirect }}</SearchLabel><span v-if="federationForm.modifiedStates.allowExternalApRedirect" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption>
										<div><SearchText>{{ i18n.ts._serverSettings.allowExternalApRedirect_description }}</SearchText></div>
										<div>{{ i18n.ts.needToRestartServerToApply }}</div>
									</template>
								</MkSwitch>
							</SearchMarker>

							<SearchMarker :keywords="['cache', 'remote', 'files']">
								<MkSwitch v-model="federationForm.state.cacheRemoteFiles">
									<template #label><SearchLabel>{{ i18n.ts.cacheRemoteFiles }}</SearchLabel><span v-if="federationForm.modifiedStates.cacheRemoteFiles" class="_modified">{{ i18n.ts.modified }}</span></template>
									<template #caption><SearchText>{{ i18n.ts.cacheRemoteFilesDescription }}</SearchText>{{ i18n.ts.youCanCleanRemoteFilesCache }}</template>
								</MkSwitch>
							</SearchMarker>

							<template v-if="federationForm.state.cacheRemoteFiles">
								<SearchMarker :keywords="['cache', 'remote', 'sensitive', 'files']">
									<MkSwitch v-model="federationForm.state.cacheRemoteSensitiveFiles">
										<template #label><SearchLabel>{{ i18n.ts.cacheRemoteSensitiveFiles }}</SearchLabel><span v-if="federationForm.modifiedStates.cacheRemoteSensitiveFiles" class="_modified">{{ i18n.ts.modified }}</span></template>
										<template #caption><SearchText>{{ i18n.ts.cacheRemoteSensitiveFilesDescription }}</SearchText></template>
									</MkSwitch>
								</SearchMarker>
							</template>
						</div>
					</MkFolder>
				</SearchMarker>

				<SearchMarker v-slot="slotProps" :keywords="['proxy', 'account']">
					<MkFolder :defaultOpen="slotProps.isParentOfTarget">
						<template #icon><SearchIcon><i class="ti ti-ghost"></i></SearchIcon></template>
						<template #label><SearchLabel>{{ i18n.ts.proxyAccount }}</SearchLabel></template>
						<template v-if="proxyAccountForm.modified.value" #footer>
							<MkFormFooter :form="proxyAccountForm"/>
						</template>

						<div class="_gaps">
							<MkInfo>{{ i18n.ts.proxyAccountDescription }}</MkInfo>

							<SearchMarker :keywords="['description']">
								<MkTextarea v-model="proxyAccountForm.state.description" :max="500" tall mfmAutocomplete :mfmPreview="true">
									<template #label><SearchLabel>{{ i18n.ts._profile.description }}</SearchLabel></template>
									<template #caption>{{ i18n.ts._profile.youCanIncludeHashtags }}</template>
								</MkTextarea>
							</SearchMarker>
						</div>
					</MkFolder>
				</SearchMarker>
				</template>

				<!-- 布局与外观（合并：小工具 + 布局模板 + 界面元素 + admin 后台菜单 + 自定义文案） -->
				<template v-if="currentTab === 'layout'">
					<div :class="$style.layoutHeader">
						<div :class="$style.layoutHeaderLeft">
							<div :class="$style.layoutTitle"><i class="ti ti-layout-grid"></i> 布局与外观</div>
							<div :class="$style.layoutSubtitle">统一管理首页布局、小工具、界面元素和文案。所有改动都需要点底部「保存」。</div>
						</div>
						<div :class="$style.layoutHeaderRight">
							<MkButton :rounded="true" @click="togglePreviewMode">
								<i :class="previewMode.asUser ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
								{{ previewMode.asUser ? '退出预览' : '👁 预览用户视角' }}
							</MkButton>
						</div>
					</div>

					<MkInfo v-if="previewMode.asUser" warn>
						当前为<strong>预览普通用户视角</strong>,所见为普通用户渲染效果。改动需点底部「保存」才能写入后端。
					</MkInfo>

					<!-- ========== MkFolder 1: 布局模板预设 ========== -->
					<SearchMarker :keywords="['layout', 'template', '布局', '模板']">
						<MkFolder :defaultOpen="false">
							<template #icon><SearchIcon><i class="ti ti-layout-grid-add"></i></SearchIcon></template>
							<template #label><SearchLabel>布局模板预设</SearchLabel></template>
							<template #caption><SearchText>选择一个默认布局模板，应用到所有用户的桌面端首页 widget 布局。</SearchText></template>

							<div class="_gaps">
								<div :class="$style.templateGrid">
									<div
										v-for="tpl in layoutTemplates"
										:key="tpl.name"
										:class="[$style.templateCard, { [$style.templateCardActive]: selectedTemplate === tpl.name }]"
										@click="selectedTemplate = tpl.name"
									>
										<div :class="$style.templateIcon">
											<i :class="tpl.icon"></i>
										</div>
										<div :class="$style.templateName">{{ tpl.label }}</div>
										<div :class="$style.templateDesc">
											<template v-if="tpl.name === 'classic'">左侧通知+日历，右侧时间线</template>
											<template v-else-if="tpl.name === 'dashboard'">多列仪表盘，信息密度最高</template>
											<template v-else-if="tpl.name === 'focus'">全宽时间线，底部通知+日历</template>
											<template v-else>用户自行拖拽排列</template>
										</div>
										<div :class="$style.templatePreview">
											<div :class="$style.previewGrid">
												<div
													v-for="(pos, widget) in tpl.layouts"
													:key="widget"
													:class="$style.previewBlock"
													:style="{
														gridColumn: `${pos.x + 1} / span ${pos.w}`,
														gridRow: `${pos.y + 1} / span ${pos.h}`,
													}"
												></div>
											</div>
										</div>
									</div>
								</div>

								<div :class="$style.templateActions">
									<MkButton primary @click="applyLayoutTemplate">
										<i class="ti ti-check"></i> 应用到所有用户
									</MkButton>
									<MkButton @click="selectedTemplate = (meta as any).clientOptions?.defaultLayoutTemplate ?? 'custom'">
										<i class="ti ti-refresh"></i> 重置
									</MkButton>
								</div>
							</div>
						</MkFolder>
					</SearchMarker>

					<!-- ========== MkFolder 2: 小工具可见性 ========== -->
					<SearchMarker :keywords="['widget', '小工具']">
						<MkFolder :defaultOpen="false">
							<template #icon><SearchIcon><i class="ti ti-layout-grid"></i></SearchIcon></template>
							<template #label><SearchLabel>小工具可见性</SearchLabel></template>
							<template #caption><SearchText>控制普通用户可见的小工具。被隐藏的小工具不会出现在添加列表中，已添加的也会停止渲染。</SearchText></template>
							<template v-if="widgetForm.modified.value" #footer>
								<MkFormFooter :form="widgetForm"/>
							</template>

							<div class="_gaps_s">
								<MkInfo>勾选表示对普通用户隐藏。管理员和版主始终可以看到所有小工具。</MkInfo>
								<div v-for="w in allWidgets" :key="w" style="display: flex; align-items: center; gap: 8px;">
									<MkSwitch v-model="widgetForm.state.hiddenWidgets[w]" style="margin: 0;">
										<template #label>{{ i18n.ts._widgets[w] ?? w }}</template>
									</MkSwitch>
								</div>
							</div>

							<MkFolder>
								<template #icon><SearchIcon><i class="ti ti-sidebar"></i></SearchIcon></template>
								<template #label><SearchLabel>右侧小工具面板</SearchLabel></template>
								<template #caption><SearchText>控制是否显示右侧小工具面板。开启后普通用户可见，关闭后所有用户强制隐藏。</SearchText></template>

								<div class="_gaps_s">
									<MkSwitch v-model="widgetForm.state.widgetsSideVisible">
										<template #label>{{ i18n.ts._serverSettings.widgetsSideVisible }}</template>
									</MkSwitch>
								</div>
							</MkFolder>
						</MkFolder>
					</SearchMarker>

					<!-- ========== MkFolder 3: 导航与界面元素 ========== -->
					<SearchMarker :keywords="['ui', 'elements', 'navbar', 'settingsPage', '导航', '界面']">
						<MkFolder :defaultOpen="false">
							<template #icon><SearchIcon><i class="ti ti-eye"></i></SearchIcon></template>
							<template #label><SearchLabel>导航与界面元素</SearchLabel></template>
							<template #caption><SearchText>控制普通用户能看到的导航、帖子、设置页、时间线等 UI 元素。管理员始终可见全部。</SearchText></template>
							<template v-if="uiElementsDirty" #footer>
								<div :class="$style.formFooterActions">
									<MkButton @click="resetUiElements"><i class="ti ti-refresh"></i> 放弃改动</MkButton>
									<MkButton primary @click="saveUiElements"><i class="ti ti-check"></i> 保存</MkButton>
								</div>
							</template>

							<div class="_gaps_m">
								<!-- 顶部导航 -->
								<MkFolder>
									<template #label><i class="ti ti-navigation"></i> 顶部导航</template>
									<MkInfo>控制顶部导航栏的功能按钮，admin 和普通用户都受影响。</MkInfo>
									<UniversalConfigPanel
										:items="navbarConfigItems"
										category="navbar"
										:modelValue="navbarModelValue"
										@update="onNavbarUpdate"
									/>
								</MkFolder>

								<!-- 帖子操作 -->
								<MkFolder>
									<template #label><i class="ti ti-message-circle"></i> 帖子操作</template>
									<MkInfo>控制帖子页操作按钮、帖子弹窗菜单、发帖表单组件。影响所有用户。</MkInfo>
									<UniversalConfigPanel
										:items="postConfigItems"
										category="post"
										:modelValue="postModelValue"
										@update="onPostUpdate"
									/>
								</MkFolder>

								<!-- 用户功能权限 -->
								<MkFolder>
									<template #label><i class="ti ti-shield-lock"></i> 用户功能权限</template>
									<div class="_gaps_s">
										<MkInfo>控制普通用户可见的功能，管理员始终可见全部。未设置的默认显示，关闭后对普通用户隐藏。</MkInfo>
										<div :class="$style.permActions">
											<MkButton :small="true" @click="toggleAllPermissions(false)"><i class="ti ti-eye"></i> 全部显示</MkButton>
											<MkButton :small="true" @click="toggleAllPermissions(true)"><i class="ti ti-eye-off"></i> 全部隐藏</MkButton>
											<MkButton :small="true" danger @click="resetPermissions"><i class="ti ti-refresh"></i> 重置默认</MkButton>
										</div>
										<div :class="$style.permGroups">
											<div v-for="group in permissionGroups" :key="group.name" :class="$style.permGroupCard">
												<div :class="$style.permGroupHeader2">
													<div :class="$style.permGroupTitle">
														<div :class="$style.permGroupIconWrap">
															<i :class="[getGroupIcon(group.name), $style.permGroupIcon]"></i>
														</div>
														<span>{{ group.name }}</span>
														<span :class="$style.permCount">({{ group.items.length }})</span>
													</div>
													<div :class="$style.permGroupActions">
														<button class="_button" :class="$style.permGroupBtn" @click="toggleGroup(group.name, false)" :title="'全部显示'">
															<i class="ti ti-eye"></i>
														</button>
														<button class="_button" :class="$style.permGroupBtn" @click="toggleGroup(group.name, true)" :title="'全部隐藏'">
															<i class="ti ti-eye-off"></i>
														</button>
													</div>
												</div>
												<div :class="$style.permListInner">
													<div v-for="perm in group.items" :key="perm.key" :class="$style.permItemInner">
														<div :class="$style.permInfoInner">
															<i :class="[perm.icon, $style.permIcon]"></i>
															<div :class="$style.permText">
																<span :class="$style.permLabel">{{ perm.label }}</span>
																<span :class="$style.permKeyText">{{ perm.key }}</span>
															</div>
														</div>
														<MkSwitch :modelValue="getPermValue(perm.key)" @update:modelValue="setPerm(perm.key, $event)" />
													</div>
												</div>
											</div>
										</div>
									</div>
								</MkFolder>

								<!-- 设置页 -->
								<MkFolder>
									<template #label><i class="ti ti-settings"></i> 设置页</template>
									<MkInfo>控制普通用户在设置页面能看到哪些选项。</MkInfo>
									<UniversalConfigPanel
										:items="settingsPageConfigItems"
										category="settingsPage"
										:modelValue="settingsPageModelValue"
										@update="onSettingsPageUpdate"
									/>
								</MkFolder>

								<!-- 时间线标签页 -->
								<MkFolder>
									<template #label><i class="ti ti-clock"></i> 时间线</template>
									<MkInfo>控制普通用户在首页时间线顶部能看到哪些标签页，管理员始终可见全部。</MkInfo>
									<div :class="$style.sectionActions">
										<MkButton :small="true" @click="resetTimelineTabs"><i class="ti ti-refresh"></i> 恢复默认</MkButton>
									</div>
									<div :class="$style.sectionList">
										<div v-for="tab in timelineTabs" :key="tab.key" :class="$style.sectionItem">
											<div :class="$style.sectionLeft">
												<i :class="tab.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
												<span :class="$style.sectionName">{{ tab.label }}</span>
											</div>
											<MkSwitch :modelValue="isTabVisible(tab.key)" @update:modelValue="setTabVisible(tab.key, $event)" />
										</div>
									</div>
								</MkFolder>

								<!-- 个人主页标签 -->
								<MkFolder>
									<template #label><i class="ti ti-user-circle"></i> 个人主页标签</template>
									<MkInfo>控制普通用户在个人主页能看到的标签页。</MkInfo>
									<div :class="$style.sectionList">
										<div v-for="item in profileTabs" :key="item.key" :class="$style.sectionItem">
											<div :class="$style.sectionLeft">
												<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
												<span :class="$style.sectionName">{{ item.label }}</span>
											</div>
											<MkSwitch :modelValue="isUIVisible('profileTabs', item.key)" @update:modelValue="setUIVisible('profileTabs', item.key, $event)" />
										</div>
									</div>
								</MkFolder>

								<!-- 首页模块（排序） -->
								<MkFolder>
									<template #label><i class="ti ti-layout-list"></i> 首页模块</template>
									<MkInfo>控制首页显示哪些模块及排序，上下箭头调整顺序。</MkInfo>
									<div :class="$style.sectionList">
										<div v-for="(section, index) in layoutSections" :key="section.id" :class="$style.sectionItem">
											<div :class="$style.sectionLeft">
												<span :class="$style.sectionIcon">{{ section.icon }}</span>
												<div>
													<div :class="$style.sectionName">{{ section.name }}</div>
													<div :class="$style.sectionDesc">{{ section.type }}</div>
												</div>
											</div>
											<div :class="$style.sectionActions">
												<button class="_button" :class="$style.arrowBtn" @click="moveSectionUp(index)" :disabled="index === 0">
													<i class="ti ti-chevron-up"></i>
												</button>
												<button class="_button" :class="$style.arrowBtn" @click="moveSectionDown(index)" :disabled="index === layoutSections.length - 1">
													<i class="ti ti-chevron-down"></i>
												</button>
												<MkSwitch v-model="section.enabled" />
											</div>
										</div>
									</div>
								</MkFolder>
							</div>
						</MkFolder>
					</SearchMarker>

					<!-- ========== MkFolder 4: admin 后台菜单 ========== -->
					<SearchMarker :keywords="['admin', 'menu', '后台', '菜单']">
						<MkFolder :defaultOpen="false">
							<template #icon><SearchIcon><i class="ti ti-shield"></i></SearchIcon></template>
							<template #label><SearchLabel>admin 后台菜单</SearchLabel></template>
							<template #caption><SearchText>勾选显示 / 取消隐藏，点击编辑重命名。影响 admin 后台侧边栏菜单项。</SearchText></template>
							<template v-if="adminMenuForm.modified.value" #footer>
								<MkFormFooter :form="adminMenuForm"/>
							</template>

							<div class="_gaps_m">
								<MkInfo>勾选显示 / 取消隐藏，点击编辑重命名。影响下方示意图中标记的 admin 后台侧边栏菜单项。</MkInfo>
								<AdminSidebarPreview
									:hidden="hiddenAdminMenu"
									:labels="adminMenuLabels"
								/>
								<UniversalConfigPanel
									:items="menuConfigItems"
									category="menu"
									:modelValue="adminMenuModelValue"
									@update="onAdminMenuUpdate"
								/>
							</div>
						</MkFolder>
					</SearchMarker>

					<!-- ========== MkFolder 5: 自定义文案 ========== -->
					<SearchMarker :keywords="['custom', 'label', '文案']">
						<MkFolder :defaultOpen="false">
							<template #icon><SearchIcon><i class="ti ti-tag"></i></SearchIcon></template>
							<template #label><SearchLabel>自定义文案</SearchLabel></template>
							<template #caption><SearchText>自定义界面上显示的文字。留空则使用默认值。修改后刷新页面生效。</SearchText></template>
							<template v-if="customLabelsDirty" #footer>
								<div :class="$style.formFooterActions">
									<MkButton @click="resetCustomLabelsLocal"><i class="ti ti-rotate"></i> 放弃改动</MkButton>
									<MkButton primary @click="saveCustomLabels"><i class="ti ti-check"></i> 保存</MkButton>
								</div>
							</template>

							<div class="_gaps_s">
								<MkInfo>自定义界面上显示的文字。留空则使用默认值。修改后刷新页面生效。</MkInfo>
								<div style="display: flex; justify-content: flex-end;">
									<MkButton :small="true" @click="resetLabels"><i class="ti ti-refresh"></i> 恢复默认</MkButton>
								</div>
								<div v-for="group in labelGroups" :key="group.name" :class="$style.permGroup">
									<div :class="$style.permGroupHeader">
										<span :class="$style.permGroupName">{{ group.name }}</span>
									</div>
									<div :class="$style.permList">
										<div v-for="item in group.items" :key="item.key" :class="$style.permItem">
											<div :class="$style.permInfo">
												<span :class="$style.labelKey">{{ item.key }}</span>
												<span :class="$style.labelDefault">默认: {{ item.defaultLabel }}</span>
											</div>
											<input
												type="text"
												:class="$style.labelInput"
												:value="customLabels[item.key] || ''"
												:placeholder="item.defaultLabel"
												@input="onCustomLabelInput(item.key, $event)"
											/>
										</div>
									</div>
								</div>
							</div>
						</MkFolder>
					</SearchMarker>
				</template>

				<MkButton primary @click="openSetupWizard">
					Open setup wizard
				</MkButton>
			</div>
		</SearchMarker>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref, defineAsyncComponent } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSplit from '@/components/form/split.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance, instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import { useForm } from '@/composables/use-form.js';
import MkFormFooter from '@/components/MkFormFooter.vue';
import MkRadios from '@/components/MkRadios.vue';
import { widgets as allWidgets } from '@/widgets/index.js';
import { layoutTemplates } from '@/utility/layout-templates.js';
import { PERMISSION_DEFINITIONS } from '@/utility/use-permission.js';
import { CUSTOM_LABEL_DEFINITIONS } from '@/utility/use-custom-label.js';
import { ADMIN_MENU_ITEMS } from '@/utility/admin-menu-items.js';
import { usePreviewModeStore, togglePreviewMode } from '@/stores/preview-mode.js';
import AdminSidebarPreview from '@/components/AdminSidebarPreview.vue';

const UniversalConfigPanel = defineAsyncComponent(() => import('@/components/UniversalConfigPanel.vue'));
const previewMode = usePreviewModeStore();

const meta = await misskeyApi('admin/meta');

const proxyAccount = await misskeyApi('users/show', { userId: meta.proxyAccountId });

const infoForm = useForm({
	name: meta.name ?? '',
	shortName: meta.shortName ?? '',
	description: meta.description ?? '',
	maintainerName: meta.maintainerName ?? '',
	maintainerEmail: meta.maintainerEmail ?? '',
	tosUrl: meta.tosUrl ?? '',
	privacyPolicyUrl: meta.privacyPolicyUrl ?? '',
	inquiryUrl: meta.inquiryUrl ?? '',
	repositoryUrl: meta.repositoryUrl ?? '',
	impressumUrl: meta.impressumUrl ?? '',
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		name: state.name,
		shortName: state.shortName === '' ? null : state.shortName,
		description: state.description,
		maintainerName: state.maintainerName,
		maintainerEmail: state.maintainerEmail,
		tosUrl: state.tosUrl,
		privacyPolicyUrl: state.privacyPolicyUrl,
		inquiryUrl: state.inquiryUrl,
		repositoryUrl: state.repositoryUrl,
		impressumUrl: state.impressumUrl,
	});
	fetchInstance(true);
});

const pinnedUsersForm = useForm({
	pinnedUsers: meta.pinnedUsers.join('\n'),
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		pinnedUsers: state.pinnedUsers.split('\n'),
	});
	fetchInstance(true);
});

const serviceWorkerForm = useForm({
	enableServiceWorker: meta.enableServiceWorker,
	swPublicKey: meta.swPublickey ?? '',
	swPrivateKey: meta.swPrivateKey ?? '',
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		enableServiceWorker: state.enableServiceWorker,
		swPublicKey: state.swPublicKey,
		swPrivateKey: state.swPrivateKey,
	});
	fetchInstance(true);
});

const adForm = useForm({
	notesPerOneAd: meta.notesPerOneAd,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		notesPerOneAd: state.notesPerOneAd,
	});
	fetchInstance(true);
});

const urlPreviewForm = useForm({
	urlPreviewEnabled: meta.urlPreviewEnabled,
	urlPreviewAllowRedirect: meta.urlPreviewAllowRedirect,
	urlPreviewTimeout: meta.urlPreviewTimeout,
	urlPreviewMaximumContentLength: meta.urlPreviewMaximumContentLength,
	urlPreviewRequireContentLength: meta.urlPreviewRequireContentLength,
	urlPreviewUserAgent: meta.urlPreviewUserAgent ?? '',
	urlPreviewSummaryProxyUrl: meta.urlPreviewSummaryProxyUrl ?? '',
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		urlPreviewEnabled: state.urlPreviewEnabled,
		urlPreviewAllowRedirect: state.urlPreviewAllowRedirect,
		urlPreviewTimeout: state.urlPreviewTimeout,
		urlPreviewMaximumContentLength: state.urlPreviewMaximumContentLength,
		urlPreviewRequireContentLength: state.urlPreviewRequireContentLength,
		urlPreviewUserAgent: state.urlPreviewUserAgent,
		urlPreviewSummaryProxyUrl: state.urlPreviewSummaryProxyUrl,
	});
	fetchInstance(true);
});

const federationForm = useForm({
	federation: meta.federation,
	federationHosts: meta.federationHosts.join('\n'),
	deliverSuspendedSoftware: meta.deliverSuspendedSoftware,
	signToActivityPubGet: meta.signToActivityPubGet,
	proxyRemoteFiles: meta.proxyRemoteFiles,
	allowExternalApRedirect: meta.allowExternalApRedirect,
	cacheRemoteFiles: meta.cacheRemoteFiles,
	cacheRemoteSensitiveFiles: meta.cacheRemoteSensitiveFiles,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		federation: state.federation,
		federationHosts: state.federationHosts.split('\n'),
		deliverSuspendedSoftware: state.deliverSuspendedSoftware,
		signToActivityPubGet: state.signToActivityPubGet,
		proxyRemoteFiles: state.proxyRemoteFiles,
		allowExternalApRedirect: state.allowExternalApRedirect,
		cacheRemoteFiles: state.cacheRemoteFiles,
		cacheRemoteSensitiveFiles: state.cacheRemoteSensitiveFiles,
	});
	fetchInstance(true);
});

const proxyAccountForm = useForm({
	description: proxyAccount.description,
}, async (state) => {
	await os.apiWithDialog('admin/update-proxy-account', {
		description: state.description,
	});
	fetchInstance(true);
});

// ========== MkFolder 2: 小工具可见性 ==========
const hiddenWidgetsMap: Record<string, boolean> = {};
const currentHiddenWidgets = (meta as any).hiddenWidgets as string[] | undefined ?? [];
for (const w of allWidgets) {
	hiddenWidgetsMap[w] = currentHiddenWidgets.includes(w);
}
const widgetForm = useForm({
	hiddenWidgets: hiddenWidgetsMap,
	widgetsSideVisible: (meta as any).widgetsSideVisible ?? true,
}, async (state) => {
	const hidden = Object.entries(state.hiddenWidgets)
		.filter(([, v]) => v)
		.map(([k]) => k);
	await os.apiWithDialog('admin/update-meta', {
		hiddenWidgets: hidden,
		widgetsSideVisible: state.widgetsSideVisible,
	} as any);
	fetchInstance(true);
});

// ========== MkFolder 1: 布局模板 ==========
const selectedTemplate = ref<string>((meta as any).clientOptions?.defaultLayoutTemplate ?? 'custom');

async function applyLayoutTemplate() {
	const latest = await misskeyApi('admin/meta') as any;
	await os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...(latest.clientOptions ?? {}),
			defaultLayoutTemplate: selectedTemplate.value,
		},
	} as any);
	fetchInstance(true);
}

// ========== MkFolder 3: 导航与界面元素 ==========
interface ConfigItem {
	key: string;
	label: string;
	icon: string;
	group?: string;
}

const navbarConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'post', label: '发帖按钮', icon: 'ti ti-pencil', group: '导航' },
	{ key: 'notifications', label: '通知', icon: 'ti ti-bell', group: '导航' },
	{ key: 'drive', label: '云盘', icon: 'ti ti-cloud', group: '导航' },
	{ key: 'followRequests', label: '关注请求', icon: 'ti ti-user-plus', group: '导航' },
	{ key: 'explore', label: '发现页', icon: 'ti ti-hash', group: '导航' },
	{ key: 'videoFeed', label: '刷视频', icon: 'ti ti-movie', group: '导航' },
	{ key: 'announcements', label: '公告', icon: 'ti ti-speakerphone', group: '导航' },
	{ key: 'search', label: '搜索', icon: 'ti ti-search', group: '导航' },
	{ key: 'lookup', label: '查找', icon: 'ti ti-world-search', group: '导航' },
	{ key: 'lists', label: '列表', icon: 'ti ti-list', group: '导航' },
	{ key: 'antennas', label: '天线', icon: 'ti ti-antenna', group: '导航' },
	{ key: 'favorites', label: '收藏', icon: 'ti ti-star', group: '导航' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news', group: '导航' },
	{ key: 'play', label: 'Play', icon: 'ti ti-player-play', group: '导航' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons', group: '导航' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip', group: '导航' },
	{ key: 'channels', label: '频道', icon: 'ti ti-device-tv', group: '导航' },
	{ key: 'achievements', label: '成就', icon: 'ti ti-medal', group: '导航' },
	{ key: 'ui', label: '切换UI', icon: 'ti ti-devices', group: '导航' },
]);

const postConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'actions:reply', label: '回复', icon: 'ti ti-arrow-back-up', group: '帖子操作' },
	{ key: 'actions:renote', label: '转发', icon: 'ti ti-repeat', group: '帖子操作' },
	{ key: 'actions:react', label: '反应/点赞', icon: 'ti ti-heart', group: '帖子操作' },
	{ key: 'actions:share', label: '分享', icon: 'ti ti-share', group: '帖子弹窗' },
	{ key: 'actions:bookmark', label: '收藏', icon: 'ti ti-bookmark', group: '帖子弹窗' },
	{ key: 'actions:report', label: '举报', icon: 'ti ti-exclamation-circle', group: '帖子弹窗' },
	{ key: 'actions:copyLink', label: '复制链接', icon: 'ti ti-link', group: '帖子弹窗' },
	{ key: 'actions:delete', label: '删除', icon: 'ti ti-trash', group: '帖子弹窗' },
	{ key: 'form:poll', label: '投票', icon: 'ti ti-chart-bar', group: '发帖表单' },
	{ key: 'form:cw', label: '内容警告 (CW)', icon: 'ti ti-eye-off', group: '发帖表单' },
	{ key: 'form:geo', label: '地理位置', icon: 'ti ti-map-pin', group: '发帖表单' },
	{ key: 'form:visibility', label: '可见范围', icon: 'ti ti-world', group: '发帖表单' },
	{ key: 'form:reactionAcceptance', label: '反应类型', icon: 'ti ti-settings', group: '发帖表单' },
]);

const settingsPageConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'profile', label: i18n.ts.profile, icon: 'ti ti-user', group: '账号' },
	{ key: 'privacy', label: i18n.ts.privacy, icon: 'ti ti-lock-open', group: '账号' },
	{ key: 'notifications', label: i18n.ts.notifications, icon: 'ti ti-bell', group: '账号' },
	{ key: 'email', label: i18n.ts.email, icon: 'ti ti-mail', group: '账号' },
	{ key: 'security', label: i18n.ts.security, icon: 'ti ti-lock', group: '账号' },
	{ key: 'preferences', label: i18n.ts.preferences, icon: 'ti ti-adjustments', group: '偏好' },
	{ key: 'theme', label: i18n.ts.theme, icon: 'ti ti-palette', group: '偏好' },
	{ key: 'emoji-palette', label: i18n.ts.emojiPalette, icon: 'ti ti-mood-happy', group: '偏好' },
	{ key: 'sounds', label: i18n.ts.sounds, icon: 'ti ti-music', group: '偏好' },
	{ key: 'plugin', label: i18n.ts.plugins, icon: 'ti ti-plug', group: '偏好' },
	{ key: 'drive', label: i18n.ts.drive, icon: 'ti ti-cloud', group: '数据' },
	{ key: 'mute-block', label: i18n.ts.muteAndBlock, icon: 'ti ti-ban', group: '数据' },
	{ key: 'connect', label: '服务连接', icon: 'ti ti-link', group: '数据' },
	{ key: 'account-data', label: '账户数据', icon: 'ti ti-package', group: '数据' },
]);

// UI 元素整体保存 — 用 ref + manual dirty 检测
const hiddenUIElements = ref<Record<string, string[]>>(
	(meta as any).clientOptions?.hiddenUIElements ?? {}
);
const layoutSections = ref(
	(meta as any).clientOptions?.layoutSections ?? [
		{ id: 'banner', type: 'banner', name: 'Banner 轮播', icon: '🖼️', enabled: true, order: 0 },
		{ id: 'featured', type: 'featured', name: '精选推荐', icon: '⭐', enabled: true, order: 1 },
		{ id: 'categories', type: 'categories', name: '分类入口', icon: '📂', enabled: true, order: 2 },
		{ id: 'timeline', type: 'timeline', name: '时间线', icon: '📰', enabled: true, order: 3 },
		{ id: 'hot-tags', type: 'hot-tags', name: '热门标签', icon: '🏷️', enabled: false, order: 4 },
		{ id: 'creators', type: 'creators', name: '创作者推荐', icon: '👥', enabled: false, order: 5 },
	]
);
const userPermissions = ref<Record<string, boolean>>(
	(meta as any).clientOptions?.userPermissions ?? {}
);
const hiddenSettingsForUsers = ref<string[]>(
	Array.isArray((meta as any).clientOptions?.hiddenSettingsForUsers?.hidden)
		? (meta as any).clientOptions!.hiddenSettingsForUsers!.hidden
		: []
);
const settingsPageLabels = ref<Record<string, string>>(
	typeof (meta as any).clientOptions?.hiddenSettingsForUsers?.labels === 'object'
		? (meta as any).clientOptions!.hiddenSettingsForUsers!.labels ?? {}
		: {}
);

// 初始值快照
const uiElementsSnapshot = {
	hiddenUIElements: JSON.parse(JSON.stringify(hiddenUIElements.value)),
	layoutSections: JSON.parse(JSON.stringify(layoutSections.value)),
	userPermissions: JSON.parse(JSON.stringify(userPermissions.value)),
	hiddenSettingsForUsers: JSON.parse(JSON.stringify(hiddenSettingsForUsers.value)),
	settingsPageLabels: JSON.parse(JSON.stringify(settingsPageLabels.value)),
};

const uiElementsDirty = computed(() => {
	return JSON.stringify(hiddenUIElements.value) !== JSON.stringify(uiElementsSnapshot.hiddenUIElements)
		|| JSON.stringify(layoutSections.value) !== JSON.stringify(uiElementsSnapshot.layoutSections)
		|| JSON.stringify(userPermissions.value) !== JSON.stringify(uiElementsSnapshot.userPermissions)
		|| JSON.stringify(hiddenSettingsForUsers.value) !== JSON.stringify(uiElementsSnapshot.hiddenSettingsForUsers)
		|| JSON.stringify(settingsPageLabels.value) !== JSON.stringify(uiElementsSnapshot.settingsPageLabels);
});

async function saveUiElements() {
	const latest = await misskeyApi('admin/meta') as any;
	await os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...(latest.clientOptions ?? {}),
			hiddenUIElements: hiddenUIElements.value,
			layoutSections: layoutSections.value,
			userPermissions: userPermissions.value,
			hiddenSettingsForUsers: {
				hidden: hiddenSettingsForUsers.value,
				labels: settingsPageLabels.value,
			},
		},
	} as any);
	// 同步快照
	uiElementsSnapshot.hiddenUIElements = JSON.parse(JSON.stringify(hiddenUIElements.value));
	uiElementsSnapshot.layoutSections = JSON.parse(JSON.stringify(layoutSections.value));
	uiElementsSnapshot.userPermissions = JSON.parse(JSON.stringify(userPermissions.value));
	uiElementsSnapshot.hiddenSettingsForUsers = JSON.parse(JSON.stringify(hiddenSettingsForUsers.value));
	uiElementsSnapshot.settingsPageLabels = JSON.parse(JSON.stringify(settingsPageLabels.value));
	fetchInstance(true);
}

function resetUiElements() {
	hiddenUIElements.value = JSON.parse(JSON.stringify(uiElementsSnapshot.hiddenUIElements));
	layoutSections.value = JSON.parse(JSON.stringify(uiElementsSnapshot.layoutSections));
	userPermissions.value = JSON.parse(JSON.stringify(uiElementsSnapshot.userPermissions));
	hiddenSettingsForUsers.value = JSON.parse(JSON.stringify(uiElementsSnapshot.hiddenSettingsForUsers));
	settingsPageLabels.value = JSON.parse(JSON.stringify(uiElementsSnapshot.settingsPageLabels));
}

// 用户权限分组
const permissionGroups = computed(() => {
	const groups: { name: string; items: typeof PERMISSION_DEFINITIONS[number][] }[] = [];
	const groupMap = new Map<string, typeof PERMISSION_DEFINITIONS[number][]>();
	for (const def of PERMISSION_DEFINITIONS) {
		if (!groupMap.has(def.group)) groupMap.set(def.group, []);
		groupMap.get(def.group)!.push(def);
	}
	for (const [name, items] of groupMap) {
		groups.push({ name, items });
	}
	return groups;
});

const groupIcons: Record<string, string> = {
	'个人资料': 'ti ti-user-circle',
	'偏好设置': 'ti ti-adjustments',
	'主题': 'ti ti-palette',
	'安全设置': 'ti ti-shield-lock',
	'隐私': 'ti ti-lock-open',
	'通知设置': 'ti ti-bell',
	'其他设置': 'ti ti-settings',
	'帖子': 'ti ti-message-circle',
	'时间线': 'ti ti-clock',
	'搜索': 'ti ti-search',
	'导航': 'ti ti-navigation',
	'互动': 'ti ti-heart',
	'创作': 'ti ti-pencil',
};

function getGroupIcon(name: string): string {
	return groupIcons[name] || 'ti ti-folder';
}

function getPermValue(key: string): boolean {
	return userPermissions.value[key] !== false;
}

function setPerm(key: string, value: boolean) {
	if (value) {
		delete userPermissions.value[key];
	} else {
		userPermissions.value[key] = false;
	}
	userPermissions.value = { ...userPermissions.value };
}

function toggleGroup(groupName: string, hide: boolean) {
	const group = permissionGroups.value.find(g => g.name === groupName);
	if (!group) return;
	for (const item of group.items) {
		if (hide) {
			userPermissions.value[item.key] = false;
		} else {
			delete userPermissions.value[item.key];
		}
	}
	userPermissions.value = { ...userPermissions.value };
}

function resetPermissions() {
	userPermissions.value = {};
}

function toggleAllPermissions(hide: boolean) {
	for (const group of permissionGroups.value) {
		for (const item of group.items) {
			if (hide) {
				userPermissions.value[item.key] = false;
			} else {
				delete userPermissions.value[item.key];
			}
		}
	}
	userPermissions.value = { ...userPermissions.value };
}

function moveSectionUp(index: number | string) {
	const i = Number(index);
	if (!Number.isFinite(i) || i <= 0) return;
	const arr = [...layoutSections.value];
	[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
	layoutSections.value = arr;
}

function moveSectionDown(index: number | string) {
	const i = Number(index);
	if (!Number.isFinite(i) || i >= layoutSections.value.length - 1) return;
	const arr = [...layoutSections.value];
	[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
	layoutSections.value = arr;
}

// 时间线标签页
const timelineTabs = [
	{ key: 'home', label: '首页', icon: 'ti ti-home' },
	{ key: 'local', label: '本地', icon: 'ti ti-planet' },
	{ key: 'social', label: '社交', icon: 'ti ti-universe' },
	{ key: 'global', label: '全局', icon: 'ti ti-whirl' },
	{ key: 'lists', label: '列表', icon: 'ti ti-list' },
	{ key: 'antennas', label: '天线', icon: 'ti ti-antenna' },
	{ key: 'channels', label: '频道', icon: 'ti ti-device-tv' },
];

const profileTabs = [
	{ key: 'followers', label: '粉丝', icon: 'ti ti-users' },
	{ key: 'following', label: '关注', icon: 'ti ti-user-plus' },
	{ key: 'activity', label: '活动', icon: 'ti ti-clock' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons' },
];

function isTabVisible(tabKey: string): boolean {
	const hidden = hiddenUIElements.value['timeline'] ?? [];
	return !hidden.includes(tabKey);
}

function setTabVisible(tabKey: string, visible: boolean) {
	const hidden = hiddenUIElements.value['timeline'] ?? [];
	if (visible) {
		hiddenUIElements.value['timeline'] = hidden.filter(k => k !== tabKey);
	} else {
		hiddenUIElements.value['timeline'] = [...hidden, tabKey];
	}
	hiddenUIElements.value = { ...hiddenUIElements.value };
}

function resetTimelineTabs() {
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		timeline: [],
	};
}

function isUIVisible(group: string, key: string): boolean {
	const hidden = hiddenUIElements.value[group] ?? [];
	return !hidden.includes(key);
}

function setUIVisible(group: string, key: string, visible: boolean) {
	const hidden = hiddenUIElements.value[group] ?? [];
	if (visible) {
		hiddenUIElements.value[group] = hidden.filter(k => k !== key);
	} else {
		hiddenUIElements.value[group] = [...hidden, key];
	}
	hiddenUIElements.value = { ...hiddenUIElements.value };
}

// Navbar / 帖子操作 UniversalConfigPanel 双向绑定
const navbarHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['navbar'])
		? hiddenUIElements.value['navbar']
		: []
);
const navbarCustomLabels = ref<Record<string, string>>({});

function onNavbarUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	navbarHiddenItems.value = val.hidden;
	navbarCustomLabels.value = val.labels;
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		navbar: val.hidden,
	};
}

const navbarModelValue = computed(() => ({
	hidden: navbarHiddenItems.value,
	labels: navbarCustomLabels.value,
}));

const postActionsHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['postActions'])
		? hiddenUIElements.value['postActions']
		: []
);
const postFormHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['postForm'])
		? hiddenUIElements.value['postForm']
		: []
);

const postActionsLabels = ref<Record<string, string>>({});
const postFormLabels = ref<Record<string, string>>({});

const postModelValue = computed(() => ({
	hidden: [
		...postActionsHiddenItems.value.map(k => `actions:${k}`),
		...postFormHiddenItems.value.map(k => `form:${k}`),
	],
	labels: {},
}));

function onPostUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	const actions: string[] = [];
	const form: string[] = [];
	for (const key of val.hidden) {
		if (key.startsWith('actions:')) actions.push(key.slice('actions:'.length));
		else if (key.startsWith('form:')) form.push(key.slice('form:'.length));
	}
	postActionsHiddenItems.value = actions;
	postFormHiddenItems.value = form;
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		postActions: actions,
		postForm: form,
	};
}

function onSettingsPageUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	hiddenSettingsForUsers.value = val.hidden;
	settingsPageLabels.value = val.labels;
}

const settingsPageModelValue = computed(() => ({
	hidden: hiddenSettingsForUsers.value,
	labels: settingsPageLabels.value,
}));

// ========== MkFolder 4: admin 后台菜单 ==========
const menuConfigItems = computed<ConfigItem[]>(() => {
	const items: ConfigItem[] = [];
	for (const group of ADMIN_MENU_ITEMS) {
		for (const item of group.items) {
			items.push({ key: item.key, label: item.text, icon: item.icon, group: group.title });
		}
	}
	return items;
});

const hiddenAdminMenu = ref<string[]>(
	typeof (meta as any).adminMenu?.hidden === 'object'
		? (meta as any).adminMenu.hidden ?? []
		: []
);
const adminMenuLabels = ref<Record<string, string>>(
	typeof (meta as any).adminMenu?.labels === 'object'
		? (meta as any).adminMenu.labels ?? {}
		: {}
);

const adminMenuModelValue = computed(() => ({
	hidden: hiddenAdminMenu.value,
	labels: adminMenuLabels.value,
}));

function onAdminMenuUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	hiddenAdminMenu.value = val.hidden;
	adminMenuLabels.value = val.labels;
}

const adminMenuForm = useForm({
	hidden: hiddenAdminMenu.value,
	labels: adminMenuLabels.value,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		adminMenu: {
			hidden: state.hidden,
			labels: state.labels,
		},
	} as any);
	fetchInstance(true);
});

// ========== MkFolder 5: 自定义文案 ==========
const customLabels = ref<Record<string, string>>((meta as any).clientOptions?.customLabels ?? {});

const labelGroups = computed(() => {
	const groups: { name: string; items: typeof CUSTOM_LABEL_DEFINITIONS[number][] }[] = [];
	const groupMap = new Map<string, typeof CUSTOM_LABEL_DEFINITIONS[number][]>();
	for (const def of CUSTOM_LABEL_DEFINITIONS) {
		if (!groupMap.has(def.group)) groupMap.set(def.group, []);
		groupMap.get(def.group)!.push(def);
	}
	for (const [name, items] of groupMap) {
		groups.push({ name, items });
	}
	return groups;
});

const labelDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function setLabel(key: string, value: string) {
	if (labelDebounceTimers.has(key)) {
		clearTimeout(labelDebounceTimers.get(key)!);
	}
	labelDebounceTimers.set(key, setTimeout(() => {
		if (value.trim()) {
			customLabels.value[key] = value.trim();
		} else {
			delete customLabels.value[key];
		}
		customLabels.value = { ...customLabels.value };
		labelDebounceTimers.delete(key);
	}, 300));
}

function onCustomLabelInput(key: string, ev: Event) {
	setLabel(key, (ev.target as HTMLInputElement).value);
}

function resetLabels() {
	customLabels.value = {};
}

// 初始值快照
let customLabelsSnapshot = JSON.parse(JSON.stringify(customLabels.value));

const customLabelsDirty = computed(() => {
	return JSON.stringify(customLabels.value) !== JSON.stringify(customLabelsSnapshot);
});

async function saveCustomLabels() {
	const latest = await misskeyApi('admin/meta') as any;
	await os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...(latest.clientOptions ?? {}),
			customLabels: customLabels.value,
		},
	} as any);
	customLabelsSnapshot = JSON.parse(JSON.stringify(customLabels.value));
	fetchInstance(true);
}

function resetCustomLabelsLocal() {
	customLabels.value = JSON.parse(JSON.stringify(customLabelsSnapshot));
}

async function openSetupWizard() {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: i18n.ts._serverSettings.restartServerSetupWizardConfirm_title,
		text: i18n.ts._serverSettings.restartServerSetupWizardConfirm_text,
	});
	if (canceled) return;

	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkServerSetupWizardDialog.vue').then(x => x.default), {
	}, {});
}

const currentTab = ref('basic');

const headerTabs = computed(() => [{
	key: 'basic',
	title: '基本信息',
	icon: 'ti ti-info-circle',
}, {
	key: 'service',
	title: '服务配置',
	icon: 'ti ti-settings',
}, {
	key: 'federation',
	title: '联邦设置',
	icon: 'ti ti-whirl',
}, {
	key: 'layout',
	title: '布局与外观',
	icon: 'ti ti-layout-grid',
}]);

definePage(() => ({
	title: i18n.ts.general,
	icon: 'ti ti-settings',
}));
</script>

<style lang="scss" module>
.subCaption {
	font-size: 0.85em;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
}

.metadataRoot {
	container-type: inline-size;
}

.fieldDragItem {
	display: flex;
	padding: 10px;
	align-items: flex-end;
	border-radius: 6px;

	@container (max-width: 452px) {
		align-items: center;
	}
}

.dragItemHandle {
	cursor: grab;
	width: 32px;
	height: 32px;
	margin: 0 8px 0 0;
	opacity: 0.5;
	flex-shrink: 0;

	&:active {
		cursor: grabbing;
	}
}

.dragItemRemove {
	@extend .dragItemHandle;

	color: #ff2a2a;
	opacity: 1;
	cursor: pointer;

	&:hover, &:focus {
		opacity: .7;
	}

	&:active {
		cursor: pointer;
	}
}

.dragItemForm {
	flex-grow: 1;
}

.formFooterActions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	width: 100%;
}

// ========== layout tab 顶部 bar ==========
.layoutHeader {
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	margin-bottom: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	gap: 16px;
	flex-wrap: wrap;
}

.layoutHeaderLeft {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.layoutTitle {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 18px;
	font-weight: 700;
}

.layoutSubtitle {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.layoutHeaderRight {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

// ========== 布局模板卡片 ==========
.templateGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
}

.templateCard {
	background: var(--MI_THEME-panel);
	border: 2px solid transparent;
	border-radius: 12px;
	padding: 16px;
	cursor: pointer;
	transition: all 0.2s;
	text-align: center;

	&:hover {
		border-color: var(--MI_THEME-divider);
		background: var(--MI_THEME-panelHighlight);
	}
}

.templateCardActive {
	border-color: var(--MI_THEME-accent) !important;
	background: color-mix(in srgb, var(--MI_THEME-accent) 8%, var(--MI_THEME-panel));
}

.templateIcon {
	font-size: 28px;
	color: var(--MI_THEME-accent);
	margin-bottom: 8px;
}

.templateName {
	font-weight: 700;
	font-size: 14px;
	margin-bottom: 4px;
}

.templateDesc {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 12px;
	line-height: 1.4;
}

.templatePreview {
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	padding: 8px;
	overflow: hidden;
}

.previewGrid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	grid-template-rows: repeat(3, 1fr);
	gap: 2px;
	height: 60px;
}

.previewBlock {
	background: color-mix(in srgb, var(--MI_THEME-accent) 30%, var(--MI_THEME-bg));
	border-radius: 3px;
	min-height: 0;
	min-width: 0;
}

.templateActions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	align-items: center;
}

// ========== 用户权限分组（来自 menu-config） ==========
.permGroup {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	overflow: hidden;
	border-left: 3px solid var(--MI_THEME-accent);
}

.permGroupHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-bg));
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.permGroupName {
	font-weight: 600;
	font-size: 14px;
}

.permList {
	padding: 4px 0;
}

.permItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	transition: background 0.15s;
	gap: 12px;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.permInfo {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13px;
	min-width: 0;
	flex: 1;
}

.labelKey {
	font-family: monospace;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-bg);
	padding: 2px 6px;
	border-radius: 4px;
}

.labelDefault {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.labelInput {
	flex: 1;
	max-width: 200px;
	padding: 6px 10px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 6px;
	font-size: 13px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	outline: none;
	transition: border-color 0.15s;

	&:focus {
		border-color: var(--MI_THEME-accent);
	}

	&::placeholder {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

// ========== 首页模块排序 ==========
.sectionList {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.sectionActions {
	display: flex;
	justify-content: flex-end;
	gap: 6px;
	margin-bottom: 8px;
	align-items: center;
}

.sectionItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
	margin-bottom: 4px;

	&:last-child {
		margin-bottom: 0;
	}

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
		transform: translateX(2px);
	}
}

.sectionLeft {
	display: flex;
	align-items: center;
	gap: 12px;
}

.sectionIcon {
	font-size: 24px;
}

.sectionName {
	font-weight: 600;
	font-size: 14px;
}

.sectionDesc {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.arrowBtn {
	width: 28px;
	height: 28px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.permGroups {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.permActions {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

.permGroupCard {
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
	transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

	&:hover {
		border-color: var(--MI_THEME-accent);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent);
		transform: translateY(-1px);
	}
}

.permGroupHeader2 {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	background: linear-gradient(135deg, color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-panel)), var(--MI_THEME-panel));
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.permGroupTitle {
	display: flex;
	align-items: center;
	gap: 12px;
	font-weight: 600;
	font-size: 15px;
	color: var(--MI_THEME-fg);
}

.permGroupIconWrap {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: var(--MI_THEME-accentedBg);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 20%, transparent);
}

.permGroupIcon {
	color: var(--MI_THEME-accent);
	font-size: 18px;
}

.permCount {
	font-size: 11px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-bg);
	padding: 3px 10px;
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
}

.permGroupActions {
	display: flex;
	gap: 4px;
}

.permGroupBtn {
	width: 30px;
	height: 30px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		transform: scale(1.05);
	}

	i {
		font-size: 14px;
	}
}

.permListInner {
	padding: 4px 0;
}

.permItemInner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	margin: 0 8px;
	border-radius: 10px;
	transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
	gap: 12px;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		transform: translateX(4px);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
	}
}

.permInfoInner {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.permIcon {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 16px;
	width: 20px;
	text-align: center;
	flex-shrink: 0;
}

.permText {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.permLabel {
	font-weight: 500;
	font-size: 13px;
}

.permKeyText {
	font-size: 10px;
	font-family: monospace;
	color: var(--MI_THEME-fgTransparentWeak);
}
</style>