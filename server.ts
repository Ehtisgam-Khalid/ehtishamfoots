import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServer } from "http";
import { Server } from "socket.io";
import twilio from 'twilio';

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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // Normalize prices on startup
  try {
    const db = await getDb();
    let changed = false;
    db.products = db.products.map((p: any) => {
      // If it's a main item (not a small side like naan under 100), ensure it's at least 300
      if (p.price < 300 && p.price > 50) {
        p.price = 300 + (Math.floor(Math.random() * 50));
        changed = true;
      } else if (p.price <= 50) {
        // Small items like Naan
        p.price = 80;
        changed = true;
      }
      return p;
    });
    if (changed) await saveDb(db);
  } catch (e) {
    console.error("Migration error:", e);
  }

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("join_admin", () => {
      socket.join("admins");
      console.log("Admin joined admin room");
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // Helper to emit events
  const notifyAdmins = (event: string, data: any) => {
    io.to("admins").emit(event, data);
  };

  const notifyUser = (userId: string, event: string, data: any) => {
    io.to(userId).emit(event, data);
  };

  const notifyAll = (event: string, data: any) => {
    io.emit(event, data);
  };

  const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  const otps = new Map<string, { otp: string, expires: number }>();

  // --- Auth Routes ---
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone number required" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otps.set(phone, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

      if (twilioClient) {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', // Twilio Sandbox
          to: `whatsapp:${phone}`,
          body: `*ShamFood Authentication*\n\nYour verification code is: *${otp}*\n\nThis code will expire in 10 minutes. Do not share it with anyone.`
        });
        res.json({ message: "OTP sent successfully on WhatsApp!" });
      } else {
        console.log(`[AUTH-DEBUG] OTP for ${phone}: ${otp}`);
        res.json({ 
          message: "OTP sent (Dev Mode)", 
          debug_otp: otp // Only for easier testing in AIS environment if twilio not set
        });
      }
    } catch (err: any) {
      console.error("Twilio Error:", err);
      res.status(500).json({ message: "Failed to send WhatsApp OTP. Use a valid WhatsApp number." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone, otp } = req.body;
      
      const db = await getDb();
      if (db.users.find((u: any) => u.email === email)) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Verify OTP
      const stored = otps.get(phone);
      if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Clear OTP after use
      otps.delete(phone);

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        uid: nanoid(),
        name,
        email,
        phone,
        password: hashedPassword,
        role: "user",
        verified: true,
        lastCouponClaimedAt: null,
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
      
      const user = db.users.find((u: any) => u.email === email || (u.phone && u.phone === email));
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

  app.post("/api/auth/claim-reward", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const db = await getDb();
      const userIndex = db.users.findIndex((u: any) => u.uid === decoded.uid);
      
      if (userIndex === -1) return res.status(404).json({ message: "User not found" });

      const lastClaimedAt = db.users[userIndex].lastCouponClaimedAt;
      const now = new Date();
      
      if (lastClaimedAt) {
        const lastDate = new Date(lastClaimedAt);
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          return res.status(400).json({ message: "Coupon available once every 24 hours" });
        }
      }

      db.users[userIndex].lastCouponClaimedAt = now.toISOString();
      await saveDb(db);
      
      res.json({ message: "Coupon applied! -PKR 50", lastCouponClaimedAt: now.toISOString() });
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
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

  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const db = await getDb();
      const userIndex = db.users.findIndex((u: any) => u.uid === decoded.uid);
      
      if (userIndex === -1) return res.status(404).json({ message: "User not found" });

      const { name, phone, avatar } = req.body;
      if (name) db.users[userIndex].name = name;
      if (phone) db.users[userIndex].phone = phone;
      if (avatar) db.users[userIndex].avatar = avatar;

      await saveDb(db);
      const { password: _, ...userWithoutPassword } = db.users[userIndex];
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
      
      notifyAll("new_product", { title: product.title });
      
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
      
      const initialCount = db.products.length;
      db.products = db.products.filter((p: any) => String(p.id).trim() !== targetId);
      
      if (db.products.length === initialCount) {
        // Try fallback with case-insensitive
        db.products = db.products.filter((p: any) => String(p.id).trim().toLowerCase() !== targetId.toLowerCase());
      }

      if (db.products.length === initialCount) {
        console.log(`[ADMIN DELETE PRODUCT] Failed - ID not found: ${targetId}`);
        return res.status(404).json({ message: "Product not found" });
      }

      await saveDb(db);
      console.log(`[ADMIN DELETE PRODUCT] Success - Deleted ID: ${targetId}`);
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
      console.log("[ORDER CREATE] Start - Request body keys:", Object.keys(req.body));
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log("[ORDER CREATE] Failed - No auth header");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      console.log("[ORDER CREATE] User ID:", decoded.uid);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      
      if (!req.body.items || !Array.isArray(req.body.items)) {
        console.log("[ORDER CREATE] Failed - Items missing or not an array");
        return res.status(400).json({ message: "Invalid order items" });
      }

      // Calculate actual total on server for safety
      const subtotal = req.body.items.reduce((acc: number, item: any) => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.quantity || 1);
        return acc + (itemPrice * itemQty);
      }, 0);
      
      let finalTotal = subtotal;

      // Use explicit discount from client (manual button claim)
      const discount = Number(req.body.discount || 0);
      if (discount > 0 && subtotal >= 600) {
        finalTotal -= discount;
      }

      // Add delivery fee if provided
      if (req.body.deliveryFee) {
        finalTotal += Number(req.body.deliveryFee);
      }

      const order = {
        id: nanoid(),
        userId: decoded.uid,
        userName: user?.name || "Guest",
        userPhone: user?.phone || "N/A",
        ...req.body,
        total: finalTotal, // Use server-calculated total
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.orders.push(order);
      await saveDb(db);
      
      notifyAdmins("new_order", order);
      
      res.status(201).json(order);
    } catch (err: any) {
      console.error("[ORDER CREATE] Error:", err.message);
      res.status(500).json({ message: "Failed to place order: " + err.message });
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
        // Enrich orders with user info if missing (for legacy orders) and filter hidden
        const enrichedOrders = db.orders
          .filter((o: any) => !o.hiddenForAdmin)
          .map((o: any) => {
            const u = db.users.find((u: any) => u.uid === o.userId);
            return {
              ...o,
              userName: o.userName || u?.name || 'Unknown',
              userPhone: o.userPhone || u?.phone || 'N/A'
            };
          });
        res.json(enrichedOrders);
      } else {
        res.json(db.orders.filter((o: any) => o.userId === decoded.uid && !o.hiddenForUser));
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
      
      notifyUser(db.orders[index].userId, "order_status_update", db.orders[index]);
      
      res.json(db.orders[index]);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.post("/api/auth/claim-reward", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const userIndex = db.users.findIndex((u: any) => u.uid === decoded.uid);
      if (userIndex === -1) return res.status(404).json({ message: "User not found" });

      const user = db.users[userIndex];
      const now = new Date();
      
      if (user.lastCouponClaimedAt) {
        const lastClaim = new Date(user.lastCouponClaimedAt);
        const diffHours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          const remainingMinutes = Math.ceil((24 - diffHours) * 60);
          return res.status(400).json({ 
            message: "Reward already claimed today. Try again later.",
            remainingMinutes
          });
        }
      }

      db.users[userIndex].lastCouponClaimedAt = now.toISOString();
      await saveDb(db);

      res.json({ message: "Reward claimed! Rs. 50 will be deducted from your next order above Rs. 600.", nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() });
    } catch (err) {
      res.status(500).json({ message: "Claim failed" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const targetId = String(req.params.id).trim();
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "No authorization header" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      const orderIndex = db.orders.findIndex((o: any) => String(o.id).trim() === targetId);

      if (orderIndex === -1) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (user?.role === 'admin') {
        db.orders[orderIndex].hiddenForAdmin = true;
      } else if (db.orders[orderIndex].userId === decoded.uid) {
        // Soft delete for users: won't be visible to them but stays for admin
        db.orders[orderIndex].hiddenForUser = true;
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      // Cleanup: Physically remove if hidden from both (if it wasn't already spliced)
      const checkAgain = db.orders[orderIndex];
      if (checkAgain && checkAgain.hiddenForAdmin && checkAgain.hiddenForUser) {
        db.orders.splice(orderIndex, 1);
      }

      await saveDb(db);
      res.json({ message: "Order deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to remove order" });
    }
  });

  app.post("/api/orders/:id/cancel", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "No authorization header" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      const targetId = String(req.params.id).trim();
      const order = db.orders.find((o: any) => String(o.id).trim() === targetId);

      if (!order) return res.status(404).json({ message: "Order not found" });

      // Security check: Only owner or admin can cancel
      if (order.userId !== decoded.uid && user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Time check: Only within 5 minutes (300,000 ms) for users
      if (user?.role !== 'admin') {
        const orderTime = new Date(order.createdAt).getTime();
        const now = new Date().getTime();
        if (now - orderTime > 5 * 60 * 1000) {
          return res.status(400).json({ message: "Cancellation window (5 mins) has expired" });
        }
      }

      order.status = "cancelled";
      order.updatedAt = new Date().toISOString();
      await saveDb(db);
      res.json({ message: "Order cancelled successfully", order });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to cancel order" });
    }
  });

  // --- Review Routes ---
  app.get("/api/reviews", async (req, res) => {
    const db = await getDb();
    res.json(db.reviews || []);
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = db.users.find((u: any) => u.uid === decoded.uid);
      if (!user) return res.status(401).json({ message: "User not found" });

      const review = {
        id: nanoid(),
        userId: decoded.uid,
        userName: user.name,
        ...req.body,
        createdAt: new Date().toISOString()
      };

      if (!db.reviews) db.reviews = [];
      db.reviews.push(review);
      await saveDb(db);
      
      res.status(201).json(review);
    } catch (err) {
      res.status(500).json({ message: "Failed to post review" });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
