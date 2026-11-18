import { Command } from "@nestjs/cqrs";

// Seals encrypted settings again with the current APP_SECRET; returns how
// many changed. Runs on every start, so rotating needs only a restart.
export class ReencryptConfigsCommand extends Command<number> {}
