-- 1. Make user_id nullable to allow Global Categories
ALTER TABLE public.categories 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update RLS Policy for Viewing
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;

CREATE POLICY "Users can view default and own categories" 
ON public.categories 
FOR SELECT 
USING (
  auth.uid() = user_id  -- Own custom categories
  OR 
  user_id IS NULL       -- Global system categories
);

-- 3. Insert Default Global Categories
-- Assumes transaction_type_id: 1 = Income, 2 = Expense. Check your 'transaction_types' table first!
INSERT INTO public.categories (name, icon, transaction_type_id, user_id)
VALUES 
  ('Food', 'shopping-cart', 2, NULL),
  ('Transport', 'car', 2, NULL),
  ('Utilities', 'zap', 2, NULL),
  ('Entertainment', 'film', 2, NULL),
  ('Healthcare', 'activity', 2, NULL),
  ('Housing', 'home', 2, NULL),
  ('Salary', 'wallet', 1, NULL),
  ('Freelance', 'briefcase', 1, NULL),
  ('Investments', 'trending-up', 1, NULL),
  ('Other', 'circle', 2, NULL);
