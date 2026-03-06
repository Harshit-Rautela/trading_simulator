import { pool } from "./db.js"
import { latestPrices } from "./priceSubscriber.js"

export async function executeOrder(req, res) {
    const { userId, symbol, type, amount } = req.body;
    try {
        const price = latestPrices[symbol];
        if (!price) {
            return res.status(400).json({ error: "Price not available" });
        }
        console.log("Latest prices:", latestPrices);
        console.log("Requested symbol:", symbol);
        const cost = price * amount;
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
            //updating the portfolio table
            await pool.query(
                `
        INSERT INTO portfolio (user_id, symbol, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, symbol)
        DO UPDATE SET quantity = portfolio.quantity + $3
        `,
                [userId, symbol, amount]
            );

        }
        // updating the orders table
        await pool.query(
            `
      INSERT INTO orders (user_id, symbol, type, amount, price)
      VALUES ($1,$2,$3,$4,$5)
      `,
            [userId, symbol, type, amount, price]
        );
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