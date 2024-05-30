const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Queries = require("../models/queryModel");

const { createHash } = require("crypto");
const bizSdk = require("facebook-nodejs-business-sdk");

exports.addQueries = catchAsyncErrors(async (req, res, next) => {
  const { message, email, name } = req.body;

  const ServerEvent = bizSdk.ServerEvent;
  const CustomData = bizSdk.CustomData;
  const EventRequest = bizSdk.EventRequest;
  const UserData = bizSdk.UserData;

  const access_token = process.env.PIXEL_ACCESS_TOKEN;
  const pixel_id = process.env.PIXEL_ID;
  const api = bizSdk.FacebookAdsApi.init(access_token);

  let current_timestamp = Math.floor(new Date() / 1000);

  const userData_0 = new UserData()
    .setEmails([createHash("sha256").update(email).digest("hex")])
    .setFirstNames([createHash("sha256").update(name).digest("hex")])
    .setClientIpAddress(req.headers["x-real-ip"])
    .setClientUserAgent(req.get("user-agent"))
    .setFbp(req.cookies["_fbp"])
    .setFbc(req.cookies["_fbc"]);

  const customData_0 = new CustomData().setContentName(message);

  const serverEvent_0 = new ServerEvent()
    .setEventName("Contact")
    .setEventTime(current_timestamp)
    .setCustomData(customData_0)
    .setUserData(userData_0)
    .setActionSource("website")
    .setEventId(crypto.randomUUID())
    .setEventSourceUrl("https://www.essentialsbyla.com/contact");

  const eventsData = [serverEvent_0];
  const eventRequest = new EventRequest(access_token, pixel_id).setEvents(
    eventsData
  );
  eventRequest.execute().then(
    (response) => {
      console.log("Response: ", response);
    },
    (err) => {
      console.error("Error: ", err);
    }
  );

  const newQuery = new Queries({
    email,
    message,
    name,
  });

  await newQuery.save();

  return res.status(200).json({ success: true });
});
