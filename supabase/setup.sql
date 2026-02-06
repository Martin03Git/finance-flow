-- ==========================================
-- FINANCEFLOW DATABASE SETUP
-- Combined Schema, Triggers, and Security Policies
-- ==========================================

-- 1. TABLES SETUP
-- ==========================================

-- Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Types (Master Data: Income vs Expense)
CREATE TABLE IF NOT EXISTS public.transaction_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

-- Insert Master Data for Transaction Types if not exists
INSERT INTO public.transaction_types (name, slug) 
VALUES ('Pemasukan', 'income'), ('Pengeluaran', 'expense')
ON CONFLICT (slug) DO NOTHING;

-- Categories (User specific)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type_id INTEGER REFERENCES public.transaction_types(id),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT, -- Stores Tailwind classes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  image_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (Future Feature)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  next_payment_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions Policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Transaction Types Policies (Public Read)
CREATE POLICY "Public read transaction types" ON public.transaction_types FOR SELECT USING (true);


-- 3. AUTOMATION & TRIGGERS
-- ==========================================

-- Function to handle new user registration
-- 1. Creates a public profile
-- 2. Seeds default categories for the new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  income_type_id INTEGER;
  expense_type_id INTEGER;
BEGIN
  -- Get IDs for transaction types
  SELECT id INTO income_type_id FROM public.transaction_types WHERE slug = 'income';
  SELECT id INTO expense_type_id FROM public.transaction_types WHERE slug = 'expense';

  -- A. Create Profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email
  );

  -- B. Seed Default Categories
  
  -- Expense Categories
  INSERT INTO public.categories (user_id, transaction_type_id, name, icon, color) VALUES 
    (new.id, expense_type_id, 'Food', 'shopping-cart', 'bg-orange-100 text-orange-600'),
    (new.id, expense_type_id, 'Transport', 'car', 'bg-blue-100 text-blue-600'),
    (new.id, expense_type_id, 'Utilities', 'zap', 'bg-yellow-100 text-yellow-600'),
    (new.id, expense_type_id, 'Entertainment', 'film', 'bg-purple-100 text-purple-600'),
    (new.id, expense_type_id, 'Healthcare', 'activity', 'bg-red-100 text-red-600'),
    (new.id, expense_type_id, 'Housing', 'home', 'bg-indigo-100 text-indigo-600'),
    (new.id, expense_type_id, 'Other', 'circle', 'bg-gray-100 text-gray-600');

  -- Income Categories
  INSERT INTO public.categories (user_id, transaction_type_id, name, icon, color) VALUES 
    (new.id, income_type_id, 'Salary', 'wallet', 'bg-green-100 text-green-600'),
    (new.id, income_type_id, 'Freelance', 'briefcase', 'bg-teal-100 text-teal-600'),
    (new.id, income_type_id, 'Investments', 'trending-up', 'bg-cyan-100 text-cyan-600');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run handle_new_user() every time a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
