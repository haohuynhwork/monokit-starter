import {
  Global,
  Inject,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { closeDatabase, connectDatabase, db } from "@packages/db";

export const DB = Symbol("DB");
export type Db = typeof db;

// Shorthand for @Inject(DB)
export const InjectDb = () => Inject(DB);

// Import once in the root module. Tests swap the client with
// .overrideProvider(DB).useValue(fake).
@Global()
@Module({
  providers: [
    {
      provide: DB,
      useValue: db,
    },
  ],
  exports: [
    DB,
  ],
})
export class DatabaseModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  // Fail at startup, not on the first request, if the db is unreachable
  async onApplicationBootstrap(): Promise<void> {
    await connectDatabase();
  }

  // Lets the process (and the seeder) exit; needs app.enableShutdownHooks()
  // or app.close()
  async onApplicationShutdown(): Promise<void> {
    await closeDatabase();
  }
}
