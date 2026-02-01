-- 1. Clean up Global Categories (Optional: Run only if you want to remove old null-user data)
DELETE FROM public.categories WHERE user_id IS NULL;

-- 2. Update the Trigger Function to seed categories per user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Create Profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);

  -- B. Seed Default Categories
  -- Note: We store full Tailwind classes in 'color' column for easy frontend rendering
  
  -- Expense Categories (ID: 2)
  INSERT INTO public.categories (user_id, transaction_type_id, name, icon, color) VALUES 
    (new.id, 2, 'Food', 'shopping-cart', 'bg-orange-100 text-orange-600'),
    (new.id, 2, 'Transport', 'car', 'bg-blue-100 text-blue-600'),
    (new.id, 2, 'Utilities', 'zap', 'bg-yellow-100 text-yellow-600'),
    (new.id, 2, 'Entertainment', 'film', 'bg-purple-100 text-purple-600'),
    (new.id, 2, 'Healthcare', 'activity', 'bg-red-100 text-red-600'),
    (new.id, 2, 'Housing', 'home', 'bg-indigo-100 text-indigo-600'),
    (new.id, 2, 'Other', 'circle', 'bg-gray-100 text-gray-600');

  -- Income Categories (ID: 1)
  INSERT INTO public.categories (user_id, transaction_type_id, name, icon, color) VALUES 
    (new.id, 1, 'Salary', 'wallet', 'bg-green-100 text-green-600'),
    (new.id, 1, 'Freelance', 'briefcase', 'bg-teal-100 text-teal-600'),
    (new.id, 1, 'Investments', 'trending-up', 'bg-cyan-100 text-cyan-600');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
