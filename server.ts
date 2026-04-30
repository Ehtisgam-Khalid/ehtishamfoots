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
import nodemailer from "nodemailer";
import { v2 as cloudinary } from 'cloudinary';
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_shamfood";
const MONGODB_URI = process.env.MONGODB_URI;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Brevo Transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

// --- MongoDB Schemas ---
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  verified: { type: Boolean, default: true },
  lastCouponClaimedAt: { type: Date },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String },
  available: { type: Boolean, default: true },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: "Package" }
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String },
  userPhone: { type: String },
  items: [{
    id: String,
    title: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  total: { type: Number, required: true },
  status: { type: String, default: "pending" },
  address: { type: String },
  paymentMethod: { type: String },
  discount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  hiddenForUser: { type: Boolean, default: false },
  hiddenForAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String },
  rating: { type: Number, required: true },
  comment: { type: String },
  orderId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Category = mongoose.model("Category", categorySchema);
const Order = mongoose.model("Order", orderSchema);
const Review = mongoose.model("Review", reviewSchema);

async function startServer() {
  let isConnected = false;
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Fail faster if URI is wrong
      });
      console.log("Connected to MongoDB Atlas");
      isConnected = true;
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  } else {
    console.warn("MONGODB_URI not found. App will likely fail on DB operations. Please set MONGODB_URI in environment variables.");
  }

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Middleware to check DB connection
  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    
    if (!isConnected) {
      return res.status(503).json({ 
        message: "Database connection not established. Please verify your collection is active and MONGODB_URI is correct.",
        database: "disconnected"
      });
    }
    next();
  });

  // Normalize prices on startup
  if (isConnected) {
    try {
      const products = await Product.find({});
      for (const p of products) {
        let changed = false;
        if (p.price < 300 && p.price > 50) {
          p.price = 300 + (Math.floor(Math.random() * 50));
          changed = true;
        } else if (p.price <= 50) {
          p.price = 80;
          changed = true;
        }
        if (changed) await p.save();
      }
    } catch (e) {
      console.error("Migration error:", e);
    }
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
      const { phone, email } = req.body;
      const identifier = email || phone;
      if (!identifier) return res.status(400).json({ message: "Identifier required" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otps.set(identifier, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

      if (email) {
        // Send via Brevo
        const mailOptions = {
          from: `"${process.env.BREVO_FROM_NAME || 'ShamFood'}" <${process.env.BREVO_FROM_EMAIL}>`,
          to: email,
          subject: "ShamFood Verification Code",
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #f97316;">ShamFood Verification</h2>
              <p>Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; padding: 10px; background: #f3f4f6; text-align: center; border-radius: 8px; letter-spacing: 5px; color: #f97316;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
            </div>
          `,
        };

        if (process.env.BREVO_SMTP_KEY && process.env.BREVO_FROM_EMAIL && process.env.BREVO_SMTP_USER) {
          try {
            await transporter.sendMail(mailOptions);
            res.json({ message: "OTP sent to your email!" });
          } catch (mailErr: any) {
            console.error("Brevo Mail Error:", mailErr);
            // Fallback to debug mode even if key exists but something went wrong (e.g. invalid sender)
            res.json({ 
              message: "Failed to send email via Brevo. Check your SMTP settings and verified sender in Brevo.", 
              debug_otp: otp,
              error: "Mail service error" 
            });
          }
        } else {
          console.log(`[AUTH-DEBUG] Email OTP for ${email}: ${otp}`);
          res.json({ message: "OTP sent (Dev Mode)", debug_otp: otp });
        }
        return;
      }

      if (phone) {
        // Phone OTP logic... (existing)
        let normalizedPhone = phone.replace(/\D/g, '');
        if (normalizedPhone.startsWith('03') && normalizedPhone.length === 11) {
          normalizedPhone = '92' + normalizedPhone.substring(1);
        }
        if (!normalizedPhone.startsWith('+')) {
          normalizedPhone = '+' + normalizedPhone;
        }

        if (twilioClient) {
          const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
          const twilioFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
          
          await twilioClient.messages.create({
            from: twilioFrom,
            to: `whatsapp:${normalizedPhone}`,
            body: `*ShamFood Authentication*\n\nYour verification code is: *${otp}*\n\nThis code will expire in 10 minutes. Do not share it with anyone.`
          });
          res.json({ message: "OTP sent successfully on WhatsApp!" });
        } else {
          console.log(`[AUTH-DEBUG] OTP for ${phone}: ${otp}`);
          res.json({ 
            message: "OTP sent (Dev Mode)", 
            debug_otp: otp 
          });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      res.status(500).json({ message: "Failed to send verification code." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        uid: nanoid(),
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: "user",
        verified: true,
      });

      await user.save();

      const userObj = user.toObject();
      delete (userObj as any).password;
      const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET);
      
      res.status(201).json({ user: userObj, token });
    } catch (err) {
      console.error("Register Error:", err);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const normalizedInput = email.toLowerCase();
      const user = await User.findOne({
        $or: [
          { email: normalizedInput },
          { phone: email }
        ]
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email/phone or password" });
      }

      const userObj = user.toObject();
      delete (userObj as any).password;
      const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET);
      
      res.json({ user: userObj, token });
    } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ message: "Server error during login" });
    }
  });


  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ uid: decoded.uid });
      
      if (!user) return res.status(401).json({ message: "User not found" });

      const userObj = user.toObject();
      delete (userObj as any).password;
      res.json(userObj);
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ uid: decoded.uid });
      
      if (!user) return res.status(404).json({ message: "User not found" });

      const { name, phone, avatar } = req.body;
      if (name) user.name = name;
      if (phone) user.phone = phone;
      
      if (avatar) {
        if (avatar.startsWith('data:image')) {
          if (process.env.CLOUDINARY_CLOUD_NAME) {
            const uploadRes = await cloudinary.uploader.upload(avatar, {
              folder: 'avatars',
              resource_type: 'auto'
            });
            user.avatar = uploadRes.secure_url;
          } else {
            user.avatar = avatar;
          }
        } else {
          user.avatar = avatar;
        }
      }

      await user.save();
      const userObj = user.toObject();
      delete (userObj as any).password;
      res.json(userObj);
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // --- Product Routes ---
  // --- Cloud Storage / Upload ---
  app.post("/api/upload", async (req, res) => {
    try {
      const { image, folder = 'shamfood' } = req.body;
      if (!image) return res.status(400).json({ message: "No image provided" });

      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: folder,
          resource_type: 'auto'
        });
        res.json({ url: uploadResponse.secure_url });
      } else {
        // Mock success in dev mode if credentials missing
        console.log("[STORAGE-DEBUG] Mocking upload (Cloudinary credentials missing)");
        res.json({ url: image.startsWith('data:') ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' : image });
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/products", async (req, res) => {
    const products = await Product.find({});
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const product = new Product({
        id: nanoid(),
        ...req.body,
        price: Number(req.body.price),
        available: true
      });

      await product.save();
      
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

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      
      const result = await Product.findOneAndDelete({ id: targetId });
      
      if (!result) {
        return res.status(404).json({ message: "Product not found" });
      }

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

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      const product = await Product.findOne({ id: targetId });
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updates = req.body;
      if (updates.price) updates.price = Number(updates.price);
      
      Object.assign(product, updates);
      await product.save();
      
      res.json(product);
    } catch (err) {
      console.error("Update product error:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    const categories = await Category.find({});
    res.json(categories);
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const category = new Category({
        id: nanoid(),
        name: req.body.name,
        icon: req.body.icon || "Package"
      });

      await category.save();
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

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const targetId = String(req.params.id).trim();
      const result = await Category.findOneAndDelete({ id: targetId });

      if (!result) {
        return res.status(404).json({ message: "Category not found" });
      }

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

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

      const targetId = String(req.params.id).trim();
      const category = await Category.findOne({ id: targetId });

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      Object.assign(category, req.body);
      await category.save();
      res.json(category);
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

      const user = await User.findOne({ uid: decoded.uid });
      
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

      const order = new Order({
        id: nanoid(),
        userId: decoded.uid,
        userName: user?.name || "Guest",
        userPhone: user?.phone || "N/A",
        ...req.body,
        total: finalTotal,
        status: "pending"
      });

      await order.save();
      
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

      const user = await User.findOne({ uid: decoded.uid });
      
      if (user?.role === 'admin') {
        const orders = await Order.find({ hiddenForAdmin: { $ne: true } });
        res.json(orders);
      } else {
        const orders = await Order.find({ userId: decoded.uid, hiddenForUser: { $ne: true } });
        res.json(orders);
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await Order.findOne({ id: req.params.id });
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

      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = String(req.params.id).trim();
      const order = await Order.findOne({ id: targetId });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.status = req.body.status;
      order.updatedAt = new Date();
      await order.save();
      
      notifyUser(order.userId, "order_status_update", order);
      
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.post("/api/auth/claim-reward", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const user = await User.findOne({ uid: decoded.uid });
      if (!user) return res.status(404).json({ message: "User not found" });

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

      user.lastCouponClaimedAt = now;
      await user.save();

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

      const user = await User.findOne({ uid: decoded.uid });
      const order = await Order.findOne({ id: targetId });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (user?.role === 'admin') {
        order.hiddenForAdmin = true;
      } else if (order.userId === decoded.uid) {
        order.hiddenForUser = true;
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      if (order.hiddenForAdmin && order.hiddenForUser) {
        await Order.findOneAndDelete({ id: targetId });
      } else {
        await order.save();
      }

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

      const user = await User.findOne({ uid: decoded.uid });
      const targetId = String(req.params.id).trim();
      const order = await Order.findOne({ id: targetId });

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
      order.updatedAt = new Date();
      await order.save();
      res.json({ message: "Order cancelled successfully", order });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to cancel order" });
    }
  });

  // --- Review Routes ---
  app.get("/api/reviews", async (req, res) => {
    const reviews = await Review.find({}).sort({ createdAt: -1 });
    res.json(reviews);
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const user = await User.findOne({ uid: decoded.uid });
      if (!user) return res.status(401).json({ message: "User not found" });

      const review = new Review({
        id: nanoid(),
        userId: decoded.uid,
        userName: user.name,
        ...req.body
      });

      await review.save();
      
      res.status(201).json(review);
    } catch (err) {
      res.status(500).json({ message: "Failed to post review" });
    }
  });

  // --- Health Check ---
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      mode: process.env.NODE_ENV,
      database: isConnected ? "connected" : "disconnected"
    });
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
