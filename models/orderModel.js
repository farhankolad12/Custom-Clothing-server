const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  uid: {
    type: String,
  },
  products: [
    {
      productId: {
        type: String,
      },
      quantity: {
        type: Number,
      },
      name: {
        type: String,
      },
      shortDescription: {
        type: String,
      },
      fullDescription: {
        type: String,
      },
      price: {
        type: Number,
      },
      isFeatured: {
        type: Boolean,
      },
      category: {
        type: String,
      },
      tags: [
        {
          id: { type: String },
          tag: { type: String },
        },
      ],
      variants: [
        {
          displayName: { type: String },
          title: { type: String },
          values: [
            {
              id: { type: String },
              variant: { type: String },
            },
          ],
        },
      ],
      // combinations: [
      //   {
      //     id: { type: String },
      //     price: { type: Number },
      //     salePrice: { type: Number },
      //     combinations: [
      //       {
      //         id: { type: String },
      //         variant: { type: String },
      //         parentName: { type: String },
      //       },
      //     ],
      //   },
      // ],
      images: [
        {
          id: {
            type: String,
          },
          link: {
            type: String,
          },
        },
      ],
      selectedCombination: {
        id: { type: String },
        price: { type: Number },
        salePrice: { type: Number },
        combinations: [
          {
            id: { type: String },
            variant: { type: String },
            parentName: { type: String },
          },
        ],
      },
    },
  ],
  coupon: {
    image: {
      id: { type: String },
      link: { type: String },
    },
    name: { type: String },
    code: { type: String },
    expiresAt: { type: Number },
    type: { type: String },
    discount: { type: Number },
    minimumCartValue: { type: Number },
    createdAt: {
      type: Number,
      default: Date.now,
    },
  },
  status: [
    {
      name: {
        type: String,
      },
      message: {
        type: String,
      },
      changedAt: {
        type: Date,
      },
    },
  ],
  shippingPrice: {
    type: Number,
  },
  subtotal: {
    type: Number,
  },
  discountedPrice: {
    type: Number,
  },
  deliveredAt: {
    type: Date,
  },
  method: {
    type: String,
  },
  address: {
    fname: {
      type: String,
    },
    lname: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    streetAddr1: {
      type: String,
    },
    streetAddr2: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    state: {
      type: String,
    },
  },
  paidAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Orders", orderSchema);
