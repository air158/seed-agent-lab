# Dreamly chat UI implementation

Reference: `chat-concept.png` generated for this requested app. The primary screen is a left conversation rail, a restrained white workspace, three suggested prompts, and a rounded composer. This is a functioning app, not the reference image rendered as UI.

## Design tokens

- White canvas; sidebar `#f7f8fa`; text `#202833`; muted text `#828b98`; border `#e4e7eb`; teal `#245f63`.
- Native system sans, including PingFang SC for Chinese. Desktop heading 34px, body 15px, controls 12–14px. Sidebar 252–300px, content/composer 768px.
- Thin Lucide icons, 8–15px interface radii, minimal shadows. A four-point sparkle is the only brand mark.
- No remotely loaded fonts, scripts, images, analytics, or automatic external Markdown image requests.

## Intentional adaptations

- Final user preference is the free model. The deployed control says 免费模型, as in the reference. Earlier local QA screenshots used the initially selected MomoAI adapter; those are explicitly historical local checks.
- Fake example histories in the reference are replaced by real saved chats or a clear empty state.
- A private login screen is required by the user's privacy concern; authenticated screens follow the same design system.
- Status label is 私人工作区 instead of a blanket 已连接 claim; heartbeat health is shown separately from model availability.
- Attachment, response, status, task, settings, search, and mobile states use the same tokens and component family.

## Verification ledger

Verified in signed-in Chrome against the generated concept on 2026-10-23 (Asia/Shanghai):

- Desktop 1340×772: reference-style left rail, central greeting/suggestions and rounded wide composer; real conversation titles replace concept samples. Screenshot: `desktop-verified.png`.
- Mobile 390×844: document scroll width equals viewport width, messages and composer fit without horizontal overflow. Screenshot: `mobile-verified.png`. This is browser responsive emulation, not physical phone testing.
- Earlier local MomoAI streaming returned Markdown and checkbox content before the user switched to the free provider. A function-call turn added a reminder, then read it back; the task is visible in the task page.
- Reload restores the selected chat and saved messages. Stop cancels streaming and marks the partial reply stopped.
- Build and backend integration tests verify authentication, CSRF, CRUD, quota, persistence, logout, SSE and tool handling. UI smoke checks are not an exhaustive audit.
- Screenshots are local test data; production deployment and provider-secret configuration are separate verification steps.

## Free-provider revision

The user subsequently requested the free option. The active provider is now the native Workers AI Gemma binding, with no paid fallback. Unit tests cover streaming, fragmented tool calls, vision payload conversion, provider errors and no paid-key use. Production model verification is pending.
