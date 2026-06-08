/*
 * CG微米 功能开关配置
 * 控制各功能模块的启用/禁用，navbar.ts 等模块通过 import 引用
 *
 * true  = 启用（默认展示）
 * false = 禁用（隐藏入口）
 *
 * 修改后重新编译生效，不支持运行时热切换
 */

export const features = {
	// === 核心功能（默认启用）===
	videoFeed: true,        // 刷视频 — CG微米主功能
	notifications: true,    // 通知
	search: true,           // 搜索
	explore: true,          // 发现/推荐
	profile: true,          // 个人主页
	announcements: false,   // 公告
	favorites: false,       // 收藏

	// === 次要功能（按需启用）===
	drive: false,           // 网盘/文件管理
	pages: false,           // 用户页面（Wiki）
	play: false,            // Play（交互式小程序）
	gallery: true,          // 作品集
	channels: false,        // 频道
	achievements: false,    // 成就系统
	lists: false,           // 自定义列表
	followRequests: false,  // 关注请求
	antennas: false,        // 天线
	clips: false,           // Clip
	lookup: false,          // 查找
	ui: false,              // UI切换
} as const;
