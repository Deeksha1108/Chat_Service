import { Server } from 'socket.io';
import { SOCKET_IO_SERVER } from './socket.constants';

const io = new Server({
  cors: {
    origin: '*',
  },
});

export const SocketIoProvider = {
  provide: SOCKET_IO_SERVER,
  useValue: io,
};
