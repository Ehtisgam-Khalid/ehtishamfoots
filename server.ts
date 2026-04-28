import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_shamfood";

async function getDb() {
  const data = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(data);
}

async function saveDb(db: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      
      const db = await getDb();
      if (db.users.find((u: any) => u.email === email)) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        uid: nanoid(),
        name,
        email,
        phone,
        password: hashedPassword,
        role: "user",
        verified: true,
        createdAt: new Date().toISOString()
      };

      db.users.push(user);
      await saveDb(db);

      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET);
      
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const db = await getDb();
      
      const user = db.users.find((u: any) => u.email === email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET);
      
      res.json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      
      if (!user) return res.status(401).json({ message: "User not found" });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // --- Product Routes ---
  app.get("/api/products", async (req, res) => {
    const db = await getDb();
    res.json(db.products);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const product = {
        id: nanoid(),
        ...req.body,
        price: Number(req.body.price),
        available: true
      };

      db.products.push(product);
      await saveDb(db);
      res.status(201).json(product);
    } catch (err) {
      console.error("Add product error:", err);
      res.status(500).json({ message: "Failed to add product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      console.log(`[ADMIN DELETE] Request for product ID: "${targetId}"`);
      
      const index = db.products.findIndex((p: any) => String(p.id).trim() === targetId);
      
      if (index === -1) {
        // Try case-insensitive as fallback
        const indexCI = db.products.findIndex((p: any) => String(p.id).trim().toLowerCase() === targetId.toLowerCase());
        
        if (indexCI === -1) {
          console.log(`[ADMIN DELETE] Product not found. ID: "${targetId}". Available IDs: ${db.products.map((p: any) => p.id).join(", ")}`);
          return res.status(404).json({ 
            message: `Product not found (ID: ${targetId})`,
            availableIds: db.products.map((p: any) => p.id)
          });
        }
        // If found case-insensitive, use that index
        db.products.splice(indexCI, 1);
      } else {
        db.products.splice(index, 1);
      }

      await saveDb(db);
      res.json({ message: "Product deleted successfully" });
    } catch (err) {
      console.error("Delete product error:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      const index = db.products.findIndex((p: any) => String(p.id).trim() === targetId);
      
      if (index === -1) {
        return res.status(404).json({ message: "Product not found" });
      }

      db.products[index] = {
        ...db.products[index],
        ...req.body,
        id: db.products[index].id,
        price: Number(req.body.price || db.products[index].price)
      };

      await saveDb(db);
      res.json(db.products[index]);
    } catch (err) {
      console.error("Update product error:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    const db = await getDb();
    res.json(db.categories);
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const category = {
        id: nanoid(),
        name: req.body.name,
        icon: req.body.icon || "Package"
      };

      db.categories.push(category);
      await saveDb(db);
      res.status(201).json(category);
    } catch (err) {
      res.status(500).json({ message: "Failed to add category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const targetId = String(req.params.id).trim();
      console.log(`[ADMIN DELETE CATEGORY] Request for ID: "${targetId}"`);

      const index = db.categories.findIndex((c: any) => String(c.id).trim() === targetId);

      if (index === -1) {
        console.log(`[ADMIN DELETE CATEGORY] Not found. Available IDs: ${db.categories.map((c: any) => c.id).join(", ")}`);
        return res.status(404).json({ message: "Category not found" });
      }

      db.categories.splice(index, 1);
      await saveDb(db);
      console.log(`[ADMIN DELETE CATEGORY] Successfully deleted ID: ${targetId}`);
      res.json({ message: "Category deleted successfully" });
    } catch (err) {
      console.error("Delete category error:", err);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const targetId = String(req.params.id).trim();
      const index = db.categories.findIndex((c: any) => String(c.id).trim() === targetId);

      if (index === -1) {
        return res.status(404).json({ message: "Category not found" });
      }

      db.categories[index] = {
        ...db.categories[index],
        ...req.body,
        id: db.categories[index].id
      };

      await saveDb(db);
      res.json(db.categories[index]);
    } catch (err) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // --- Order Routes ---
  app.post("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);

      const order = {
        id: nanoid(),
        userId: decoded.uid,
        userName: user?.name,
        userPhone: user?.phone,
        ...req.body,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.orders.push(order);
      await saveDb(db);
      res.status(201).json(order);
    } catch (err) {
      res.status(500).json({ message: "Failed to place order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      
      if (user?.role === 'admin') {
        // Enrich orders with user info if missing (for legacy orders)
        const enrichedOrders = db.orders.map((o: any) => {
          const u = db.users.find((u: any) => u.uid === o.userId);
          return {
            ...o,
            userName: o.userName || u?.name || 'Unknown',
            userPhone: o.userPhone || u?.phone || 'N/A'
          };
        });
        res.json(enrichedOrders);
      } else {
        res.json(db.orders.filter((o: any) => o.userId === decoded.uid));
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const db = await getDb();
      const order = db.orders.find((o: any) => o.id === req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      const index = db.orders.findIndex((o: any) => String(o.id).trim() === targetId);
      if (index === -1) {
        console.log(`[ADMIN STATUS UPDATE] Order not found: ${targetId}`);
        return res.status(404).json({ message: "Order not found" });
      }

      db.orders[index].status = req.body.status;
      db.orders[index].updatedAt = new Date().toISOString();
      await saveDb(db);
      res.json(db.orders[index]);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const targetId = String(req.params.id).trim();
      console.log(`[ORDER DELETE] Request for ID: "${targetId}"`);
      
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "No authorization header" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const initialCount = db.orders.length;
      db.orders = db.orders.filter((o: any) => String(o.id).trim() !== targetId);
      
      if (db.orders.length === initialCount) {
        console.log(`[ORDER DELETE] Order not found: ${targetId}`);
        return res.status(404).json({ message: "Order not found" });
      }

      await saveDb(db);
      console.log(`[ORDER DELETE] Successfully deleted: ${targetId}`);
      res.json({ message: "Order deleted successfully" });
    } catch (err: any) {
      console.error("Delete order error:", err);
      res.status(500).json({ message: err.message || "Failed to delete order" });
    }
  });

  // --- Health Check ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // Vite middleware for development or Static files for production
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // API routes should have been handled already, but just in case
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // Final catch-all for API errors (if not handled above)
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
