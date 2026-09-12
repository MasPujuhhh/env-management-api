import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./modules/database/database.module";
import { CommonModule } from "./modules/common/common.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RepositoriesModule } from "./modules/repositories/repositories.module";
import { SecretsModule } from "./modules/secrets/secrets.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { EnvModule } from "./modules/env/env.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { RepositoryGroupsModule } from "./modules/repository-groups/repository-groups.module";
import { UsersModule } from "./modules/users/users.module";
import { SidebarModule } from "./modules/sidebar/sidebar.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    CommonModule,
    RepositoriesModule,
    SecretsModule,
    ApiKeysModule,
    EnvModule,
    OrganizationsModule,
    WorkspacesModule,
    RepositoryGroupsModule,
    UsersModule,
    SidebarModule,
  ],
})
export class AppModule {}
