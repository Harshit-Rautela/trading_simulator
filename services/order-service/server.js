import express from "express";
import cors from "cors";

import { executeOrder } from "./orderController.js";
import { startPriceSubscriber } from "./priceSubscriber.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/order", executeOrder);

startPriceSubscriber();

app.listen(5000, () => {
  console.log("Order service running on port 5000");
});