import express from "express"
import http from "http"
import { Server } from "socket.io";
import { createClient } from "redis";
import cors from "cors";

const app = express()
app.use(cors());

//creating a manual http server
const server = http.createServer(app);

//here, we create a websocket Server and attach it to our main http server, so they run on the same port
const io = new Server(server, {
    cors: {
        origin: "*",
    },
})

const redisSubscriber = createClient();

async function startSocketServer() {
    await redisSubscriber.connect()
    console.log("Socket Gateway started");
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);
        socket.on("disconnect", () => {
            console.log("User Disconnected: ", socket.id)
        })
    })
    await redisSubscriber.subscribe("PRICE_UPDATES", (msg) => {
        const prices = JSON.parse(msg);
        console.log("Broadcasting prices:", msg);

        io.emit("price_update", prices);
    })
    // it is listening to the published event in orderController.
    await redisSubscriber.subscribe("PORTFOLIO_UPDATE", (msg) => {
        const update = JSON.parse(msg);
        console.log("Portfolio update:", update);

        io.emit("portfolio_update", update);
    })
    await redisSubscriber.subscribe("ORDER_BOOK_UPDATE",(msg)=>{
        const data = JSON.parse(msg);
         io.emit("order_book_update", data);
    })

}

startSocketServer();
server.listen(4000, () => {
    console.log("Socket server running on port 4000");
});