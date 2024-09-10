import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group,  } from './group.entity';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { User } from 'src/auth/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    
    imports: [TypeOrmModule.forFeature([Group]), AuthModule],  // Include AuthModule
    controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {

    private logger = new Logger(GroupModule.name);

    constructor() {
      this.logger.log('GroupModule initialized');
    }
}