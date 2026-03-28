export abstract class EventsRepository {
  abstract getEvents(filters: any): Promise<any>;
  abstract getEvent(id: string): Promise<any>;
  abstract getFeatured(): Promise<any[]>;
  abstract createEvent(data: any, organizerId: string): Promise<any>;
  abstract updateEvent(id: string, data: any, organizerId: string): Promise<any>;
  abstract cancelEvent(id: string, organizerId: string): Promise<any>;
}
