import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { RegionNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import { Region } from "../../domain/region.js";
import {
  REGION_REPOSITORY,
  type RegionRepository,
} from "../../domain/region.repository.js";
import { CreateRegionCommand } from "./create-region.command.js";

@CommandHandler(CreateRegionCommand)
export class CreateRegionHandler
  implements ICommandHandler<CreateRegionCommand>
{
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
  ) {}

  async execute({ input, actor }: CreateRegionCommand): Promise<bigint> {
    checkStaff(actor);
    const { parentId, ...fields } = input;
    let parent: Region | null = null;
    if (parentId !== null) {
      parent = await this.regions.findById(parentId);
      if (!parent) {
        throw new RegionNotFoundError();
      }
    }
    const region = Region.create({
      ...fields,
      parent: parent && {
        id: parentId!,
        countryCode: parent.countryCode,
      },
    });
    await this.regions.save(region);
    return region.id!;
  }
}
