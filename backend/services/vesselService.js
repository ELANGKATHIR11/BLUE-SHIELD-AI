/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { vesselRepository } from '../repositories/vesselRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';

class VesselService {
  async registerVessel(vesselData, actor = 'SYSTEM') {
    const { aisId, governmentBoatNumber, boatId, fishermanName, captainName, phone, contactInfo } = vesselData;

    if (!aisId) {
      throw new Error('AIS Transponder ID is required');
    }

    const boatNum = governmentBoatNumber || boatId;
    if (!boatNum) {
      throw new Error('Government Boat Number is required');
    }

    // Check if AIS ID or Boat Number is already registered
    const existingAis = await vesselRepository.findByAisId(aisId);
    if (existingAis && existingAis.governmentBoatNumber !== boatNum) {
      throw new Error(`AIS ID ${aisId} is already registered to boat ${existingAis.governmentBoatNumber}`);
    }

    const saved = await vesselRepository.createOrUpdate(aisId, {
      ...vesselData,
      governmentBoatNumber: boatNum,
      captainName: captainName || fishermanName || 'Captain',
      phone: phone || contactInfo || ''
    });

    await auditRepository.log({
      action: 'VESSEL_REGISTERED',
      actor,
      targetId: aisId,
      details: { boatNumber: boatNum }
    });

    return saved;
  }

  async getVessel(aisId) {
    return await vesselRepository.findByAisId(aisId);
  }

  async getAllActiveVessels() {
    return await vesselRepository.getAllActive();
  }

  async updateVesselStatus(aisId, status, actor = 'SYSTEM') {
    await vesselRepository.updateStatus(aisId, status);
    await auditRepository.log({
      action: 'VESSEL_STATUS_UPDATED',
      actor,
      targetId: aisId,
      details: { status }
    });
  }
}

export const vesselService = new VesselService();
export default vesselService;
