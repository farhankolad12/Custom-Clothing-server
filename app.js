const dotenv = require("dotenv");
dotenv.config();

const express = require("express");

const app = express();

const cookieParser = require("cookie-parser");
const connectDatabase = require("./config/database");
const connectCloudinary = require("./config/cloudinaryUpload");

connectDatabase();
connectCloudinary();

app.use(express.json());
app.use(cookieParser());

// Import Routers
const user = require("./routes/userRoute");
const home = require("./routes/homeRoute");
const shop = require("./routes/shopRoute");
const blog = require("./routes/blogRoute");
const about = require("./routes/aboutRoute");
const order = require("./routes/orderRoute");
const coupon = require("./routes/couponRoute");
const review = require("./routes/reviewRoute");
const product = require("./routes/productRoute");
const queries = require("./routes/queriesRoute");
const payment = require("./routes/paymentRoute");
const category = require("./routes/categoryRoute");
const attribute = require("./routes/attributeRoute");
const privacyTerms = require("./routes/privacyTerms");
const notifications = require("./routes/notificationRoute");

// Call Routers
app.use("/api", user);
app.use("/api", home);
app.use("/api", shop);
app.use("/api", blog);
app.use("/api", about);
app.use("/api", order);
app.use("/api", coupon);
app.use("/api", review);
app.use("/api", product);
app.use("/api", queries);
app.use("/api", category);
app.use("/api", attribute);
app.use("/api", privacyTerms);
app.use("/api", notifications);
app.use("/api/payment", payment);

app.listen(process.env.PORT || 4000);
