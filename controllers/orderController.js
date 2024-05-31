const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Orders = require("../models/orderModel");
const Reviews = require("../models/reviewModel");

exports.getOrders = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 5;

  const query = params.get("query");
  const status = params.get("status");
  const method = params.get("method");

  const filterQuery =
    query && status && method
      ? {
          $or: [
            {
              "address.fname": {
                $regex: query || "",
                $options: "i",
              },
            },
            {
              "address.lname": {
                $regex: query || "",
                $options: "i",
              },
            },
          ],
          method: method || "",
          "status.name": {
            $regex: status || "",
            $options: "i",
          },
        }
      : query && !status && !method
      ? {
          $or: [
            {
              "address.fname": {
                $regex: query || "",
                $options: "i",
              },
            },
            {
              "address.lname": {
                $regex: query || "",
                $options: "i",
              },
            },
          ],
        }
      : query && !status && method
      ? {
          $or: [
            {
              "address.fname": {
                $regex: query || "",
                $options: "i",
              },
            },
            {
              "address.lname": {
                $regex: query || "",
                $options: "i",
              },
            },
          ],
          method: method || "",
        }
      : query && status && !method
      ? {
          $or: [
            {
              "address.fname": {
                $regex: query || "",
                $options: "i",
              },
            },
            {
              "address.lname": {
                $regex: query || "",
                $options: "i",
              },
            },
          ],
          "status.name": {
            $regex: status || "",
            $options: "i",
          },
        }
      : !query && status && method
      ? {
          method: method || "",
          "status.name": {
            $regex: status || "",
            $options: "i",
          },
        }
      : !query && !status && method
      ? {
          method: method || "",
        }
      : !query && status && !method
      ? {
          "status.name": {
            $regex: status || "",
            $options: "i",
          },
        }
      : {};

  const totalDocuments = await Orders.countDocuments(filterQuery);

  const orders = await Orders.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1));

  return res.status(200).json({
    orders,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + orders.length,
  });
});

exports.getOrder = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.query;

  return res.status(200).json(await Orders.findOne({ _id: id }));
});

exports.updateStatus = catchAsyncErrors(async (req, res, next) => {
  const { status, orderId } = req.body;

  await Orders.updateOne(
    { _id: orderId },
    {
      $push: {
        status: {
          name: status,
          message:
            status === "Pending"
              ? "Your order has been received"
              : status === "Processing"
              ? "Your order is in the process"
              : status === "Shipped"
              ? "Your order has been shipped"
              : status === "Delivered"
              ? "Your order has been delivered to you"
              : status === "Cancel"
              ? "Your order has been cancelled"
              : "",
          changedAt: Date.now(),
        },
      },
    }
  );

  return res.status(200).json({ success: true });
});

exports.getUserOrders = catchAsyncErrors(async (req, res, next) => {
  const currentUser = req.user;
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 5;

  const sortQuery = { paidAt: -1 };

  const filterQuery = { uid: currentUser._id };

  const totalDocuments = await Orders.countDocuments(filterQuery);

  const orders = await Orders.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort(sortQuery);

  return res.status(200).json({
    orders,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + orders.length,
  });
});

exports.getUserOrder = catchAsyncErrors(async (req, res, next) => {
  const currentUser = req.user;
  const { id } = req.query;

  const isReview = await Reviews.findOne({ orderId: id });

  const order = await Orders.findOne({ uid: currentUser._id, _id: id });

  return res
    .status(200)
    .json({ ...order?._doc, isReview: isReview ? true : false });
});
