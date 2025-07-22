const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const mysql = require('mysql2/promise'); // ✅ use mysql2 with async/await

const app = express();
const PORT = 3000;

// Database config
const dbConfig = {
  host: 'sql10.freesqldatabase.com',
  user: 'sql10791237',
  password: 'SzPWYv2Lcw',
  database: 'sql10791237'
};

// Connect once and reuse pool
const dbPool = mysql.createPool(dbConfig);

// Static Paths
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true
  }
}));

app.use(express.static(PUBLIC_DIR));

// Middleware to check admin
function checkAdmin(req, res, next) {
  if (req.session?.isAdmin) next();
  else res.redirect('/login.html');
}

// Routes
app.get('/products', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get('/admin.html', checkAdmin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    res.redirect('/admin.html');
  } else {
    res.send('<h3>Invalid credentials! <a href="/login.html">Try again</a></h3>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

app.post('/add-product', checkAdmin, async (req, res) => {
  const { name, price, quantity } = req.body;
  try {
    await dbPool.query(
      'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)',
      [name, price, quantity]
    );
    res.redirect('/admin.html?added=true');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add product');
  }
});

app.delete('/delete-product/:id', checkAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [result] = await dbPool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.put('/edit-product/:id', checkAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, quantity } = req.body;
  try {
    const [result] = await dbPool.query(
      'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?',
      [name, price, quantity, id]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
