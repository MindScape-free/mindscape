-- ─── Drop admin_stats (deprecated — platform_stats is the source of truth) ──
-- All writes and reads to admin_stats have been removed from application code.
-- The single canonical source for platform metrics is now platform_stats.
-- ────────────────────────────────────────────────────────────────────────

drop table if exists public.admin_stats cascade;
