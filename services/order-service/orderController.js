import { pool } from "./db.js"
import { latestPrices } from "./priceSubscriber.js"
import { createClient } from "redis"
import { addOrder } from "./matchingEngine.js"

const redisPublisher = createClient()
await redisPublisher.connect()

export async function executeOrder(req, res) {
    const { userId, symbol, type, amount } = req.body;
    try {
        const price = latestPrices[symbol];
        if (!price) {
            return res.status(400).json({ error: "Price not available" });
        }
        addOrder({ symbol, type, price, amount })
        console.log("Latest prices:", latestPrices);
        console.log("Requested symbol:", symbol);
        const cost = price * amount;
        let finalAvgPrice = 0;
        // Here $ is a positional parameter, which means it's place will later be filled by userId or cost etc.
        // Parameterised queries prevent SQL injection.
        const userResult = await pool.query("SELECT balance FROM users WHERE id = $1",
            [userId])
        const balance = userResult.rows[0].balance
        if (type === "BUY" && balance < cost) {
            return res.status(400).json({ error: "Insufficient balance" })
        }
        if (type === "BUY") {
            await pool.query(
                "UPDATE users SET balance = balance - $1 WHERE id = $2",
                [cost, userId]
            );
            //updating the portfolio table--
            // Check existing portfolio position
            const portfolioResult = await pool.query(
                "SELECT quantity, avg_price FROM portfolio WHERE user_id=$1 AND symbol=$2",
                [userId, symbol]
            );

            if (portfolioResult.rows.length === 0) {

                // first time buying this asset
                finalAvgPrice = price;
                await pool.query(
                    `INSERT INTO portfolio (user_id, symbol, quantity, avg_price)
     VALUES ($1,$2,$3,$4)`,
                    [userId, symbol, amount, price]
                );

            } else {

                const { quantity, avg_price } = portfolioResult.rows[0];

                const newQuantity = Number(quantity) + amount;

                finalAvgPrice =
                    ((quantity * avg_price) + amount * price) / newQuantity;

                await pool.query(
                    `UPDATE portfolio
     SET quantity=$1, avg_price=$2
     WHERE user_id=$3 AND symbol=$4`,
                    [newQuantity, finalAvgPrice, userId, symbol]
                );

            }

        }
        // updating the orders table
        await pool.query(
            `
      INSERT INTO orders (user_id, symbol, type, amount, price)
      VALUES ($1,$2,$3,$4,$5)
      `,
            [userId, symbol, type, amount, price]
        );
        await redisPublisher.publish("PORTFOLIO_UPDATE", JSON.stringify({
            userId,
            symbol,
            amount,
            type,
            avg_price: finalAvgPrice
        }))
        res.json({
            message: "Order executed",
            price,
            cost

        })

    } catch (error) {
        console.log("Couldn't execute order:", error)
        res.status(500).json({ error: "Order failed" });
    }
}