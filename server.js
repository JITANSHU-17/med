const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Database config
const dbConfig = {
  host: 'sql10.freesqldatabase.com',
  user: 'sql10791237',
  password: 'SzPWYv2Lcw',
  database: 'sql10791237'
};

const dbPool = mysql.createPool(dbConfig);
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

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get('/products', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/orders', checkAdmin, async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

app.post('/order', (req, res) => {
  try {
    const { name, price, quantity, userPhone } = req.body;

    if (!name || !price || !quantity || !userPhone) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const sql = 'INSERT INTO orders (medicine_name, price, quantity, phone) VALUES (?, ?, ?, ?)';
    dbPool.query(sql, [name, price, quantity, userPhone], (err, result) => {
      if (err) {
        console.error("MySQL error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      return res.json({ success: true });
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.delete('/delete-order-group', (req, res) => {
  const { phone, time } = req.query;

  // ✅ Step 1: Validate query parameters
  if (!phone || !time) {
    return res.status(400).json({ success: false, message: 'Missing phone or time parameter' });
  }

  // ✅ Step 2: Run parameterized SQL query to prevent SQL injection
  const deleteQuery = 'DELETE FROM orders WHERE phone = ? AND created_at = ?';

  dbPool.query(deleteQuery, [phone, time], (err, result) => {
    if (err) {
      console.error("❌ SQL Delete Error:", err);
      return res.status(500).json({ success: false, message: 'Internal server error while deleting data' });
    }

    // ✅ Step 3: Check if any rows were actually deleted
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'No matching order group found for deletion' });
    }

    // ✅ Step 4: Send success response
    console.log("✅ Order group deleted successfully.");
    return res.json({ success: true, message: 'Order group deleted successfully' });
  });
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

app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
