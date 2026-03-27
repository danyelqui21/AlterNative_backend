import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventsDto } from './dto/filter-events.dto';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll(@Query() filters: FilterEventsDto) {
    return this.appService.findAll(filters);
  }

  @Get('featured')
  findFeatured() {
    return this.appService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateEventDto,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.appService.create(dto, organizerId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.appService.update(id, dto, organizerId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(
    @Param('id') id: string,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.appService.delete(id, organizerId);
  }
}
