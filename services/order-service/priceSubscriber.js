import { createClient } from "redis";
const redisClient = createClient()

export const latestPrices = {};

export async function startPriceSubscriber() {
    await redisClient.connect()
    console.log("Order Service subscribed to price updates");
    await redisClient.subscribe("PRICE_UPDATES",((msg)=>{
        const prices = JSON.parse(msg)
        Object.assign(latestPrices,prices);
         console.log("Updated local prices:", latestPrices);

    }))

}
