import { collegesRepository } from './colleges.repository.js';
import { CollegeResponseDto } from './colleges.types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export class CollegesService {
  async getActiveColleges(): Promise<CollegeResponseDto[]> {
    const colleges = await collegesRepository.findAllActive();
    return colleges.map((c) => ({
      id: c._id.toHexString(),
      name: c.name,
      domain: c.domain,
      isActive: c.isActive,
    }));
  }

  async getCollegeById(id: string): Promise<CollegeResponseDto> {
    const college = await collegesRepository.findById(id);
    if (!college || !college.isActive) {
      throw new NotFoundError('College not found or inactive');
    }
    return {
      id: college._id.toHexString(),
      name: college.name,
      domain: college.domain,
      isActive: college.isActive,
    };
  }

  /**
   * Validates if an email domain matches a registered and active institutional college
   */
  async resolveCollegeByEmail(email: string): Promise<CollegeResponseDto> {
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2) {
      throw new ValidationError('Invalid email format');
    }

    const domain = parts[1];
    const college = await collegesRepository.findByDomain(domain);
    if (!college || !college.isActive) {
      throw new ValidationError(
        `Email domain "@${domain}" is not an active institutional partner. Currently supported colleges include: KIET (@kiet.edu)`
      );
    }

    return {
      id: college._id.toHexString(),
      name: college.name,
      domain: college.domain,
      isActive: college.isActive,
    };
  }

  /**
   * Resolves the primary/default active college for guest or provisioned student users
   */
  async resolveDefaultCollege(): Promise<CollegeResponseDto> {
    const active = await collegesRepository.findAllActive();
    if (active.length > 0) {
      return {
        id: active[0]._id.toHexString(),
        name: active[0].name,
        domain: active[0].domain,
        isActive: active[0].isActive,
      };
    }
    return {
      id: 'default_campus',
      name: 'KIET Group of Institutions',
      domain: 'kiet.edu',
      isActive: true,
    };
  }
}

export const collegesService = new CollegesService();
