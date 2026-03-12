import { SupabaseService } from '../modules/supabase/supabase.service';
import { SearchDonorsDto } from '../modules/search/dto/search-donors.dto';
export declare class SearchService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    searchDonors(dto: SearchDonorsDto): Promise<{
        results: {
            id: any;
            userName: any;
            bloodType: any;
            hospital: any;
            location: any;
            unitsAvailable: any;
            status: any;
            phone: any;
        }[];
        total: number;
    } | {
        results: {
            id: any;
            userName: any;
            organType: any;
            hospital: any;
            location: any;
            status: any;
            phone: any;
        }[];
        total: number;
    }>;
    private searchBloodDonors;
    private searchOrganDonors;
}
