import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway for real-time seat status broadcasts.
 *
 * Clients join a room per theater event to receive live updates
 * when seats are held, released, or confirmed.
 */
@WebSocketGateway({
  namespace: '/seats',
  cors: { origin: '*' },
})
export class SeatsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected — they must join a room via 'join-event'
  }

  handleDisconnect(client: Socket) {
    // Cleanup handled automatically by socket.io room management
  }

  @SubscribeMessage('join-event')
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { theaterEventId: string },
  ) {
    client.join(`event:${data.theaterEventId}`);
    return { status: 'joined', theaterEventId: data.theaterEventId };
  }

  @SubscribeMessage('leave-event')
  handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { theaterEventId: string },
  ) {
    client.leave(`event:${data.theaterEventId}`);
    return { status: 'left', theaterEventId: data.theaterEventId };
  }

  /**
   * Broadcast seat status change to all clients viewing this event.
   * Called by TheatersGatewayService after hold/release/confirm operations.
   */
  broadcastSeatUpdate(
    theaterEventId: string,
    update: {
      seatIds: string[];
      status: 'held' | 'released' | 'reserved';
      userId?: string;
    },
  ) {
    this.server
      .to(`event:${theaterEventId}`)
      .emit('seat-update', update);
  }

  /**
   * Broadcast multiple seat statuses (bulk update on initial load).
   */
  broadcastBulkStatus(
    theaterEventId: string,
    seats: Array<{
      seatId: string;
      status: 'available' | 'held' | 'reserved';
      userId?: string;
    }>,
  ) {
    this.server
      .to(`event:${theaterEventId}`)
      .emit('seat-bulk-status', seats);
  }
}
