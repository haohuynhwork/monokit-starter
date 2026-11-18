import { BadRequestException, type PipeTransform } from "@nestjs/common";

// @Param('id', IdPipe) id: bigint
export class IdPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (!/^[1-9]\d{0,18}$/.test(value)) {
      throw new BadRequestException("Invalid id");
    }
    return BigInt(value);
  }
}
