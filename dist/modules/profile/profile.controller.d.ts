import { ProfileService } from '../../services/profile.service';
import { InitialProfileDto } from './dto/initial-profile.dto';
import { GetProfileDto } from './dto/get-profile.dto';
export declare class ProfileController {
    private readonly profile;
    constructor(profile: ProfileService);
    upsertInitial(dto: InitialProfileDto): Promise<{
        ok: boolean;
        profile: any;
    }>;
    getInitial(dto: GetProfileDto): Promise<{
        ok: boolean;
        profile: any;
    }>;
}
