import { matchingRepository } from './matching.repository.js';
import { tripsRepository } from '../trips/trips.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { usersService } from '../users/users.service.js';
import { retrieveCandidatesForTrip } from './candidate-retrieval.js';
import { evaluateTripMatch } from './match-score.js';
import { generateMatchExplanation } from './match-explanation.js';
import { MatchDocument, MatchResponseDto } from './matching.types.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

export class MatchingService {
  private async formatMatchDto(match: MatchDocument): Promise<MatchResponseDto> {
    const candidateTrip = await tripsRepository.findTripById(match.candidateTripId);
    const candidateUser = await usersService.getPublicProfile(match.candidateUserId).catch(() => null);

    return {
      id: match._id.toHexString(),
      tripId: match.tripId,
      candidateTripId: match.candidateTripId,
      candidateUser,
      candidateTrip: {
        id: match.candidateTripId,
        source: candidateTrip?.source || { name: 'Unknown', normalizedName: 'unknown', coordinates: { type: 'Point', coordinates: [0, 0] } },
        destination: candidateTrip?.destination || { name: 'Unknown', normalizedName: 'unknown', coordinates: { type: 'Point', coordinates: [0, 0] } },
        travelDate: candidateTrip?.travelDate || '',
        departureTime: candidateTrip?.departureTime || '',
        transportType: candidateTrip?.transportType || 'other',
        availableSeats: candidateTrip?.availableSeats || 0,
        notes: candidateTrip?.notes || null,
      },
      score: match.score,
      routeScore: match.routeScore,
      destinationScore: match.destinationScore,
      dateScore: match.dateScore,
      timeScore: match.timeScore,
      transportScore: match.transportScore,
      preferenceScore: match.preferenceScore,
      explanation: match.explanation,
      status: match.status,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
    };
  }

  /**
   * Generates and persists matches for a specific trip
   */
  async generateMatchesForTrip(tripId: string): Promise<MatchResponseDto[]> {
    const targetTrip = await tripsRepository.findTripById(tripId);
    if (!targetTrip) {
      throw new NotFoundError('Trip not found');
    }

    const candidates = await retrieveCandidatesForTrip(targetTrip);
    if (candidates.length === 0) {
      return [];
    }

    // Fetch user profiles for gender evaluation
    const targetProfile = await usersRepository.findProfileByUserId(targetTrip.userId);

    const generatedMatches: MatchDocument[] = [];

    for (const candidateTrip of candidates) {
      const candidateProfile = await usersRepository.findProfileByUserId(candidateTrip.userId);

      const context = {
        targetTrip,
        candidateTrip,
        targetGender: targetProfile?.gender,
        candidateGender: candidateProfile?.gender,
      };

      const evaluation = evaluateTripMatch(context);

      // Only persist eligible matches with minimum score threshold (>= 30)
      if (evaluation.isEligible && evaluation.scores.score >= 30) {
        const explanation = generateMatchExplanation(evaluation, context);

        const matchDoc = await matchingRepository.upsertMatch({
          tripId: targetTrip._id.toHexString(),
          candidateTripId: candidateTrip._id.toHexString(),
          userId: targetTrip.userId,
          candidateUserId: candidateTrip.userId,
          score: evaluation.scores.score,
          routeScore: evaluation.scores.routeScore,
          destinationScore: evaluation.scores.destinationScore,
          dateScore: evaluation.scores.dateScore,
          timeScore: evaluation.scores.timeScore,
          transportScore: evaluation.scores.transportScore,
          preferenceScore: evaluation.scores.preferenceScore,
          explanation,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        generatedMatches.push(matchDoc);
      }
    }

    // Sort by score descending
    generatedMatches.sort((a, b) => b.score - a.score);

    return Promise.all(generatedMatches.map((m) => this.formatMatchDto(m)));
  }

  /**
   * Get matches for a user's trip
   */
  async getMatchesForTrip(userId: string, tripId: string, page = 1, pageSize = 20) {
    const targetTrip = await tripsRepository.findTripById(tripId);
    if (!targetTrip) {
      throw new NotFoundError('Trip not found');
    }

    if (targetTrip.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view matches for this trip');
    }

    // Trigger on-demand generation if no matches exist yet
    let { items, totalCount } = await matchingRepository.findMatchesByTripId(tripId, page, pageSize);
    if (totalCount === 0) {
      await this.generateMatchesForTrip(tripId);
      const refreshed = await matchingRepository.findMatchesByTripId(tripId, page, pageSize);
      items = refreshed.items;
      totalCount = refreshed.totalCount;
    }

    const formatted = await Promise.all(items.map((m) => this.formatMatchDto(m)));

    return {
      items: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * Get all active matches for the authenticated user across all trips
   */
  async getMatchesForUser(userId: string, page = 1, pageSize = 20) {
    const { items, totalCount } = await matchingRepository.findMatchesByUserId(userId, page, pageSize);
    const formatted = await Promise.all(items.map((m) => this.formatMatchDto(m)));

    return {
      items: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * Get a single match by ID
   */
  async getMatchById(userId: string, matchId: string): Promise<MatchResponseDto> {
    const match = await matchingRepository.findMatchById(matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }

    if (match.userId !== userId && match.candidateUserId !== userId) {
      throw new ForbiddenError('You do not have permission to view this match');
    }

    return this.formatMatchDto(match);
  }

  /**
   * Dismiss a match
   */
  async dismissMatch(userId: string, matchId: string): Promise<{ message: string }> {
    const match = await matchingRepository.findMatchById(matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }

    if (match.userId !== userId) {
      throw new ForbiddenError('You do not have permission to dismiss this match');
    }

    await matchingRepository.updateMatchStatus(matchId, userId, 'dismissed');
    return { message: 'Match dismissed successfully' };
  }
}

export const matchingService = new MatchingService();
