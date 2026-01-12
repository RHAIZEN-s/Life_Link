import { SearchService } from '../../services/search.service';
import { SearchDonorsDto } from './dto/search-donors.dto';
export declare class SearchController {
    private readonly search;
    constructor(search: SearchService);
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
}
