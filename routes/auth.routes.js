router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (!data || data.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = data[0];

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ✅ Return BOTH token and user object
  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      email: user.email
    }
  });
});