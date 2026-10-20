# Design
## Reference
主参考：Mobbin / ISO Meet Hero Section
https://mobbin.com/explore/sections/5b101db5-6858-4280-a8d2-77b31aa1353d
实际查看了公开截图，借鉴浅色留白、左右主次布局、圆角预览和少量强调色。重新实现月老自己的产品界面，不复制第三方图片、品牌或源码。Mobbin discover 页面需登录，本轮通过公开 Explore > Sites 获取参考；未取得可下载代码模板。
辅助比较：Lightdash Hero Section（https://mobbin.com/explore/sections/29e133de-34ee-4255-a796-b185d60e359d）。Voiceflow 媒体无法播放，未将其作为视觉依据。
## Scene and theme
创作者在日常明亮的桌面工作环境中，把看到的账号整理成自己的内容方向，需要安静、可读和容易开始的工作台。采用浅色主题。
## Color
Restrained：暖灰与米白为主要表面，珊瑚红只用于主按钮和当前导航状态；绿色只用于保存状态。用 OKLCH 定义 token。
## Typography
Segoe UI / Microsoft YaHei 系统字体，正文14px，说明12px，页面标题32–36px。避免原型里过多10px说明。
## Layout
单功能页面，不使用常驻侧栏、工作空间卡或编号步骤导航。顶部仅品牌、历史入口和新分析；首页为最大 616px 的单列表单。结果阅读区最大 916px，只保留「对标拆解 / 我的账号搭建」两个主视图，标题下直接显示结果。方向编辑、材料、候选和版本置于更多菜单；来源按需展开。
## Components
保留米白和珊瑚红。按钮、输入和复制区域使用10–12px圆角；报告主体用留白与细分隔线组织，不逐条套卡。四个分析主题分别集中观察、推测和建议；六项账号搭建按步骤折叠。仅当前任务确实需要操作时展示运行状态。关键缺口保留一行，完整限制和证据放在可展开区域。
## Motion
仅交互状态150ms颜色变化，尊重prefers-reduced-motion。无需装饰动画、摄影素材或生图；实际Mobbin截图与代码浏览器预览足以评估本轮布局。
