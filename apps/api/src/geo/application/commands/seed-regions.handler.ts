import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { checkStaff } from "../../domain/geo.js";
import { Region } from "../../domain/region.js";
import {
  REGION_REPOSITORY,
  type RegionRepository,
} from "../../domain/region.repository.js";
import { SeedRegionsCommand } from "./seed-regions.command.js";

@CommandHandler(SeedRegionsCommand)
export class SeedRegionsHandler implements ICommandHandler<SeedRegionsCommand> {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
  ) {}

  async execute({
    countryCode,
    regions,
    actor,
  }: SeedRegionsCommand): Promise<boolean> {
    checkStaff(actor);
    if (regions.length === 0 || (await this.regions.hasCountry(countryCode))) {
      return false;
    }
    await this.regions.insertMany(
      regions.map((r, position) =>
        Region.create({
          countryCode,
          ...r,
          parent: null,
          position,
        }),
      ),
    );
    return true;
  }
}
