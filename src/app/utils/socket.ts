import { Server as SocketIOServer } from "socket.io";
import AppError from "../errors/AppError";
import httpStatus from "http-status";

let initialIo: SocketIOServer;
export const initSocket = (server: any) => {
    initialIo = new SocketIOServer(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true,
        },
        transports: ['websocket', 'polling']
    });
    return initialIo
}



export const getSocket = () => {
    if (!initialIo) {
        throw new AppError(httpStatus.NOT_FOUND, 'Socket.io instance not initialized yet!');
    }
    return initialIo;
};

