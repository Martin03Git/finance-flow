-- 1. Add columns for Telegram Integration
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_otp TEXT;

-- 2. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_otp ON public.profiles(telegram_otp);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id);
