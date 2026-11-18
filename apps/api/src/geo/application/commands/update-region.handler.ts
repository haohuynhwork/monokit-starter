import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { RegionNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  REGION_REPOSITORY,
  type RegionRepository,
} from "../../domain/region.repository.js";
import { UpdateRegionCommand } from "./update-region.command.js";

@CommandHandler(UpdateRegionCommand)
export class UpdateRegionHandler
  implements ICommandHandler<UpdateRegionCommand>
{
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
  ) {}

  async execute({
    regionId,
    input,
    actor,
  }: UpdateRegionCommand): Promise<void> {
    checkStaff(actor);
    const region = await this.regions.findById(regionId);
    if (!region) {
      throw new RegionNotFoundError();
    }
    const { parentId, ...fields } = input;
    region.update(fields);
    if (parentId !== undefined) {
      if (parentId === null) {
        region.moveTo(null, []);
      } else {
        const parent = await this.regions.findById(parentId);
        if (!parent) {
          throw new RegionNotFoundError();
        }
        region.moveTo(
          {
            id: parentId,
            countryCode: parent.countryCode,
          },
          await this.regions.ancestorIds(parentId),
        );
      }
    }
    await this.regions.save(region);
  }
}
