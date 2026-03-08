import { createClient } from "redis";
console.log("Starting price engine script...");
const redis = createClient()


const prices = {
    BTC: 42000,
    ETH: 2200,
    SOL: 100,
};

async function startPriceEngine() {
    await redis.connect()
    console.log("Price Engine started...");

    setInterval(async() => {
        for (const asset in prices) {
            const change = (Math.random() - 0.5) * 50;

            prices[asset] = Math.max(1, prices[asset] + change);
        }

        console.log("New Prices:", prices);

        await redis.publish(
            "PRICE_UPDATES",
            JSON.stringify(prices)
        );
    }, 4000)
}

startPriceEngine()