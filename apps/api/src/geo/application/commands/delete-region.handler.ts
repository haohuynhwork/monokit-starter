import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  RegionInUseError,
  RegionNotFoundError,
} from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  REGION_REPOSITORY,
  type RegionRepository,
} from "../../domain/region.repository.js";
import { DeleteRegionCommand } from "./delete-region.command.js";

@CommandHandler(DeleteRegionCommand)
export class DeleteRegionHandler
  implements ICommandHandler<DeleteRegionCommand>
{
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
  ) {}

  async execute({ regionId, actor }: DeleteRegionCommand): Promise<void> {
    checkStaff(actor);
    const region = await this.regions.findById(regionId);
    if (!region) {
      throw new RegionNotFoundError();
    }
    if (await this.regions.isInUse(region)) {
      throw new RegionInUseError();
    }
    await this.regions.delete(regionId);
  }
}
