"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const profile_service_1 = require("../../services/profile.service");
const initial_profile_dto_1 = require("./dto/initial-profile.dto");
const get_profile_dto_1 = require("./dto/get-profile.dto");
let ProfileController = class ProfileController {
    profile;
    constructor(profile) {
        this.profile = profile;
    }
    async upsertInitial(dto) {
        return this.profile.upsertInitialProfile(dto);
    }
    async getInitial(dto) {
        return this.profile.getInitialProfile(dto.email);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Post)('initial'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initial_profile_dto_1.InitialProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "upsertInitial", null);
__decorate([
    (0, common_1.Get)('initial'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_profile_dto_1.GetProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getInitial", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map