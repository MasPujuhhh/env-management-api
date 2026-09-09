import { Module } from '@nestjs/common';
import { RepositoryGroupsController } from './repository-groups.controller';
import { RepositoryGroupsService } from './repository-groups.service';
@Module({ controllers: [RepositoryGroupsController], providers: [RepositoryGroupsService] })
export class RepositoryGroupsModule {}
