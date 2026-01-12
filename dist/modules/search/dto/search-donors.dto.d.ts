export declare enum SearchType {
    BLOOD = "blood",
    ORGAN = "organ"
}
export declare class SearchDonorsDto {
    searchType: SearchType;
    filterType: string;
}
