import { SetMetadata } from '@nestjs/common';

export const RequiresFeature = (feature: string) => SetMetadata('requiredFeature', feature);
