import { createClient } from "redis";

const redisPublisher  = createClient()
await redisPublisher .connect()
export const orderBooks = {}

function getOrderBook(symbol) {
    if (!orderBooks[symbol]) {
        orderBooks[symbol] = {
            bids: [],
            asks: []
        }
    }
    return orderBooks[symbol];
}

function matchOrders(symbol) {

    const book = orderBooks[symbol];

    while (book.bids.length && book.asks.length) {

        const bestBid = book.bids[0];
        const bestAsk = book.asks[0];

        if (bestBid.price < bestAsk.price) {
            break;
        }
        //now here bestbid is >= to bestAsk
        const tradeAmount = Math.min(bestBid.amount, bestAsk.amount);

        console.log("TRADE EXECUTED", {
            symbol,
            price: bestAsk.price,
            quantity: tradeAmount
        });

        bestBid.amount -= tradeAmount;
        bestAsk.amount -= tradeAmount;
        //shift removes the first element of the array
        if (bestBid.amount === 0) {
            book.bids.shift();
        }

        if (bestAsk.amount === 0) {
            book.asks.shift();
        }
    }
}
export function addOrder(order) {
    const { symbol, type, price, amount } = order;
    const book = getOrderBook(symbol)
    if (type === "BUY") {
        book.bids.push({ price, amount });
        book.bids.sort((a, b) => b.price - a.price)
    }
    if (type === "SELL") {
        book.asks.push({ price, amount });
        book.asks.sort((a, b) => a.price - b.price)
    }

    matchOrders(symbol)

}

await redisPublisher.publish(
  "ORDER_BOOK_UPDATE",
  JSON.stringify({
    symbol,
    bids: book.bids,
    asks: book.asks
  })
);